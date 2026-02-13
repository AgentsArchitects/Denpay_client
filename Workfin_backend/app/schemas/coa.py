from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CoACategoryBase(BaseModel):
    coa_name: str
    category_number: str
    values: Optional[str] = None


class CoACategoryCreate(CoACategoryBase):
    pass


class CoACategoryUpdate(CoACategoryBase):
    pass


class CoACategoryInDB(CoACategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CoACategoryResponse(CoACategoryInDB):
    pass
