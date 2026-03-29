from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ENV_FILE_PATH, ROOT_ENV_FILE_PATH, get_settings
from app.routes import agro_context, copilot, predict, recommend

settings = get_settings()

app = FastAPI(
    title="Dr. Crop API",
    description="Crop disease detection and recommendation engine",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, tags=["prediction"])
app.include_router(recommend.router, tags=["recommendation"])
app.include_router(agro_context.router, tags=["field-data"])
app.include_router(copilot.router, tags=["copilot"])


@app.get("/")
async def root():
    return {
        "service": "Dr. Crop API",
        "docs": "/docs",
        "health": "/health",
        "frontend": "http://localhost:3000",
        "hint": "Run `npm run dev` in the frontend/ folder for the PWA.",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    """Use this to see why /predict might return 503 (missing key, wrong .env path)."""
    s = get_settings()
    return {
        "status": "ok",
        "llm_api_key_configured": bool(s.llm_api_key and s.llm_api_key.strip()),
        "env_file_backend": str(ENV_FILE_PATH),
        "env_file_backend_exists": ENV_FILE_PATH.is_file(),
        "env_file_repo_root": str(ROOT_ENV_FILE_PATH),
        "env_file_repo_root_exists": ROOT_ENV_FILE_PATH.is_file(),
        "llm_base_url": s.llm_base_url,
        "vision_model": s.vision_model,
        "llm_model": s.llm_model,
        "cors_origins": s.allowed_origins,
    }
