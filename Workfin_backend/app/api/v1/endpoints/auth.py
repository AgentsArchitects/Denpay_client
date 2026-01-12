from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import LoginRequest, LoginResponse
from app.core.security import create_access_token, verify_password
from datetime import timedelta

router = APIRouter()

# Mock user data (replace with database later)
MOCK_USERS = {
    "ajay.lad@workfin.com": {
        "id": "1",
        "email": "ajay.lad@workfin.com",
        "password_hash": "$2b$12$KIXxLJm6P5qL5h5h5h5h5uO5h5h5h5h5h5h5h5h5h5h5h5h5h5h5h",  # Demo@123
        "full_name": "Ajay Lad",
        "role": "Admin"
    }
}


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    Login endpoint - returns JWT token
    For now uses mock data, will be replaced with database authentication
    """
    # For demo purposes, accept demo@123 as password
    if login_data.email == "ajay.lad@workfin.com" and login_data.password == "Demo@123":
        user = MOCK_USERS[login_data.email]

        # Create access token
        access_token = create_access_token(
            data={"sub": user["email"], "user_id": user["id"], "role": user["role"]},
            expires_delta=timedelta(minutes=30)
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"]
            }
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password"
    )


@router.post("/logout")
async def logout():
    """
    Logout endpoint
    In a real application, you might want to blacklist the token
    """
    return {"message": "Successfully logged out"}
