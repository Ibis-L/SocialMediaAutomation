from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from rest_framework import serializers, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from masters.models import PasswordResetOTP

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role')

        if not username or not email or not password:
            return Response({"error": "Please provide username, email, and password"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        user.is_active = False
        user.save()
        
        if role:
            try:
                group = Group.objects.get(name=role)
                user.groups.add(group)
            except Group.DoesNotExist:
                pass

        # Feature B: Send notification email to Super Admins & alert email
        try:
            admin_emails = list(
                User.objects.filter(is_superuser=True, is_active=True)
                .exclude(email='')
                .values_list('email', flat=True)
            )
            admin_alert = getattr(settings, 'ADMIN_ALERT_EMAIL', 'dejoro7604@goldvester.com')
            if admin_alert and admin_alert not in admin_emails:
                admin_emails.append(admin_alert)

            if admin_emails:
                subject = "New User Registration Pending Approval - Media Tech"
                body = (
                    f"Hello Administrator,\n\n"
                    f"A new user has registered on the platform and requires your approval:\n\n"
                    f"• Username: {user.username}\n"
                    f"• Email: {user.email}\n"
                    f"• Requested Role: {role or 'Viewer'}\n\n"
                    f"Please log in to the admin panel (/user-management or /user-approvals) to approve or reject this user.\n\n"
                    f"Best regards,\nMedia Tech Portal"
                )
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    fail_silently=True,
                )
        except Exception:
            pass

        return Response({"message": "User created successfully. Pending admin approval."}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        input_value = request.data.get('username')
        password = request.data.get('password')

        # Feature 5: Login via Username OR Email
        if input_value and '@' in input_value:
            user_obj = User.objects.filter(email__iexact=input_value).first()
            if user_obj:
                username = user_obj.username
            else:
                return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            username = input_value
        
        user = authenticate(username=username, password=password)
        if user is not None:
            tokens = get_tokens_for_user(user)
            response = Response({"access": tokens["access"], "message": "Login successful"}, status=status.HTTP_200_OK)
            
            # Set HttpOnly cookie for refresh token
            response.set_cookie(
                key=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
                value=tokens["refresh"],
                expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=False, # Set to True in production (HTTPS)
                httponly=True,
                samesite='Lax'
            )
            return response
        else:
            try:
                existing_user = User.objects.get(username=username)
                if not existing_user.is_active:
                    return Response({"error": "Account pending admin approval. Please wait until an admin activates your account."}, status=status.HTTP_403_FORBIDDEN)
            except User.DoesNotExist:
                pass
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'))
        if refresh_token:
            request.data['refresh'] = refresh_token
        
        response = super().post(request, *args, **kwargs)
        
        # If rotation is enabled, the new refresh token is in response.data
        if 'refresh' in response.data:
            response.set_cookie(
                key=settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
                value=response.data['refresh'],
                expires=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                secure=False, 
                httponly=True,
                samesite='Lax'
            )
            del response.data['refresh']
            
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token'))
        return response


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        groups = list(user.groups.values_list('name', flat=True))
        if user.is_superuser and 'Super Admin' not in groups:
            groups.append('Super Admin')
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_superuser": user.is_superuser,
            "groups": groups
        })


class PendingUsersView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        users = User.objects.filter(is_active=False).values('id', 'username', 'email', 'date_joined')
        return Response(list(users))


class ApproveUserView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_active=False)
            user.is_active = True
            user.save()

            # Feature B: Send approval notification email to the user
            if user.email:
                try:
                    subject = "Your Account Has Been Approved - Media Tech"
                    body = (
                        f"Hello {user.username},\n\n"
                        f"Great news! Your account on Media Tech has been approved by the administrator.\n\n"
                        f"You can now log in to the portal using your credentials:\n"
                        f"http://localhost:3000/login\n\n"
                        f"Welcome to the team!\n"
                        f"Media Tech Portal"
                    )
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

            return Response({"message": f"User {user.username} approved successfully."})
        except User.DoesNotExist:
            return Response({"error": "User not found or already active."}, status=status.HTTP_404_NOT_FOUND)


class RejectUserView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_active=False)
            username = user.username
            user_email = user.email

            # Send rejection notification email if user provided an email
            if user_email:
                try:
                    subject = "Registration Status - Media Tech"
                    body = (
                        f"Hello {username},\n\n"
                        f"Thank you for registering on the Media Tech portal.\n\n"
                        f"We regret to inform you that your registration request could not be approved by the administrator at this time.\n\n"
                        f"If you believe this was done in error, please contact your administrator.\n\n"
                        f"Best regards,\n"
                        f"Media Tech Portal"
                    )
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user_email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

            user.delete()
            return Response({"message": f"Registration for user '{username}' has been rejected."})
        except User.DoesNotExist:
            return Response({"error": "User not found or already active."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, user_id):
        return self.post(request, user_id)


# ============================================================
# Feature 1: Password Reset API (Admin only)
# ============================================================

class ResetPasswordView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request):
        user_id = request.data.get('user_id')
        new_password = request.data.get('new_password')

        if not user_id or not new_password:
            return Response({"error": "Please provide user_id and new_password"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(new_password)
        user.save()
        return Response({"message": f"Password reset successfully for user '{user.username}'"}, status=status.HTTP_200_OK)


# ============================================================
# Feature A: Self-Service Password Reset via OTP (Email)
# ============================================================

class RequestPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('email_or_username', '').strip()
        if not identifier:
            return Response({"error": "Please provide your username or email address."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup user by email or username
        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            return Response({"error": "No account found with this username or email."}, status=status.HTTP_404_NOT_FOUND)

        if not user.email:
            return Response({"error": "This account does not have a registered email address. Please contact your Super Admin."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            return Response({"error": "This account is inactive or pending admin approval."}, status=status.HTTP_403_FORBIDDEN)

        # Generate OTP
        otp_record = PasswordResetOTP.generate_otp_for_user(user)

        # Send email via SMTP
        subject = "Password Reset OTP - Media Tech"
        body = (
            f"Hello {user.username},\n\n"
            f"You requested a password reset for your Media Tech account.\n\n"
            f"Your 6-digit OTP code is:  {otp_record.otp_code}\n\n"
            f"This code will expire in 10 minutes.\n"
            f"If you did not request this password reset, please ignore this email.\n\n"
            f"Best regards,\nMedia Tech Team"
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            parts = user.email.split('@')
            masked_name = parts[0][0] + '***' + (parts[0][-1] if len(parts[0]) > 1 else '')
            masked_email = f"{masked_name}@{parts[1]}"
            return Response({
                "message": f"OTP has been sent to your email ({masked_email}). Please check your inbox.",
                "email": user.email,
                "username": user.username,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "error": f"Failed to deliver email: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('email_or_username', '').strip()
        otp_code = request.data.get('otp_code', '').strip()
        new_password = request.data.get('new_password', '')

        if not identifier or not otp_code or not new_password:
            return Response({"error": "Please provide username/email, OTP code, and new password."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup user
        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            return Response({"error": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

        # Validate OTP
        otp_record = PasswordResetOTP.objects.filter(user=user, otp_code=otp_code, is_used=False).first()
        if not otp_record or not otp_record.is_valid():
            return Response({"error": "Invalid or expired OTP code. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        # Reset password
        user.set_password(new_password)
        user.save()

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        return Response({"message": "Password reset successfully! You can now log in with your new password."}, status=status.HTTP_200_OK)


# ============================================================
# Feature 2: User Stats API
# ============================================================

class UserStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        return Response({
            "total_users": total_users,
            "active_users": active_users,
        }, status=status.HTTP_200_OK)


# ============================================================
# Feature 3: User CRUD API (superuser only)
# ============================================================

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(write_only=True, required=False, allow_blank=True)
    groups = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_active', 'is_superuser', 'groups', 'date_joined', 'role']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'is_superuser': {'read_only': True},
            'date_joined': {'read_only': True},
        }

    def get_groups(self, obj):
        groups = list(obj.groups.values_list('name', flat=True))
        if obj.is_superuser and 'Super Admin' not in groups:
            groups.append('Super Admin')
        return groups

    def create(self, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        if role == 'Super Admin':
            user.is_superuser = True
            user.is_staff = True
        user.save()
        if role:
            group, _ = Group.objects.get_or_create(name=role)
            user.groups.add(group)
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        if role == 'Super Admin':
            instance.is_superuser = True
            instance.is_staff = True
        elif role is not None:
            instance.is_superuser = False
            instance.is_staff = False
        instance.save()
        if role is not None:
            instance.groups.clear()
            if role:  # non-empty string
                group, _ = Group.objects.get_or_create(name=role)
                instance.groups.add(group)
        return instance


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def destroy(self, request, *args, **kwargs):
        """Soft delete — set is_active = False instead of actually deleting."""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"message": f"User '{user.username}' has been deactivated"}, status=status.HTTP_200_OK)
