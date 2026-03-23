import uuid
from datetime import datetime, timedelta, timezone

from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config import settings
from tests.utils.category import create_random_category
from tests.utils.task import create_random_task


def test_create_task(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "Foo", "description": "Fighters"}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "owner_id" in content
    assert content["category_id"] is None


def test_create_task_without_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "Foo", "description": "Bar"}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["category_id"] is None


def test_create_task_with_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    # Create a category
    category_data = {"title": "Work"}
    category_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json=category_data,
    )
    assert category_response.status_code == status.HTTP_200_OK
    category_id = category_response.json()["id"]

    data = {"title": "Foo", "description": "Bar", "category_id": category_id}
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["category_id"] == category_id


def test_create_task_with_nonexistent_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {
        "title": "Foo",
        "description": "Bar",
        "category_id": str(uuid.uuid4()),
    }
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    content = response.json()
    assert content["detail"] == "Category not found"


def test_create_task_with_other_users_category(
    client: TestClient,
    user_token_headers: dict[str, str],
    db: Session,
) -> None:
    # Create a category owned by a different user
    category = create_random_category(db)
    data = {
        "title": "Foo",
        "description": "Bar",
        "category_id": str(category.id),
    }
    response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Invalid category"


def test_read_task(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json={"title": "Read me", "description": "Test desc"},
    )
    task_id = create_response.json()["id"]
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == "Read me"
    assert content["description"] == "Test desc"
    assert content["id"] == task_id


def test_read_task_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Task not found"


def test_read_task_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    task = create_random_task(db)
    response = client.get(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_read_tasks(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json={"title": "Task A"},
    )
    client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json={"title": "Task B"},
    )
    response = client.get(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert len(content["data"]) >= 2  # noqa: PLR2004


def test_update_task(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json={"title": "Original"},
    )
    task_id = create_response.json()["id"]
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["id"] == task_id


def test_update_task_set_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    task_data = {"title": "Foo"}
    task_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=task_data,
    )
    assert task_response.status_code == status.HTTP_200_OK
    task_id = task_response.json()["id"]

    category_data = {"title": "Work"}
    category_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json=category_data,
    )
    assert category_response.status_code == status.HTTP_200_OK
    category_id = category_response.json()["id"]

    update_data = {"category_id": category_id}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
        json=update_data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["category_id"] == category_id


def test_update_task_with_other_users_category(
    client: TestClient,
    user_token_headers: dict[str, str],
    db: Session,
) -> None:
    task_data = {"title": "Foo"}
    task_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=task_data,
    )
    assert task_response.status_code == status.HTTP_200_OK
    task_id = task_response.json()["id"]

    category = create_random_category(db)
    update_data = {"category_id": str(category.id)}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
        json=update_data,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Invalid category"


def test_update_task_remove_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    category_data = {"title": "Work"}
    category_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json=category_data,
    )
    category_id = category_response.json()["id"]

    task_data = {"title": "Foo", "category_id": category_id}
    task_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=task_data,
    )
    task_id = task_response.json()["id"]

    update_data = {"category_id": None}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
        json=update_data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["category_id"] is None


def test_update_task_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Task not found"


def test_update_task_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    task = create_random_task(db)
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=other_user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_delete_task(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json={"title": "Delete me"},
    )
    task_id = create_response.json()["id"]
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["message"] == "Task deleted successfully"


def test_delete_task_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{uuid.uuid4()}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Task not found"


def test_delete_task_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    task = create_random_task(db)
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/{task.id}",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_complete_task_no_repeat(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "One-off task"}
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    task_id = create_response.json()["id"]
    assert create_response.json()["completed"] is False

    response = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["completed"] is True

    get_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}",
        headers=user_token_headers,
    )
    assert get_response.status_code == status.HTTP_200_OK
    assert get_response.json()["completed"] is True

    completion_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}/completions",
        headers=user_token_headers,
    )
    assert completion_response.status_code == status.HTTP_200_OK
    completions = completion_response.json()
    assert len(completions) == 1
    assert completions[0]["task_id"] == task_id


def test_complete_task_repeat_on_due_date(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    """Completing a task with ON_DUE_DATE repeat should advance dates from due_date."""
    data = {
        "title": "Repeating task",
        "due_date": "2026-03-15T12:00:00Z",
        "start_date": "2026-03-10T12:00:00Z",
        "repeat_type": "on_due_date",
        "repeat_days": 7,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert create_response.status_code == status.HTTP_200_OK
    task_id = create_response.json()["id"]

    response = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["completed"] is False
    assert datetime.fromisoformat(content["due_date"]) == datetime(
        2026,
        3,
        22,
        12,
        0,
        tzinfo=timezone.utc,
    )
    assert datetime.fromisoformat(content["start_date"]) == datetime(
        2026,
        3,
        17,
        12,
        0,
        tzinfo=timezone.utc,
    )

    completion_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}/completions",
        headers=user_token_headers,
    )
    assert completion_response.status_code == status.HTTP_200_OK
    completions = completion_response.json()
    assert len(completions) == 1
    assert completions[0]["task_id"] == task_id


def test_complete_task_repeat_on_completion(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {
        "title": "Repeating task",
        "due_date": "2026-01-01T00:00:00Z",
        "start_date": "2025-12-29T00:00:00Z",
        "repeat_type": "on_completion",
        "repeat_days": 1,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    task_id = create_response.json()["id"]

    response = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["completed"] is False
    now = datetime.now(timezone.utc)
    expected = now + timedelta(days=1)
    new_due = datetime.fromisoformat(content["due_date"])
    assert abs((new_due - expected).total_seconds()) < 1
    new_start = datetime.fromisoformat(content["start_date"])
    assert abs((new_start - expected).total_seconds()) < 1

    completion_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}/completions",
        headers=user_token_headers,
    )
    assert completion_response.status_code == status.HTTP_200_OK
    completions = completion_response.json()
    assert len(completions) == 1
    assert completions[0]["task_id"] == task_id


def test_complete_task_monthly_day_clamping_and_restoration(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {
        "title": "Monthly on 31st",
        "due_date": "2026-01-31T12:00:00Z",
        "start_date": "2026-01-31T09:00:00Z",
        "repeat_type": "on_due_date",
        "repeat_months": 1,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert create_response.status_code == status.HTTP_200_OK
    task_id = create_response.json()["id"]

    response_1 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response_1.status_code == status.HTTP_200_OK
    content_1 = response_1.json()
    assert datetime.fromisoformat(content_1["due_date"]) == datetime(
        2026,
        2,
        28,
        12,
        0,
        tzinfo=timezone.utc,
    )
    assert datetime.fromisoformat(content_1["start_date"]) == datetime(
        2026,
        2,
        28,
        9,
        0,
        tzinfo=timezone.utc,
    )

    response_2 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response_2.status_code == status.HTTP_200_OK
    content_2 = response_2.json()
    assert datetime.fromisoformat(content_2["due_date"]) == datetime(
        2026,
        3,
        31,
        12,
        0,
        tzinfo=timezone.utc,
    )
    assert datetime.fromisoformat(content_2["start_date"]) == datetime(
        2026,
        3,
        31,
        9,
        0,
        tzinfo=timezone.utc,
    )


def test_complete_task_yearly_leap_day(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {
        "title": "Yearly on leap day",
        "due_date": "2028-02-29T12:00:00Z",
        "repeat_type": "on_due_date",
        "repeat_years": 1,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert create_response.status_code == status.HTTP_200_OK
    task_id = create_response.json()["id"]

    response_1 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert datetime.fromisoformat(response_1.json()["due_date"]) == datetime(
        2029,
        2,
        28,
        12,
        0,
        tzinfo=timezone.utc,
    )

    response_2 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert datetime.fromisoformat(response_2.json()["due_date"]) == datetime(
        2030,
        2,
        28,
        12,
        0,
        tzinfo=timezone.utc,
    )

    response_3 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert datetime.fromisoformat(response_3.json()["due_date"]) == datetime(
        2031,
        2,
        28,
        12,
        0,
        tzinfo=timezone.utc,
    )

    response_4 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert datetime.fromisoformat(response_4.json()["due_date"]) == datetime(
        2032,
        2,
        29,
        12,
        0,
        tzinfo=timezone.utc,
    )


def test_complete_task_month_plus_day_overflow(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {
        "title": "Monthly + daily",
        "due_date": "2026-01-31T12:00:00Z",
        "repeat_type": "on_due_date",
        "repeat_months": 1,
        "repeat_days": 1,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=user_token_headers,
        json=data,
    )
    assert create_response.status_code == status.HTTP_200_OK
    task_id = create_response.json()["id"]

    # Complete: Jan 31 + 1 month (→ Feb 28) + 1 day → Mar 1
    response_1 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert response_1.status_code == status.HTTP_200_OK
    assert datetime.fromisoformat(response_1.json()["due_date"]) == datetime(
        2026,
        3,
        1,
        12,
        0,
        tzinfo=timezone.utc,
    )

    # Complete: Mar 1 + 1 month (→ Apr 1) + 1 day → Apr 2
    response_2 = client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=user_token_headers,
    )
    assert datetime.fromisoformat(response_2.json()["due_date"]) == datetime(
        2026,
        4,
        2,
        12,
        0,
        tzinfo=timezone.utc,
    )


def _create_completion(
    client: TestClient,
    headers: dict[str, str],
) -> tuple[str, str]:
    """Create a task and complete it. Returns (task_id, completion_id)."""
    task_response = client.post(
        f"{settings.API_V1_STR}/tasks/",
        headers=headers,
        json={"title": "Task for completion"},
    )
    task_id = task_response.json()["id"]
    client.post(
        f"{settings.API_V1_STR}/tasks/{task_id}/complete",
        headers=headers,
    )
    completions_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}/completions",
        headers=headers,
    )
    completion_id = completions_response.json()[0]["id"]
    return task_id, completion_id


def test_read_all_completions(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    _create_completion(client, user_token_headers)

    response = client.get(
        f"{settings.API_V1_STR}/tasks/completions/all",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["count"] >= 1
    assert len(content["data"]) >= 1
    assert "task_title" in content["data"][0]
    assert "completed_at" in content["data"][0]
    assert "task_id" in content["data"][0]


def test_read_all_completions_not_enough_permissions(
    client: TestClient,
    user_token_headers: dict[str, str],
    other_user_token_headers: dict[str, str],
) -> None:
    _create_completion(client, user_token_headers)

    response = client.get(
        f"{settings.API_V1_STR}/tasks/completions/all",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    # Other user should not see this user's completions
    for completion in response.json()["data"]:
        assert completion["task_title"] != "Task for completion"


def test_delete_completion(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    task_id, completion_id = _create_completion(client, user_token_headers)

    response = client.delete(
        f"{settings.API_V1_STR}/tasks/completions/{completion_id}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Completion deleted successfully"

    # Verify it's gone
    completions_response = client.get(
        f"{settings.API_V1_STR}/tasks/{task_id}/completions",
        headers=user_token_headers,
    )
    assert completions_response.status_code == status.HTTP_200_OK
    completion_ids = [c["id"] for c in completions_response.json()]
    assert completion_id not in completion_ids


def test_delete_completion_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/tasks/completions/{uuid.uuid4()}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Completion not found"


def test_delete_completion_not_enough_permissions(
    client: TestClient,
    user_token_headers: dict[str, str],
    other_user_token_headers: dict[str, str],
) -> None:
    _, completion_id = _create_completion(client, user_token_headers)

    response = client.delete(
        f"{settings.API_V1_STR}/tasks/completions/{completion_id}",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Not enough permissions"


def test_update_completion(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    _, completion_id = _create_completion(client, user_token_headers)

    new_time = "2026-01-15T10:30:00Z"
    response = client.put(
        f"{settings.API_V1_STR}/tasks/completions/{completion_id}",
        headers=user_token_headers,
        json={"completed_at": new_time},
    )
    assert response.status_code == status.HTTP_200_OK
    assert datetime.fromisoformat(response.json()["completed_at"]) == datetime(
        2026,
        1,
        15,
        10,
        30,
        tzinfo=timezone.utc,
    )


def test_update_completion_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.put(
        f"{settings.API_V1_STR}/tasks/completions/{uuid.uuid4()}",
        headers=user_token_headers,
        json={"completed_at": "2026-01-15T10:30:00Z"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Completion not found"


def test_update_completion_not_enough_permissions(
    client: TestClient,
    user_token_headers: dict[str, str],
    other_user_token_headers: dict[str, str],
) -> None:
    _, completion_id = _create_completion(client, user_token_headers)

    response = client.put(
        f"{settings.API_V1_STR}/tasks/completions/{completion_id}",
        headers=other_user_token_headers,
        json={"completed_at": "2026-01-15T10:30:00Z"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["detail"] == "Not enough permissions"
