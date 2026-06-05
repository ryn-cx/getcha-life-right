import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import col, func, select

from app.auth.dependencies import CurrentUser, SessionDep
from app.categories.models import Category
from app.schemas import Message
from app.tasks.models import RepeatType, Task, TaskCompletion, get_datetime_utc
from app.tasks.recurrence import set_task_dates
from app.tasks.schemas import (
    TaskCompletionPublic,
    TaskCompletionsPublic,
    TaskCompletionUpdate,
    TaskCompletionWithTask,
    TaskCreate,
    TaskPublic,
    TasksPublic,
    TaskUpdate,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

# February in non-leap years has 28 days — the shortest month.
# Days 1-28 exist in every month and never need clamping restoration.
MIN_MONTH_DAYS = 28
FEBRUARY = 2
LEAP_DAY = 29


def _needs_day_restoration(task_in: TaskCreate, date: datetime | None) -> bool:
    """Return True if the given date's day-of-month could be clamped by recurrence."""
    if date is None:
        return False
    return (task_in.repeat_months > 0 and date.day > MIN_MONTH_DAYS) or (
        task_in.repeat_years > 0 and date.month == FEBRUARY and date.day == LEAP_DAY
    )


def _validate_category_ownership(
    session: SessionDep,
    category_id: uuid.UUID | None,
    owner_id: uuid.UUID,
) -> None:
    """Validate that the category belongs to the same owner as the task."""
    if category_id is None:
        return
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category not found",
        )
    if category.owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid category",
        )


@router.get("/")
def read_tasks(
    session: SessionDep,
    current_user: CurrentUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1)] = 100_000,
) -> TasksPublic:
    """
    Retrieve tasks.
    """

    count_statement = (
        select(func.count()).select_from(Task).where(Task.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(Task)
        .where(Task.owner_id == current_user.id)
        .order_by(col(Task.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    tasks = session.exec(statement).all()

    # reportArgumentType - Arguements are automatically converted.
    return TasksPublic(data=tasks, count=count)  # pyright: ignore[reportArgumentType]


@router.get("/completions/all")
def read_all_completions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1)] = 100_000,
) -> TaskCompletionsPublic:
    """
    Retrieve all task completions for the current user.
    """
    base = (
        select(TaskCompletion)
        .join(Task, TaskCompletion.task_id == Task.id)  # type: ignore[arg-type]
        .where(Task.owner_id == current_user.id)
    )

    count = session.exec(
        select(func.count()).select_from(base.subquery()),
    ).one()

    completions = session.exec(
        base.order_by(col(TaskCompletion.completed_at).desc())
        .offset(skip)
        .limit(limit),
    ).all()

    data = [
        TaskCompletionWithTask(
            id=c.id,
            task_id=c.task_id,
            completed_at=c.completed_at,
            task_title=c.task.title if c.task else "Deleted task",
        )
        for c in completions
    ]

    return TaskCompletionsPublic(data=data, count=count)


@router.delete("/completions/{completion_id}")
def delete_completion(
    session: SessionDep,
    current_user: CurrentUser,
    completion_id: uuid.UUID,
) -> Message:
    """
    Delete a task completion record.
    """
    completion = session.get(TaskCompletion, completion_id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Completion not found",
        )
    task = session.get(Task, completion.task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    session.delete(completion)
    session.commit()
    return Message(message="Completion deleted successfully")


@router.put("/completions/{completion_id}", response_model=TaskCompletionPublic)
def update_completion(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    completion_id: uuid.UUID,
    completion_in: TaskCompletionUpdate,
) -> TaskCompletion:
    """
    Update a task completion record.
    """
    completion = session.get(TaskCompletion, completion_id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Completion not found",
        )
    task = session.get(Task, completion.task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    completion.completed_at = completion_in.completed_at
    session.add(completion)
    session.commit()
    session.refresh(completion)
    return completion


@router.get("/{task_id}", response_model=TaskPublic)
def read_task(
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Task:
    """
    Get task by ID.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return task


@router.post("/", response_model=TaskPublic)
def create_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_in: TaskCreate,
) -> Task:
    """
    Create new task.
    """
    _validate_category_ownership(session, task_in.category_id, current_user.id)
    updates: dict[str, object] = {"owner_id": current_user.id}
    # Auto-set original days for monthly/yearly recurrence, but only when the
    # day could be clamped (>28 for monthly, Feb 29 for yearly).  Days 1-28
    # exist in every month so they never need restoration.
    if _needs_day_restoration(task_in, task_in.start_date):
        updates["repeat_original_start_day"] = task_in.start_date.day  # type: ignore[union-attr]
    if _needs_day_restoration(task_in, task_in.due_date):
        updates["repeat_original_due_day"] = task_in.due_date.day  # type: ignore[union-attr]
    task = Task.model_validate(task_in, update=updates)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskPublic)
def update_task(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
    task_in: TaskUpdate,
) -> Task:
    """
    Update a task.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    update_dict = task_in.model_dump(exclude_unset=True)
    if "category_id" in update_dict:
        _validate_category_ownership(session, update_dict["category_id"], task.owner_id)
    task.sqlmodel_update(update_dict)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskPublic)
def complete_task(
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Task:
    """
    Complete a task. If the task repeats, advance its dates accordingly.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    now = get_datetime_utc()

    # Record the completion
    completion = TaskCompletion(task_id=task.id, completed_at=now)
    session.add(completion)

    if task.repeat_type == RepeatType.NONE:
        task.completed = True
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    set_task_dates(task)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.get("/{task_id}/completions", response_model=list[TaskCompletionPublic])
def read_task_completions(
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Sequence[TaskCompletion]:
    """
    Get completion history for a task.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    statement = (
        select(TaskCompletion)
        .where(TaskCompletion.task_id == task_id)
        .order_by(col(TaskCompletion.completed_at).desc())
    )
    return session.exec(statement).all()  # pyright: ignore[reportReturnType]


@router.delete("/{task_id}")
def delete_task(
    session: SessionDep,
    current_user: CurrentUser,
    task_id: uuid.UUID,
) -> Message:
    """
    Delete a task.
    """
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    if task.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    session.delete(task)
    session.commit()
    return Message(message="Task deleted successfully")
