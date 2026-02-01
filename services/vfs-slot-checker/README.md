# TravelHub VFS Slot Checker

A Python service for checking VFS Global appointment slot availability, integrated with the TravelHub application.

Based on [vfs-appointment-bot](https://github.com/ranjan-mohanty/vfs-appointment-bot) by Ranjan Mohanty.

## Features

- Check VFS appointment availability for multiple countries
- Support for Germany (DE), Italy (IT), UK (GB), and extensible to other destinations
- RESTful API for integration with the TravelHub Next.js application
- Background monitoring with configurable intervals
- Notification support via Email, Telegram, and Twilio (planned)

## Installation

1. Create and activate a virtual environment:

```bash
cd travelhub/services/vfs-slot-checker
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows
```

2. Install dependencies:

```bash
pip install -r requirements.txt
playwright install chromium
```

3. (Optional) Configure the service by copying and editing the config file:

```bash
cp config/config.example.ini config/config.ini
```

## Quick Start

### Start the API Server

```bash
# From the vfs-slot-checker directory
python api_server.py
```

The API will be available at `http://localhost:8000`. The TravelHub Next.js app will automatically proxy requests to this service via `/api/vfs/*` routes.

### Check Service Health

```bash
curl http://localhost:8000/
```

### Check for Slots (Example)

```bash
curl -X POST http://localhost:8000/api/check-slot \
  -H "Content-Type: application/json" \
  -d '{
    "source_country": "NG",
    "destination_country": "DE",
    "visa_center": "Lagos",
    "visa_category": "National Visa",
    "visa_sub_category": "Study",
    "email": "your-vfs-email@example.com",
    "password": "your-vfs-password"
  }'
```

## API Endpoints

### GET /
Health check endpoint.

### GET /api/supported-countries
Get list of supported destination countries with their visa centers and categories.

### POST /api/visa-centers
Get available visa centers for a source-destination pair.

### POST /api/visa-categories
Get available visa categories for a destination country.

### POST /api/check-slot
Check for available VFS appointment slots.

**Request Body:**
```json
{
  "source_country": "NG",
  "destination_country": "DE",
  "visa_center": "Lagos",
  "visa_category": "National Visa",
  "visa_sub_category": "Work Visa",
  "email": "user@example.com",
  "password": "vfs_password",
  "headless": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 2 available slot(s)",
  "slots": [
    {
      "date": "2026-02-15",
      "time": "09:00",
      "location": "VFS Global - Lagos",
      "appointment_type": "Biometric Submission"
    }
  ],
  "checked_at": "2026-01-15T10:30:00"
}
```

### POST /api/start-monitoring
Start background monitoring for slot availability.

**Request Body:**
```json
{
  "source_country": "NG",
  "destination_country": "DE",
  "visa_center": "Lagos",
  "visa_category": "National Visa",
  "visa_sub_category": "Study",
  "email": "user@example.com",
  "password": "vfs_password",
  "check_interval_minutes": 30,
  "notify_email": "notify@example.com"
}
```

### GET /api/monitoring/{job_id}
Get the status of a monitoring job.

### DELETE /api/monitoring/{job_id}
Stop a monitoring job.

## Supported Countries

| Source Country | Destination | Notes |
|---------------|-------------|-------|
| Nigeria (NG) | Germany (DE) | Full support |
| Ghana (GH) | Germany (DE) | Full support |
| Nigeria (NG) | UK (GB) | Full support |
| Nigeria (NG) | Italy (IT) | Full support |
| India (IN) | Germany (DE) | Needs testing |
| Pakistan (PK) | Germany (DE) | Needs testing |

## Integration with TravelHub

The VFS Slot Checker is integrated with the TravelHub Next.js application through:

1. **API Routes**: Next.js API routes in `app/api/vfs/` proxy requests to this Python service
2. **SlotFinder Component**: The `components/visa/slot-finder.tsx` component provides the UI
3. **Environment Variable**: Set `VFS_CHECKER_URL` to override the default `http://localhost:8000`

### Running Both Services

```bash
# Terminal 1: Start VFS Checker (Python)
cd travelhub/services/vfs-slot-checker
source venv/bin/activate
python api_server.py

# Terminal 2: Start TravelHub (Next.js)
cd travelhub
pnpm dev
```

## Development

### Adding Support for New Countries

1. Create a new bot file in `vfs_checker/` (e.g., `vfs_bot_fr.py`)
2. Extend the `VfsBot` base class
3. Implement the abstract methods: `pre_login_steps()`, `check_for_appointment()`
4. Add country mapping to `bot_factory.py`

### Testing

```bash
# Run a quick test
python -c "from vfs_checker.bot_factory import get_supported_countries; print(get_supported_countries())"
```

## License

MIT License - See LICENSE file for details.

## Credits

- Original [vfs-appointment-bot](https://github.com/ranjan-mohanty/vfs-appointment-bot) by Ranjan Mohanty
- Adapted and integrated for TravelHub by Travis Moore
|----------------|--------------------| --------|
| India (IN) | Germany (DE) | visa.vfsglobal.com/ind/en/deu |
| Nigeria (NG) | Germany (DE) | visa.vfsglobal.com/nga/en/deu |
| Ghana (GH) | Germany (DE) | visa.vfsglobal.com/gha/en/deu |
| South Africa (ZA) | Germany (DE) | visa.vfsglobal.com/zaf/en/deu |
| Morocco (MA) | Italy (IT) | visa.vfsglobal.com/mar/en/ita |

## License

MIT License - See LICENSE file for details.
