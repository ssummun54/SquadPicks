from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserRegisterSerializer, UserSerializer

User = get_user_model()


class CreateUserView(generics.CreateAPIView):
    """
    POST /api/users/register/
    Public registration endpoint.
    Creates a regular (free) user by default.
    Requires: email, password, first_name, last_name, birthdate (>= 12 years old).
    """
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]


class ManageUserView(generics.RetrieveUpdateAPIView):
    """
    GET /api/users/me/ - Get current user's profile.
    PUT/PATCH /api/users/me/ - Update profile (cannot change email or user_type here).
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UpgradeToPremiumView(APIView):
    """
    POST /api/users/upgrade/
    Upgrades the current authenticated user to premium.
    Later: hook into payment processing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user: User = request.user
        if user.user_type == "premium":
            return Response({"detail": "You are already a premium member."}, status=status.HTTP_200_OK)

        user.user_type = "premium"
        user.save(update_fields=["user_type"])
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
