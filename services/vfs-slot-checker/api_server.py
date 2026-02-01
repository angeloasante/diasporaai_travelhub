"""
FastAPI server for the VFS Slot Checker service.

This provides a REST API for checking VFS appointment availability
that can be called from the TravelHub Next.js application.
"""

import asyncio
import logging
import os
from typing import Optional, List
from datetime import datetime
from contextlib import asynccontextmanager

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from vfs_checker.config import initialize_config
from vfs_checker.bot_factory import (
    get_vfs_bot,
    get_supported_countries,
    get_visa_centers,
    get_visa_categories,
    get_visa_sub_categories,
    UnsupportedCountryError,
)
from vfs_checker.vfs_bot import LoginError, SlotCheckError, AppointmentSlot


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Pydantic models for API
class SlotCheckRequest(BaseModel):
    """Request model for slot checking."""
    source_country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 source country code")
    destination_country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 destination country code")
    visa_center: str = Field(..., description="VFS visa center name")
    visa_category: str = Field(..., description="Visa category")
    visa_sub_category: str = Field(..., description="Visa sub-category")
    email: str = Field(..., description="VFS account email")
    password: str = Field(..., description="VFS account password")
    headless: bool = Field(default=True, description="Run browser in headless mode")


class SlotInfo(BaseModel):
    """Model for appointment slot information."""
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None


class SlotCheckResponse(BaseModel):
    """Response model for slot checking."""
    success: bool
    message: str
    slots: List[SlotInfo] = []
    checked_at: str


class CountryInfo(BaseModel):
    """Model for country information."""
    code: str
    name: str
    visa_centers: List[str] = []
    visa_categories: List[str] = []
    visa_sub_categories: List[str] = []


class SupportedCountriesResponse(BaseModel):
    """Response model for supported countries."""
    destinations: dict


class VisaCentersRequest(BaseModel):
    """Request model for getting visa centers."""
    source_country: str
    destination_country: str


class VisaCentersResponse(BaseModel):
    """Response model for visa centers."""
    visa_centers: List[str]


class VisaCategoriesRequest(BaseModel):
    """Request model for getting visa categories."""
    destination_country: str


class VisaCategoriesResponse(BaseModel):
    """Response model for visa categories."""
    visa_categories: List[str]
    visa_sub_categories: List[str]


# Store for monitoring jobs
monitoring_jobs = {}


class MonitoringRequest(BaseModel):
    """Request for starting slot monitoring."""
    source_country: str
    destination_country: str
    visa_center: str
    visa_category: str
    visa_sub_category: str
    email: str
    password: str
    check_interval_minutes: int = Field(default=30, ge=5, le=240)
    notify_email: Optional[str] = None
    notify_webhook: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Starting VFS Slot Checker API...")
    initialize_config()
    yield
    # Shutdown
    logger.info("Shutting down VFS Slot Checker API...")


# Create FastAPI app
app = FastAPI(
    title="TravelHub VFS Slot Checker API",
    description="API for checking VFS Global appointment slot availability",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        os.getenv("TRAVELHUB_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    from vfs_checker.vfs_bot import captcha_solver
    
    return {
        "status": "ok",
        "service": "VFS Slot Checker",
        "version": "1.0.0",
        "captcha_solver": {
            "configured": captcha_solver.is_configured,
            "service": captcha_solver.service if captcha_solver.is_configured else None,
        }
    }


@app.get("/api/captcha-status")
async def captcha_status():
    """Check CAPTCHA solver configuration and balance."""
    from vfs_checker.vfs_bot import captcha_solver
    
    if not captcha_solver.is_configured:
        return {
            "configured": False,
            "message": "CAPTCHA solver not configured. Set CAPTCHA_API_KEY environment variable.",
            "supported_services": ["2captcha", "capsolver"],
        }
    
    balance = captcha_solver.get_balance()
    return {
        "configured": True,
        "service": captcha_solver.service,
        "balance": balance,
        "message": f"CAPTCHA solver ready ({captcha_solver.service})",
    }


@app.get("/api/supported-countries", response_model=SupportedCountriesResponse)
async def get_countries():
    """Get list of supported destination countries and their options."""
    return SupportedCountriesResponse(destinations=get_supported_countries())


@app.post("/api/visa-centers", response_model=VisaCentersResponse)
async def get_centers(request: VisaCentersRequest):
    """Get available visa centers for a source-destination pair."""
    centers = get_visa_centers(request.source_country, request.destination_country)
    return VisaCentersResponse(visa_centers=centers)


@app.post("/api/visa-categories", response_model=VisaCategoriesResponse)
async def get_categories(request: VisaCategoriesRequest):
    """Get available visa categories for a destination country."""
    categories = get_visa_categories(request.destination_country)
    sub_categories = get_visa_sub_categories(request.destination_country)
    return VisaCategoriesResponse(
        visa_categories=categories,
        visa_sub_categories=sub_categories
    )


@app.post("/api/check-slot", response_model=SlotCheckResponse)
async def check_slot(request: SlotCheckRequest):
    """
    Check for available VFS appointment slots.
    
    This endpoint performs a real-time check against the VFS website.
    Note: This operation may take 30-60 seconds to complete.
    """
    try:
        # Get the appropriate bot
        bot = get_vfs_bot(request.source_country, request.destination_country)
        
        # Prepare appointment parameters
        appointment_params = {
            "visa_center": request.visa_center,
            "visa_category": request.visa_category,
            "visa_sub_category": request.visa_sub_category,
        }
        
        # Run the sync playwright code in a thread pool to avoid blocking
        def run_check():
            return bot.check_slots(
                email=request.email,
                password=request.password,
                appointment_params=appointment_params,
                headless=request.headless,
            )
        
        slots = await asyncio.to_thread(run_check)
        
        # Convert to response format
        slot_infos = [
            SlotInfo(
                date=slot.date,
                time=slot.time,
                location=slot.location,
                appointment_type=slot.appointment_type,
            )
            for slot in slots
        ]
        
        return SlotCheckResponse(
            success=True,
            message=f"Found {len(slots)} available slot(s)" if slots else "No slots available",
            slots=slot_infos,
            checked_at=datetime.utcnow().isoformat(),
        )
        
    except UnsupportedCountryError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LoginError as e:
        raise HTTPException(status_code=401, detail=f"VFS Login failed: {e}")
    except SlotCheckError as e:
        raise HTTPException(status_code=500, detail=f"Slot check failed: {e}")
    except Exception as e:
        logger.exception("Unexpected error during slot check")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.post("/api/start-monitoring")
async def start_monitoring(request: MonitoringRequest, background_tasks: BackgroundTasks):
    """
    Start background monitoring for slot availability.
    
    This will periodically check for slots and notify via configured channels.
    """
    job_id = f"{request.source_country}-{request.destination_country}-{datetime.utcnow().timestamp()}"
    
    # Store job info
    monitoring_jobs[job_id] = {
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
        "request": request.model_dump(exclude={"password"}),
        "last_check": None,
        "slots_found": [],
    }
    
    # Add background task
    background_tasks.add_task(
        run_monitoring,
        job_id,
        request,
    )
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Monitoring started",
    }


@app.get("/api/monitoring/{job_id}")
async def get_monitoring_status(job_id: str):
    """Get the status of a monitoring job."""
    if job_id not in monitoring_jobs:
        raise HTTPException(status_code=404, detail="Monitoring job not found")
    
    return monitoring_jobs[job_id]


@app.delete("/api/monitoring/{job_id}")
async def stop_monitoring(job_id: str):
    """Stop a monitoring job."""
    if job_id not in monitoring_jobs:
        raise HTTPException(status_code=404, detail="Monitoring job not found")
    
    monitoring_jobs[job_id]["status"] = "stopped"
    return {"success": True, "message": "Monitoring stopped"}


async def run_monitoring(job_id: str, request: MonitoringRequest):
    """Background task for monitoring slot availability."""
    import asyncio
    
    while monitoring_jobs.get(job_id, {}).get("status") == "running":
        try:
            bot = get_vfs_bot(request.source_country, request.destination_country)
            
            appointment_params = {
                "visa_center": request.visa_center,
                "visa_category": request.visa_category,
                "visa_sub_category": request.visa_sub_category,
            }
            
            slots = bot.check_slots(
                email=request.email,
                password=request.password,
                appointment_params=appointment_params,
                headless=True,
            )
            
            monitoring_jobs[job_id]["last_check"] = datetime.utcnow().isoformat()
            
            if slots:
                monitoring_jobs[job_id]["slots_found"] = [
                    {
                        "date": slot.date,
                        "time": slot.time,
                        "location": slot.location,
                    }
                    for slot in slots
                ]
                
                # TODO: Send notification via webhook or email
                logger.info(f"Slots found for job {job_id}: {slots}")
                
        except Exception as e:
            logger.error(f"Error in monitoring job {job_id}: {e}")
            monitoring_jobs[job_id]["last_error"] = str(e)
        
        # Wait for next check
        await asyncio.sleep(request.check_interval_minutes * 60)


if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=int(os.getenv("VFS_CHECKER_PORT", 8000)),
        reload=True,
    )
