from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    short_name: Mapped[str] = mapped_column(String(32))

    quality_metrics: Mapped[list[QualityMetric]] = relationship(back_populates="department", cascade="all, delete-orphan")
    events: Mapped[list[Event]] = relationship(back_populates="department", cascade="all, delete-orphan")
    climate: Mapped[list[ClimateSeries]] = relationship(back_populates="department", cascade="all, delete-orphan")


class QualityMetric(Base):
    __tablename__ = "quality_metrics"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    title: Mapped[str] = mapped_column(Text)
    goal: Mapped[str] = mapped_column(Text, default="")
    periodicity: Mapped[str] = mapped_column(String(255), default="")
    owner: Mapped[str] = mapped_column(Text, default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    fact_label: Mapped[str] = mapped_column(String(255), default="")
    target_label: Mapped[str] = mapped_column(String(255), default="")
    latest_period: Mapped[str] = mapped_column(String(64), default="")
    latest_fact: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    progress: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="Нет данных")
    series: Mapped[list[dict]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    department: Mapped[Department] = relationship(back_populates="quality_metrics")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    row_number: Mapped[int] = mapped_column(Integer)
    number: Mapped[str] = mapped_column(String(32), default="")
    priority: Mapped[str] = mapped_column(String(64), default="")
    name: Mapped[str] = mapped_column(Text)
    owner: Mapped[str] = mapped_column(String(255), default="")
    curator: Mapped[str] = mapped_column(String(255), default="")
    moscow_yaroslavl: Mapped[bool] = mapped_column(Boolean, default=False)
    electoral_cycle: Mapped[bool] = mapped_column(Boolean, default=False)
    deadline: Mapped[str] = mapped_column(String(64), default="")
    agent: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(64), default="")
    raw_status: Mapped[str] = mapped_column(String(64), default="")
    traffic: Mapped[str] = mapped_column(String(8), default="")
    traffic_label: Mapped[str] = mapped_column(String(32), default="")
    budget: Mapped[str] = mapped_column(String(255), default="")
    is_high_priority: Mapped[bool] = mapped_column(Boolean, default=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    is_problem: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    # Поля для журнала отклонений (вводятся вручную в UI)
    week: Mapped[str] = mapped_column(String(32), default="")
    deviation: Mapped[str] = mapped_column(Text, default="")
    root_cause: Mapped[str] = mapped_column(Text, default="")
    countermeasure: Mapped[str] = mapped_column(Text, default="")
    responsible: Mapped[str] = mapped_column(String(255), default="")
    term_weeks: Mapped[str] = mapped_column(String(32), default="")
    status_code: Mapped[int] = mapped_column(Integer, default=0)  # 0=пусто, 1..4=пирожок
    closure_confirm: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    department: Mapped[Department] = relationship(back_populates="events")


class Measure(Base):
    """Журнал отклонений / мероприятий. Отдельная сущность, не связан с Event."""
    __tablename__ = "measures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    task: Mapped[str] = mapped_column(Text, default="")
    week: Mapped[str] = mapped_column(String(32), default="")
    initiator: Mapped[str] = mapped_column(String(255), default="")
    deviation: Mapped[str] = mapped_column(Text, default="")
    root_cause: Mapped[str] = mapped_column(Text, default="")
    countermeasure: Mapped[str] = mapped_column(Text, default="")
    responsible: Mapped[str] = mapped_column(String(255), default="")
    term_weeks: Mapped[str] = mapped_column(String(32), default="")
    status_code: Mapped[int] = mapped_column(Integer, default=0)
    closure_confirm: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class MoraleEntry(Base):
    """Балл морального климата сотрудника за конкретную неделю.

    Сетка сотрудник × неделя. department_id связывает с отделом, но в UI
    показываем единую таблицу управления.
    """
    __tablename__ = "morale_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    employee: Mapped[str] = mapped_column(String(128))
    week: Mapped[str] = mapped_column(String(32))
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ClimateSeries(Base):
    __tablename__ = "climate_series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), unique=True)
    title: Mapped[str] = mapped_column(Text, default="Моральный климат")
    question: Mapped[str] = mapped_column(Text, default="")
    target: Mapped[float] = mapped_column(Float, default=3)
    employee_count: Mapped[int] = mapped_column(Integer, default=0)
    latest_week: Mapped[str] = mapped_column(String(64), default="")
    latest_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="Нет данных")
    series: Mapped[list[dict]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    department: Mapped[Department] = relationship(back_populates="climate")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_row: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(255), default="")
    level: Mapped[str] = mapped_column(String(32), default="")
    department: Mapped[str] = mapped_column(Text, default="")
    day: Mapped[str] = mapped_column(String(32), default="")
    time: Mapped[str] = mapped_column(String(16), default="")
    place: Mapped[str] = mapped_column(String(255), default="")
    format: Mapped[str] = mapped_column(String(255), default="")
    leader: Mapped[str] = mapped_column(String(255), default="")
    leader_phone: Mapped[str] = mapped_column(String(32), default="")
    quality_owner: Mapped[str] = mapped_column(String(255), default="")
    quality_owner_phone: Mapped[str] = mapped_column(String(32), default="")


class ImportLog(Base):
    __tablename__ = "import_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    identity: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(32))  # quality / events / climate / meetings / bootstrap
    department_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255))
    summary: Mapped[dict] = mapped_column(JSON, default=dict)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    identity: Mapped[str] = mapped_column(String(80))
    entity: Mapped[str] = mapped_column(String(32))  # quality_metric / event / climate / meeting
    entity_id: Mapped[str] = mapped_column(String(64))
    field: Mapped[str] = mapped_column(String(64))
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
