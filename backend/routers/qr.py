import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends

import db
from auth import get_current_user, require_faculty
from models import QRGenerateRequest, QRGenerateResponse, QRValidateRequest, QRValidateResponse, QRActiveSessionOut

router = APIRouter()


# ── POST /api/qr/generate ──────────────────────────────────────────────────────

@router.post("/generate", response_model=QRGenerateResponse)
def generate_qr(body: QRGenerateRequest, current_user: dict = Depends(require_faculty)):
    # check if there's already an active session for this course
    existing = db.get_active_qr_session(body.course_id)
    if existing:
        # return the existing active session instead of creating a new one
        return QRGenerateResponse(
            session_id=str(existing["session_id"]),
            course_id=body.course_id,
            qr_payload=str(existing["session_id"])
        )

    session_id = uuid.uuid4()
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=10)        # session valid for 10 minutes

    db.create_qr_session(
        session_id=session_id,
        course_id=body.course_id,
        host_id=current_user["id"],
        generated_at=now.isoformat(),
        expires_at=expires_at.isoformat()
    )

    return QRGenerateResponse(
        session_id=str(session_id),
        course_id=body.course_id,
        qr_payload=str(session_id)      # frontend encodes this UUID into the QR image
    )


# ── GET /api/qr/active/{courseId} ─────────────────────────────────────────────

@router.get("/active/{courseId}", response_model=QRActiveSessionOut)
def get_active_session(courseId: str, current_user: dict = Depends(get_current_user)):
    session = db.get_active_qr_session(courseId)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session found for this course"
        )
    return QRActiveSessionOut(
        session_id=str(session["session_id"]),
        event_id=str(session["event_id"]),
        is_active=session["is_active"]
    )


# ── POST /api/qr/validate ──────────────────────────────────────────────────────

@router.post("/validate", response_model=QRValidateResponse)
def validate_qr(body: QRValidateRequest, current_user: dict = Depends(get_current_user)):
    # the qr_payload is the session UUID
    try:
        session_uuid = uuid.UUID(body.qr_payload)       # validates it's a proper UUID
    except ValueError:
        return QRValidateResponse(
            valid=False,
            session_id=None,
            course_id=None,
            message="Invalid QR code format"
        )

    # we need to find the session by its UUID
    # since db.get_active_qr_session takes course_id, we query directly
    from db import get_conn
    import psycopg2.extras

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM course_attendance_sessions
                WHERE session_id = %s AND is_active = TRUE
            """, (str(session_uuid),))
            session = cur.fetchone()

    if not session:
        return QRValidateResponse(
            valid=False,
            session_id=None,
            course_id=None,
            message="QR code is invalid or session has expired"
        )

    return QRValidateResponse(
        valid=True,
        session_id=str(session["session_id"]),
        course_id=str(session["event_id"]),
        message="QR code is valid"
    )