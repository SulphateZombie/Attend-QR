import uuid
from fastapi import APIRouter, HTTPException, status, Depends

import db
from auth import create_access_token, get_current_user
from models import RegisterRequest, LoginRequest, LoginResponse, UserOut

router = APIRouter()


# ── POST /api/auth/register ────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    # check if email already exists
    existing = db.get_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    user_id = str(uuid.uuid4())
    db.create_user(
        user_id=user_id,
        name=body.name,
        email=body.email,
        phone_no=body.phone_no,
        password=body.password,
        role=body.role
    )

    return {"message": "User registered successfully", "user_id": user_id}


# ── POST /api/auth/login ───────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = db.get_user_by_email(body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not db.verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(data={"sub": user["id"]})

    return LoginResponse(
        token=token,
        user=UserOut(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            type=user["type"],
            phone_no=user["phone_no"]
        )
    )


# ── GET /api/auth/me ───────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        type=current_user["type"],
        phone_no=current_user["phone_no"]
    )