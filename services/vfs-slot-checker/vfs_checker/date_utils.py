"""
Date utility functions for the VFS Slot Checker.
"""

import re
from datetime import datetime
from typing import Optional


def extract_date_from_string(text: str) -> Optional[str]:
    """
    Extracts a date from a string containing date information.
    
    Supports various date formats commonly used on VFS websites.

    Args:
        text: The string containing the date.

    Returns:
        The extracted date in YYYY-MM-DD format, or None if no date found.
    """
    if not text:
        return None
    
    # Common date patterns
    patterns = [
        # DD/MM/YYYY or DD-MM-YYYY
        r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
        # YYYY-MM-DD
        r'(\d{4})-(\d{1,2})-(\d{1,2})',
        # Month DD, YYYY (e.g., "January 15, 2026")
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
        # DD Month YYYY (e.g., "15 January 2026")
        r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
    ]
    
    month_map = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            
            # Handle different pattern matches
            if len(groups) == 3:
                if groups[0].isdigit() and len(groups[2]) == 4:
                    # DD/MM/YYYY format
                    day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
                elif len(groups[0]) == 4:
                    # YYYY-MM-DD format
                    year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                elif groups[0] in month_map:
                    # Month DD, YYYY format
                    month = month_map[groups[0]]
                    day = int(groups[1])
                    year = int(groups[2])
                elif groups[1] in month_map:
                    # DD Month YYYY format
                    day = int(groups[0])
                    month = month_map[groups[1]]
                    year = int(groups[2])
                else:
                    continue
                
                try:
                    date_obj = datetime(year, month, day)
                    return date_obj.strftime('%Y-%m-%d')
                except ValueError:
                    continue
    
    return None


def extract_time_from_string(text: str) -> Optional[str]:
    """
    Extracts a time from a string containing time information.

    Args:
        text: The string containing the time.

    Returns:
        The extracted time in HH:MM format, or None if no time found.
    """
    if not text:
        return None
    
    # Time patterns
    patterns = [
        # HH:MM (24-hour)
        r'(\d{1,2}):(\d{2})',
        # HH:MM AM/PM
        r'(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            hour = int(groups[0])
            minute = int(groups[1])
            
            # Handle AM/PM
            if len(groups) == 3 and groups[2]:
                if groups[2].upper() == 'PM' and hour != 12:
                    hour += 12
                elif groups[2].upper() == 'AM' and hour == 12:
                    hour = 0
            
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
    
    return None


def format_date_for_display(date_str: str) -> str:
    """
    Formats a date string for display.

    Args:
        date_str: Date in YYYY-MM-DD format.

    Returns:
        Formatted date string (e.g., "Monday, January 15, 2026").
    """
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%A, %B %d, %Y')
    except ValueError:
        return date_str
