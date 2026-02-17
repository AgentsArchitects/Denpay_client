"""
Power BI Service — Workspace auto-creation on client onboarding.

Flow:
1. Authenticate with Power BI using Service Principal credentials
2. Create a workspace named "{tenant_id}_{client_name}"
3. Assign Admin role to WORKFIN_ADMIN users
4. Assign Viewer role to all other active users
5. Return workspace_id to be stored on the client record
"""

import httpx
from app.core.config import settings


async def _get_access_token() -> str:
    """
    Authenticate with Microsoft identity platform using Service Principal
    and return a Power BI API access token.
    """
    token_url = f"https://login.microsoftonline.com/{settings.POWERBI_TENANT_ID}/oauth2/v2.0/token"

    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.POWERBI_CLIENT_ID,
        "client_secret": settings.POWERBI_CLIENT_SECRET,
        "scope": settings.POWERBI_SCOPE,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)

    if response.status_code != 200:
        raise Exception(
            f"Power BI authentication failed: {response.status_code} — {response.text}"
        )

    return response.json()["access_token"]


async def _create_workspace(token: str, workspace_name: str) -> str:
    """
    Create a Power BI workspace and return its ID.
    """
    url = f"{settings.POWERBI_API_URL}/groups"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={"name": workspace_name}, headers=headers)

    if response.status_code not in (200, 201):
        raise Exception(
            f"Failed to create Power BI workspace '{workspace_name}': "
            f"{response.status_code} — {response.text}"
        )

    return response.json()["id"]


async def _add_user_to_workspace(
    token: str, workspace_id: str, email: str, access_right: str
) -> None:
    """
    Add a user to a Power BI workspace with the given access right.
    access_right: "Admin" | "Member" | "Contributor" | "Viewer"
    """
    url = f"{settings.POWERBI_API_URL}/groups/{workspace_id}/users"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "emailAddress": email,
        "groupUserAccessRight": access_right,
        "principalType": "User",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

    # 200/201 = success, 400 with "already exists" is also acceptable
    if response.status_code not in (200, 201):
        error_text = response.text
        if "already exists" not in error_text.lower():
            raise Exception(
                f"Failed to add user '{email}' to workspace: "
                f"{response.status_code} — {error_text}"
            )


async def create_workspace_for_client(
    tenant_id: str,
    legal_trading_name: str,
    admin_users: list,
    other_users: list,
) -> str:
    """
    Main entry point called during client onboarding.

    Parameters
    ----------
    tenant_id           : the client's 8-char tenant ID
    legal_trading_name  : the client's legal trading name
    admin_users         : list of email strings for WORKFIN_ADMIN users
    other_users         : list of email strings for all other active users

    Returns
    -------
    workspace_id : str — Power BI workspace GUID to store on the client record
    """
    clean_name = legal_trading_name.strip().replace("/", "-").replace("\\", "-")
    workspace_name = f"{clean_name}_{tenant_id}"

    token = await _get_access_token()
    workspace_id = await _create_workspace(token, workspace_name)

    # Assign Admin access to WorkFin admin users
    for email in admin_users:
        await _add_user_to_workspace(token, workspace_id, email, "Admin")

    # Assign Viewer access to all other users
    for email in other_users:
        await _add_user_to_workspace(token, workspace_id, email, "Viewer")

    return workspace_id
