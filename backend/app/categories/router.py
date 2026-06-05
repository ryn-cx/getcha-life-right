import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import col, func, select

from app.auth.dependencies import CurrentUser, SessionDep
from app.categories.models import Category
from app.categories.schemas import (
    CategoriesPublic,
    CategoryCreate,
    CategoryPublic,
    CategoryUpdate,
)
from app.schemas import Message

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/")
def read_categories(
    session: SessionDep,
    current_user: CurrentUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1)] = 100_000,
) -> CategoriesPublic:
    """
    Retrieve categories.
    """
    count_statement = (
        select(func.count())
        .select_from(Category)
        .where(Category.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    statement = (
        select(Category)
        .where(Category.owner_id == current_user.id)
        .order_by(col(Category.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    categories = session.exec(statement).all()

    # reportArgumentType - Arguments are automatically converted.
    return CategoriesPublic(data=categories, count=count)  # pyright: ignore[reportArgumentType]


@router.get("/{category_id}", response_model=CategoryPublic)
def read_category(
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
) -> Category:
    """
    Get category by ID.
    """
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    if category.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return category


@router.post("/", response_model=CategoryPublic)
def create_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    category_in: CategoryCreate,
) -> Category:
    """
    Create new category.
    """
    category = Category.model_validate(
        category_in,
        update={"owner_id": current_user.id},
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryPublic)
def update_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
    category_in: CategoryUpdate,
) -> Category:
    """
    Update a category.
    """
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    if category.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    update_dict = category_in.model_dump(exclude_unset=True)
    category.sqlmodel_update(update_dict)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
) -> Message:
    """
    Delete a category.
    """
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    if category.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    session.delete(category)
    session.commit()
    return Message(message="Category deleted successfully")
