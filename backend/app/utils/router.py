from fastapi import APIRouter, status
from pydantic.networks import EmailStr

from app.auth.dependencies import CurrentUser
from app.models import Message
from app.utils import service as email_service

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    status_code=status.HTTP_201_CREATED,
)
def test_email(email_to: EmailStr, current_user: CurrentUser) -> Message:  # noqa: ARG001
    """
    Test emails.
    """
    email_data = email_service.generate_test_email(email_to=email_to)
    email_service.send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
async def health_check() -> bool:
    return True
