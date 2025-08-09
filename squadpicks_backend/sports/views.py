from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError

from core.models import Match
from .models import Prediction
from .serializers import (
    MatchSerializer,
    PredictionSerializer,
    BulkPredictionRequest,
    PredictionInputSerializer,
)


def _serialize_matchday(user, matchday: int):
    """Return [{ match: {...}, prediction: {...}|None }, ...] for a matchday."""
    matches = (
        Match.objects.filter(matchday=matchday)
        .select_related("home_team", "away_team")
        .order_by("kickoff_at")
    )
    match_data = MatchSerializer(matches, many=True).data

    preds = Prediction.objects.filter(user=user, match__in=matches)
    pred_map = {p.match_id: p for p in preds}

    combined = []
    for m in match_data:
        mid = m["id"]
        combined.append({
            "match": m,
            "prediction": PredictionSerializer(pred_map[mid]).data if mid in pred_map else None,
        })
    return combined


class MatchdayPredictionsView(APIView):
    """
    GET: List matches for a matchday + the current user's prediction (if any).
    POST: Bulk upsert predictions for those matches (blocked after each match's kickoff).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, matchday: int):
        return Response(_serialize_matchday(request.user, matchday))

    def post(self, request, matchday: int):
        payload = BulkPredictionRequest(data=request.data)
        payload.is_valid(raise_exception=True)
        items = payload.validated_data["items"]
        match_ids = [i["match_id"] for i in items]

        # Verify matches exist and belong to this matchday
        matches = {m.id: m for m in Match.objects.filter(id__in=match_ids, matchday=matchday)}
        if len(matches) != len(match_ids):
            return Response(
                {"detail": "All provided matches must exist and belong to this matchday."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        for m in matches.values():
            if now >= m.kickoff_at:
                return Response({"detail": f"Match {m.id} is locked."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                for it in items:
                    match = matches[it["match_id"]]
                    # Model enforces lock + outcome derivation
                    Prediction.objects.update_or_create(
                        user=request.user,
                        match=match,
                        defaults={
                            "home_goals": it["home_goals"],
                            "away_goals": it["away_goals"],
                        },
                    )
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)

        # Return the same shape as GET for convenience
        return Response(_serialize_matchday(request.user, matchday), status=status.HTTP_200_OK)


class PredictionDetailView(APIView):
    """
    PUT/PATCH: Upsert the current user's prediction for a single match by ID.
    Response includes both match and prediction for easy UI rendering.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, match_id: int):
        return self._upsert(request, match_id)

    def patch(self, request, match_id: int):
        return self._upsert(request, match_id)

    def _upsert(self, request, match_id: int):
        match = get_object_or_404(Match.objects.select_related("home_team", "away_team"), id=match_id)
        data = PredictionInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)

        try:
            obj, _ = Prediction.objects.update_or_create(
                user=request.user,
                match=match,
                defaults={
                    "home_goals": data.validated_data["home_goals"],
                    "away_goals": data.validated_data["away_goals"],
                },
            )
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "match": MatchSerializer(match).data,
            "prediction": PredictionSerializer(obj).data,
        }, status=status.HTTP_200_OK)
