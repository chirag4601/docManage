from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Company, User, Document, DocumentImage


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    ordering = ['name']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'company', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'company', 'date_joined']
    search_fields = ['username', 'email', 'mobile']
    ordering = ['username']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Company Information', {'fields': ('company', 'role', 'mobile')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Company Information', {'fields': ('company', 'role', 'mobile')}),
    )


class DocumentImageInline(admin.TabularInline):
    model = DocumentImage
    extra = 0
    readonly_fields = ['image_url', 's3_key', 'file_size', 'uploaded_at']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['truck_number', 'date', 'company', 'uploaded_by', 'created_at']
    list_filter = ['company', 'date', 'created_at']
    search_fields = ['truck_number']
    ordering = ['-created_at']
    inlines = [DocumentImageInline]
    readonly_fields = ['created_at', 'updated_at']
