import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.users.models import User

if TYPE_CHECKING:
    from app.tasks.models import Task


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class CategoryBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=32)


# Database model, database table inferred from class name
class Category(CategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore[call-overload]
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        ondelete="CASCADE",
    )
    owner: User | None = Relationship(back_populates="categories")
    tasks: list[Task] = Relationship(back_populates="category")
