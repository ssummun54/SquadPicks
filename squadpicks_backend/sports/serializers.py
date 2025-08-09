from django.utils import timezone
from rest_framework import serializers

from core.models import Match
from .models import Prediction


class MatchSerializer(serializers.ModelSerializer):
    home_team_name = serializers.CharField(source="home_team.name", read_only=True)
    away_team_name = serializers.CharField(source="away_team.name", read_only=True)
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ["id", "matchday", "kickoff_at", "home_team_name", "away_team_name", "is_locked"]

    def get_is_locked(self, obj):
        return timezone.now() >= obj.kickoff_at


class PredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = ["id", "match", "home_goals", "away_goals", "outcome", "updated_at"]
        read_only_fields = ["id", "outcome", "updated_at", "match"]


# ---- Inputs ----

class BulkPredictionItem(serializers.Serializer):
    match_id = serializers.IntegerField()
    home_goals = serializers.IntegerField(min_value=0)
    away_goals = serializers.IntegerField(min_value=0)


class BulkPredictionRequest(serializers.Serializer):
    items = BulkPredictionItem(many=True)


class PredictionInputSerializer(serializers.Serializer):
    home_goals = serializers.IntegerField(min_value=0)
    away_goals = serializers.IntegerField(min_value=0)
