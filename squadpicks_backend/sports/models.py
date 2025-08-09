# sports/models.py
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import Match


class Prediction(models.Model):
    OUTCOME_HOME = "home_win"
    OUTCOME_DRAW = "draw"
    OUTCOME_AWAY = "away_win"

    OUTCOME_CHOICES = [
        (OUTCOME_HOME, "Home Win"),
        (OUTCOME_DRAW, "Draw"),
        (OUTCOME_AWAY, "Away Win"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="predictions",
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="predictions",
    )

    home_goals = models.PositiveSmallIntegerField(default=0)
    away_goals = models.PositiveSmallIntegerField(default=0)

    # Stored outcome for quick filtering/analytics
    outcome = models.CharField(
        max_length=10,
        choices=OUTCOME_CHOICES,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "match"], name="uniq_user_match_prediction"
            )
        ]
        ordering = ["match_id"]

    def __str__(self) -> str:
        return f"{self.user} · {self.match} · {self.outcome}"

    # ---------- Business logic ----------

    @staticmethod
    def _derive_outcome(home: int, away: int) -> str:
        """Given goals, return the outcome string."""
        if home > away:
            return Prediction.OUTCOME_HOME
        if home < away:
            return Prediction.OUTCOME_AWAY
        return Prediction.OUTCOME_DRAW

    def clean(self):
        """Prevent updates after kickoff."""
        if self.match and timezone.now() >= self.match.kickoff_at:
            raise ValidationError("Predictions are locked after kickoff for this match.")

    def save(self, *args, **kwargs):
        """Enforce rules & set outcome before saving."""
        self.full_clean()  # Runs clean() and field validators
        self.outcome = self._derive_outcome(self.home_goals, self.away_goals)
        super().save(*args, **kwargs)
