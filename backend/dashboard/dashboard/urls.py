"""
URL configuration for dashboard project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
from masters import auth_views
from rest_framework.routers import DefaultRouter

# Router for User CRUD ViewSet
auth_router = DefaultRouter()
auth_router.register(r'api/auth/users', auth_views.UserViewSet, basename='auth-users')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('masters/', include('masters.urls')),

    # Auth endpoints
    path('api/auth/register/', auth_views.RegisterView.as_view(), name='register'),
    path('api/auth/login/', auth_views.LoginView.as_view(), name='login'),
    path('api/auth/refresh/', auth_views.CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('api/auth/me/', auth_views.MeView.as_view(), name='me'),

    # Pending, Approve & Reject endpoints (from kube)
    path('api/auth/users/pending/', auth_views.PendingUsersView.as_view(), name='pending_users'),
    path('api/auth/users/<int:user_id>/approve/', auth_views.ApproveUserView.as_view(), name='approve_user'),
    path('api/auth/users/<int:user_id>/reject/', auth_views.RejectUserView.as_view(), name='reject_user'),

    # Password reset (Admin only)
    path('api/auth/reset-password/', auth_views.ResetPasswordView.as_view(), name='reset-password'),

    # Self-service Password Reset via Email OTP
    path('api/auth/password-reset/request-otp/', auth_views.RequestPasswordResetOTPView.as_view(), name='request_password_reset_otp'),
    path('api/auth/password-reset/verify-otp/', auth_views.VerifyPasswordResetOTPView.as_view(), name='verify_password_reset_otp'),

    # User stats
    path('api/auth/user-stats/', auth_views.UserStatsView.as_view(), name='user-stats'),

    # User CRUD (router-generated)
    path('', include(auth_router.urls)),

    # Media files (nginx ki jagah Django serve karega)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
