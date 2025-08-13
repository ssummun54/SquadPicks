from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


def _years_old(birthdate, today=None):
    if not today:
        today = timezone.now().date()
    return today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))


class UserManager(BaseUserManager):
    """Custom manager using email and username as unique identifiers, with required fields + age check."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        username = (extra_fields.get("username") or "").strip()
        first_name = (extra_fields.get("first_name") or "").strip()
        last_name = (extra_fields.get("last_name") or "").strip()
        birthdate = extra_fields.get("birthdate")

        if not username:
            raise ValueError("Username is required")
        if self.model.objects.filter(username=username).exists():
            raise ValueError("Username is already taken")
        if not first_name:
            raise ValueError("First name is required")
        if not last_name:
            raise ValueError("Last name is required")
        if not birthdate:
            raise ValueError("Birthdate is required")
        if _years_old(birthdate) < 12:
            raise ValueError("User must be at least 12 years old")

        if password is None:
            raise ValueError("Password is required")

        email = self.normalize_email(email.strip().lower())
        extra_fields["username"] = username
        extra_fields["first_name"] = first_name
        extra_fields["last_name"] = last_name
        extra_fields.setdefault("user_type", "free")
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, birthdate=birthdate, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        if password is None:
            raise ValueError("Password is required for superuser")

        extra_fields.setdefault("username", extra_fields.get("username", "admin"))
        extra_fields.setdefault("first_name", extra_fields.get("first_name", "Admin"))
        extra_fields.setdefault("last_name", extra_fields.get("last_name", "User"))
        extra_fields.setdefault(
            "birthdate",
            timezone.now().date().replace(year=timezone.now().year - 30)
        )

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        extra_fields.setdefault("user_type", "free")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user with username login and simple tiering."""
    USER_TYPE_CHOICES = [
        ("free", "Free"),
        ("premium", "Premium"),
    ]

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=30, unique=True)  # required field
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default="free")

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "username"  # <-- changed from "email" to "username"
    REQUIRED_FIELDS = ["email"]  # email is now required, but username is the login field

    def __str__(self):
        return self.username
