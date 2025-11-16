import boto3
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime
import uuid

from .models import Company, User, Document, DocumentImage
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    DocumentSerializer
)
from .permissions import IsCompanyAdmin, IsSameCompany


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        from django.contrib.auth import authenticate
        
        mobile = request.data.get('mobile')
        password = request.data.get('password')
        
        if not mobile or not password:
            return Response(
                {'error': 'Mobile number and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, mobile=mobile, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        
        return Response({'message': 'Logged out successfully'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]
    
    def get_queryset(self):
        if not self.request.user.company:
            return User.objects.none()
        return User.objects.filter(company=self.request.user.company)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = self.request.user.company
        return context
    
    def perform_create(self, serializer):
        if not self.request.user.company:
            raise ValueError("User must belong to a company")
        serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]
    
    def get_queryset(self):
        if not self.request.user.company:
            return User.objects.none()
        return User.objects.filter(company=self.request.user.company)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def perform_destroy(self, instance):
        if instance.role == 'company_admin' and instance != self.request.user:
            return Response(
                {'error': 'Cannot delete other company admins'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.is_active = False
        instance.save()


@method_decorator(csrf_exempt, name='dispatch')
class DocumentUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.company:
            return Response(
                {'error': 'User must belong to a company to upload documents'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        truck_number = request.data.get('truck_number')
        date = request.data.get('date')
        images = request.FILES.getlist('images')

        if not truck_number:
            return Response(
                {'error': 'Truck number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not date:
            return Response(
                {'error': 'Date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not images:
            return Response(
                {'error': 'At least one image is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(images) > settings.MAX_FILES_PER_UPLOAD:
            return Response(
                {'error': f'Maximum {settings.MAX_FILES_PER_UPLOAD} files allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for image in images:
            if image.size > settings.MAX_FILE_SIZE_BYTES:
                return Response(
                    {'error': f'File {image.name} exceeds maximum size of {settings.MAX_FILE_SIZE_BYTES} bytes'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        document = Document.objects.create(
            company=request.user.company,
            uploaded_by=request.user,
            truck_number=truck_number,
            date=date
        )

        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )

        uploaded_images = []

        try:
            for image in images:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_id = str(uuid.uuid4())[:8]
                file_extension = image.name.split('.')[-1]
                s3_key = f"companies/{request.user.company.id}/documents/{truck_number}/{date}/{timestamp}_{unique_id}.{file_extension}"

                s3_client.upload_fileobj(
                    image,
                    settings.AWS_STORAGE_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={'ContentType': image.content_type}
                )

                image_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"

                document_image = DocumentImage.objects.create(
                    document=document,
                    image_url=image_url,
                    s3_key=s3_key,
                    file_size=image.size
                )
                uploaded_images.append(document_image)

            serializer = DocumentSerializer(document)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            document.delete()
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        if not self.request.user.company:
            return Document.objects.none()
            
        documents = Document.objects.filter(company=self.request.user.company)
        
        truck_number = self.request.query_params.get('truck_number')
        date = self.request.query_params.get('date')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if truck_number:
            documents = documents.filter(truck_number__icontains=truck_number)
        if date:
            documents = documents.filter(date=date)
        if date_from:
            documents = documents.filter(date__gte=date_from)
        if date_to:
            documents = documents.filter(date__lte=date_to)
        
        return documents


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSameCompany]
    
    def get(self, request, pk):
        if not request.user.company:
            return Response(
                {'error': 'User must belong to a company'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            document = Document.objects.get(pk=pk, company=request.user.company)
            self.check_object_permissions(request, document)
            serializer = DocumentSerializer(document)
            return Response(serializer.data)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, pk):
        if not request.user.company:
            return Response(
                {'error': 'User must belong to a company'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            document = Document.objects.get(pk=pk, company=request.user.company)
            self.check_object_permissions(request, document)
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            for image in document.images.all():
                try:
                    s3_client.delete_object(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Key=image.s3_key
                    )
                except Exception as e:
                    pass
            
            document.delete()
            return Response({'message': 'Document deleted successfully'})
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
