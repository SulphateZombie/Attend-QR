import uuid
from fastapi import APIRouter, HTTPException, status, Depends
import psycopg2.extras

import db
from auth import require_admin
from models import ActivityCreate, ActivityOut

router = APIRouter()


@router.get("/", response_model=list[ActivityOut])
def get_activities(current_user: dict = Depends(require_admin)):
    rows = db.get_all_activities()
    return [dict(r) for r in rows]


@router.get("/commitees")
def get_all_commitees(current_user: dict = Depends(require_admin)):
    return db.get_all_commitees()


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ActivityOut)
def create_activity(body: ActivityCreate, current_user: dict = Depends(require_admin)):
    event_id = str(uuid.uuid4())[:15]

    db.create_activity(
        event_id=event_id,
        event_name=body.event_name,
        building_name=body.building_name,
        room_id=body.room_id,
        activity_date=str(body.activity_date),
        start_time=str(body.start_time),
        end_time=str(body.end_time),
        commitee_id=body.commitee_id,
    )

    activity = db.get_activity_by_id(event_id)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Activity created but could not be retrieved",
        )
    return dict(activity)


@router.delete("/{activityId}", status_code=status.HTTP_200_OK)
def delete_activity(activityId: str, current_user: dict = Depends(require_admin)):
    activity = db.get_activity_by_id(activityId)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete_activity(activityId)
    return {"detail": "Activity deleted"}


@router.get("/{activityId}/members")
def get_activity_members(activityId: str, current_user: dict = Depends(require_admin)):
    return db.get_activity_members(activityId)


@router.delete("/{activityId}/members/{memberId}")
def remove_activity_member(activityId: str, memberId: str, current_user: dict = Depends(require_admin)):
    db.remove_activity_member(activityId, memberId)
    return {"detail": "Member removed"}


@router.delete("/{activityId}/volunteers/{volunteerId}")
def remove_activity_volunteer(activityId: str, volunteerId: str, current_user: dict = Depends(require_admin)):
    db.remove_activity_volunteer(activityId, volunteerId)
    return {"detail": "Volunteer removed"}
