from rest_framework import permissions


class IsCompanyAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'company_admin'


class IsSameCompany(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.company == request.user.company
