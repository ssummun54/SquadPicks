from django.db import models
from django.utils import timezone

class Competition(models.Model):
    slug = models.SlugField(unique=True)          # e.g. "premier-league"
    name = models.CharField(max_length=100)

    def __str__(self): return self.name

class Season(models.Model):
    name = models.CharField(max_length=20, unique=True)  # e.g. "2024-2025"
    def __str__(self): return self.name

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class Match(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    matchday = models.PositiveIntegerField()
    kickoff_at = models.DateTimeField()
    home_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="home_matches")
    away_team = models.ForeignKey(Team, on_delete=models.PROTECT, related_name="away_matches")

    class Meta:
        indexes = [models.Index(fields=["competition", "season", "matchday"])]

    def is_locked(self) -> bool:
        return timezone.now() >= self.kickoff_at

    def __str__(self):
        return f"{self.home_team} vs {self.away_team} (MD {self.matchday})"
