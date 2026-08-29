from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api.endpoints import router as api_router
from app.config import DATA_DIR, UPLOADS_DIR, REPORTS_DIR

app = FastAPI(
    title="PenAgent Backend",
    description="Local AI-Assisted Bug-Bounty Recon Dashboard",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    logging.basicConfig(level=logging.INFO)
    for directory in (DATA_DIR, UPLOADS_DIR, REPORTS_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    await init_db()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
