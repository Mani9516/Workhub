from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.career_paths import recommend_career_paths
from app.database import get_db
from app.dependencies import get_current_user
from app.models import LearningItem, Policy, User, UserLearningProgress, UserRole
from app.routers.certifications import approved_certifications_blob
from app.schemas import LearningRecommendation

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _token_set(s: str) -> set[str]:
    return {t.strip().lower() for t in s.replace(";", ",").split(",") if t.strip()}


def score_learning(user: User, course: LearningItem, hr_verified_cert_blob: str = "") -> tuple[float, str]:
    score = 0.0
    reasons = []
    user_skills = _token_set(user.skills)
    course_skills = _token_set(course.skill_tags)
    overlap = user_skills & course_skills
    if overlap:
        score += 3.0 + min(2.0, len(overlap))
        reasons.append(f"matches skills: {', '.join(sorted(overlap)[:4])}")
    dept_tags = _token_set(course.department_tags)
    if user.department.lower() in dept_tags or "all" in dept_tags:
        score += 2.0
        reasons.append("aligned with your department")
    goals = user.career_goals.lower()
    if goals and any(word in course.title.lower() + course.description.lower() for word in goals.split() if len(word) > 3):
        score += 1.5
        reasons.append("supports stated career goals")
    certs = _token_set(hr_verified_cert_blob)
    if certs and any(c in course.title.lower() for c in certs):
        score += 1.0
        reasons.append("builds on your certifications")
    interests = _token_set(user.interests)
    i_overlap = interests & course_skills
    if i_overlap:
        score += 1.0
        reasons.append("matches interests")
    score += max(0.0, 2.0 - course.duration_hours * 0.1)
    if not reasons:
        reasons.append("popular pick for your profile")
    return score, "; ".join(reasons[:3])


def score_policy(user: User, policy: Policy) -> tuple[float, str]:
    score = float(policy.priority)
    if policy.category == "hr" and user.role.value == "employee":
        score += 2
    if policy.category == "ai" and user.role.value == "hr":
        score += 2
    if "security" in policy.title.lower() or policy.category == "it":
        score += 1.5
    explanation = f"Priority {policy.priority} — relevant to {user.role.value} workflows"
    return score, explanation


def _learning_recommendation_subject(db: Session, current: User, user_id: int | None) -> User:
    subject_id = user_id if user_id is not None else current.id
    subject = db.query(User).filter(User.id == subject_id).first()
    if not subject or not subject.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    allowed = (
        current.id == subject.id
        or current.role == UserRole.hr
        or (current.role == UserRole.manager and subject.manager_id == current.id)
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not allowed to view this user's learning recommendations")
    return subject


@router.get("/recommendations/career")
def career_recommendations(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Same ranking as Career page — HR-approved certification blob only."""
    blob = approved_certifications_blob(db, current.id)
    return recommend_career_paths(current, hr_verified_cert_blob=blob)


@router.get("/recommendations/learning", response_model=list[LearningRecommendation])
def learning_recommendations(
    user_id: int | None = Query(None, description="Recommend for this user (HR or their manager). Defaults to you."),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    subject = _learning_recommendation_subject(db, current, user_id)
    done_ids = {
        r.learning_item_id
        for r in db.query(UserLearningProgress).filter(
            UserLearningProgress.user_id == subject.id,
            UserLearningProgress.completed.is_(True),
        ).all()
    }
    courses = [c for c in db.query(LearningItem).all() if c.id not in done_ids]
    cert_blob = approved_certifications_blob(db, subject.id)
    ranked: list[tuple[float, LearningItem, str]] = []
    for c in courses:
        s, why = score_learning(subject, c, cert_blob)
        ranked.append((s, c, why))
    ranked.sort(key=lambda x: x[0], reverse=True)
    out = []
    for s, c, why in ranked[:5]:
        out.append(LearningRecommendation(learning_item_id=c.id, title=c.title, score=round(s, 2), explanation=why))
    return out


@router.get("/recommendations/compliance")
def compliance_priorities(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    policies = db.query(Policy).all()
    ranked = [(score_policy(current, p)[0], p, score_policy(current, p)[1]) for p in policies]
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [
        {"policy_id": p.id, "title": p.title, "category": p.category, "score": round(s, 2), "explanation": why}
        for s, p, why in ranked[:5]
    ]
