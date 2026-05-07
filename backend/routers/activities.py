from fastapi import APIRouter, Depends
import psycopg2.extras

from db import get_conn
from auth import require_admin

router = APIRouter()

@router.get("/")
def get_activities(current_user: dict = Depends(require_admin)):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT a.event_id, et.event_name, a.activity_date,
                       a.start_time, a.end_time, c.name AS commitee_name
                FROM activities a
                JOIN event_table et ON a.event_id = et.event_id
                JOIN commitee c ON a.commitee_id = c.commitee_id
                ORDER BY a.activity_date DESC
            """)
            rows = cur.fetchall()
    return [dict(r) for r in rows]