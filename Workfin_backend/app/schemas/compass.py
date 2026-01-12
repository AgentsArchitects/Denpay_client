from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


class CompassDateBase(BaseModel):
    month: str
    schedule_period: str
    adjustment_last_day: date
    processing_cut_off_date: date
    pay_statement_available: date
    pay_date: date


class CompassDateCreate(CompassDateBase):
    pass


class CompassDateUpdate(CompassDateBase):
    pass


class CompassDateInDB(CompassDateBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompassDateResponse(CompassDateInDB):
    pass
