from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "WorkHub API"
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./data/workhub.db"
    bcrypt_rounds: int = 12
    # Demo/dev: delete all certification rows on startup. Set false in production.
    clear_certifications_on_start: bool = False

    # Login OTP email (SMTP). When unset, use login_otp_log_to_console for local dev only.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    login_otp_expire_minutes: int = 10
    login_otp_log_to_console: bool = False


settings = Settings()
