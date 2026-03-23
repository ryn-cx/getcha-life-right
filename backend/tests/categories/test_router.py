import uuid

from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config import settings
from tests.utils.category import create_random_category


def test_create_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "Work", "description": "Work-related tasks"}
    response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "owner_id" in content


def test_read_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json={"title": "Read me"},
    )
    category_id = create_response.json()["id"]
    response = client.get(
        f"{settings.API_V1_STR}/categories/{category_id}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == "Read me"
    assert content["id"] == category_id


def test_read_category_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Category not found"


def test_read_category_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_random_category(db)
    response = client.get(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_read_categories(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json={"title": "Cat A"},
    )
    client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json={"title": "Cat B"},
    )
    response = client.get(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert len(content["data"]) >= 2  # noqa: PLR2004


def test_update_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json={"title": "Original"},
    )
    category_id = create_response.json()["id"]
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/categories/{category_id}",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["id"] == category_id


def test_update_category_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Category not found"


def test_update_category_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_random_category(db)
    data = {"title": "Updated title", "description": "Updated description"}
    response = client.put(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=other_user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_delete_category(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    create_response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=user_token_headers,
        json={"title": "Delete me"},
    )
    category_id = create_response.json()["id"]
    response = client.delete(
        f"{settings.API_V1_STR}/categories/{category_id}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["message"] == "Category deleted successfully"


def test_delete_category_not_found(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=user_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Category not found"


def test_delete_category_not_enough_permissions(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    category = create_random_category(db)
    response = client.delete(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=other_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"
