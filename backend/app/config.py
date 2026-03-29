from pathlib import Path
from typing import Annotated, Any

from dotenv import load_dotenv
from pydantic import AliasChoices, BeforeValidator, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (parent of app/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = _BACKEND_DIR / ".env"
# Repo root (often where users put a single .env for both frontend + backend)
_REPO_ROOT = _BACKEND_DIR.parent
ROOT_ENV_FILE_PATH = _REPO_ROOT / ".env"


def _load_env_files() -> None:
    """Load env vars from repo root first, then backend/.env (backend wins on duplicates)."""
    if ROOT_ENV_FILE_PATH.is_file():
        load_dotenv(ROOT_ENV_FILE_PATH, override=False, encoding="utf-8-sig")
    if ENV_FILE_PATH.is_file():
        load_dotenv(ENV_FILE_PATH, override=True, encoding="utf-8-sig")


_load_env_files()


def _parse_csv_origins(v: Any) -> list[str]:
    if v is None:
        return ["http://localhost:3000"]
    if isinstance(v, list):
        out = [str(x).strip() for x in v if str(x).strip()]
        return out if out else ["http://localhost:3000"]
    if isinstance(v, str):
        parts = [p.strip() for p in v.split(",") if p.strip()]
        return parts if parts else ["http://localhost:3000"]
    return ["http://localhost:3000"]


def _strip_secret(v: Any) -> str:
    if not isinstance(v, str):
        return ""
    s = v.strip()
    if len(s) >= 2 and ((s[0] == s[-1] == '"') or (s[0] == s[-1] == "'")):
        s = s[1:-1].strip()
    return s


class Settings(BaseSettings):
    """Environment variables: set LLM_API_KEY or OPENAI_API_KEY in backend/.env or repo-root .env."""

    exa_api_key: str = ""
    llm_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("LLM_API_KEY", "OPENAI_API_KEY"),
    )
    apify_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    vision_model: str = "gpt-4o-mini"
    openweathermap_api_key: str = ""
    model_path: str = "ml/model.pth"
    allowed_origins: Annotated[list[str], BeforeValidator(_parse_csv_origins)] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        validation_alias=AliasChoices("ALLOWED_ORIGINS"),
    )

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH if ENV_FILE_PATH.is_file() else None,
        env_file_encoding="utf-8-sig",
        env_ignore_empty=True,
        extra="ignore",
    )

    @field_validator("llm_api_key", "exa_api_key", "apify_api_key", "openweathermap_api_key", mode="after")
    @classmethod
    def strip_secret_fields(cls, v: str) -> str:
        return _strip_secret(v)


def get_settings() -> Settings:
    return Settings()
