from fastapi import (
    APIRouter, 
    Depends,
    HTTPException, 
    status
)
from sqlalchemy.orm import Session

from app.core import (
    get_db,
    PasswordService, 
    JwtManager
)

from .schemas import (
    SignInRequest,
    SignInResponse,
    ErrorResponse
)
from .services import UserServices


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/sign-in", 
    response_model=SignInResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Email not found",
        },
        status.HTTP_401_UNAUTHORIZED: {
            "model": ErrorResponse,
            "description": "Incorrect password",
        },
    },
)
async def sign_in(
    request: SignInRequest,
    db: Session = Depends(get_db),
):
    password_service = PasswordService()
    jwt_manager = JwtManager()

    user_service = UserServices(
        db=db,
        password_service=password_service,
        jwt_manager=jwt_manager
    )

    result = await user_service.user_sign_in(
        email=request.email,
        password=request.password,
    )
    
    if result["code"] == "EMAIL_NOT_FOUND":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"],
        )

    if result["code"] == "INCORRECT_PASSWORD":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result["message"]
        )
        
    return result
