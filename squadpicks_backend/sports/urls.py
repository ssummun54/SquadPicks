from django.urls import path
from .views import MatchdayPredictionsView, PredictionDetailView

app_name = "sports"

urlpatterns = [
    # GET + POST (bulk upsert) for a matchday
    path("matchdays/<int:matchday>/predictions/", MatchdayPredictionsView.as_view(), name="matchday-predictions"),
    # PUT/PATCH single match prediction for current user
    path("predictions/<int:match_id>/", PredictionDetailView.as_view(), name="prediction-detail"),
]
