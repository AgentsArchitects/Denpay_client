from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class XeroConnectionBase(BaseModel):
    client_id: str
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None


class XeroConnectionCreate(XeroConnectionBase):
    pass


class XeroConnectionInDB(XeroConnectionBase):
    id: str
    status: str
    connected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class XeroConnectionResponse(XeroConnectionInDB):
    pass


class XeroConnectRequest(BaseModel):
    client_id: str
    authorization_code: str
