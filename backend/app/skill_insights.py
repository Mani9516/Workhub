"""Heuristic certification and role suggestions from profile text (skills, interests, goals)."""

from __future__ import annotations

from app.career_paths import recommend_career_paths
from app.models import User

# Curated credentials HR may recognize; keywords matched against skills + interests + goals + job title + department.
_CERT_SUGGESTIONS: list[tuple[str, frozenset[str]]] = [
    ("AWS Certified Solutions Architect – Associate", frozenset({"aws", "amazon web services", "cloud", "solutions architect", "ec2", "s3"})),
    ("Microsoft Azure Administrator (AZ-104)", frozenset({"azure", "microsoft cloud", "entra", "active directory"})),
    ("Google Cloud Professional Cloud Architect", frozenset({"gcp", "google cloud", "kubernetes", "gke"})),
    ("Certified Kubernetes Administrator (CKA)", frozenset({"kubernetes", "k8s", "docker", "container", "helm"})),
    ("CISSP / Security+", frozenset({"security", "cissp", "soc", "compliance", "risk", "infosec"})),
    ("PMP or Certified ScrumMaster (CSM)", frozenset({"pmp", "scrum", "agile", "project management", "delivery", "program"})),
    ("SHRM-CP / PHR (HR certification)", frozenset({"hr", "shrm", "phr", "people", "talent", "payroll", "benefits"})),
    ("Google Analytics / Ads certification", frozenset({"marketing", "seo", "sem", "google ads", "analytics", "social media", "content"})),
    ("HubSpot or Salesforce certification", frozenset({"crm", "salesforce", "hubspot", "sales", "pipeline"})),
    ("CPA / CFA (Finance)", frozenset({"finance", "accounting", "cpa", "cfa", "budget", "forecast", "fp&a", "audit"})),
    ("Financial modeling / Excel advanced", frozenset({"excel", "modeling", "valuation", "spreadsheet"})),
    ("Data analytics (e.g. Power BI, Tableau)", frozenset({"data", "analytics", "tableau", "power bi", "sql", "bi"})),
    ("People management / leadership program", frozenset({"leadership", "manager", "people management", "mentoring", "executive"})),
]


def _profile_blob(user: User) -> str:
    parts = [
        user.skills or "",
        user.interests or "",
        user.career_goals or "",
        user.job_title or "",
        user.department or "",
    ]
    return " ".join(parts).lower()


def suggested_certification_titles(user: User, approved_lower: set[str]) -> list[str]:
    blob = _profile_blob(user)
    if not blob.strip():
        return []
    out: list[str] = []
    for title, kws in _CERT_SUGGESTIONS:
        if title.lower() in approved_lower:
            continue
        if any(kw in blob for kw in kws):
            out.append(title)
    return out[:12]


def open_role_titles(user: User, approved_cert_titles: list[str], limit: int = 6) -> list[str]:
    blob = " ".join(approved_cert_titles).lower()
    recs = recommend_career_paths(user, hr_verified_cert_blob=blob, limit=limit)
    return [r["title"] for r in recs]


def build_skill_insights(user: User, approved_titles: list[str]) -> tuple[list[str], list[str]]:
    approved_lower = {t.strip().lower() for t in approved_titles if t.strip()}
    certs = suggested_certification_titles(user, approved_lower)
    roles = open_role_titles(user, approved_titles, limit=6)
    return certs, roles
