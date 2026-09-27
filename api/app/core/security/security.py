from pwdlib import PasswordHash


class PasswordService:
    def __init__(self):
        self._hasher = PasswordHash.recommended()

    def hash_password(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify_password(
        self,
        password: str,
        hashed_password: str,
    ) -> bool:
        return self._hasher.verify(password, hashed_password)
