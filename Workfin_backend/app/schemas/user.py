from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str


class UserCreate(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None


class UserInDB(UserBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(UserInDB):
    pass


class ClientUserBase(BaseModel):
    name: str
    email: EmailStr
    roles: str


class ClientUserCreate(ClientUserBase):
    client_id: str


class ClientUserResponse(ClientUserBase):
    id: str
    client_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
