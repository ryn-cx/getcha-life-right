from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.auth.security import verify_password
from app.config import settings
from app.users import service as user_service
from app.users.models import User
from app.users.schemas import UserCreate
from tests.utils.utils import random_email, random_lower_string


def test_get_user_me(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=user_token_headers)
    current_user = r.json()
    assert current_user
    assert current_user["is_active"] is True
    assert "email" in current_user


def test_update_user_me(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    full_name = "Updated Name"
    email = random_email()
    data = {"full_name": full_name, "email": email}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=user_token_headers,
        json=data,
    )
    assert r.status_code == status.HTTP_200_OK
    updated_user = r.json()
    assert updated_user["email"] == email
    assert updated_user["full_name"] == full_name


def test_update_user_me_email_exists(
    client: TestClient,
    other_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user_service.create_user(session=db, user_create=user_in)

    data = {"email": username}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me",
        headers=other_user_token_headers,
        json=data,
    )
    assert r.status_code == status.HTTP_409_CONFLICT
    assert r.json()["detail"] == "User with this email already exists"


def test_update_password_me(
    client: TestClient,
    db: Session,
) -> None:
    email = random_email()
    old_password = random_lower_string()
    new_password = random_lower_string()
    user_in = UserCreate(email=email, password=old_password)
    user_service.create_user(session=db, user_create=user_in)

    login_data = {"username": email, "password": old_password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    data = {"current_password": old_password, "new_password": new_password}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=headers,
        json=data,
    )
    assert r.status_code == status.HTTP_200_OK

    user_db = db.exec(select(User).where(User.email == email)).first()
    assert user_db
    verified, _ = verify_password(new_password, user_db.hashed_password)
    assert verified


def test_update_password_me_incorrect_password(
    client: TestClient,
    user_token_headers: dict[str, str],
) -> None:
    data = {"current_password": "wrongpassword12345", "new_password": "newpassword123"}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=user_token_headers,
        json=data,
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert r.json()["detail"] == "Incorrect password"


def test_update_password_me_same_password_error(
    client: TestClient,
    db: Session,
) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user_service.create_user(session=db, user_create=user_in)

    login_data = {"username": email, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    data = {"current_password": password, "new_password": password}
    r = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=headers,
        json=data,
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert r.json()["detail"] == "New password cannot be the same as the current one"


def test_register_user(client: TestClient) -> None:
    username = random_email()
    password = random_lower_string()
    full_name = random_lower_string()
    data = {"email": username, "password": password, "full_name": full_name}
    r = client.post(f"{settings.API_V1_STR}/users/signup", json=data)
    assert r.status_code == status.HTTP_200_OK
    created_user = r.json()
    assert created_user["email"] == username
    assert created_user["full_name"] == full_name


def test_register_user_already_exists_error(
    client: TestClient,
    db: Session,
) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user_service.create_user(session=db, user_create=user_in)

    data = {"email": email, "password": password, "full_name": "Test"}
    r = client.post(f"{settings.API_V1_STR}/users/signup", json=data)
    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert r.json()["detail"] == "The user with this email already exists in the system"


def test_delete_user_me(client: TestClient, db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = user_service.create_user(session=db, user_create=user_in)
    user_id = user.id

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.delete(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["message"] == "User deleted successfully"
    result = db.exec(select(User).where(User.id == user_id)).first()
    assert result is None
