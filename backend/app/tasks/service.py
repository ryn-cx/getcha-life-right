import uuid

from sqlmodel import Session

from app.tasks.models import Task
from app.tasks.schemas import TaskCreate


def create_task(*, session: Session, task_in: TaskCreate, owner_id: uuid.UUID) -> Task:
    db_task = Task.model_validate(task_in, update={"owner_id": owner_id})
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task
