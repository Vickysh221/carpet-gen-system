from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.settings import DATA_ROOT
from app.services.preference_store import init_preference_db

app = FastAPI(
    title="Carpet Gen System API",
    version="0.1.0",
    description="FastAPI skeleton for preference-driven carpet pattern generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if DATA_ROOT.exists():
    app.mount("/data", StaticFiles(directory=DATA_ROOT), name="data")

init_preference_db()
