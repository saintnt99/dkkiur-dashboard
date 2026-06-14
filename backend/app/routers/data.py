from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_auth
from ..db import get_db
from ..models import AuditLog, ClimateSeries, Department, Event, Meeting, QualityMetric

router = APIRouter()


def _dept(d: Department) -> dict[str, str]:
    return {"id": d.id, "name": d.name, "short_name": d.short_name}


def _quality(m: QualityMetric, dept: Department) -> dict[str, Any]:
    return {
        "id": m.id,
        "department_id": m.department_id,
        "department": dept.short_name,
        "title": m.title,
        "goal": m.goal,
        "periodicity": m.periodicity,
        "owner": m.owner,
        "comment": m.comment,
        "fact_label": m.fact_label,
        "target_label": m.target_label,
        "latest_period": m.latest_period,
        "latest_fact": m.latest_fact,
        "latest_target": m.latest_target,
        "progress": m.progress,
        "status": m.status,
        "series": m.series or [],
    }


def _event(e: Event, dept: Department) -> dict[str, Any]:
    return {
        "id": e.id,
        "department_id": e.department_id,
        "department": dept.short_name,
        "row_number": e.row_number,
        "number": e.number,
        "priority": e.priority,
        "name": e.name,
        "owner": e.owner,
        "curator": e.curator,
        "moscow_yaroslavl": e.moscow_yaroslavl,
        "electoral_cycle": e.electoral_cycle,
        "deadline": e.deadline,
        "agent": e.agent,
        "status": e.status,
        "raw_status": e.raw_status,
        "traffic": e.traffic,
        "traffic_label": e.traffic_label,
        "budget": e.budget,
        "notes": e.notes,
        "is_high_priority": e.is_high_priority,
        "is_done": e.is_done,
        "is_problem": e.is_problem,
    }


def _climate(c: ClimateSeries, dept: Department) -> dict[str, Any]:
    return {
        "department_id": c.department_id,
        "department": dept.short_name,
        "title": c.title,
        "question": c.question,
        "target": c.target,
        "employee_count": c.employee_count,
        "latest_week": c.latest_week,
        "latest_value": c.latest_value,
        "status": c.status,
        "series": c.series or [],
    }


def _meeting(m: Meeting) -> dict[str, Any]:
    return {
        "id": m.id,
        "source_row": m.source_row,
        "type": m.type,
        "level": m.level,
        "department": m.department,
        "day": m.day,
        "time": m.time,
        "place": m.place,
        "format": m.format,
        "leader": m.leader,
        "leader_phone": m.leader_phone,
        "quality_owner": m.quality_owner,
        "quality_owner_phone": m.quality_owner_phone,
    }


@router.get("/departments")
def list_departments(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, str]]:
    return [_dept(d) for d in db.scalars(select(Department).order_by(Department.id))]


@router.get("/quality")
def list_quality(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, Any]]:
    rows = db.scalars(select(QualityMetric)).all()
    depts = {d.id: d for d in db.scalars(select(Department))}
    return [_quality(m, depts[m.department_id]) for m in rows if m.department_id in depts]


@router.get("/events")
def list_events(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, Any]]:
    rows = db.scalars(select(Event)).all()
    depts = {d.id: d for d in db.scalars(select(Department))}
    return [_event(e, depts[e.department_id]) for e in rows if e.department_id in depts]


@router.get("/morale")
def list_morale(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, Any]]:
    rows = db.scalars(select(ClimateSeries)).all()
    depts = {d.id: d for d in db.scalars(select(Department))}
    return [_climate(c, depts[c.department_id]) for c in rows if c.department_id in depts]


@router.get("/meetings")
def list_meetings(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, Any]]:
    return [_meeting(m) for m in db.scalars(select(Meeting).order_by(Meeting.source_row))]


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: str = Depends(require_auth)) -> dict[str, Any]:
    events = db.scalars(select(Event)).all()
    quality = db.scalars(select(QualityMetric)).all()
    climate = db.scalars(select(ClimateSeries)).all()
    meetings_total = db.query(Meeting).count()
    status_counts = Counter(e.status or "Без статуса" for e in events)
    priority_counts = Counter(e.priority or "Без приоритета" for e in events)
    department_counts = Counter(e.department_id for e in events)
    done = sum(1 for e in events if e.is_done)
    high = [e for e in events if e.is_high_priority]
    high_done = sum(1 for e in high if e.is_done)
    problems = sum(1 for e in events if e.is_problem)
    return {
        "events_total": len(events),
        "events_done": done,
        "events_completion": (done / len(events)) if events else 0,
        "high_priority_total": len(high),
        "high_priority_done": high_done,
        "high_priority_completion": (high_done / len(high)) if high else 0,
        "problem_total": problems,
        "quality_total": len(quality),
        "quality_at_risk": sum(1 for m in quality if m.status == "Ниже цели"),
        "climate_filled_departments": sum(1 for c in climate if c.latest_value is not None),
        "meetings_total": meetings_total,
        "status_counts": dict(status_counts),
        "priority_counts": dict(priority_counts),
        "department_counts": dict(department_counts),
    }


class PatchPayload(BaseModel):
    field: str
    value: str | float | bool | None


def _apply_patch(target: Any, field: str, value: Any, identity: str, entity: str, db: Session) -> dict[str, Any]:
    if not hasattr(target, field):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unknown field {field}")
    old = getattr(target, field)
    setattr(target, field, value)
    db.add(
        AuditLog(
            identity=identity,
            entity=entity,
            entity_id=str(target.id),
            field=field,
            old_value=None if old is None else str(old),
            new_value=None if value is None else str(value),
        )
    )
    db.commit()
    return {"ok": True, "field": field, "old": old, "new": value}


@router.patch("/quality/{metric_id}")
def patch_quality(metric_id: str, payload: PatchPayload, db: Session = Depends(get_db), identity: str = Depends(require_auth)) -> dict[str, Any]:
    metric = db.get(QualityMetric, metric_id)
    if not metric:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "metric not found")
    return _apply_patch(metric, payload.field, payload.value, identity, "quality_metric", db)


@router.patch("/events/{event_id}")
def patch_event(event_id: str, payload: PatchPayload, db: Session = Depends(get_db), identity: str = Depends(require_auth)) -> dict[str, Any]:
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "event not found")
    return _apply_patch(ev, payload.field, payload.value, identity, "event", db)


@router.get("/audit")
def audit(limit: int = 50, db: Session = Depends(get_db), _: str = Depends(require_auth)) -> list[dict[str, Any]]:
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)).all()
    return [
        {
            "id": r.id,
            "at": r.created_at.isoformat() if r.created_at else None,
            "by": r.identity,
            "entity": r.entity,
            "entity_id": r.entity_id,
            "field": r.field,
            "old": r.old_value,
            "new": r.new_value,
        }
        for r in rows
    ]
