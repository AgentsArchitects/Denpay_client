from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListItem
)
from app.db.database import get_db
from app.db.models import (
    Client,
    ClientAddress,
    User,
    UserRoleAssignment,
    ClientAdjustmentType,
    ClientPMSIntegration,
    ClientDenpayPeriod,
    ClientFYEndPeriod
)
from datetime import datetime
import uuid

router = APIRouter()


# Default adjustment types to create for new clients
DEFAULT_ADJUSTMENT_TYPES = [
    'Mentoring Fee',
    'Retainer Fee',
    'Therapist - Invoice',
    'Locum - Days',
    'Reconciliation Adjustment',
    'Payment on Account',
    'Previous Period Payment',
    'Training and Other'
]


@router.get("/", response_model=List[ClientListItem])
async def get_clients(db: AsyncSession = Depends(get_db)):
    """Get all clients from database"""
    try:
        result = await db.execute(select(Client))
        clients = result.scalars().all()

        return [
            ClientListItem(
                id=client.id,
                legal_trading_name=client.legal_trading_name,
                workfin_reference=client.workfin_reference,
                status=client.status,
                contact_email=client.contact_email,
                contact_phone=client.contact_phone,
                client_type=client.client_type,
                created_at=client.created_at
            )
            for client in clients
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific client by ID with all related data"""
    try:
        # Load client with all relationships
        result = await db.execute(
            select(Client)
            .options(
                selectinload(Client.address),
                selectinload(Client.users),
                selectinload(Client.adjustment_types),
                selectinload(Client.pms_integrations),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.id == uuid.UUID(client_id))
        )
        client = result.scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        return ClientResponse.from_orm(client)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(client: ClientCreate, db: AsyncSession = Depends(get_db)):
    """Create a new client with all related data (onboarding form submission)"""
    try:
        # Step 1: Create the client
        new_client = Client(
            # Basic info
            legal_trading_name=client.legal_trading_name,
            workfin_reference=client.workfin_reference,
            contact_email=client.contact_email,
            contact_phone=client.contact_phone,
            status="Active",

            # Branding (Tab 1)
            expanded_logo_url=client.expanded_logo_url,
            logo_url=client.logo_url,
            client_type=client.client_type,
            company_registration_no=client.company_registration_no,
            xero_vat_tax_type=client.xero_vat_tax_type,

            # License info (Tab 3)
            accounting_system=client.accounting_system,
            xero_app=client.xero_app,
            license_workfin_users=client.license_workfin_users or 0,
            license_compass_connections=client.license_compass_connections or 0,
            license_finance_system_connections=client.license_finance_system_connections or 0,
            license_pms_connections=client.license_pms_connections or 0,
            license_purchasing_system_connections=client.license_purchasing_system_connections or 0,

            # Accountant details (Tab 4)
            accountant_name=client.accountant_name,
            accountant_address=client.accountant_address,
            accountant_contact_no=client.accountant_contact_no,
            accountant_email=client.accountant_email,

            # IT Provider details (Tab 5)
            it_provider_name=client.it_provider_name,
            it_provider_address=client.it_provider_address,
            it_provider_postcode=client.it_provider_postcode,
            it_provider_contact_name=client.it_provider_contact_name,
            it_provider_phone_1=client.it_provider_phone_1,
            it_provider_phone_2=client.it_provider_phone_2,
            it_provider_email=client.it_provider_email,
            it_provider_notes=client.it_provider_notes,

            # Feature access (Tab 10)
            feature_clinician_pay_enabled=client.feature_clinician_pay_enabled,
            feature_powerbi_enabled=client.feature_powerbi_enabled
        )
        db.add(new_client)
        await db.flush()  # Flush to get the client ID

        # Step 2: Create client address
        client_address = ClientAddress(
            client_id=new_client.id,
            line1=client.address.line1,
            line2=client.address.line2,
            city=client.address.city,
            county=client.address.county,
            postcode=client.address.postcode,
            country=client.address.country
        )
        db.add(client_address)

        # Step 3: Create admin user
        admin_user = User(
            email=client.admin_user.email,
            name=client.admin_user.name,
            client_id=new_client.id
        )
        db.add(admin_user)
        await db.flush()  # Flush to get user ID

        # Step 4: Assign ClientAdmin role to the admin user
        admin_role = UserRoleAssignment(
            user_id=admin_user.id,
            role="ClientAdmin"
        )
        db.add(admin_role)

        # Step 5: Create adjustment types (use provided or defaults)
        adjustment_types_to_create = client.adjustment_types if client.adjustment_types else [
            {"name": name} for name in DEFAULT_ADJUSTMENT_TYPES
        ]
        for adj_type_data in adjustment_types_to_create:
            adj_type = ClientAdjustmentType(
                client_id=new_client.id,
                name=adj_type_data.name if hasattr(adj_type_data, 'name') else adj_type_data['name']
            )
            db.add(adj_type)

        # Step 6: Create PMS integrations (if any)
        for pms_data in client.pms_integrations or []:
            pms_integration = ClientPMSIntegration(
                client_id=new_client.id,
                pms_type=pms_data.pms_type,
                integration_config=pms_data.integration_config,
                status=pms_data.status or "Active"
            )
            db.add(pms_integration)

        # Step 7: Create Denpay periods (if any)
        for period_data in client.denpay_periods or []:
            denpay_period = ClientDenpayPeriod(
                client_id=new_client.id,
                month=period_data.month,
                from_date=period_data.from_date,
                to_date=period_data.to_date
            )
            db.add(denpay_period)

        # Step 8: Create FY End periods (if any)
        for period_data in client.fy_end_periods or []:
            fy_end_period = ClientFYEndPeriod(
                client_id=new_client.id,
                month=period_data.month,
                from_date=period_data.from_date,
                to_date=period_data.to_date
            )
            db.add(fy_end_period)

        # Commit all changes
        await db.commit()

        # Reload with all relationships
        await db.refresh(new_client)
        result = await db.execute(
            select(Client)
            .options(
                selectinload(Client.address),
                selectinload(Client.users),
                selectinload(Client.adjustment_types),
                selectinload(Client.pms_integrations),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.id == new_client.id)
        )
        client_with_relations = result.scalar_one()

        return ClientResponse.from_orm(client_with_relations)

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create client: {str(e)}"
        )


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, client: ClientUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing client"""
    try:
        # Load client with all relationships
        result = await db.execute(
            select(Client)
            .options(
                selectinload(Client.address),
                selectinload(Client.users),
                selectinload(Client.adjustment_types),
                selectinload(Client.pms_integrations),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.id == uuid.UUID(client_id))
        )
        existing_client = result.scalar_one_or_none()

        if not existing_client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Update client fields - only update if value is provided
        update_data = client.dict(exclude_unset=True)

        for field, value in update_data.items():
            if field == 'legal_trading_name':
                existing_client.legal_trading_name = value
            elif field == 'workfin_reference':
                existing_client.workfin_reference = value
            elif field == 'contact_email':
                existing_client.contact_email = value
            elif field == 'contact_phone':
                existing_client.contact_phone = value
            elif field == 'client_type':
                existing_client.client_type = value
            elif field == 'company_registration_no':
                existing_client.company_registration_no = value
            elif field == 'xero_vat_tax_type':
                existing_client.xero_vat_tax_type = value
            elif field == 'expanded_logo_url':
                existing_client.expanded_logo_url = value
            elif field == 'logo_url':
                existing_client.logo_url = value
            elif field == 'accounting_system':
                existing_client.accounting_system = value
            elif field == 'xero_app':
                existing_client.xero_app = value
            elif field == 'license_workfin_users':
                existing_client.license_workfin_users = value
            elif field == 'license_compass_connections':
                existing_client.license_compass_connections = value
            elif field == 'license_finance_system_connections':
                existing_client.license_finance_system_connections = value
            elif field == 'license_pms_connections':
                existing_client.license_pms_connections = value
            elif field == 'license_purchasing_system_connections':
                existing_client.license_purchasing_system_connections = value
            elif field == 'accountant_name':
                existing_client.accountant_name = value
            elif field == 'accountant_address':
                existing_client.accountant_address = value
            elif field == 'accountant_contact_no':
                existing_client.accountant_contact_no = value
            elif field == 'accountant_email':
                existing_client.accountant_email = value
            elif field == 'it_provider_name':
                existing_client.it_provider_name = value
            elif field == 'it_provider_address':
                existing_client.it_provider_address = value
            elif field == 'it_provider_postcode':
                existing_client.it_provider_postcode = value
            elif field == 'it_provider_contact_name':
                existing_client.it_provider_contact_name = value
            elif field == 'it_provider_phone_1':
                existing_client.it_provider_phone_1 = value
            elif field == 'it_provider_phone_2':
                existing_client.it_provider_phone_2 = value
            elif field == 'it_provider_email':
                existing_client.it_provider_email = value
            elif field == 'it_provider_notes':
                existing_client.it_provider_notes = value
            elif field == 'feature_clinician_pay_enabled':
                existing_client.feature_clinician_pay_enabled = value
            elif field == 'feature_powerbi_enabled':
                existing_client.feature_powerbi_enabled = value

        await db.commit()
        await db.refresh(existing_client)

        return ClientResponse.from_orm(existing_client)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update client: {str(e)}"
        )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle client status between Active and Inactive (soft delete/restore)"""
    try:
        result = await db.execute(
            select(Client).where(Client.id == uuid.UUID(client_id))
        )
        client = result.scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Toggle status: Active <-> Inactive
        client.status = "Inactive" if client.status == "Active" else "Active"
        await db.commit()
        return None
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change client status: {str(e)}"
        )


@router.get("/{client_id}/users")
async def get_client_users(client_id: str, db: AsyncSession = Depends(get_db)):
    """Get all users for a specific client"""
    try:
        # Verify client exists
        client_result = await db.execute(
            select(Client).where(Client.id == uuid.UUID(client_id))
        )
        if not client_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Get users for this client
        result = await db.execute(
            select(User).where(User.client_id == uuid.UUID(client_id))
        )
        users = result.scalars().all()

        return [
            {
                "id": str(user.id),
                "client_id": client_id,
                "name": user.name,
                "email": user.email,
                "roles": "Client User",  # TODO: Get actual roles from user_roles table
                "status": "Active",
                "created_at": user.created_at
            }
            for user in users
        ]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/{client_id}/users", status_code=status.HTTP_201_CREATED)
async def create_client_user(client_id: str, user_data: dict, db: AsyncSession = Depends(get_db)):
    """Create a new user for a client"""
    try:
        # Verify client exists
        client_result = await db.execute(
            select(Client).where(Client.id == uuid.UUID(client_id))
        )
        if not client_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Create user
        new_user = User(
            email=user_data.get("email"),
            name=user_data.get("name"),
            client_id=uuid.UUID(client_id)
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return {
            "id": str(new_user.id),
            "client_id": client_id,
            "name": new_user.name,
            "email": new_user.email,
            "status": "Active",
            "created_at": new_user.created_at
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
