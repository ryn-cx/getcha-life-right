import uuid

from sqlmodel import Session

from app.categories.models import Category
from app.categories.schemas import CategoryCreate


def create_category(
    *,
    session: Session,
    category_in: CategoryCreate,
    owner_id: uuid.UUID,
) -> Category:
    db_category = Category.model_validate(category_in, update={"owner_id": owner_id})
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category
