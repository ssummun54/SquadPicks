from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Basic user serializer for reading/updating user info.
    Does not handle password.
    """
    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name", "birthdate", "user_type"]
        read_only_fields = ["id", "email", "username", "user_type"]


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    Registration serializer with required fields and age check.
    Calls the custom manager's create_user method.
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        trim_whitespace=False
    )

    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name", "birthdate", "password"]
        extra_kwargs = {
            "email": {"required": True},
            "username": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
            "birthdate": {"required": True},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return username

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required.")
        return value.strip()

    def validate_last_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required.")
        return value.strip()

    def validate_birthdate(self, dob):
        if not dob:
            raise serializers.ValidationError("Birthdate is required.")
        today = timezone.now().date()
        age_years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age_years < 12:
            raise serializers.ValidationError("You must be at least 12 years old to register.")
        return dob

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data["email"] = validated_data["email"].strip().lower()
        validated_data["username"] = validated_data["username"].strip()
        # Use custom manager so rules/defaults apply
        user = User.objects.create_user(password=password, **validated_data)
        return user
