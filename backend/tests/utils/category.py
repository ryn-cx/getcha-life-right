from sqlmodel import Session

from app.categories import service as category_service
from app.categories.models import Category
from app.categories.schemas import CategoryCreate
from tests.utils.user import create_random_user
from tests.utils.utils import random_lower_string


def create_random_category(db: Session) -> Category:
    user = create_random_user(db)
    owner_id = user.id
    assert owner_id is not None
    title = random_lower_string()
    description = random_lower_string()
    category_in = CategoryCreate(title=title, description=description)
    return category_service.create_category(
        session=db,
        category_in=category_in,
        owner_id=owner_id,
    )
