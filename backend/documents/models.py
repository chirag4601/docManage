from django.db import models
from django.contrib.auth.models import AbstractUser


class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Companies'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ('company_admin', 'Company Admin'),
        ('user', 'User'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    mobile = models.CharField(max_length=15, unique=True)
    
    USERNAME_FIELD = 'mobile'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        ordering = ['mobile']

    def save(self, *args, **kwargs):
        if not self.username and self.company and self.mobile:
            company_name = self.company.name.lower().replace(' ', '')
            self.username = f"{company_name}@{self.mobile}"
        super().save(*args, **kwargs)

    def __str__(self):
        if self.company:
            return f"{self.mobile} ({self.company.name})"
        return self.mobile


class Document(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='documents')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    truck_number = models.CharField(max_length=50)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['company', 'truck_number']),
            models.Index(fields=['company', 'date']),
        ]

    def __str__(self):
        return f"{self.truck_number} - {self.date}"


class DocumentImage(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(max_length=500)
    s3_key = models.CharField(max_length=500)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.document.truck_number}"
