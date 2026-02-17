from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
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
    ClientDenpayPeriod,
    ClientFYEndPeriod
)
from datetime import datetime
import sys
import os

# Add auth modules to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from auth_utils import create_invitation, get_current_user_from_token
from app.services.email_service import email_service
from app.services.powerbi_service import create_workspace_for_client

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
    """Get all clients from database with invitation status"""
    try:
        from auth_models import AuthUser, Invitation

        result = await db.execute(select(Client))
        clients = result.scalars().all()

        # Build client list with invitation status
        client_list = []
        for client in clients:
            # Check if there's an accepted user for this client's email
            user_result = await db.execute(
                select(AuthUser).where(AuthUser.email == client.contact_email)
            )
            user_exists = user_result.scalar_one_or_none() is not None

            # Check if there's a pending invitation
            invitation_result = await db.execute(
                select(Invitation).where(
                    Invitation.email == client.contact_email,
                    Invitation.is_used == False,
                    Invitation.role_type == "CLIENT_ADMIN"
                )
            )
            has_pending_invitation = invitation_result.first() is not None

            # Determine status
            if not user_exists and has_pending_invitation:
                client_status = "Pending Invite"
            else:
                client_status = client.status

            client_list.append(
                ClientListItem(
                    id=client.tenant_id,
                    tenant_id=client.tenant_id,
                    legal_trading_name=client.legal_trading_name,
                    workfin_reference=client.workfin_reference,
                    status=client_status,
                    contact_email=client.contact_email,
                    contact_phone=client.contact_phone,
                    client_type=client.client_type,
                    created_at=client.created_at
                )
            )

        return client_list
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
                selectinload(Client.practices),
                selectinload(Client.adjustment_types),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.tenant_id == client_id)
        )
        client = result.scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        return ClientResponse.from_orm(client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client: ClientCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Create a new client with all related data (onboarding form submission)"""
    try:
        # Step 1: Create the client
        new_client = Client(
            # Basic info
            legal_trading_name=client.legal_trading_name,
            workfin_reference=client.workfin_reference,
            contact_email=client.contact_email,
            contact_phone=client.contact_phone,
            contact_first_name=client.admin_user.first_name,
            contact_last_name=client.admin_user.last_name,
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
            tenant_id=new_client.tenant_id,
            line1=client.address.line1,
            line2=client.address.line2,
            city=client.address.city,
            postcode=client.address.postcode,
            country=client.address.country
        )
        db.add(client_address)

        # Step 3: Create admin user
        admin_user = User(
            email=client.admin_user.email,
            name=client.admin_user.name,
            tenant_id=new_client.tenant_id
        )
        db.add(admin_user)
        await db.flush()  # Flush to get user ID

        # Step 4: Assign ClientAdmin role to the admin user
        admin_role = UserRoleAssignment(
            user_id=admin_user.id,
            role="ClientAdmin"
        )
        db.add(admin_role)

        # Step 4.5: Create invitation and send email
        # Extract current user ID from authorization token (required)
        authorization = request.headers.get("authorization")
        try:
            invited_by_user_id = get_current_user_from_token(authorization)
        except Exception as auth_err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(auth_err)}"
            )

        try:
            # Create invitation token with first_name and last_name
            invitation_token = await create_invitation(
                session=db,
                email=client.admin_user.email,
                role_type="CLIENT_ADMIN",
                invited_by_user_id=invited_by_user_id,
                first_name=client.admin_user.first_name,
                last_name=client.admin_user.last_name,
                tenant_id=new_client.tenant_id
            )

            # Send invitation email via SendGrid
            email_sent = await email_service.send_client_invitation(
                to_email=client.admin_user.email,
                first_name=client.admin_user.first_name,
                last_name=client.admin_user.last_name,
                invitation_token=invitation_token,
                client_name=client.legal_trading_name
            )

            pass  # email_sent status logged by email service

        except Exception:
            pass  # Don't fail client creation if email fails

        # Step 5: Create adjustment types (use provided or defaults)
        adjustment_types_to_create = client.adjustment_types if client.adjustment_types else [
            {"name": name} for name in DEFAULT_ADJUSTMENT_TYPES
        ]
        for adj_type_data in adjustment_types_to_create:
            adj_type = ClientAdjustmentType(
                tenant_id=new_client.tenant_id,
                name=adj_type_data.name if hasattr(adj_type_data, 'name') else adj_type_data['name']
            )
            db.add(adj_type)

        # Step 6: Create Denpay periods (if any)
        for period_data in client.denpay_periods or []:
            denpay_period = ClientDenpayPeriod(
                tenant_id=new_client.tenant_id,
                month=period_data.month,
                from_date=period_data.from_date,
                to_date=period_data.to_date
            )
            db.add(denpay_period)

        # Step 7: Create FY End periods (if any)
        for period_data in client.fy_end_periods or []:
            fy_end_period = ClientFYEndPeriod(
                tenant_id=new_client.tenant_id,
                month=period_data.month,
                from_date=period_data.from_date,
                to_date=period_data.to_date
            )
            db.add(fy_end_period)

        # Commit all changes
        await db.commit()

        # Step 8: Create Power BI workspace (only if Power BI is enabled for this client)
        if client.feature_powerbi_enabled:
            from auth_models import AuthUser, UserRole as AuthUserRole, PowerBIWorkspace
            from sqlalchemy import select as sa_select

            # Fetch all WORKFIN_ADMIN user emails — only admins get workspace Admin access
            admin_result = await db.execute(
                sa_select(AuthUser.email)
                .join(AuthUserRole, AuthUserRole.user_id == AuthUser.user_id)
                .where(
                    AuthUserRole.role_type == "WORKFIN_ADMIN",
                    AuthUserRole.is_active == True,
                    AuthUser.is_active == True
                )
            )
            admin_emails = [row[0] for row in admin_result.all()]

            # All other users access reports via embedded tokens with RLS — no workspace membership needed
            powerbi_workspace_guid = await create_workspace_for_client(
                tenant_id=new_client.tenant_id,
                legal_trading_name=new_client.legal_trading_name,
                admin_users=admin_emails,
                other_users=[],
            )

            # Save workspace record to auth.powerbi_workspaces
            workspace_record = PowerBIWorkspace(
                tenant_id=new_client.tenant_id,
                powerbi_workspace_guid=powerbi_workspace_guid,
                workspace_name=f"{new_client.legal_trading_name}_{new_client.tenant_id}",
                is_active=True,
                created_by=invited_by_user_id
            )
            db.add(workspace_record)
            await db.commit()

        # Reload with all relationships
        await db.refresh(new_client)
        result = await db.execute(
            select(Client)
            .options(
                selectinload(Client.address),
                selectinload(Client.users),
                selectinload(Client.practices),
                selectinload(Client.adjustment_types),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.tenant_id == new_client.tenant_id)
        )
        client_with_relations = result.scalar_one()

        return ClientResponse.from_orm(client_with_relations)

    except HTTPException:
        await db.rollback()
        raise
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
                selectinload(Client.practices),
                selectinload(Client.adjustment_types),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.tenant_id == client_id)
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
    except HTTPException:
        raise
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
            select(Client).where(Client.tenant_id == client_id)
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
    except HTTPException:
        raise
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
            select(Client).where(Client.tenant_id == client_id)
        )
        if not client_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )

        # Get users for this client
        result = await db.execute(
            select(User).where(User.tenant_id == client_id)
        )
        users = result.scalars().all()

        return [
            {
                "id": str(user.id),
                "tenant_id": client_id,
                "name": user.name,
                "email": user.email,
                "roles": "Client User",  # TODO: Get actual roles from user_roles table
                "status": "Active",
                "created_at": user.created_at
            }
            for user in users
        ]
    except HTTPException:
        raise
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
            select(Client).where(Client.tenant_id == client_id)
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
            tenant_id=client_id
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return {
            "id": str(new_user.id),
            "tenant_id": client_id,
            "name": new_user.name,
            "email": new_user.email,
            "status": "Active",
            "created_at": new_user.created_at
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.post("/{client_id}/resend-invitation", status_code=status.HTTP_200_OK)
async def resend_invitation(
    client_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Invalidate the existing pending invitation and send a fresh one to the client's contact email."""
    try:
        from auth_models import AuthUser, Invitation

        # Get the client
        result = await db.execute(select(Client).where(Client.tenant_id == client_id))
        client = result.scalar_one_or_none()
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

        # Check client has not already accepted the invitation
        user_result = await db.execute(select(AuthUser).where(AuthUser.email == client.contact_email))
        if user_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client has already accepted the invitation and created an account"
            )

        # Get the current admin sending the resend
        authorization = request.headers.get("authorization")
        try:
            invited_by_user_id = get_current_user_from_token(authorization)
        except Exception as auth_err:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Authentication failed: {str(auth_err)}")

        # Invalidate existing pending invitations for this email
        existing_result = await db.execute(
            select(Invitation).where(
                Invitation.email == client.contact_email,
                Invitation.is_used == False,
                Invitation.role_type == "CLIENT_ADMIN"
            )
        )
        for old_invitation in existing_result.scalars().all():
            old_invitation.is_used = True
        await db.flush()

        # Create a fresh invitation
        new_token = await create_invitation(
            session=db,
            email=client.contact_email,
            role_type="CLIENT_ADMIN",
            invited_by_user_id=invited_by_user_id,
            first_name=client.contact_first_name,
            last_name=client.contact_last_name,
            tenant_id=client.tenant_id
        )

        # Send the email
        await email_service.send_client_invitation(
            to_email=client.contact_email,
            first_name=client.contact_first_name or "",
            last_name=client.contact_last_name or "",
            invitation_token=new_token,
            client_name=client.legal_trading_name
        )

        await db.commit()
        return {"message": f"Invitation resent successfully to {client.contact_email}"}

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend invitation: {str(e)}"
        )


@router.get("/by-tenant/{tenant_id}", response_model=ClientResponse)
async def get_client_by_tenant(tenant_id: str, db: AsyncSession = Depends(get_db)):
    """Look up a client by its 8-digit tenant ID"""
    try:
        result = await db.execute(
            select(Client)
            .options(
                selectinload(Client.address),
                selectinload(Client.users),
                selectinload(Client.adjustment_types),
                selectinload(Client.denpay_periods),
                selectinload(Client.fy_end_periods)
            )
            .where(Client.tenant_id == tenant_id)
        )
        client = result.scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Client with tenant ID '{tenant_id}' not found"
            )

        return ClientResponse.from_orm(client)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
