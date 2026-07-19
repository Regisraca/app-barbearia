from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from bson import ObjectId
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class UserRole:
    ADMIN = "admin"
    BARBER = "barber"
    CLIENT = "client"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: str = UserRole.CLIENT

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int

class ServiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    created_at: datetime

class BarberCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    specialties: List[str] = []

class BarberResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    specialties: List[str]
    qr_code: Optional[str] = None
    created_at: datetime

class BookingCreate(BaseModel):
    service_id: str
    barber_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    payment_method: str  # "prepaid" or "onsite"
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    service_id: str
    service_name: str
    barber_id: str
    barber_name: str
    date: str
    time: str
    status: str  # "pending", "confirmed", "completed", "cancelled"
    payment_method: str
    payment_status: str  # "pending", "paid"
    notes: Optional[str] = None
    created_at: datetime

# ===== HELPER FUNCTIONS =====

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

def generate_qr_code(barber_id: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"barber:{barber_id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

# ===== AUTH ROUTES =====

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Generate token
    token = create_access_token({"user_id": str(result.inserted_id)})
    
    user_response = UserResponse(
        id=str(user_dict["_id"]),
        email=user_dict["email"],
        name=user_dict["name"],
        phone=user_dict["phone"],
        role=user_dict["role"],
        created_at=user_dict["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"user_id": str(user["_id"])})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

# ===== SERVICE ROUTES (Admin only) =====

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    service_dict = {
        **service_data.dict(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.services.insert_one(service_dict)
    service_dict["_id"] = result.inserted_id
    
    return ServiceResponse(
        id=str(service_dict["_id"]),
        **service_data.dict(),
        created_at=service_dict["created_at"]
    )

@api_router.get("/services", response_model=List[ServiceResponse])
async def get_services():
    services = await db.services.find().to_list(100)
    return [
        ServiceResponse(
            id=str(service["_id"]),
            name=service["name"],
            description=service.get("description"),
            price=service["price"],
            duration_minutes=service["duration_minutes"],
            created_at=service["created_at"]
        )
        for service in services
    ]

@api_router.delete("/services/{service_id}", status_code=204)
async def delete_service(
    service_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    result = await db.services.delete_one({"_id": ObjectId(service_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return None

# ===== BARBER ROUTES =====

@api_router.post("/barbers", response_model=BarberResponse)
async def create_barber(
    barber_data: BarberCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    # Check if barber email exists
    existing = await db.users.find_one({"email": barber_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create barber user
    user_dict = {
        "email": barber_data.email,
        "password": hash_password(barber_data.password),
        "name": barber_data.name,
        "phone": barber_data.phone,
        "role": UserRole.BARBER,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    barber_id = str(result.inserted_id)
    
    # Create barber profile
    barber_profile = {
        "user_id": barber_id,
        "bio": barber_data.bio,
        "specialties": barber_data.specialties,
        "qr_code": generate_qr_code(barber_id),
        "created_at": datetime.utcnow()
    }
    
    await db.barber_profiles.insert_one(barber_profile)
    
    return BarberResponse(
        id=barber_id,
        email=barber_data.email,
        name=barber_data.name,
        phone=barber_data.phone,
        bio=barber_data.bio,
        specialties=barber_data.specialties,
        qr_code=barber_profile["qr_code"],
        created_at=user_dict["created_at"]
    )

@api_router.get("/barbers", response_model=List[BarberResponse])
async def get_barbers():
    barbers = await db.users.find({"role": UserRole.BARBER}).to_list(100)
    result = []
    
    for barber in barbers:
        profile = await db.barber_profiles.find_one({"user_id": str(barber["_id"])})
        result.append(BarberResponse(
            id=str(barber["_id"]),
            email=barber["email"],
            name=barber["name"],
            phone=barber.get("phone"),
            bio=profile.get("bio") if profile else None,
            specialties=profile.get("specialties", []) if profile else [],
            qr_code=profile.get("qr_code") if profile else None,
            created_at=barber["created_at"]
        ))
    
    return result

@api_router.get("/barbers/{barber_id}", response_model=BarberResponse)
async def get_barber(barber_id: str):
    barber = await db.users.find_one({"_id": ObjectId(barber_id), "role": UserRole.BARBER})
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    profile = await db.barber_profiles.find_one({"user_id": barber_id})
    
    return BarberResponse(
        id=str(barber["_id"]),
        email=barber["email"],
        name=barber["name"],
        phone=barber.get("phone"),
        bio=profile.get("bio") if profile else None,
        specialties=profile.get("specialties", []) if profile else [],
        qr_code=profile.get("qr_code") if profile else None,
        created_at=barber["created_at"]
    )

# ===== BOOKING ROUTES =====

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify service and barber exist
    service = await db.services.find_one({"_id": ObjectId(booking_data.service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    barber = await db.users.find_one({"_id": ObjectId(booking_data.barber_id), "role": UserRole.BARBER})
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Check if time slot is available
    existing_booking = await db.bookings.find_one({
        "barber_id": booking_data.barber_id,
        "date": booking_data.date,
        "time": booking_data.time,
        "status": {"$nin": ["cancelled"]}
    })
    
    if existing_booking:
        raise HTTPException(status_code=400, detail="Time slot not available")
    
    # Create booking
    booking_dict = {
        "client_id": str(current_user["_id"]),
        "client_name": current_user["name"],
        "service_id": booking_data.service_id,
        "service_name": service["name"],
        "barber_id": booking_data.barber_id,
        "barber_name": barber["name"],
        "date": booking_data.date,
        "time": booking_data.time,
        "status": "confirmed",
        "payment_method": booking_data.payment_method,
        "payment_status": "paid" if booking_data.payment_method == "prepaid" else "pending",
        "notes": booking_data.notes,
        "created_at": datetime.utcnow()
    }
    
    result = await db.bookings.insert_one(booking_dict)
    booking_dict["_id"] = result.inserted_id
    
    return BookingResponse(
        id=str(booking_dict["_id"]),
        **{k: v for k, v in booking_dict.items() if k != "_id"}
    )

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = None
):
    query = {}
    
    # Filter based on user role
    if current_user["role"] == UserRole.CLIENT:
        query["client_id"] = str(current_user["_id"])
    elif current_user["role"] == UserRole.BARBER:
        query["barber_id"] = str(current_user["_id"])
    # Admin sees all bookings
    
    if status_filter:
        query["status"] = status_filter
    
    bookings = await db.bookings.find(query).sort("date", -1).to_list(100)
    
    return [
        BookingResponse(
            id=str(booking["_id"]),
            client_id=booking["client_id"],
            client_name=booking["client_name"],
            service_id=booking["service_id"],
            service_name=booking["service_name"],
            barber_id=booking["barber_id"],
            barber_name=booking["barber_name"],
            date=booking["date"],
            time=booking["time"],
            status=booking["status"],
            payment_method=booking["payment_method"],
            payment_status=booking["payment_status"],
            notes=booking.get("notes"),
            created_at=booking["created_at"]
        )
        for booking in bookings
    ]

@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,  # noqa: F811 - query param, distinct from `from fastapi import status`
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check permissions
    if current_user["role"] == UserRole.CLIENT and booking["client_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user["role"] == UserRole.BARBER and booking["barber_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": status}}
    )
    
    return {"message": "Booking status updated"}

@api_router.get("/bookings/available-slots")
async def get_available_slots(
    barber_id: str,
    date: str
):
    """Get available time slots for a barber on a specific date"""
    # Get all bookings for this barber on this date
    bookings = await db.bookings.find({
        "barber_id": barber_id,
        "date": date,
        "status": {"$nin": ["cancelled"]}
    }).to_list(100)
    
    booked_times = [booking["time"] for booking in bookings]
    
    # Generate time slots (9 AM to 6 PM, every 30 minutes)
    all_slots = []
    for hour in range(9, 18):
        all_slots.append(f"{hour:02d}:00")
        all_slots.append(f"{hour:02d}:30")
    
    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    return {"available_slots": available_slots}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
