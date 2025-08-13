from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CreateUserView, ManageUserView, UpgradeToPremiumView

urlpatterns = [
    # Auth / JWT
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Users
    path("register/", CreateUserView.as_view(), name="user-register"),
    path("me/", ManageUserView.as_view(), name="user-me"),
    path("upgrade/", UpgradeToPremiumView.as_view(), name="user-upgrade"),
]
