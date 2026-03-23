import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.tasks.models import TaskBase


# Properties to receive on task creation
class TaskCreate(TaskBase):
    pass


# Properties to receive on task update
class TaskUpdate(TaskBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Properties to return via API, id is always required
class TaskPublic(TaskBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    completed: bool = False
    created_at: datetime | None = None


class TasksPublic(SQLModel):
    data: list[TaskPublic]
    count: int


class TaskCompletionPublic(SQLModel):
    id: uuid.UUID
    task_id: uuid.UUID
    completed_at: datetime


class TaskCompletionUpdate(SQLModel):
    completed_at: datetime


class TaskCompletionWithTask(TaskCompletionPublic):
    task_title: str


class TaskCompletionsPublic(SQLModel):
    data: list[TaskCompletionWithTask]
    count: int
