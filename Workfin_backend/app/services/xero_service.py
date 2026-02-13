"""
Xero Integration Service
Handles OAuth 2.0 flow and API calls to Xero
"""
import httpx
import base64
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from urllib.parse import urlencode
from app.core.config import settings


class XeroService:
    """Service for interacting with Xero API"""

    AUTHORIZATION_URL = "https://login.xero.com/identity/connect/authorize"
    TOKEN_URL = "https://identity.xero.com/connect/token"
    CONNECTIONS_URL = "https://api.xero.com/connections"
    API_BASE_URL = "https://api.xero.com/api.xro/2.0"

    def __init__(self):
        self.client_id = settings.XERO_CLIENT_ID
        self.client_secret = settings.XERO_CLIENT_SECRET
        self.redirect_uri = settings.XERO_REDIRECT_URI
        self.scopes = settings.XERO_SCOPES

        # In-memory token storage (use database in production)
        self._tokens: Dict[str, Any] = {}

    def get_authorization_url(self, state: str = "default") -> str:
        """Generate Xero OAuth authorization URL"""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": self.scopes,
            "state": state
        }
        return f"{self.AUTHORIZATION_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(self, authorization_code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": self.redirect_uri
                }
            )

            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.text}")

            tokens = response.json()
            tokens["expires_at"] = datetime.now() + timedelta(seconds=tokens.get("expires_in", 1800))
            self._tokens["default"] = tokens
            return tokens

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh the access token using refresh token"""
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={
                    "Authorization": f"Basic {auth_header}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token
                }
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            tokens = response.json()
            tokens["expires_at"] = datetime.now() + timedelta(seconds=tokens.get("expires_in", 1800))
            self._tokens["default"] = tokens
            return tokens

    async def get_valid_token(self) -> Optional[str]:
        """Get a valid access token, refreshing if necessary"""
        tokens = self._tokens.get("default")
        if not tokens:
            return None

        # Check if token is expired (with 5 min buffer)
        expires_at = tokens.get("expires_at")
        if expires_at:
            # Handle timezone-aware datetime from database
            now = datetime.now()
            if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
                # Make expires_at naive for comparison
                expires_at = expires_at.replace(tzinfo=None)
            if now >= expires_at - timedelta(minutes=5):
                refresh_token = tokens.get("refresh_token")
                if refresh_token:
                    tokens = await self.refresh_access_token(refresh_token)

        return tokens.get("access_token")

    async def get_tenants(self) -> List[Dict[str, Any]]:
        """Get list of connected Xero tenants (organizations)"""
        access_token = await self.get_valid_token()
        if not access_token:
            raise Exception("Not authenticated with Xero")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.CONNECTIONS_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                raise Exception(f"Failed to get tenants: {response.text}")

            return response.json()

    async def _api_request(
        self,
        method: str,
        endpoint: str,
        tenant_id: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make authenticated request to Xero API"""
        access_token = await self.get_valid_token()
        if not access_token:
            raise Exception("Not authenticated with Xero")

        url = f"{self.API_BASE_URL}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-Tenant-Id": tenant_id,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = await client.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code not in [200, 201]:
                raise Exception(f"API request failed: {response.status_code} - {response.text}")

            return response.json()

    # ==================
    # ACCOUNTS
    # ==================
    async def get_accounts(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Fetch all accounts (Chart of Accounts)"""
        result = await self._api_request("GET", "Accounts", tenant_id)
        return result.get("Accounts", [])

    # ==================
    # CONTACTS
    # ==================
    async def get_contacts(self, tenant_id: str, page: int = 1) -> List[Dict[str, Any]]:
        """Fetch contacts (customers/suppliers)"""
        result = await self._api_request("GET", "Contacts", tenant_id, params={"page": page})
        return result.get("Contacts", [])

    async def get_contact_groups(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Fetch contact groups"""
        result = await self._api_request("GET", "ContactGroups", tenant_id)
        return result.get("ContactGroups", [])

    # ==================
    # INVOICES
    # ==================
    async def get_invoices(self, tenant_id: str, page: int = 1, modified_after: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch invoices"""
        params = {"page": page}
        if modified_after:
            params["where"] = f"UpdatedDateUTC >= DateTime({modified_after})"
        result = await self._api_request("GET", "Invoices", tenant_id, params=params)
        return result.get("Invoices", [])

    # ==================
    # CREDIT NOTES
    # ==================
    async def get_credit_notes(self, tenant_id: str, page: int = 1) -> List[Dict[str, Any]]:
        """Fetch credit notes"""
        result = await self._api_request("GET", "CreditNotes", tenant_id, params={"page": page})
        return result.get("CreditNotes", [])

    # ==================
    # PAYMENTS
    # ==================
    async def get_payments(self, tenant_id: str, page: int = 1) -> List[Dict[str, Any]]:
        """Fetch payments"""
        result = await self._api_request("GET", "Payments", tenant_id, params={"page": page})
        return result.get("Payments", [])

    # ==================
    # BANK TRANSACTIONS
    # ==================
    async def get_bank_transactions(self, tenant_id: str, page: int = 1) -> List[Dict[str, Any]]:
        """Fetch bank transactions"""
        result = await self._api_request("GET", "BankTransactions", tenant_id, params={"page": page})
        return result.get("BankTransactions", [])

    async def get_bank_transfers(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Fetch bank transfers"""
        result = await self._api_request("GET", "BankTransfers", tenant_id)
        return result.get("BankTransfers", [])

    # ==================
    # JOURNALS
    # ==================
    async def get_journals(self, tenant_id: str, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch journals (requires accounting.journals.read scope)"""
        result = await self._api_request("GET", "Journals", tenant_id, params={"offset": offset})
        return result.get("Journals", [])

    # ==================
    # TOKEN MANAGEMENT
    # ==================
    def set_tokens(self, tokens: Dict[str, Any]):
        """Set tokens (for restoring from database)"""
        if "expires_at" not in tokens and "expires_in" in tokens:
            tokens["expires_at"] = datetime.now() + timedelta(seconds=tokens["expires_in"])
        self._tokens["default"] = tokens

    def get_stored_tokens(self) -> Optional[Dict[str, Any]]:
        """Get currently stored tokens"""
        return self._tokens.get("default")

    def clear_tokens(self):
        """Clear stored tokens (logout)"""
        self._tokens.clear()

    def is_authenticated(self) -> bool:
        """Check if we have valid tokens"""
        return "default" in self._tokens and self._tokens["default"].get("access_token") is not None


# Singleton instance
xero_service = XeroService()
