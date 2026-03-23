import calendar
from datetime import datetime, timedelta, timezone

from app.tasks.models import RepeatType, Task

_FEBRUARY = 2


def _increment_months(
    original_datetime: datetime,
    months: int,
    original_day: int | None,
) -> datetime:
    month = original_datetime.month - 1 + months
    year = original_datetime.year + month // 12
    month = month % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    target_day = original_day if original_day is not None else original_datetime.day
    day = min(target_day, max_day)
    return original_datetime.replace(year=year, month=month, day=day)


def _increment_years(
    original_datetime: datetime,
    years: int,
    original_day: int | None,
) -> datetime:
    target_year = original_datetime.year + years
    if original_datetime.month == _FEBRUARY:
        target_day = original_day if original_day is not None else original_datetime.day
        max_day = 29 if calendar.isleap(target_year) else 28
        return original_datetime.replace(year=target_year, day=min(target_day, max_day))
    return original_datetime.replace(year=target_year)


def _increment_date(
    task: Task,
    original_datetime: datetime,
    original_day: int | None,
) -> tuple[datetime, int | None]:
    total_timedelta = timedelta(
        seconds=task.repeat_seconds,
        minutes=task.repeat_minutes,
        hours=task.repeat_hours,
        days=task.repeat_days + task.repeat_weeks * 7,
    )
    result = original_datetime
    if task.repeat_months:
        result = _increment_months(result, task.repeat_months, original_day)
    if task.repeat_years:
        result = _increment_years(result, task.repeat_years, original_day)

    day_after_calendar = result.day
    result = result + total_timedelta

    if result.day != day_after_calendar:
        original_day = result.day

    return result, original_day


def set_task_dates(task: Task) -> None:
    """
    Advance the task's start_date and due_date based on its repeat interval
    and repeat type. Mutates the task in place.

    ON_COMPLETION: Uses the current time to set the start_date and due_date.
    ON_DUE_DATE: Uses the existing start_date and due_date to set the start_date and
    due_date.
    """
    now = datetime.now(timezone.utc)
    is_on_completion = task.repeat_type == RepeatType.ON_COMPLETION

    if task.due_date is not None:
        due_anchor = now if is_on_completion else task.due_date
        task.due_date, task.repeat_original_due_day = _increment_date(
            task,
            due_anchor,
            task.repeat_original_due_day,
        )

    if task.start_date is not None:
        start_anchor = now if is_on_completion else task.start_date
        task.start_date, task.repeat_original_start_day = _increment_date(
            task,
            start_anchor,
            task.repeat_original_start_day,
        )
