# VFS Slot Checker - Complete Technical Guide

> A comprehensive guide to understanding, running, and extending the VFS Slot Checker service integrated with TravelHub.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Installation & Setup](#installation--setup)
5. [API Reference](#api-reference)
6. [Code Deep Dive](#code-deep-dive)
7. [Extending the System](#extending-the-system)
8. [Study Guide](#study-guide)
9. [Troubleshooting](#troubleshooting)
10. [Security Considerations](#security-considerations)

---

## Overview

### What is VFS Slot Checker?

VFS Slot Checker is a Python-based web scraping service that automatically checks VFS Global websites for available visa appointment slots. VFS Global is the company that handles visa applications for many embassies worldwide, and their appointment slots are often extremely difficult to book due to high demand.

### The Problem It Solves

1. **Manual Checking is Tedious**: People have to manually refresh VFS websites dozens of times daily
2. **Slots Disappear Fast**: Available slots often get booked within seconds
3. **No API Available**: VFS doesn't provide a public API to check availability
4. **Bot Detection**: VFS websites have anti-bot measures that block simple scripts

### Our Solution

- **Browser Automation**: Uses Playwright to control a real browser
- **Stealth Mode**: Applies techniques to avoid bot detection
- **REST API**: Exposes the functionality via a clean FastAPI interface
- **Integration Ready**: Connects seamlessly with the TravelHub Next.js app

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TravelHub (Next.js)                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           components/visa/slot-finder.tsx                    │   │
│  │  - Calendar UI for date selection                            │   │
│  │  - Credentials input form                                    │   │
│  │  - Real-time slot display                                    │   │
│  │  - Monitoring status                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              app/api/vfs/check-slot/route.ts                 │   │
│  │  - Validates request                                         │   │
│  │  - Transforms camelCase ↔ snake_case                         │   │
│  │  - Proxies to Python service                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (localhost:8000)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              VFS Slot Checker (Python FastAPI)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    api_server.py                             │   │
│  │  - FastAPI application                                       │   │
│  │  - CORS middleware for Next.js                               │   │
│  │  - Request validation (Pydantic)                             │   │
│  │  - Background monitoring tasks                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    bot_factory.py                            │   │
│  │  - Factory pattern for creating bots                         │   │
│  │  - Maps country codes to bot implementations                 │   │
│  │  - Returns supported countries/categories                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────┬──────────────┬──────────────┐                    │
│  │ vfs_bot_de.py│ vfs_bot_gb.py│ vfs_bot_it.py│                    │
│  │   Germany    │      UK      │    Italy     │                    │
│  └──────────────┴──────────────┴──────────────┘                    │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      vfs_bot.py                              │   │
│  │  - Abstract base class                                       │   │
│  │  - Playwright browser control                                │   │
│  │  - Stealth mode application                                  │   │
│  │  - Login flow orchestration                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Playwright (Chromium)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VFS Global Website                               │
│  - https://visa.vfsglobal.com/nga/en/deu/                          │
│  - Authentication required                                          │
│  - Dynamic content (React/Angular)                                  │
│  - Bot detection measures                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Step-by-Step Flow

#### 1. User Initiates Slot Check (Frontend)

```typescript
// In slot-finder.tsx
const checkVFSSlots = async () => {
  const response = await fetch("/api/vfs/check-slot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceCountry: "NG",           // Nigeria
      destinationCountry: "DE",       // Germany
      visaCenter: "Lagos",
      visaCategory: "National Visa",
      visaSubCategory: "Study",
      email: "user@example.com",
      password: "vfs_password",
    }),
  });
  
  const data = await response.json();
  // Handle slots...
};
```

#### 2. Next.js API Route Proxies Request

```typescript
// In app/api/vfs/check-slot/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Transform to snake_case for Python
  const pythonRequest = {
    source_country: body.sourceCountry,
    destination_country: body.destinationCountry,
    // ...
  };

  // Forward to Python service
  const response = await fetch(`${VFS_CHECKER_URL}/api/check-slot`, {
    method: 'POST',
    body: JSON.stringify(pythonRequest),
  });
  
  // Transform response back to camelCase
  return NextResponse.json(result);
}
```

#### 3. Python API Receives and Processes

```python
# In api_server.py
@app.post("/api/check-slot")
async def check_slot(request: SlotCheckRequest):
    # Get appropriate bot for the destination
    bot = get_vfs_bot(request.source_country, request.destination_country)
    
    # Check for slots
    slots = bot.check_slots(
        email=request.email,
        password=request.password,
        appointment_params={...},
        headless=True,  # Run browser without GUI
    )
    
    return SlotCheckResponse(
        success=True,
        slots=slots,
        checked_at=datetime.utcnow().isoformat(),
    )
```

#### 4. Bot Factory Creates Appropriate Bot

```python
# In bot_factory.py
def get_vfs_bot(source_country: str, destination_country: str) -> VfsBot:
    """Factory function to get the appropriate VFS bot."""
    
    destination_country = destination_country.upper()
    
    if destination_country == "DE":
        return VfsBotDE(source_country, destination_country)
    elif destination_country == "GB":
        return VfsBotGB(source_country, destination_country)
    elif destination_country == "IT":
        return VfsBotIT(source_country, destination_country)
    else:
        raise UnsupportedCountryError(f"No bot for {destination_country}")
```

#### 5. VFS Bot Automates Browser

```python
# In vfs_bot.py (base class)
def check_slots(self, email, password, appointment_params, headless=True):
    with sync_playwright() as p:
        # Launch real Chromium browser
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context()
        
        # Apply stealth techniques to avoid detection
        with stealth.apply_stealth(context):
            page = context.new_page()
            
            # Navigate to VFS website
            page.goto(vfs_url, timeout=60000)
            
            # Country-specific pre-login steps
            self.pre_login_steps(page)
            
            # Login with credentials
            self.login(page, email, password)
            
            # Check for available appointments
            slots = self.check_for_appointment(page, appointment_params)
            
    return slots
```

#### 6. Country-Specific Implementation

```python
# In vfs_bot_de.py (Germany-specific)
class VfsBotDE(VfsBot):
    
    def login(self, page, email, password):
        # Click login button
        page.click("button:has-text('Sign In')")
        page.wait_for_timeout(1000)
        
        # Fill credentials
        page.fill("input[type='email']", email)
        page.fill("input[type='password']", password)
        
        # Submit and wait for navigation
        page.click("button[type='submit']")
        page.wait_for_load_state("networkidle")
    
    def check_for_appointment(self, page, params):
        # Select visa center
        page.select_option("#visa_center", params["visa_center"])
        
        # Select category
        page.select_option("#visa_category", params["visa_category"])
        
        # Look for available dates
        date_elements = page.query_selector_all(".available-date")
        
        slots = []
        for el in date_elements:
            date_text = el.inner_text()
            slots.append(AppointmentSlot(date=date_text))
        
        return slots
```

---

## Installation & Setup

### Prerequisites

- Python 3.8+
- Node.js 18+ (for Next.js)
- pnpm (package manager)

### Step 1: Set Up Python Service

```bash
# Navigate to the service directory
cd travelhub/services/vfs-slot-checker

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### Step 2: Start the Python API

```bash
# From the vfs-slot-checker directory
./venv/bin/python api_server.py

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Verify It's Working

```bash
# Health check
curl http://localhost:8000/

# Expected response:
# {"status":"ok","service":"VFS Slot Checker","version":"1.0.0"}

# Get supported countries
curl http://localhost:8000/api/supported-countries
```

### Step 4: Start TravelHub (Next.js)

```bash
# In a separate terminal
cd travelhub
pnpm dev
```

---

## API Reference

### Base URL

```
http://localhost:8000
```

### Endpoints

#### GET /
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "VFS Slot Checker",
  "version": "1.0.0"
}
```

---

#### GET /api/supported-countries
Returns all supported destination countries with their visa centers and categories.

**Response:**
```json
{
  "destinations": {
    "DE": {
      "name": "Germany",
      "visa_centers": {
        "NG": ["Lagos", "Abuja"],
        "GH": ["Accra"]
      },
      "visa_categories": ["National Visa", "Schengen Visa"],
      "visa_sub_categories": ["Work Visa", "Student Visa", "Family Reunion"]
    }
  }
}
```

---

#### POST /api/check-slot
Check for available VFS appointment slots.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source_country | string | Yes | ISO 3166-1 alpha-2 code (e.g., "NG") |
| destination_country | string | Yes | ISO 3166-1 alpha-2 code (e.g., "DE") |
| visa_center | string | Yes | Visa center name (e.g., "Lagos") |
| visa_category | string | Yes | Category (e.g., "National Visa") |
| visa_sub_category | string | Yes | Sub-category (e.g., "Student Visa") |
| email | string | Yes | VFS account email |
| password | string | Yes | VFS account password |
| headless | boolean | No | Run browser without GUI (default: true) |

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/check-slot \
  -H "Content-Type: application/json" \
  -d '{
    "source_country": "NG",
    "destination_country": "DE",
    "visa_center": "Lagos",
    "visa_category": "National Visa",
    "visa_sub_category": "Student Visa",
    "email": "your-email@example.com",
    "password": "your-vfs-password"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Found 2 available slot(s)",
  "slots": [
    {
      "date": "2026-02-15",
      "time": "09:00",
      "location": "VFS Global Lagos",
      "appointment_type": "Biometric Submission"
    }
  ],
  "checked_at": "2026-01-31T19:00:00"
}
```

**Error Response:**
```json
{
  "detail": "VFS Login failed: Invalid credentials"
}
```

---

#### POST /api/start-monitoring
Start background monitoring for slot availability.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source_country | string | Yes | ISO 3166-1 alpha-2 code |
| destination_country | string | Yes | ISO 3166-1 alpha-2 code |
| visa_center | string | Yes | Visa center name |
| visa_category | string | Yes | Category |
| visa_sub_category | string | Yes | Sub-category |
| email | string | Yes | VFS account email |
| password | string | Yes | VFS account password |
| check_interval_minutes | integer | No | Check interval (default: 30, min: 5) |
| notify_email | string | No | Email for notifications |
| notify_webhook | string | No | Webhook URL for notifications |

**Response:**
```json
{
  "success": true,
  "job_id": "NG-DE-1706727600",
  "message": "Monitoring started"
}
```

---

#### GET /api/monitoring/{job_id}
Get the status of a monitoring job.

**Response:**
```json
{
  "status": "running",
  "started_at": "2026-01-31T18:00:00",
  "last_check": "2026-01-31T18:30:00",
  "slots_found": []
}
```

---

#### DELETE /api/monitoring/{job_id}
Stop a monitoring job.

**Response:**
```json
{
  "success": true,
  "message": "Monitoring stopped"
}
```

---

## Code Deep Dive

### File Structure

```
services/vfs-slot-checker/
├── api_server.py           # FastAPI REST server
├── requirements.txt        # Python dependencies
├── start.sh               # Startup script
├── README.md              # Documentation
├── config/
│   ├── config.example.ini # Configuration template
│   └── vfs_urls.ini       # VFS URL mappings
└── vfs_checker/
    ├── __init__.py        # Package exports
    ├── bot_factory.py     # Factory pattern for bots
    ├── config.py          # Configuration loader
    ├── date_utils.py      # Date extraction utilities
    ├── vfs_bot.py         # Abstract base class
    ├── vfs_bot_de.py      # Germany implementation
    ├── vfs_bot_gb.py      # UK implementation
    └── vfs_bot_it.py      # Italy implementation
```

### Key Files Explained

#### 1. `api_server.py` - The REST API

This is the entry point. It uses FastAPI to create a web server.

```python
# Key components:

# 1. Pydantic Models for request/response validation
class SlotCheckRequest(BaseModel):
    source_country: str = Field(..., min_length=2, max_length=2)
    destination_country: str = Field(..., min_length=2, max_length=2)
    # ... Pydantic validates all incoming data

# 2. CORS Middleware for browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", ...],  # Next.js URLs
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Async endpoints for non-blocking I/O
@app.post("/api/check-slot")
async def check_slot(request: SlotCheckRequest):
    # The actual bot work happens synchronously
    # but the API can handle multiple requests
```

#### 2. `vfs_bot.py` - The Base Class

This defines the interface all country-specific bots must implement.

```python
class VfsBot(ABC):
    """Abstract base class using the Template Method pattern."""
    
    def check_slots(self, email, password, params, headless):
        """Template method that orchestrates the flow."""
        # 1. Launch browser with stealth
        # 2. Navigate to VFS URL
        # 3. Call pre_login_steps() - abstract
        # 4. Call login() - abstract
        # 5. Call check_for_appointment() - abstract
        # 6. Return results
    
    @abstractmethod
    def pre_login_steps(self, page):
        """Country-specific steps before login."""
        pass
    
    @abstractmethod
    def login(self, page, email, password):
        """Country-specific login implementation."""
        pass
    
    @abstractmethod
    def check_for_appointment(self, page, params):
        """Country-specific appointment checking."""
        pass
```

#### 3. `vfs_bot_de.py` - Germany Implementation

Each country has different VFS website layouts.

```python
class VfsBotDE(VfsBot):
    """Germany-specific VFS bot."""
    
    def pre_login_steps(self, page):
        # Germany VFS might show a language selector
        try:
            page.click("text=English", timeout=3000)
        except:
            pass  # Already in English
    
    def login(self, page, email, password):
        # Find and click login button
        page.click("button:has-text('Sign In')")
        page.wait_for_timeout(1000)
        
        # Fill form
        page.fill("input[type='email']", email)
        page.fill("input[type='password']", password)
        
        # Submit
        page.click("button[type='submit']")
        page.wait_for_load_state("networkidle")
    
    def check_for_appointment(self, page, params):
        # Navigate to appointment section
        # Select options from dropdowns
        # Scrape available dates
        # Return as AppointmentSlot objects
```

#### 4. `bot_factory.py` - Factory Pattern

Creates the right bot based on destination country.

```python
# Mapping of supported destinations
SUPPORTED_DESTINATIONS = {
    "DE": {
        "name": "Germany",
        "visa_centers": {
            "NG": ["Lagos", "Abuja"],
            "GH": ["Accra"],
        },
        "visa_categories": ["National Visa", "Schengen Visa"],
        "visa_sub_categories": ["Work Visa", "Student Visa"],
    },
    # ... more countries
}

def get_vfs_bot(source_country: str, destination_country: str) -> VfsBot:
    """Factory function - returns appropriate bot instance."""
    
    if destination_country == "DE":
        return VfsBotDE(source_country, destination_country)
    elif destination_country == "GB":
        return VfsBotGB(source_country, destination_country)
    # ... more mappings
```

---

## Extending the System

### Adding a New Country

#### Step 1: Create the Bot File

```python
# vfs_checker/vfs_bot_fr.py
from .vfs_bot import VfsBot, AppointmentSlot

class VfsBotFR(VfsBot):
    """VFS Bot for France visa appointments."""
    
    def pre_login_steps(self, page):
        # France-specific setup
        pass
    
    def login(self, page, email, password):
        # France VFS login flow
        # Study the website structure first!
        page.click("#login-btn")
        page.fill("#email", email)
        page.fill("#password", password)
        page.click("#submit")
        page.wait_for_load_state("networkidle")
    
    def check_for_appointment(self, page, params):
        # France-specific appointment checking
        slots = []
        # ... implementation
        return slots
```

#### Step 2: Register in Factory

```python
# In bot_factory.py

from .vfs_bot_fr import VfsBotFR

SUPPORTED_DESTINATIONS = {
    # ... existing countries
    "FR": {
        "name": "France",
        "visa_centers": {
            "NG": ["Lagos"],
            "GH": ["Accra"],
        },
        "visa_categories": ["Schengen Visa"],
        "visa_sub_categories": ["Tourist", "Business", "Student"],
    },
}

def get_vfs_bot(source_country: str, destination_country: str) -> VfsBot:
    # ... existing code
    elif destination_country == "FR":
        return VfsBotFR(source_country, destination_country)
```

#### Step 3: Add URL Configuration

```ini
# In config/vfs_urls.ini
[vfs-url]
NG-FR = https://visa.vfsglobal.com/nga/en/fra/
GH-FR = https://visa.vfsglobal.com/gha/en/fra/
```

---

## Study Guide

### Concepts to Learn

#### 1. **Web Scraping Fundamentals**
- How websites render content (HTML, CSS, JavaScript)
- DOM structure and element selection
- XPath vs CSS selectors
- Handling dynamic content (SPAs)

**Resources:**
- [MDN Web Docs - DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [CSS Selectors Guide](https://www.w3schools.com/cssref/css_selectors.php)

#### 2. **Playwright Automation**
- Browser contexts and pages
- Element selectors (`page.click()`, `page.fill()`)
- Waiting strategies (`wait_for_selector`, `wait_for_load_state`)
- Screenshots and debugging

**Resources:**
- [Playwright Python Docs](https://playwright.dev/python/docs/intro)
- [Playwright Selectors](https://playwright.dev/python/docs/selectors)

```python
# Key Playwright patterns:

# Wait for element
page.wait_for_selector("#element-id", timeout=10000)

# Click with text
page.click("button:has-text('Submit')")

# Fill form
page.fill("input[name='email']", "user@example.com")

# Select dropdown
page.select_option("select#country", "Nigeria")

# Get text content
text = page.inner_text(".result-class")

# Screenshot for debugging
page.screenshot(path="debug.png")
```

#### 3. **Bot Detection & Evasion**
- Browser fingerprinting
- Headless detection
- Rate limiting
- CAPTCHAs

**How playwright-stealth helps:**
```python
from playwright_stealth import Stealth

stealth = Stealth()
with stealth.apply_stealth(context):
    # Browser now appears more human-like
    # - Hides webdriver flag
    # - Spoofs navigator properties
    # - Adds human-like behavior
```

#### 4. **Python Async & Concurrency**
- `async`/`await` syntax
- FastAPI's async request handling
- Background tasks
- Thread vs Process

```python
# FastAPI async endpoint
@app.post("/api/check")
async def check():
    # Non-blocking I/O
    result = await some_async_operation()
    return result

# Background task
@app.post("/api/monitor")
async def start_monitor(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_monitoring, params)
    return {"status": "started"}
```

#### 5. **Design Patterns**
- **Factory Pattern**: Creating objects without specifying exact class
- **Template Method**: Define algorithm skeleton, defer steps to subclasses
- **Dependency Injection**: Pass dependencies rather than hardcode

```python
# Factory Pattern in our code
def get_vfs_bot(destination: str) -> VfsBot:
    if destination == "DE":
        return VfsBotDE()
    elif destination == "GB":
        return VfsBotGB()

# Template Method
class VfsBot(ABC):
    def check_slots(self):  # Template
        self.pre_login()    # Hook
        self.login()        # Abstract
        self.check()        # Abstract
```

### Recommended Learning Path

1. **Week 1: Python Basics**
   - Virtual environments
   - Package management (pip)
   - Type hints
   - Dataclasses

2. **Week 2: Web Fundamentals**
   - HTTP request/response
   - HTML/CSS basics
   - Browser DevTools
   - DOM inspection

3. **Week 3: Playwright**
   - Installation and setup
   - Basic navigation and clicks
   - Form filling
   - Debugging techniques

4. **Week 4: FastAPI**
   - Creating endpoints
   - Pydantic models
   - Request validation
   - Background tasks

5. **Week 5: Integration**
   - Connect frontend to backend
   - Error handling
   - Testing
   - Deployment

### Hands-On Exercises

#### Exercise 1: Debug a Failing Login
```python
# Try running with headless=False to see the browser
curl -X POST http://localhost:8000/api/check-slot \
  -H "Content-Type: application/json" \
  -d '{
    "source_country": "NG",
    "destination_country": "DE",
    "visa_center": "Lagos",
    "visa_category": "National Visa",
    "visa_sub_category": "Student Visa",
    "email": "test@example.com",
    "password": "wrong_password",
    "headless": false
  }'
```

#### Exercise 2: Add Screenshot on Error
```python
# Modify vfs_bot.py to save screenshot on error
try:
    self.login(page, email, password)
except Exception as e:
    page.screenshot(path=f"error_{datetime.now().timestamp()}.png")
    raise
```

#### Exercise 3: Implement a New Country
1. Pick a country from [VFS Global](https://www.vfsglobal.com/)
2. Study the website structure using DevTools
3. Create `vfs_bot_xx.py`
4. Test with real credentials

---

## Troubleshooting

### Common Issues

#### 1. "ModuleNotFoundError: No module named 'playwright'"
```bash
# Solution: Install in the virtual environment
source venv/bin/activate
pip install playwright
playwright install chromium
```

#### 2. "Browser is not executable"
```bash
# Solution: Install browser binaries
playwright install chromium
```

#### 3. "Login failed" errors
- Check credentials are correct
- Run with `headless: false` to see what's happening
- VFS might have changed their website structure

#### 4. "Timeout waiting for selector"
- Element selector might have changed
- Use browser DevTools to find new selector
- Add explicit waits

#### 5. "Bot detected" / CAPTCHA
- Increase delays between actions
- Try different browser settings
- Consider using residential proxies

### Debug Mode

```python
# Run with visible browser and verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)

# In your request:
{
    "headless": false,  # See the browser
    ...
}
```

---

## Security Considerations

### Credential Handling

⚠️ **Never store VFS credentials in plain text!**

Current implementation:
- Credentials are passed per-request
- Not stored in database
- Not logged

Recommended improvements:
```python
# Use environment variables
VFS_EMAIL = os.getenv("VFS_EMAIL")
VFS_PASSWORD = os.getenv("VFS_PASSWORD")

# Or encrypted storage
from cryptography.fernet import Fernet
encrypted_password = fernet.encrypt(password.encode())
```

### Rate Limiting

- VFS may block IPs that make too many requests
- Implement exponential backoff
- Consider rotating proxies for production

### Ethical Considerations

- Only use for personal visa applications
- Don't overload VFS servers
- Respect terms of service
- Don't sell or share the service commercially

---

## Quick Reference

### Start the Services

**Option 1: Automatic (via TravelHub UI)**
- Just open TravelHub - the VFS service will auto-start when you access the Slot Finder
- If service shows "Offline", click the status indicator to start it

**Option 2: Manual**
```bash
# Terminal 1: Start VFS Checker (Python)
cd travelhub/services/vfs-slot-checker
./venv/bin/python api_server.py

# Terminal 2: Start TravelHub (Next.js)
cd travelhub
pnpm dev
```

### URLs
- **TravelHub**: http://localhost:3000
- **VFS API**: http://localhost:8000
- **VFS API Docs**: http://localhost:8000/docs

### Stop the Services

```bash
# Find the processes
lsof -i :8000
lsof -i :3000

# Kill them
kill -9 <PID>
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/

# Supported countries
curl http://localhost:8000/api/supported-countries

# Check slot (requires real credentials)
curl -X POST http://localhost:8000/api/check-slot \
  -H "Content-Type: application/json" \
  -d '{"source_country":"NG","destination_country":"DE",...}'
```

### View Logs

```bash
# If running in background
tail -f /tmp/vfs-checker.log
```

---

## Glossary

| Term | Definition |
|------|------------|
| **VFS Global** | Company that processes visa applications for embassies |
| **Playwright** | Browser automation library (like Selenium but modern) |
| **Stealth** | Techniques to avoid bot detection |
| **FastAPI** | Modern Python web framework |
| **Pydantic** | Data validation library |
| **Headless** | Running browser without visible window |
| **ISO 3166-1** | Standard for country codes (NG=Nigeria, DE=Germany) |
| **CORS** | Cross-Origin Resource Sharing (allows frontend to call backend) |
| **Factory Pattern** | Design pattern for creating objects |
| **Template Method** | Design pattern for defining algorithm skeleton |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests
4. Submit pull request

---

*Last updated: January 31, 2026*
