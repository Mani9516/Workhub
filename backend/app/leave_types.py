"""Leave type catalog: balances, labels, and who may approve."""

from __future__ import annotations

LEAVE_TYPE_LABELS: dict[str, str] = {
    "earned": "Earned leave",
    "casual": "Casual leave",
    "sick": "Sick leave",
    "bereavement": "Bereavement leave",
    "optional": "Optional leave",
    # legacy
    "annual": "Annual leave",
}

# No balance row required; approval does not deduct days.
NO_BALANCE_TYPES: frozenset[str] = frozenset({"bereavement", "optional"})

# Only HR may approve (managers do not see these in their queue).
HR_ONLY_APPROVAL_TYPES: frozenset[str] = frozenset({"bereavement", "optional"})

# Types employees may request (validated on apply).
ALLOWED_LEAVE_TYPES: frozenset[str] = frozenset(LEAVE_TYPE_LABELS.keys())


def uses_balance(leave_type: str) -> bool:
    return leave_type not in NO_BALANCE_TYPES


def hr_only_approval(leave_type: str) -> bool:
    return leave_type in HR_ONLY_APPROVAL_TYPES


def leave_type_label(leave_type: str) -> str:
    return LEAVE_TYPE_LABELS.get(leave_type, leave_type.replace("_", " ").title())
