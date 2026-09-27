
from pydantic import BaseModel, EmailStr , ConfigDict, Field


class SignInRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "hellofriend@gmail.com",
                "password": "password",
            }
        }
    )
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Password must be between 8 and 128 characters long.")
    
class UserResponse(BaseModel):
    name: str
    email: EmailStr
    access_token: str
    refresh_token: str

class SignInResponse(BaseModel):
    success: bool
    message: str
    details: dict | None
    
class ErrorResponse(BaseModel):
    detail: str