"""
Factory for creating VFS Bot instances based on destination country.
"""

from typing import Optional

from .vfs_bot import VfsBot


class UnsupportedCountryError(Exception):
    """Raised when an unsupported country code is provided."""
    pass


# Mapping of destination country codes to visa categories and centers
SUPPORTED_DESTINATIONS = {
    "DE": {
        "name": "Germany",
        "visa_centers": {
            "NG": ["Lagos", "Abuja"],
            "GH": ["Accra"],
            "KE": ["Nairobi"],
            "ZA": ["Pretoria", "Cape Town"],
            "IN": ["New Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"],
        },
        "visa_categories": [
            "National Visa",
            "Schengen Visa",
        ],
        "visa_sub_categories": [
            "Work Visa",
            "Student Visa", 
            "Family Reunion",
            "Job Seeker Visa",
            "Business Visa",
            "Tourist Visa",
        ]
    },
    "GB": {
        "name": "United Kingdom",
        "visa_centers": {
            "NG": ["Lagos", "Abuja"],
            "GH": ["Accra"],
            "KE": ["Nairobi"],
            "ZA": ["Pretoria", "Cape Town"],
            "IN": ["New Delhi", "Mumbai", "Chennai"],
        },
        "visa_categories": [
            "Standard Visitor Visa",
            "Work Visa",
            "Student Visa",
        ],
        "visa_sub_categories": [
            "Tourism",
            "Business",
            "Medical",
            "Academic",
            "Skilled Worker",
            "Student",
        ]
    },
    "IT": {
        "name": "Italy",
        "visa_centers": {
            "MA": ["Casablanca", "Rabat"],
            "AZ": ["Baku"],
            "IN": ["New Delhi", "Mumbai"],
            "NG": ["Lagos"],
        },
        "visa_categories": [
            "National Visa",
            "Schengen Visa",
        ],
        "visa_sub_categories": [
            "Tourist",
            "Business",
            "Study",
            "Work",
            "Family",
        ]
    },
    "CA": {
        "name": "Canada",
        "visa_centers": {
            "NG": ["Lagos", "Abuja"],
            "GH": ["Accra"],
            "KE": ["Nairobi"],
        },
        "visa_categories": [
            "Visitor Visa",
            "Work Permit",
            "Study Permit",
        ],
        "visa_sub_categories": [
            "Tourism",
            "Business",
            "Super Visa",
            "Work",
            "Study",
        ]
    }
}


def get_vfs_bot(source_country_code: str, destination_country_code: str) -> VfsBot:
    """
    Get the appropriate VFS Bot instance for a given country pair.

    Args:
        source_country_code: ISO 3166-1 alpha-2 code for the source country.
        destination_country_code: ISO 3166-1 alpha-2 code for the destination country.

    Returns:
        VfsBot instance for the specified countries.

    Raises:
        UnsupportedCountryError: If the country combination is not supported.
    """
    dest_code = destination_country_code.upper()
    source_code = source_country_code.upper()

    if dest_code == "DE":
        from .vfs_bot_de import VfsBotDE
        return VfsBotDE(source_code)
    elif dest_code == "IT":
        from .vfs_bot_it import VfsBotIT
        return VfsBotIT(source_code)
    elif dest_code == "GB":
        from .vfs_bot_gb import VfsBotGB
        return VfsBotGB(source_code)
    else:
        raise UnsupportedCountryError(
            f"Destination country {destination_country_code} is not supported"
        )


def get_supported_countries() -> dict:
    """
    Get information about supported countries and their options.

    Returns:
        Dictionary with destination countries and their visa options.
    """
    return SUPPORTED_DESTINATIONS


def get_visa_centers(source_country: str, destination_country: str) -> list:
    """
    Get available visa centers for a source-destination pair.

    Args:
        source_country: ISO 3166-1 alpha-2 code for the source country.
        destination_country: ISO 3166-1 alpha-2 code for the destination country.

    Returns:
        List of available visa center names.
    """
    dest_code = destination_country.upper()
    source_code = source_country.upper()
    
    if dest_code in SUPPORTED_DESTINATIONS:
        centers = SUPPORTED_DESTINATIONS[dest_code].get("visa_centers", {})
        return centers.get(source_code, [])
    
    return []


def get_visa_categories(destination_country: str) -> list:
    """
    Get available visa categories for a destination country.

    Args:
        destination_country: ISO 3166-1 alpha-2 code for the destination country.

    Returns:
        List of available visa category names.
    """
    dest_code = destination_country.upper()
    
    if dest_code in SUPPORTED_DESTINATIONS:
        return SUPPORTED_DESTINATIONS[dest_code].get("visa_categories", [])
    
    return []


def get_visa_sub_categories(destination_country: str) -> list:
    """
    Get available visa sub-categories for a destination country.

    Args:
        destination_country: ISO 3166-1 alpha-2 code for the destination country.

    Returns:
        List of available visa sub-category names.
    """
    dest_code = destination_country.upper()
    
    if dest_code in SUPPORTED_DESTINATIONS:
        return SUPPORTED_DESTINATIONS[dest_code].get("visa_sub_categories", [])
    
    return []
