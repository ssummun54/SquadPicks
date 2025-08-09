from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}  # ✅ Mask input in browsable API
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "birthdate",
            "password",
            "is_staff",
            "user_type",
        ]
        extra_kwargs = {
            "is_staff": {"read_only": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        request = self.context.get("request")
        if request and not request.user.is_staff:
            validated_data.pop("is_staff", None)
            validated_data.pop("user_type", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
