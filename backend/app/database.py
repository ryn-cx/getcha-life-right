from importlib import import_module

from sqlmodel import Session, create_engine

from app.config import settings
from app.constants import APP_PATH

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported before initializing DB otherwise, SQLModel
# might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28\
for model_file in APP_PATH.glob("*/models.py"):
    import_module(f"app.{model_file.parent.name}.models")


def init_db(_session: Session) -> None:
    pass
