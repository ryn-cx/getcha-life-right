import random
import string

from fastapi.testclient import TestClient
from sqlmodel import Session


def random_lower_string() -> str:
    # S311 - This does not need to be cryptographically secure.
    return "".join(random.choices(string.ascii_lowercase, k=32))  # noqa: S311


def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"


def get_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    from tests.utils.user import authentication_token_from_email  # noqa: PLC0415

    return authentication_token_from_email(
        client=client,
        email="test-primary@example.com",
        db=db,
    )
