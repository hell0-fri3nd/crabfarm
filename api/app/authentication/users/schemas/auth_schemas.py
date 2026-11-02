
from pydantic import (
    BaseModel, 
    EmailStr , 
    ConfigDict, 
    Field,
    field_validator
)



class SignInRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "example@gmail.com",
                "password": "password",
                "remember_me": False
            }
        }
    )
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Password must be between 8 and 128 characters long.")
    remember_me: bool = Field(default=False)

class PinRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "pin": "1234",
            }
        }
    )
    pin: str = Field(description="Pin must be exactly 4 digits.")

    @field_validator("pin")
    @classmethod
    def pin_must_be_4_digits(cls, value: str) -> str:
        if not (len(value) == 4 and value.isdigit()):
            raise ValueError("Pin must be exactly 4 digits")
        return value

class UserResponse(BaseModel):
    name: str
    email: EmailStr
    role: str
    access_token: str
    refresh_token: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    code: str | None
    details: dict | None
    
class ErrorResponse(BaseModel):
    detail: str
