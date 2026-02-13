"""
Xero API Endpoints
Handles OAuth 2.0 flow and data synchronization with Xero
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query, Path
from fastapi.responses import RedirectResponse
from typing import List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from sqlalchemy.dialects.postgresql import insert
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import re


def parse_xero_date(xero_date: Any) -> Optional[date]:
    """
    Parse Xero date format /Date(timestamp+0000)/ to Python date.

    Xero returns dates in the format: /Date(1719964800000+0000)/
    where the number is milliseconds since Unix epoch.
    """
    if xero_date is None:
        return None

    if isinstance(xero_date, (date, datetime)):
        return xero_date if isinstance(xero_date, date) else xero_date.date()

    if isinstance(xero_date, str):
        # Match /Date(timestamp+0000)/ or /Date(timestamp-0000)/
        match = re.match(r'/Date\((\d+)([+-]\d{4})?\)/', xero_date)
        if match:
            timestamp_ms = int(match.group(1))
            # Convert milliseconds to seconds and create datetime
            return datetime.fromtimestamp(timestamp_ms / 1000).date()

        # Try to parse as ISO date string (YYYY-MM-DD)
        try:
            return datetime.strptime(xero_date[:10], '%Y-%m-%d').date()
        except (ValueError, IndexError):
            pass

    return None


def parse_xero_datetime(xero_datetime: Any) -> Optional[datetime]:
    """
    Parse Xero datetime format /Date(timestamp+0000)/ to Python datetime.
    """
    if xero_datetime is None:
        return None

    if isinstance(xero_datetime, datetime):
        return xero_datetime

    if isinstance(xero_datetime, str):
        # Match /Date(timestamp+0000)/ or /Date(timestamp-0000)/
        match = re.match(r'/Date\((\d+)([+-]\d{4})?\)/', xero_datetime)
        if match:
            timestamp_ms = int(match.group(1))
            return datetime.fromtimestamp(timestamp_ms / 1000)

        # Try to parse as ISO datetime string
        try:
            return datetime.fromisoformat(xero_datetime.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            pass

    return None

from app.schemas.xero import (
    XeroConnectionResponse,
    XeroConnectRequest,
    XeroTenant,
    XeroSyncResponse,
    XeroSyncStatus
)
from app.db.database import get_db
from app.db.models import XeroConnection, Client
from app.db.pms_models import PMSConnection
from app.db.xero_models import (
    XeroToken,
    XeroAccount,
    XeroContact,
    XeroContactGroup,
    XeroInvoice,
    XeroCreditNote,
    XeroPayment,
    XeroBankTransaction,
    XeroBankTransfer,
    XeroJournal,
    XeroJournalLine,
    generate_integration_id
)
from app.services.xero_service import xero_service

router = APIRouter()


async def _get_tenant_info(db: AsyncSession, tenant_id: str) -> dict:
    """Look up tenant_name and integration_id from the tokens table for a given tenant_id."""
    result = await db.execute(
        select(XeroToken.tenant_name, XeroToken.integration_id).where(XeroToken.tenant_id == tenant_id).limit(1)
    )
    row = result.first()
    if row:
        return {"tenant_name": row[0], "integration_id": row[1]}
    return {"tenant_name": None, "integration_id": None}


# ==================
# OAuth Flow
# ==================

@router.get("/authorize/")
async def authorize_xero(client_id: Optional[str] = None):
    """
    Step 1: Redirect user to Xero login page
    Returns the authorization URL for the frontend to redirect to
    """
    state = client_id or "default"
    auth_url = xero_service.get_authorization_url(state=state)
    return {"authorization_url": auth_url}


@router.get("/callback/")
async def xero_callback(
    code: str = Query(..., description="Authorization code from Xero"),
    state: str = Query(default="default", description="State parameter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle OAuth callback from Xero
    Exchange authorization code for tokens
    """
    # state contains the 8-char tenant_id of the client (or "default")
    client_tenant_id = state if state != "default" else None

    try:
        # Exchange code for tokens - this is the critical step
        tokens = await xero_service.exchange_code_for_tokens(code)

        # Get connected tenants
        tenants = await xero_service.get_tenants()

        # Get client name if we have a client_tenant_id
        client_tenant_name = None
        if client_tenant_id:
            client_result = await db.execute(
                select(Client).where(Client.tenant_id == client_tenant_id)
            )
            client = client_result.scalars().first()
            if client:
                client_tenant_name = client.legal_trading_name

        # Try to store tokens in database, but don't fail if DB has issues
        # The tokens are already stored in memory by exchange_code_for_tokens
        try:
            for tenant in tenants:
                integration_id = generate_integration_id()

                # Save to xero.tokens table
                token_record = XeroToken(
                    tenant_id=tenant["tenantId"],  # Xero's UUID tenant ID
                    tenant_name=tenant.get("tenantName"),
                    integration_id=integration_id,
                    access_token=tokens["access_token"],
                    refresh_token=tokens["refresh_token"],
                    expires_at=tokens["expires_at"],
                    token_type=tokens.get("token_type", "Bearer"),
                    scope=tokens.get("scope")
                )

                # Upsert token into xero.tokens
                stmt = insert(XeroToken).values(
                    tenant_id=token_record.tenant_id,
                    tenant_name=token_record.tenant_name,
                    integration_id=token_record.integration_id,
                    access_token=token_record.access_token,
                    refresh_token=token_record.refresh_token,
                    expires_at=token_record.expires_at,
                    token_type=token_record.token_type,
                    scope=token_record.scope
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=["tenant_id"],
                    set_={
                        "tenant_name": token_record.tenant_name,
                        "integration_id": token_record.integration_id,
                        "access_token": token_record.access_token,
                        "refresh_token": token_record.refresh_token,
                        "expires_at": token_record.expires_at,
                        "updated_at": datetime.now()
                    }
                )
                await db.execute(stmt)

                # Also save to denpay-dev.xero_connections (links Xero to our tenant_id)
                if client_tenant_id:
                    xero_tenant_name = tenant.get("tenantName") or "Unknown"

                    # Check if a connection already exists for this client + Xero org name
                    existing = await db.execute(
                        select(XeroConnection).where(
                            XeroConnection.tenant_id == client_tenant_id,
                            XeroConnection.xero_tenant_name == xero_tenant_name
                        )
                    )
                    existing_conn = existing.scalars().first()

                    if existing_conn:
                        # Update existing connection
                        existing_conn.access_token = tokens["access_token"]
                        existing_conn.refresh_token = tokens["refresh_token"]
                        existing_conn.token_expires_at = tokens["expires_at"]
                        existing_conn.status = "CONNECTED"
                        existing_conn.connected_at = datetime.now()
                        existing_conn.updated_at = datetime.now()

                        # Also update pms_connections
                        pms_existing = await db.execute(
                            select(PMSConnection).where(
                                PMSConnection.integration_id == existing_conn.xero_tenant_id
                            )
                        )
                        pms_conn = pms_existing.scalars().first()
                        if pms_conn:
                            pms_conn.connection_status = "CONNECTED"
                            pms_conn.last_sync_at = datetime.now()
                            pms_conn.updated_at = datetime.now()
                    else:
                        # Insert new connection (xero_tenant_id auto-generated as 8-char alphanumeric)
                        new_xero_conn = XeroConnection(
                            xero_tenant_name=xero_tenant_name,
                            access_token=tokens["access_token"],
                            refresh_token=tokens["refresh_token"],
                            token_expires_at=tokens["expires_at"],
                            status="CONNECTED",
                            connected_at=datetime.now(),
                            tenant_id=client_tenant_id
                        )
                        db.add(new_xero_conn)
                        await db.flush()  # Get the auto-generated xero_tenant_id

                        # Also create entry in pms_connections
                        new_pms_conn = PMSConnection(
                            tenant_id=client_tenant_id,
                            tenant_name=client_tenant_name,
                            integration_type="XERO",
                            integration_id=new_xero_conn.xero_tenant_id,
                            integration_name=f"Xero - {xero_tenant_name}",
                            xero_tenant_name=xero_tenant_name,
                            connection_status="CONNECTED",
                            last_sync_at=datetime.now()
                        )
                        db.add(new_pms_conn)

            await db.commit()
        except Exception as db_error:
            # Log DB error but don't fail - tokens are in memory
            print(f"Warning: Failed to persist tokens to database: {db_error}")
            import traceback
            traceback.print_exc()
            # Don't raise - the OAuth flow succeeded

        # Redirect to frontend success page
        return RedirectResponse(url="https://api-uat-uk-workfin-02.azurewebsites.net/xero/list?xero=connected")

    except Exception as e:
        # Only redirect with error if the OAuth flow itself failed
        error_msg = str(e)
        print(f"Xero callback error: {error_msg}")
        return RedirectResponse(url=f"https://api-uat-uk-workfin-02.azurewebsites.net/xero/list?xero=error&message={error_msg}")


@router.get("/tenants/", response_model=List[XeroTenant])
async def get_xero_tenants(
    tenant_id: Optional[str] = Query(None, description="Filter by WorkFin tenant_id"),
    db: AsyncSession = Depends(get_db)
):
    """Get list of connected Xero organizations, optionally filtered by tenant_id"""

    # If tenant_id is provided, query from pms_connections (filtered)
    if tenant_id:
        result = await db.execute(
            select(PMSConnection).where(
                PMSConnection.integration_type == "XERO",
                PMSConnection.tenant_id == tenant_id
            )
        )
        connections = result.scalars().all()

        return [
            XeroTenant(
                tenant_id=conn.integration_id,
                tenant_name=conn.xero_tenant_name or conn.integration_name,
                tenant_type="ORGANISATION"
            )
            for conn in connections
        ]

    # No tenant_id: Return all (backward compatible)
    if not xero_service.is_authenticated():
        try:
            result = await db.execute(
                select(XeroToken).order_by(XeroToken.updated_at.desc()).limit(1)
            )
            token_record = result.scalar_one_or_none()
            if token_record:
                print(f"Restoring tokens from database for tenant: {token_record.tenant_name}")
                xero_service.set_tokens({
                    "access_token": token_record.access_token,
                    "refresh_token": token_record.refresh_token,
                    "expires_at": token_record.expires_at,
                    "token_type": token_record.token_type,
                    "scope": token_record.scope
                })
            else:
                print("No token records found in database")
        except Exception as db_error:
            print(f"Database error while loading tokens: {db_error}")
            import traceback
            traceback.print_exc()

    if not xero_service.is_authenticated():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not connected to Xero. Please authorize first."
        )

    try:
        print("Calling xero_service.get_tenants()...")
        tenants = await xero_service.get_tenants()
        print(f"Got {len(tenants)} tenants from Xero")
        return [
            XeroTenant(
                tenant_id=t["tenantId"],
                tenant_name=t.get("tenantName", "Unknown"),
                tenant_type=t.get("tenantType", "ORGANISATION")
            )
            for t in tenants
        ]
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        if "getaddrinfo" in error_msg or "connection" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to connect to Xero. Please check your internet connection and try again."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenants: {error_msg}"
        )


@router.post("/disconnect")
async def disconnect_xero(db: AsyncSession = Depends(get_db)):
    """Disconnect from Xero and clear tokens"""
    xero_service.clear_tokens()

    # Optionally clear tokens from database
    # await db.execute(delete(XeroToken))
    # await db.commit()

    return {"message": "Successfully disconnected from Xero"}


@router.get("/status/")
async def get_xero_status():
    """Check Xero connection status"""
    return {
        "connected": xero_service.is_authenticated(),
        "tokens": xero_service.get_stored_tokens() is not None
    }


# ==================
# Data Sync Endpoints
# ==================

@router.post("/sync/accounts/", response_model=XeroSyncResponse)
async def sync_accounts(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Chart of Accounts from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        accounts = await xero_service.get_accounts(tenant_id)
        synced_count = 0

        for account in accounts:
            stmt = insert(XeroAccount).values(
                account_id=account["AccountID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                code=account.get("Code"),
                name=account.get("Name"),
                type=account.get("Type"),
                bank_account_number=account.get("BankAccountNumber"),
                status=account.get("Status"),
                description=account.get("Description"),
                bank_account_type=account.get("BankAccountType"),
                currency_code=account.get("CurrencyCode"),
                tax_type=account.get("TaxType"),
                enable_payments_to_account=account.get("EnablePaymentsToAccount", False),
                show_in_expense_claims=account.get("ShowInExpenseClaims", False),
                class_=account.get("Class"),
                system_account=account.get("SystemAccount"),
                reporting_code=account.get("ReportingCode"),
                reporting_code_name=account.get("ReportingCodeName"),
                has_attachments=account.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(account.get("UpdatedDateUTC")),
                add_to_watchlist=account.get("AddToWatchlist", False),
                raw_data=account,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["account_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "name": account.get("Name"),
                    "status": account.get("Status"),
                    "raw_data": account,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

        await db.commit()
        return XeroSyncResponse(
            entity_type="accounts",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync accounts: {str(e)}"
        )


@router.post("/sync/contacts/", response_model=XeroSyncResponse)
async def sync_contacts(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Contacts from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_contacts = []
        page = 1

        # Paginate through all contacts
        while True:
            contacts = await xero_service.get_contacts(tenant_id, page=page)
            if not contacts:
                break
            all_contacts.extend(contacts)
            if len(contacts) < 100:  # Xero returns max 100 per page
                break
            page += 1

        synced_count = 0
        for contact in all_contacts:
            stmt = insert(XeroContact).values(
                contact_id=contact["ContactID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                contact_number=contact.get("ContactNumber"),
                account_number=contact.get("AccountNumber"),
                contact_status=contact.get("ContactStatus"),
                name=contact.get("Name"),
                first_name=contact.get("FirstName"),
                last_name=contact.get("LastName"),
                email_address=contact.get("EmailAddress"),
                skype_user_name=contact.get("SkypeUserName"),
                bank_account_details=contact.get("BankAccountDetails"),
                tax_number=contact.get("TaxNumber"),
                accounts_receivable_tax_type=contact.get("AccountsReceivableTaxType"),
                accounts_payable_tax_type=contact.get("AccountsPayableTaxType"),
                is_supplier=contact.get("IsSupplier", False),
                is_customer=contact.get("IsCustomer", False),
                default_currency=contact.get("DefaultCurrency"),
                updated_date_utc=parse_xero_datetime(contact.get("UpdatedDateUTC")),
                raw_data=contact,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["contact_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "name": contact.get("Name"),
                    "contact_status": contact.get("ContactStatus"),
                    "raw_data": contact,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

        await db.commit()
        return XeroSyncResponse(
            entity_type="contacts",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync contacts: {str(e)}"
        )


@router.post("/sync/contact-groups/", response_model=XeroSyncResponse)
async def sync_contact_groups(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Contact Groups from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        groups = await xero_service.get_contact_groups(tenant_id)
        synced_count = 0

        for group in groups:
            stmt = insert(XeroContactGroup).values(
                contact_group_id=group["ContactGroupID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                name=group.get("Name"),
                status=group.get("Status"),
                raw_data=group,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["contact_group_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "name": group.get("Name"),
                    "status": group.get("Status"),
                    "raw_data": group,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

        await db.commit()
        return XeroSyncResponse(
            entity_type="contact_groups",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync contact groups: {str(e)}"
        )


@router.post("/sync/invoices/", response_model=XeroSyncResponse)
async def sync_invoices(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Invoices from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_invoices = []
        page = 1

        while True:
            invoices = await xero_service.get_invoices(tenant_id, page=page)
            if not invoices:
                break
            all_invoices.extend(invoices)
            if len(invoices) < 100:
                break
            page += 1

        synced_count = 0
        batch_size = 50

        for i, invoice in enumerate(all_invoices):
            contact = invoice.get("Contact", {})
            stmt = insert(XeroInvoice).values(
                invoice_id=invoice["InvoiceID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=invoice.get("Type"),
                invoice_number=invoice.get("InvoiceNumber"),
                reference=invoice.get("Reference"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                date=parse_xero_date(invoice.get("Date")),
                due_date=parse_xero_date(invoice.get("DueDate")),
                status=invoice.get("Status"),
                line_amount_types=invoice.get("LineAmountTypes"),
                sub_total=invoice.get("SubTotal"),
                total_tax=invoice.get("TotalTax"),
                total=invoice.get("Total"),
                total_discount=invoice.get("TotalDiscount"),
                currency_code=invoice.get("CurrencyCode"),
                currency_rate=invoice.get("CurrencyRate"),
                amount_due=invoice.get("AmountDue"),
                amount_paid=invoice.get("AmountPaid"),
                amount_credited=invoice.get("AmountCredited"),
                fully_paid_on_date=parse_xero_date(invoice.get("FullyPaidOnDate")),
                sent_to_contact=invoice.get("SentToContact", False),
                expected_payment_date=parse_xero_date(invoice.get("ExpectedPaymentDate")),
                planned_payment_date=parse_xero_date(invoice.get("PlannedPaymentDate")),
                has_attachments=invoice.get("HasAttachments", False),
                has_errors=invoice.get("HasErrors", False),
                updated_date_utc=parse_xero_datetime(invoice.get("UpdatedDateUTC")),
                raw_data=invoice,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["invoice_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "status": invoice.get("Status"),
                    "amount_due": invoice.get("AmountDue"),
                    "amount_paid": invoice.get("AmountPaid"),
                    "raw_data": invoice,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

            # Commit in batches for better performance
            if (i + 1) % batch_size == 0:
                await db.commit()

        # Final commit for remaining records
        await db.commit()
        return XeroSyncResponse(
            entity_type="invoices",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync invoices: {str(e)}"
        )


@router.post("/sync/credit-notes/", response_model=XeroSyncResponse)
async def sync_credit_notes(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Credit Notes from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_credit_notes = []
        page = 1

        while True:
            credit_notes = await xero_service.get_credit_notes(tenant_id, page=page)
            if not credit_notes:
                break
            all_credit_notes.extend(credit_notes)
            if len(credit_notes) < 100:
                break
            page += 1

        synced_count = 0
        for cn in all_credit_notes:
            contact = cn.get("Contact", {})
            stmt = insert(XeroCreditNote).values(
                credit_note_id=cn["CreditNoteID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=cn.get("Type"),
                credit_note_number=cn.get("CreditNoteNumber"),
                reference=cn.get("Reference"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                date=parse_xero_date(cn.get("Date")),
                status=cn.get("Status"),
                line_amount_types=cn.get("LineAmountTypes"),
                sub_total=cn.get("SubTotal"),
                total_tax=cn.get("TotalTax"),
                total=cn.get("Total"),
                currency_code=cn.get("CurrencyCode"),
                currency_rate=cn.get("CurrencyRate"),
                remaining_credit=cn.get("RemainingCredit"),
                has_attachments=cn.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(cn.get("UpdatedDateUTC")),
                raw_data=cn,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["credit_note_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "status": cn.get("Status"),
                    "remaining_credit": cn.get("RemainingCredit"),
                    "raw_data": cn,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

        await db.commit()
        return XeroSyncResponse(
            entity_type="credit_notes",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync credit notes: {str(e)}"
        )


@router.post("/sync/payments/", response_model=XeroSyncResponse)
async def sync_payments(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Payments from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_payments = []
        page = 1

        while True:
            payments = await xero_service.get_payments(tenant_id, page=page)
            if not payments:
                break
            all_payments.extend(payments)
            if len(payments) < 100:
                break
            page += 1

        synced_count = 0
        batch_size = 50

        for i, payment in enumerate(all_payments):
            invoice = payment.get("Invoice", {})
            account = payment.get("Account", {})
            stmt = insert(XeroPayment).values(
                payment_id=payment["PaymentID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                date=parse_xero_date(payment.get("Date")),
                currency_rate=payment.get("CurrencyRate"),
                amount=payment.get("Amount"),
                reference=payment.get("Reference"),
                is_reconciled=payment.get("IsReconciled", False),
                status=payment.get("Status"),
                payment_type=payment.get("PaymentType"),
                account_id=account.get("AccountID"),
                invoice_id=invoice.get("InvoiceID"),
                credit_note_id=payment.get("CreditNote", {}).get("CreditNoteID"),
                prepayment_id=payment.get("Prepayment", {}).get("PrepaymentID"),
                overpayment_id=payment.get("Overpayment", {}).get("OverpaymentID"),
                updated_date_utc=parse_xero_datetime(payment.get("UpdatedDateUTC")),
                raw_data=payment,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["payment_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "status": payment.get("Status"),
                    "is_reconciled": payment.get("IsReconciled", False),
                    "raw_data": payment,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

            if (i + 1) % batch_size == 0:
                await db.commit()

        await db.commit()
        return XeroSyncResponse(
            entity_type="payments",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync payments: {str(e)}"
        )


@router.post("/sync/bank-transactions/", response_model=XeroSyncResponse)
async def sync_bank_transactions(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Bank Transactions from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_transactions = []
        page = 1

        while True:
            transactions = await xero_service.get_bank_transactions(tenant_id, page=page)
            if not transactions:
                break
            all_transactions.extend(transactions)
            if len(transactions) < 100:
                break
            page += 1

        synced_count = 0
        batch_size = 50

        for i, txn in enumerate(all_transactions):
            contact = txn.get("Contact", {})
            bank_account = txn.get("BankAccount", {})
            stmt = insert(XeroBankTransaction).values(
                bank_transaction_id=txn["BankTransactionID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=txn.get("Type"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                bank_account_id=bank_account.get("AccountID"),
                is_reconciled=txn.get("IsReconciled", False),
                date=parse_xero_date(txn.get("Date")),
                reference=txn.get("Reference"),
                currency_code=txn.get("CurrencyCode"),
                currency_rate=txn.get("CurrencyRate"),
                status=txn.get("Status"),
                line_amount_types=txn.get("LineAmountTypes"),
                sub_total=txn.get("SubTotal"),
                total_tax=txn.get("TotalTax"),
                total=txn.get("Total"),
                has_attachments=txn.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(txn.get("UpdatedDateUTC")),
                raw_data=txn,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["bank_transaction_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "status": txn.get("Status"),
                    "is_reconciled": txn.get("IsReconciled", False),
                    "raw_data": txn,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

            if (i + 1) % batch_size == 0:
                await db.commit()

        await db.commit()
        return XeroSyncResponse(
            entity_type="bank_transactions",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync bank transactions: {str(e)}"
        )


@router.post("/sync/bank-transfers/", response_model=XeroSyncResponse)
async def sync_bank_transfers(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Bank Transfers from Xero"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        transfers = await xero_service.get_bank_transfers(tenant_id)
        synced_count = 0

        for transfer in transfers:
            from_bank = transfer.get("FromBankAccount", {})
            to_bank = transfer.get("ToBankAccount", {})
            stmt = insert(XeroBankTransfer).values(
                bank_transfer_id=transfer["BankTransferID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                from_bank_account_id=from_bank.get("AccountID"),
                to_bank_account_id=to_bank.get("AccountID"),
                from_bank_transaction_id=transfer.get("FromBankTransactionID"),
                to_bank_transaction_id=transfer.get("ToBankTransactionID"),
                amount=transfer.get("Amount"),
                date=parse_xero_date(transfer.get("Date")),
                currency_rate=transfer.get("CurrencyRate"),
                has_attachments=transfer.get("HasAttachments", False),
                created_date_utc=parse_xero_datetime(transfer.get("CreatedDateUTC")),
                raw_data=transfer,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["bank_transfer_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "raw_data": transfer,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

        await db.commit()
        return XeroSyncResponse(
            entity_type="bank_transfers",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync bank transfers: {str(e)}"
        )


@router.post("/sync/journals/", response_model=XeroSyncResponse)
async def sync_journals(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    db: AsyncSession = Depends(get_db)
):
    """Sync Journals from Xero (requires accounting.journals.read scope)"""
    try:
        tenant_info = await _get_tenant_info(db, tenant_id)
        tenant_name = tenant_info["tenant_name"]
        integration_id = tenant_info["integration_id"]
        all_journals = []
        offset = 0

        while True:
            journals = await xero_service.get_journals(tenant_id, offset=offset)
            if not journals:
                break
            all_journals.extend(journals)
            offset += len(journals)
            if len(journals) < 100:
                break

        synced_count = 0
        journal_lines_count = 0
        batch_size = 50

        for i, journal in enumerate(all_journals):
            # Insert journal
            stmt = insert(XeroJournal).values(
                journal_id=journal["JournalID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                journal_date=parse_xero_date(journal.get("JournalDate")),
                journal_number=journal.get("JournalNumber"),
                created_date_utc=parse_xero_datetime(journal.get("CreatedDateUTC")),
                reference=journal.get("Reference"),
                source_id=journal.get("SourceID"),
                source_type=journal.get("SourceType"),
                raw_data=journal,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["journal_id"],
                set_={
                    "tenant_name": tenant_name,
                    "integration_id": integration_id,
                    "raw_data": journal,
                    "synced_at": datetime.now()
                }
            )
            await db.execute(stmt)
            synced_count += 1

            # Insert journal lines
            for line in journal.get("JournalLines", []):
                line_stmt = insert(XeroJournalLine).values(
                    journal_line_id=line["JournalLineID"],
                    journal_id=journal["JournalID"],
                    tenant_id=tenant_id,
                    tenant_name=tenant_name,
                    integration_id=integration_id,
                    account_id=line.get("AccountID"),
                    account_code=line.get("AccountCode"),
                    account_type=line.get("AccountType"),
                    account_name=line.get("AccountName"),
                    description=line.get("Description"),
                    net_amount=line.get("NetAmount"),
                    gross_amount=line.get("GrossAmount"),
                    tax_amount=line.get("TaxAmount"),
                    tax_type=line.get("TaxType"),
                    tax_name=line.get("TaxName"),
                    tracking_categories=line.get("TrackingCategories"),
                    raw_data=line,
                    synced_at=datetime.now()
                )
                line_stmt = line_stmt.on_conflict_do_update(
                    index_elements=["journal_line_id"],
                    set_={
                        "tenant_name": tenant_name,
                        "integration_id": integration_id,
                        "raw_data": line,
                        "synced_at": datetime.now()
                    }
                )
                await db.execute(line_stmt)
                journal_lines_count += 1

            # Commit in batches
            if (i + 1) % batch_size == 0:
                await db.commit()

        await db.commit()
        return XeroSyncResponse(
            entity_type="journals",
            synced_count=synced_count,
            status=XeroSyncStatus.SUCCESS,
            message=f"Synced {synced_count} journals and {journal_lines_count} journal lines"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync journals: {str(e)}"
        )


@router.post("/sync/quick/", response_model=List[XeroSyncResponse])
async def sync_quick_xero_data(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records per entity"),
    db: AsyncSession = Depends(get_db)
):
    """
    Quick sync - fetches limited data from Xero for faster performance.
    Syncs all entity types (accounts, contacts, invoices, credit notes, payments,
    bank transactions, journals) but limits each to the specified number of records.
    """
    results = []
    tenant_info = await _get_tenant_info(db, tenant_id)
    tenant_name = tenant_info["tenant_name"]
    integration_id = tenant_info["integration_id"]

    # Sync accounts (usually not many, sync all)
    try:
        accounts = await xero_service.get_accounts(tenant_id)
        synced_count = 0
        for account in accounts[:limit]:
            stmt = insert(XeroAccount).values(
                account_id=account["AccountID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                code=account.get("Code"),
                name=account.get("Name"),
                type=account.get("Type"),
                bank_account_number=account.get("BankAccountNumber"),
                status=account.get("Status"),
                description=account.get("Description"),
                bank_account_type=account.get("BankAccountType"),
                currency_code=account.get("CurrencyCode"),
                tax_type=account.get("TaxType"),
                enable_payments_to_account=account.get("EnablePaymentsToAccount", False),
                show_in_expense_claims=account.get("ShowInExpenseClaims", False),
                class_=account.get("Class"),
                system_account=account.get("SystemAccount"),
                reporting_code=account.get("ReportingCode"),
                reporting_code_name=account.get("ReportingCodeName"),
                has_attachments=account.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(account.get("UpdatedDateUTC")),
                add_to_watchlist=account.get("AddToWatchlist", False),
                raw_data=account,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["account_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "name": account.get("Name"), "status": account.get("Status"), "raw_data": account, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="accounts", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="accounts", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync contacts (limited)
    try:
        contacts = await xero_service.get_contacts(tenant_id, page=1)
        synced_count = 0
        for contact in contacts[:limit]:
            stmt = insert(XeroContact).values(
                contact_id=contact["ContactID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                contact_number=contact.get("ContactNumber"),
                account_number=contact.get("AccountNumber"),
                contact_status=contact.get("ContactStatus"),
                name=contact.get("Name"),
                first_name=contact.get("FirstName"),
                last_name=contact.get("LastName"),
                email_address=contact.get("EmailAddress"),
                skype_user_name=contact.get("SkypeUserName"),
                bank_account_details=contact.get("BankAccountDetails"),
                tax_number=contact.get("TaxNumber"),
                accounts_receivable_tax_type=contact.get("AccountsReceivableTaxType"),
                accounts_payable_tax_type=contact.get("AccountsPayableTaxType"),
                is_supplier=contact.get("IsSupplier", False),
                is_customer=contact.get("IsCustomer", False),
                default_currency=contact.get("DefaultCurrency"),
                updated_date_utc=parse_xero_datetime(contact.get("UpdatedDateUTC")),
                raw_data=contact,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["contact_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "name": contact.get("Name"), "contact_status": contact.get("ContactStatus"), "raw_data": contact, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="contacts", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="contacts", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync invoices (limited)
    try:
        invoices = await xero_service.get_invoices(tenant_id, page=1)
        synced_count = 0
        for invoice in invoices[:limit]:
            contact = invoice.get("Contact", {})
            stmt = insert(XeroInvoice).values(
                invoice_id=invoice["InvoiceID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=invoice.get("Type"),
                invoice_number=invoice.get("InvoiceNumber"),
                reference=invoice.get("Reference"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                date=parse_xero_date(invoice.get("Date")),
                due_date=parse_xero_date(invoice.get("DueDate")),
                status=invoice.get("Status"),
                line_amount_types=invoice.get("LineAmountTypes"),
                sub_total=invoice.get("SubTotal"),
                total_tax=invoice.get("TotalTax"),
                total=invoice.get("Total"),
                total_discount=invoice.get("TotalDiscount"),
                currency_code=invoice.get("CurrencyCode"),
                currency_rate=invoice.get("CurrencyRate"),
                amount_due=invoice.get("AmountDue"),
                amount_paid=invoice.get("AmountPaid"),
                amount_credited=invoice.get("AmountCredited"),
                fully_paid_on_date=parse_xero_date(invoice.get("FullyPaidOnDate")),
                sent_to_contact=invoice.get("SentToContact", False),
                expected_payment_date=parse_xero_date(invoice.get("ExpectedPaymentDate")),
                planned_payment_date=parse_xero_date(invoice.get("PlannedPaymentDate")),
                has_attachments=invoice.get("HasAttachments", False),
                has_errors=invoice.get("HasErrors", False),
                updated_date_utc=parse_xero_datetime(invoice.get("UpdatedDateUTC")),
                raw_data=invoice,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["invoice_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "status": invoice.get("Status"), "amount_due": invoice.get("AmountDue"), "amount_paid": invoice.get("AmountPaid"), "raw_data": invoice, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="invoices", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="invoices", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync credit notes (limited)
    try:
        credit_notes = await xero_service.get_credit_notes(tenant_id, page=1)
        synced_count = 0
        for cn in credit_notes[:limit]:
            contact = cn.get("Contact", {})
            stmt = insert(XeroCreditNote).values(
                credit_note_id=cn["CreditNoteID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=cn.get("Type"),
                credit_note_number=cn.get("CreditNoteNumber"),
                reference=cn.get("Reference"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                date=parse_xero_date(cn.get("Date")),
                status=cn.get("Status"),
                line_amount_types=cn.get("LineAmountTypes"),
                sub_total=cn.get("SubTotal"),
                total_tax=cn.get("TotalTax"),
                total=cn.get("Total"),
                currency_code=cn.get("CurrencyCode"),
                currency_rate=cn.get("CurrencyRate"),
                remaining_credit=cn.get("RemainingCredit"),
                has_attachments=cn.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(cn.get("UpdatedDateUTC")),
                raw_data=cn,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["credit_note_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "status": cn.get("Status"), "remaining_credit": cn.get("RemainingCredit"), "raw_data": cn, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="credit_notes", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="credit_notes", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync payments (limited)
    try:
        payments = await xero_service.get_payments(tenant_id, page=1)
        synced_count = 0
        for payment in payments[:limit]:
            invoice = payment.get("Invoice", {})
            account = payment.get("Account", {})
            stmt = insert(XeroPayment).values(
                payment_id=payment["PaymentID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                date=parse_xero_date(payment.get("Date")),
                currency_rate=payment.get("CurrencyRate"),
                amount=payment.get("Amount"),
                reference=payment.get("Reference"),
                is_reconciled=payment.get("IsReconciled", False),
                status=payment.get("Status"),
                payment_type=payment.get("PaymentType"),
                account_id=account.get("AccountID"),
                invoice_id=invoice.get("InvoiceID"),
                credit_note_id=payment.get("CreditNote", {}).get("CreditNoteID"),
                prepayment_id=payment.get("Prepayment", {}).get("PrepaymentID"),
                overpayment_id=payment.get("Overpayment", {}).get("OverpaymentID"),
                updated_date_utc=parse_xero_datetime(payment.get("UpdatedDateUTC")),
                raw_data=payment,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["payment_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "status": payment.get("Status"), "is_reconciled": payment.get("IsReconciled", False), "raw_data": payment, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="payments", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="payments", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync bank transactions (limited)
    try:
        transactions = await xero_service.get_bank_transactions(tenant_id, page=1)
        synced_count = 0
        for txn in transactions[:limit]:
            contact = txn.get("Contact", {})
            bank_account = txn.get("BankAccount", {})
            stmt = insert(XeroBankTransaction).values(
                bank_transaction_id=txn["BankTransactionID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                type=txn.get("Type"),
                contact_id=contact.get("ContactID"),
                contact_name=contact.get("Name"),
                bank_account_id=bank_account.get("AccountID"),
                is_reconciled=txn.get("IsReconciled", False),
                date=parse_xero_date(txn.get("Date")),
                reference=txn.get("Reference"),
                currency_code=txn.get("CurrencyCode"),
                currency_rate=txn.get("CurrencyRate"),
                status=txn.get("Status"),
                line_amount_types=txn.get("LineAmountTypes"),
                sub_total=txn.get("SubTotal"),
                total_tax=txn.get("TotalTax"),
                total=txn.get("Total"),
                has_attachments=txn.get("HasAttachments", False),
                updated_date_utc=parse_xero_datetime(txn.get("UpdatedDateUTC")),
                raw_data=txn,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["bank_transaction_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "status": txn.get("Status"), "is_reconciled": txn.get("IsReconciled", False), "raw_data": txn, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="bank_transactions", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="bank_transactions", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync journals (limited)
    try:
        journals = await xero_service.get_journals(tenant_id, offset=0)
        synced_count = 0
        for journal in journals[:limit]:
            stmt = insert(XeroJournal).values(
                journal_id=journal["JournalID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                journal_date=parse_xero_date(journal.get("JournalDate")),
                journal_number=journal.get("JournalNumber"),
                created_date_utc=parse_xero_datetime(journal.get("CreatedDateUTC")),
                reference=journal.get("Reference"),
                source_id=journal.get("SourceID"),
                source_type=journal.get("SourceType"),
                raw_data=journal,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["journal_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "raw_data": journal, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="journals", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="journals", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync contact groups (limited)
    try:
        groups = await xero_service.get_contact_groups(tenant_id)
        synced_count = 0
        for group in groups[:limit]:
            stmt = insert(XeroContactGroup).values(
                contact_group_id=group["ContactGroupID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                name=group.get("Name"),
                status=group.get("Status"),
                raw_data=group,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["contact_group_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "name": group.get("Name"), "status": group.get("Status"), "raw_data": group, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="contact_groups", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="contact_groups", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    # Sync bank transfers (limited)
    try:
        transfers = await xero_service.get_bank_transfers(tenant_id)
        synced_count = 0
        for transfer in transfers[:limit]:
            from_bank = transfer.get("FromBankAccount", {})
            to_bank = transfer.get("ToBankAccount", {})
            stmt = insert(XeroBankTransfer).values(
                bank_transfer_id=transfer["BankTransferID"],
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                integration_id=integration_id,
                from_bank_account_id=from_bank.get("AccountID"),
                to_bank_account_id=to_bank.get("AccountID"),
                from_bank_transaction_id=transfer.get("FromBankTransactionID"),
                to_bank_transaction_id=transfer.get("ToBankTransactionID"),
                amount=transfer.get("Amount"),
                date=parse_xero_date(transfer.get("Date")),
                currency_rate=transfer.get("CurrencyRate"),
                has_attachments=transfer.get("HasAttachments", False),
                created_date_utc=parse_xero_datetime(transfer.get("CreatedDateUTC")),
                raw_data=transfer,
                synced_at=datetime.now()
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["bank_transfer_id"],
                set_={"tenant_name": tenant_name, "integration_id": integration_id, "raw_data": transfer, "synced_at": datetime.now()}
            )
            await db.execute(stmt)
            synced_count += 1
        await db.commit()
        results.append(XeroSyncResponse(entity_type="bank_transfers", synced_count=synced_count, status=XeroSyncStatus.SUCCESS))
    except Exception as e:
        await db.rollback()
        results.append(XeroSyncResponse(entity_type="bank_transfers", synced_count=0, status=XeroSyncStatus.FAILED, message=str(e)))

    return results


@router.post("/sync/all/", response_model=List[XeroSyncResponse])
async def sync_all_xero_data(
    tenant_id: str = Query(..., description="Xero tenant ID"),
    limit: int = Query(default=0, ge=0, description="Max records per entity (0 = unlimited)"),
    db: AsyncSession = Depends(get_db)
):
    """Sync all Xero data for a tenant. Use limit param to restrict records per entity."""
    results = []

    sync_functions = [
        ("accounts", sync_accounts),
        ("contacts", sync_contacts),
        ("contact_groups", sync_contact_groups),
        ("invoices", sync_invoices),
        ("credit_notes", sync_credit_notes),
        ("payments", sync_payments),
        ("bank_transactions", sync_bank_transactions),
        ("bank_transfers", sync_bank_transfers),
        ("journals", sync_journals),
    ]

    for entity_type, sync_func in sync_functions:
        try:
            result = await sync_func(tenant_id=tenant_id, db=db)
            results.append(result)
        except HTTPException as e:
            results.append(XeroSyncResponse(
                entity_type=entity_type,
                synced_count=0,
                status=XeroSyncStatus.FAILED,
                message=e.detail
            ))
        except Exception as e:
            results.append(XeroSyncResponse(
                entity_type=entity_type,
                synced_count=0,
                status=XeroSyncStatus.FAILED,
                message=str(e)
            ))

    return results


# ==================
# Data Retrieval Endpoints (GET synced data from database)
# ==================

@router.get("/data/accounts/")
async def get_xero_accounts(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced accounts from database"""
    try:
        print(f"Getting accounts for tenant_id: {tenant_id}, page: {page}, page_size: {page_size}")

        query = select(XeroAccount)
        if tenant_id:
            query = query.where(XeroAccount.tenant_id == tenant_id)
        query = query.order_by(XeroAccount.code, XeroAccount.name)

        # Get total count
        count_query = select(XeroAccount)
        if tenant_id:
            count_query = count_query.where(XeroAccount.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        print(f"Total accounts found: {total}")

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        accounts = result.scalars().all()

        print(f"Retrieved {len(accounts)} accounts for current page")

        response_data = {
            "data": [
                {
                    "id": str(acc.id),
                    "tenant_id": acc.tenant_id,
                    "tenant_name": acc.tenant_name,
                    "integration_id": acc.integration_id,
                    "account_id": acc.account_id,
                    "code": acc.code,
                    "name": acc.name,
                    "type": acc.type,
                    "class": acc.class_,
                    "status": acc.status,
                    "description": acc.description,
                    "currency_code": acc.currency_code,
                    "tax_type": acc.tax_type,
                    "synced_at": acc.synced_at.isoformat() if acc.synced_at else None,
                }
                for acc in accounts
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

        print(f"Successfully prepared response with {len(response_data['data'])} accounts")
        return response_data

    except Exception as e:
        import traceback
        print(f"ERROR in get_xero_accounts: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch accounts: {str(e)}"
        )


@router.get("/data/contacts/")
async def get_xero_contacts(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    is_customer: Optional[bool] = Query(None, description="Filter by customer flag"),
    is_supplier: Optional[bool] = Query(None, description="Filter by supplier flag"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced contacts from database"""
    try:
        query = select(XeroContact)
        if tenant_id:
            query = query.where(XeroContact.tenant_id == tenant_id)
        if is_customer is not None:
            query = query.where(XeroContact.is_customer == is_customer)
        if is_supplier is not None:
            query = query.where(XeroContact.is_supplier == is_supplier)
        query = query.order_by(XeroContact.name)

        # Get total count
        count_query = select(XeroContact)
        if tenant_id:
            count_query = count_query.where(XeroContact.tenant_id == tenant_id)
        if is_customer is not None:
            count_query = count_query.where(XeroContact.is_customer == is_customer)
        if is_supplier is not None:
            count_query = count_query.where(XeroContact.is_supplier == is_supplier)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        contacts = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(c.id),
                    "tenant_id": c.tenant_id,
                    "tenant_name": c.tenant_name,
                    "integration_id": c.integration_id,
                    "contact_id": c.contact_id,
                    "name": c.name,
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "email_address": c.email_address,
                    "contact_status": c.contact_status,
                    "is_customer": c.is_customer,
                    "is_supplier": c.is_supplier,
                    "default_currency": c.default_currency,
                    "tax_number": c.tax_number,
                    "synced_at": c.synced_at.isoformat() if c.synced_at else None,
                }
                for c in contacts
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contacts: {str(e)}"
        )


@router.get("/data/invoices/")
async def get_xero_invoices(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PAID, AUTHORISED, DRAFT, etc.)"),
    type_filter: Optional[str] = Query(None, alias="type", description="Filter by type (ACCPAY, ACCREC)"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced invoices from database"""
    try:
        query = select(XeroInvoice)
        if tenant_id:
            query = query.where(XeroInvoice.tenant_id == tenant_id)
        if status_filter:
            query = query.where(XeroInvoice.status == status_filter)
        if type_filter:
            query = query.where(XeroInvoice.type == type_filter)
        query = query.order_by(XeroInvoice.date.desc())

        # Get total count
        count_query = select(XeroInvoice)
        if tenant_id:
            count_query = count_query.where(XeroInvoice.tenant_id == tenant_id)
        if status_filter:
            count_query = count_query.where(XeroInvoice.status == status_filter)
        if type_filter:
            count_query = count_query.where(XeroInvoice.type == type_filter)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        invoices = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(inv.id),
                    "tenant_id": inv.tenant_id,
                    "tenant_name": inv.tenant_name,
                    "integration_id": inv.integration_id,
                    "invoice_id": inv.invoice_id,
                    "invoice_number": inv.invoice_number,
                    "type": inv.type,
                    "contact_name": inv.contact_name,
                    "date": inv.date.isoformat() if inv.date else None,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                    "status": inv.status,
                    "total": float(inv.total) if inv.total else 0,
                    "amount_due": float(inv.amount_due) if inv.amount_due else 0,
                    "amount_paid": float(inv.amount_paid) if inv.amount_paid else 0,
                    "currency_code": inv.currency_code,
                    "reference": inv.reference,
                    "synced_at": inv.synced_at.isoformat() if inv.synced_at else None,
                }
                for inv in invoices
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch invoices: {str(e)}"
        )


@router.get("/data/credit-notes/")
async def get_xero_credit_notes(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced credit notes from database"""
    try:
        query = select(XeroCreditNote)
        if tenant_id:
            query = query.where(XeroCreditNote.tenant_id == tenant_id)
        query = query.order_by(XeroCreditNote.date.desc())

        # Get total count
        count_query = select(XeroCreditNote)
        if tenant_id:
            count_query = count_query.where(XeroCreditNote.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        credit_notes = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(cn.id),
                    "tenant_id": cn.tenant_id,
                    "tenant_name": cn.tenant_name,
                    "integration_id": cn.integration_id,
                    "credit_note_id": cn.credit_note_id,
                    "credit_note_number": cn.credit_note_number,
                    "type": cn.type,
                    "contact_name": cn.contact_name,
                    "date": cn.date.isoformat() if cn.date else None,
                    "status": cn.status,
                    "total": float(cn.total) if cn.total else 0,
                    "remaining_credit": float(cn.remaining_credit) if cn.remaining_credit else 0,
                    "currency_code": cn.currency_code,
                    "reference": cn.reference,
                    "synced_at": cn.synced_at.isoformat() if cn.synced_at else None,
                }
                for cn in credit_notes
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch credit notes: {str(e)}"
        )


@router.get("/data/payments/")
async def get_xero_payments(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced payments from database"""
    try:
        query = select(XeroPayment)
        if tenant_id:
            query = query.where(XeroPayment.tenant_id == tenant_id)
        query = query.order_by(XeroPayment.date.desc())

        # Get total count
        count_query = select(XeroPayment)
        if tenant_id:
            count_query = count_query.where(XeroPayment.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        payments = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(p.id),
                    "tenant_id": p.tenant_id,
                    "tenant_name": p.tenant_name,
                    "integration_id": p.integration_id,
                    "payment_id": p.payment_id,
                    "date": p.date.isoformat() if p.date else None,
                    "amount": float(p.amount) if p.amount else 0,
                    "reference": p.reference,
                    "status": p.status,
                    "payment_type": p.payment_type,
                    "is_reconciled": p.is_reconciled,
                    "synced_at": p.synced_at.isoformat() if p.synced_at else None,
                }
                for p in payments
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch payments: {str(e)}"
        )


@router.get("/data/bank-transactions/")
async def get_xero_bank_transactions(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced bank transactions from database"""
    try:
        query = select(XeroBankTransaction)
        if tenant_id:
            query = query.where(XeroBankTransaction.tenant_id == tenant_id)
        query = query.order_by(XeroBankTransaction.date.desc())

        # Get total count
        count_query = select(XeroBankTransaction)
        if tenant_id:
            count_query = count_query.where(XeroBankTransaction.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        transactions = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(t.id),
                    "tenant_id": t.tenant_id,
                    "tenant_name": t.tenant_name,
                    "integration_id": t.integration_id,
                    "bank_transaction_id": t.bank_transaction_id,
                    "type": t.type,
                    "contact_name": t.contact_name,
                    "date": t.date.isoformat() if t.date else None,
                    "reference": t.reference,
                    "status": t.status,
                    "total": float(t.total) if t.total else 0,
                    "is_reconciled": t.is_reconciled,
                    "currency_code": t.currency_code,
                    "synced_at": t.synced_at.isoformat() if t.synced_at else None,
                }
                for t in transactions
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bank transactions: {str(e)}"
        )


@router.get("/data/journals/")
async def get_xero_journals(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced journals from database"""
    try:
        query = select(XeroJournal)
        if tenant_id:
            query = query.where(XeroJournal.tenant_id == tenant_id)
        query = query.order_by(XeroJournal.journal_date.desc())

        # Get total count
        count_query = select(XeroJournal)
        if tenant_id:
            count_query = count_query.where(XeroJournal.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        journals = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(j.id),
                    "tenant_id": j.tenant_id,
                    "tenant_name": j.tenant_name,
                    "integration_id": j.integration_id,
                    "journal_id": j.journal_id,
                    "journal_number": j.journal_number,
                    "journal_date": j.journal_date.isoformat() if j.journal_date else None,
                    "reference": j.reference,
                    "source_type": j.source_type,
                    "synced_at": j.synced_at.isoformat() if j.synced_at else None,
                }
                for j in journals
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch journals: {str(e)}"
        )


@router.get("/data/journal-lines/")
async def get_xero_journal_lines(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    journal_id: Optional[str] = Query(None, description="Filter by journal ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced journal lines from database"""
    try:
        query = select(XeroJournalLine)
        if tenant_id:
            query = query.where(XeroJournalLine.tenant_id == tenant_id)
        if journal_id:
            query = query.where(XeroJournalLine.journal_id == journal_id)
        query = query.order_by(XeroJournalLine.synced_at.desc())

        # Get total count
        count_query = select(XeroJournalLine)
        if tenant_id:
            count_query = count_query.where(XeroJournalLine.tenant_id == tenant_id)
        if journal_id:
            count_query = count_query.where(XeroJournalLine.journal_id == journal_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        lines = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(line.id),
                    "tenant_id": line.tenant_id,
                    "tenant_name": line.tenant_name,
                    "integration_id": line.integration_id,
                    "journal_line_id": line.journal_line_id,
                    "journal_id": line.journal_id,
                    "account_id": line.account_id,
                    "account_code": line.account_code,
                    "account_type": line.account_type,
                    "account_name": line.account_name,
                    "description": line.description,
                    "net_amount": float(line.net_amount) if line.net_amount else 0,
                    "gross_amount": float(line.gross_amount) if line.gross_amount else 0,
                    "tax_amount": float(line.tax_amount) if line.tax_amount else 0,
                    "tax_type": line.tax_type,
                    "tax_name": line.tax_name,
                    "synced_at": line.synced_at.isoformat() if line.synced_at else None,
                }
                for line in lines
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch journal lines: {str(e)}"
        )


@router.get("/data/contact-groups/")
async def get_xero_contact_groups(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced contact groups from database"""
    try:
        query = select(XeroContactGroup)
        if tenant_id:
            query = query.where(XeroContactGroup.tenant_id == tenant_id)
        query = query.order_by(XeroContactGroup.name)

        # Get total count
        count_query = select(XeroContactGroup)
        if tenant_id:
            count_query = count_query.where(XeroContactGroup.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        groups = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(g.id),
                    "tenant_id": g.tenant_id,
                    "tenant_name": g.tenant_name,
                    "integration_id": g.integration_id,
                    "contact_group_id": g.contact_group_id,
                    "name": g.name,
                    "status": g.status,
                    "synced_at": g.synced_at.isoformat() if g.synced_at else None,
                }
                for g in groups
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contact groups: {str(e)}"
        )


@router.get("/data/bank-transfers/")
async def get_xero_bank_transfers(
    tenant_id: Optional[str] = Query(None, description="Filter by Xero tenant ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get synced bank transfers from database"""
    try:
        query = select(XeroBankTransfer)
        if tenant_id:
            query = query.where(XeroBankTransfer.tenant_id == tenant_id)
        query = query.order_by(XeroBankTransfer.date.desc())

        # Get total count
        count_query = select(XeroBankTransfer)
        if tenant_id:
            count_query = count_query.where(XeroBankTransfer.tenant_id == tenant_id)
        count_result = await db.execute(count_query)
        total = len(count_result.scalars().all())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        transfers = result.scalars().all()

        return {
            "data": [
                {
                    "id": str(t.id),
                    "tenant_id": t.tenant_id,
                    "tenant_name": t.tenant_name,
                    "integration_id": t.integration_id,
                    "bank_transfer_id": t.bank_transfer_id,
                    "from_bank_account_id": t.from_bank_account_id,
                    "to_bank_account_id": t.to_bank_account_id,
                    "amount": float(t.amount) if t.amount else 0,
                    "date": t.date.isoformat() if t.date else None,
                    "has_attachments": t.has_attachments,
                    "synced_at": t.synced_at.isoformat() if t.synced_at else None,
                }
                for t in transfers
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch bank transfers: {str(e)}"
        )


# ==================
# Generic Custom Table Endpoint
# ==================

ALLOWED_CUSTOM_TABLES: Dict[str, str] = {
    "bank-transactions-new": '"bankTransactionsNew"',
    "invoices-new": '"invoices_new"',
    "invoices-new-jenc": '"invoices_newJENC"',
    "journal2": '"Journal2"',
    "journal2-budget-template": '"Journal2_For_Budget_Template"',
    "demo-journal2": '"new_demo_journal2"',
    "vw-data": '"vw_Data"',
    "vw-cash-sheet": '"vw_data_CashSheet"',
    "vw-related-accounts": '"vw_relatedAccounts"',
}


def serialize_row(row: Any) -> Dict[str, Any]:
    """Convert a database row mapping to a JSON-serializable dict."""
    result = {}
    for key, value in row._mapping.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
        elif isinstance(value, timedelta):
            result[key] = str(value)
        elif isinstance(value, uuid.UUID):
            result[key] = str(value)
        else:
            result[key] = value
    return result


@router.get("/data/custom/{table_name}/")
async def get_custom_table_data(
    table_name: str = Path(..., description="Custom table slug (e.g. 'bank-transactions-new')"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get data from a custom xero schema table by its slug name."""
    if table_name not in ALLOWED_CUSTOM_TABLES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found. Allowed: {list(ALLOWED_CUSTOM_TABLES.keys())}"
        )

    actual_table = ALLOWED_CUSTOM_TABLES[table_name]
    qualified = f'xero.{actual_table}'

    try:
        count_result = await db.execute(text(f'SELECT COUNT(*) FROM {qualified}'))
        total = count_result.scalar() or 0

        offset = (page - 1) * page_size
        data_result = await db.execute(
            text(f'SELECT * FROM {qualified} LIMIT :limit OFFSET :offset'),
            {"limit": page_size, "offset": offset}
        )
        rows = data_result.fetchall()

        return {
            "data": [serialize_row(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch data from '{table_name}': {str(e)}"
        )
