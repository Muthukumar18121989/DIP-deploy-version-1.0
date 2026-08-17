from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.models import UseCase, User
from app.schemas import AdminUserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    users = db.execute(select(User).order_by(User.created_at.desc())).scalars().all()
    use_cases = db.execute(select(UseCase).order_by(UseCase.created_at.desc())).scalars().all()
    by_owner: dict[str, list[UseCase]] = {}
    for uc in use_cases:
        if uc.owner_user_id:
            by_owner.setdefault(uc.owner_user_id, []).append(uc)

    return [
        AdminUserOut(
            user=user,
            use_case_count=len(by_owner.get(user.id, [])),
            use_cases=by_owner.get(user.id, []),
        )
        for user in users
    ]
