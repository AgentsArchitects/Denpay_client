from pydantic_settings import BaseSettings
from typing import Union, List
from pydantic import field_validator


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "DenPay Client Onboarding API"
    API_V1_PREFIX: str = "/api"

    # CORS Settings (comma-separated origins, set in .env)
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:5174"

    # JWT Settings (legacy - kept for backward compatibility)
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # JWT Authentication Configuration (used by auth_utils.py)
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database Settings
    DATABASE_URL: str = ""

    # SendGrid Email Settings
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@workfin.co.uk"
    SENDGRID_FROM_NAME: str = "WorkFin"
    FRONTEND_URL: str = ""

    # Xero Settings
    XERO_CLIENT_ID: str = ""
    XERO_CLIENT_SECRET: str = ""
    XERO_REDIRECT_URI: str = ""
    XERO_SCOPES: str = "openid profile email accounting.transactions accounting.contacts accounting.settings accounting.journals.read offline_access"

    # Azure Storage Settings
    AZURE_STORAGE_ACCOUNT_NAME: str = ""
    AZURE_STORAGE_CONTAINER_NAME: str = ""

    # Power BI Settings
    POWERBI_TENANT_ID: str = ""
    POWERBI_CLIENT_ID: str = ""
    POWERBI_CLIENT_SECRET: str = ""
    POWERBI_AUTHORITY_URL: str = "https://login.microsoftonline.com/"
    POWERBI_SCOPE: str = "https://analysis.windows.net/powerbi/api/.default"
    POWERBI_API_URL: str = "https://api.powerbi.com/v1.0/myorg"

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
