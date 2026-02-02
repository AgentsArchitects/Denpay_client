"""
Shared database utilities
"""
import secrets
import string


def generate_alphanumeric_id(length: int = 8) -> str:
    """Generate a unique alphanumeric ID of given length.

    Used for tenant IDs, integration IDs, etc.
    Produces uppercase letters + digits (e.g., 'AB12CD34').
    """
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
