from sqlalchemy.orm import Session
from app.authentication.users.models import Users
from app.core import PasswordService, JwtManager

class UserServices:
    def __init__(
        self, 
        db: Session, 
        password_service: PasswordService,
        jwt_manager: JwtManager
    ):
        self.db = db
        self.password_service = password_service
        self.jwt_manager = jwt_manager

    async def user_sign_in(self, email: str, password: str):
        
        user = (
            self.db.query(Users).
            filter(Users.email == email).
            first()
        )
        
        if not user:
            return {
                "success": False,
                "message": "Email not found",
                "code": "EMAIL_NOT_FOUND",
                "details": None,
            }

        if not self.password_service.verify_password(password, user.password):
            return {
                "success": False,
                "message": "Incorrect password",
                "code": "INCORRECT_PASSWORD",
                "details": None,
            }

            
        access_token = self.jwt_manager.create_access_token(
            data={
                "sub": str(user.id),
            }
        )
        
        refresh_token = self.jwt_manager.create_refresh_token(
            data={
                "sub": str(user.id),
            }
        )



        
        return {
            "success": True,
            "code": "LOGIN_SUCCESS",
            "details": {
                "name": user.name,
                "email": user.email,
                "access_token": access_token,
                "refresh_token": refresh_token
            },
        }