import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.categories.models import CategoryBase


# Properties to receive on category creation
class CategoryCreate(CategoryBase):
    pass


# Properties to receive on category update
class CategoryUpdate(CategoryBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Properties to return via API, id is always required
class CategoryPublic(CategoryBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class CategoriesPublic(SQLModel):
    data: list[CategoryPublic]
    count: int
