import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.users.models import User

if TYPE_CHECKING:
    from app.categories.models import Category


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class RepeatType(str, enum.Enum):
    NONE = "none"
    ON_COMPLETION = "on_completion"
    ON_DUE_DATE = "on_due_date"


# Shared properties
class TaskBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    category_id: uuid.UUID | None = None
    start_date: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    due_date: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    repeat_type: RepeatType = RepeatType.NONE
    repeat_seconds: int = 0
    repeat_minutes: int = 0
    repeat_hours: int = 0
    repeat_days: int = 0
    repeat_weeks: int = 0
    repeat_months: int = 0
    repeat_years: int = 0


# Database model, database table inferred from class name
class Task(TaskBase, table=True):
    repeat_original_start_day: int | None = None
    repeat_original_due_day: int | None = None
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    completed: bool = False
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
    )
    category_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="category.id",
        nullable=True,
        ondelete="SET NULL",
    )
    owner: User | None = Relationship(back_populates="tasks")
    category: Optional["Category"] = Relationship(back_populates="tasks")
    completions: list["TaskCompletion"] = Relationship(
        back_populates="task",
        cascade_delete=True,
    )


class TaskCompletion(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    task_id: uuid.UUID = Field(
        foreign_key="task.id",
        nullable=False,
        ondelete="CASCADE",
    )
    completed_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    task: Task | None = Relationship(back_populates="completions")
