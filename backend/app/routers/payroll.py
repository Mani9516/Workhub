from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Payslip, User
from app.schemas import PayslipOut

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


@router.get("/payslips", response_model=list[PayslipOut])
def payslips(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(Payslip).filter(Payslip.user_id == current.id).order_by(Payslip.id.desc()).all()
    return [
        PayslipOut(id=r.id, month=r.month, gross=r.gross, net=r.net, pdf_url=r.pdf_url or "#")
        for r in rows
    ]
