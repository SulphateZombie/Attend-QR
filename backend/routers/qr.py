import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends

import db
from db import get_conn
import psycopg2.extras
from security import get_current_user, require_faculty
from token_util import current_token, verify_token
from models import (QRGenerateRequest, QRGenerateResponse, QRValidateRequest,
                    QRValidateResponse, QRActiveSessionOut, QRRotateResponse)

router = APIRouter()


def _build_payload(session_id: str, token: str) -> str:
    return f"{session_id}:{token}"


def _parse_payload(payload: str):
    """Returns (session_id, token) or raises ValueError."""
    parts = payload.split(":", 1)
    if len(parts) != 2:
        raise ValueError("Bad payload format")
    session_id = str(uuid.UUID(parts[0]))  # validates UUID format
    return session_id, parts[1]


# ── POST /api/qr/generate ──────────────────────────────────────────────────────

@router.post("/generate", response_model=QRGenerateResponse)
def generate_qr(body: QRGenerateRequest, current_user: dict = Depends(require_faculty)):
    existing = db.get_active_qr_session(body.course_id)
    if existing:
        sid = str(existing["session_id"])
        token = current_token(sid)      # compute from time, no DB needed
        return QRGenerateResponse(
            session_id=sid,
            course_id=body.course_id,
            token=token,
            qr_payload=_build_payload(sid, token)
        )

    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    db.create_qr_session(
        session_id=session_id,
        course_id=body.course_id,
        host_id=current_user["id"],
        generated_at=now.isoformat(),
        expires_at=(now + timedelta(hours=2)).isoformat()
    )
    token = current_token(session_id)

    return QRGenerateResponse(
        session_id=session_id,
        course_id=body.course_id,
        token=token,
        qr_payload=_build_payload(session_id, token)
    )


# ── POST /api/qr/rotate/{session_id} ──────────────────────────────────────────
# Called by the faculty frontend every 30 seconds.
# No DB write needed — just recompute the current time-window token.

@router.post("/rotate/{session_id}", response_model=QRRotateResponse)
def rotate_token(session_id: str, current_user: dict = Depends(require_faculty)):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    # Confirm the session is still active in the DB
    session = db.get_active_qr_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already closed")

    token = current_token(session_id)
    return QRRotateResponse(
        token=token,
        qr_payload=_build_payload(session_id, token)
    )


# ── POST /api/qr/end/{session_id} ─────────────────────────────────────────────

@router.post("/end/{session_id}", status_code=200)
def end_session(session_id: str, current_user: dict = Depends(require_faculty)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")
    db.deactivate_qr_session(sid)
    return {"message": "Session ended"}


# ── GET /api/qr/active/{courseId} ─────────────────────────────────────────────

@router.get("/active/{courseId}", response_model=QRActiveSessionOut)
def get_active_session(courseId: str, current_user: dict = Depends(get_current_user)):
    session = db.get_active_qr_session(courseId)
    if not session:
        raise HTTPException(status_code=404, detail="No active session for this course")
    return QRActiveSessionOut(
        session_id=str(session["session_id"]),
        event_id=str(session["event_id"]),
        is_active=session["is_active"]
    )


# ── POST /api/qr/validate ──────────────────────────────────────────────────────

@router.post("/validate", response_model=QRValidateResponse)
def validate_qr(body: QRValidateRequest, current_user: dict = Depends(get_current_user)):
    try:
        session_id, token = _parse_payload(body.qr_payload)
    except ValueError:
        return QRValidateResponse(valid=False, session_id=None,
                                  course_id=None, message="Invalid QR code format")

    # Check session is active in DB
    session = db.get_active_qr_session_by_id(session_id)
    if not session:
        return QRValidateResponse(valid=False, session_id=None,
                                  course_id=None, message="Session not found or closed")

    # Verify token purely in backend — no DB column involved
    if not verify_token(session_id, token):
        return QRValidateResponse(valid=False, session_id=None,
                                  course_id=None, message="QR code has expired, please scan again")

    return QRValidateResponse(
        valid=True,
        session_id=session_id,
        course_id=str(session["event_id"]),
        message="QR code is valid"
    )