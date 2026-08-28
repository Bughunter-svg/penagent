from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import init_db
from app.api.endpoints import router as api_router

app = FastAPI(
    title="PenAgent Backend",
    description="Local AI-Assisted Bug-Bounty Recon Dashboard",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local app, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    import logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize DB schema
    await init_db()
    
    # Create required directories
    os.makedirs("./data", exist_ok=True)
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("./data/reports", exist_ok=True)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
