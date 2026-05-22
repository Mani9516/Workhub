"""Heuristic career-path suggestions (HR-approved certifications only + skills/goals/role)."""

from __future__ import annotations

from app.models import User

# Each path: keywords matched against certifications (strong), then skills/goals/title (weaker).
CAREER_CATALOG: list[dict] = [
    {
        "title": "Cloud / Solutions Architect",
        "summary": "Own reference architectures, cost and reliability tradeoffs, and cross-team technical alignment.",
        "cert_weight": {"aws", "azure", "gcp", "architect", "kubernetes", "docker", "terraform", "cka", "cks"},
        "context_weight": {"cloud", "devops", "sre", "platform", "infrastructure", "solutions"},
    },
    {
        "title": "Security Engineering",
        "summary": "Shift-left security, threat modeling, and secure SDLC leadership.",
        "cert_weight": {"security", "cissp", "cism", "ceh", "comptia", "sscp", "giac", "oscp"},
        "context_weight": {"security", "secure", "compliance", "risk"},
    },
    {
        "title": "Engineering Management",
        "summary": "Grow teams, delivery predictability, and engineering culture at scale.",
        "cert_weight": {"pmp", "scrum", "psm", "csm", "safe", "management"},
        "context_weight": {"manager", "leadership", "people management", "director", "engineering manager"},
    },
    {
        "title": "HR / People Leadership",
        "summary": "Business partnership, workforce planning, and people programs.",
        "cert_weight": {"shrm", "phr", "sphr", "hr", "talent", "hrci"},
        "context_weight": {"hr", "people", "talent", "chro", "recruiting"},
    },
    {
        "title": "Staff / Principal Engineer",
        "summary": "Deep technical ownership, mentoring, and roadmap influence without people-management as primary focus.",
        "cert_weight": {},
        "context_weight": {"senior", "principal", "staff", "architect", "technical lead", "platform"},
    },
    {
        "title": "Product-minded Full-Stack IC",
        "summary": "End-to-end feature ownership from API to UI with strong product judgment.",
        "cert_weight": {},
        "context_weight": {"react", "full stack", "product", "typescript", "fastapi", "ux"},
    },
]


def _blob_no_cert(user: User) -> str:
    parts = [user.skills or "", user.career_goals or "", user.job_title or "", user.department or ""]
    return " ".join(parts).lower()


def recommend_career_paths(user: User, hr_verified_cert_blob: str = "", limit: int = 5) -> list[dict]:
    """Return ranked paths. Certification text comes only from HR-approved entries (passed as blob)."""
    cert_blob = (hr_verified_cert_blob or "").lower()
    full = f"{cert_blob} {_blob_no_cert(user)}".strip().lower()
    ranked: list[tuple[float, dict, str]] = []

    for path in CAREER_CATALOG:
        score = 0.0
        reasons: list[str] = []

        for kw in path["cert_weight"]:
            if kw in cert_blob:
                score += 4.0
                reasons.append(f'certification focus: "{kw}"')
            elif kw in full:
                score += 1.2
                reasons.append(f'related skill/context: "{kw}"')

        for kw in path["context_weight"]:
            if kw in full and len(reasons) < 4:
                score += 1.0
                reasons.append(f"profile match: {kw}")

        if score < 0.01:
            score = 0.5
            reasons = ["general growth track for your profile"]

        expl = "; ".join(reasons[:3])
        ranked.append((score, path, expl))

    ranked.sort(key=lambda x: x[0], reverse=True)
    out: list[dict] = []
    for score, path, expl in ranked[:limit]:
        out.append(
            {
                "title": path["title"],
                "summary": path["summary"],
                "score": round(score, 2),
                "explanation": expl,
            }
        )
    return out
