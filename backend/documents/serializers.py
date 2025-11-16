from rest_framework import serializers
from .models import Company, User, Document, DocumentImage


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'is_active', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'mobile', 'company', 'company_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['mobile', 'password', 'role']
    
    def create(self, validated_data):
        mobile = validated_data.pop('mobile')
        password = validated_data.pop('password')
        company = self.context.get('company')
        
        if not company:
            raise serializers.ValidationError('Company is required')
        
        company_name = company.name.lower().replace(' ', '')
        username = f"{company_name}@{mobile}"
        
        user = User.objects.create_user(
            username=username,
            mobile=mobile,
            password=password,
            company=company,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['mobile', 'role', 'is_active']


class DocumentImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentImage
        fields = ['id', 'image_url', 's3_key', 'file_size', 'uploaded_at']


class DocumentSerializer(serializers.ModelSerializer):
    images = DocumentImageSerializer(many=True, read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = Document
        fields = ['id', 'company', 'company_name', 'uploaded_by', 'uploaded_by_name', 'truck_number', 'date', 'images', 'created_at', 'updated_at']
        read_only_fields = ['id', 'company', 'uploaded_by', 'created_at', 'updated_at']
