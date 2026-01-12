from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.xero import XeroConnectionCreate, XeroConnectionResponse, XeroConnectRequest
from datetime import datetime
import uuid

router = APIRouter()

# Mock database
MOCK_XERO_CONNECTIONS = {}


@router.get("/", response_model=List[XeroConnectionResponse])
async def get_xero_connections():
    """Get all Xero connections"""
    return list(MOCK_XERO_CONNECTIONS.values())


@router.get("/{connection_id}", response_model=XeroConnectionResponse)
async def get_xero_connection(connection_id: str):
    """Get a specific Xero connection by ID"""
    if connection_id not in MOCK_XERO_CONNECTIONS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Xero connection not found"
        )
    return MOCK_XERO_CONNECTIONS[connection_id]


@router.post("/connect", response_model=XeroConnectionResponse, status_code=status.HTTP_201_CREATED)
async def connect_to_xero(connection_data: XeroConnectRequest):
    """
    Connect to Xero - initiates OAuth flow
    In a real implementation, this would redirect to Xero's OAuth page
    """
    new_id = str(uuid.uuid4())
    new_connection = {
        "id": new_id,
        "client_id": connection_data.client_id,
        "tenant_id": str(uuid.uuid4()),
        "tenant_name": "Demo Tenant",
        "status": "Active",
        "connected_at": datetime.now(),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_XERO_CONNECTIONS[new_id] = new_connection
    return new_connection


@router.post("/disconnect/{connection_id}", status_code=status.HTTP_200_OK)
async def disconnect_from_xero(connection_id: str):
    """Disconnect from Xero"""
    if connection_id not in MOCK_XERO_CONNECTIONS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Xero connection not found"
        )

    MOCK_XERO_CONNECTIONS[connection_id]["status"] = "Disconnected"
    MOCK_XERO_CONNECTIONS[connection_id]["updated_at"] = datetime.now()
    return {"message": "Successfully disconnected from Xero"}
