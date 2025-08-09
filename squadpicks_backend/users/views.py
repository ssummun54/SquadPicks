from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from .serializers import UserSerializer

User = get_user_model()


class CreateUserView(generics.CreateAPIView):
    """
    Public endpoint to register a new user.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
