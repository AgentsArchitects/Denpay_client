from pydantic_settings import BaseSettings
from typing import Union, List
from pydantic import field_validator


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "DenPay Client Onboarding API"
    API_V1_PREFIX: str = "/api"

    # CORS Settings
    CORS_ORIGINS: Union[str, List[str]] = "https://api-uat-uk-workfin-02.azurewebsites.net/"

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database Settings
    DATABASE_URL: str = ""

    # Xero Settings
    XERO_CLIENT_ID: str = ""
    XERO_CLIENT_SECRET: str = ""
    XERO_REDIRECT_URI: str = "https://api-uat-uk-workfin-02.azurewebsites.net/api/xero/callback"
    XERO_SCOPES: str = "openid profile email accounting.transactions accounting.contacts accounting.settings accounting.journals.read offline_access"

    # Azure Storage Settings
    AZURE_STORAGE_ACCOUNT_NAME: str = "synwworkfinlivesynapse"
    AZURE_STORAGE_CONTAINER_NAME: str = "a4de6dd-esk"

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
