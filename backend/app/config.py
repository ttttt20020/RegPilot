from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://regpilot:regpilot@localhost:5432/regpilot"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "https://api.openai.com/v1/chat/completions"
    LLM_MODEL: str = "gpt-4o-mini"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    REPORT_DIR: str = "/tmp/regpilot_reports"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
