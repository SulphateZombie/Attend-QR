from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, courses, slots, qr, attendance, enrollment, reports, admin, activities

app = FastAPI(
    title="QR Attendance System",
    version="1.0.0"
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(courses.router,    prefix="/api/courses",    tags=["Courses"])
app.include_router(slots.router,      prefix="/api/slots",      tags=["Slots"])
app.include_router(qr.router,         prefix="/api/qr",         tags=["QR Sessions"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(enrollment.router, prefix="/api/enrollment", tags=["Enrollment"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["Reports"])
app.include_router(admin.router,      prefix="/api/admin",      tags=["Admin"])
app.include_router(activities.router, prefix="/api/activities", tags=["Activities"])

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "QR Attendance API is running"}