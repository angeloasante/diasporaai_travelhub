"""
VFS Bot implementation for United Kingdom (GB).
"""

import logging
from typing import Dict, List

from playwright.sync_api import Page

from .vfs_bot import VfsBot, AppointmentSlot, LoginError
from .date_utils import extract_date_from_string, extract_time_from_string


class VfsBotGB(VfsBot):
    """
    VFS Bot implementation for UK visa appointments.
    
    Handles the specific workflow and selectors for the UK VFS website.
    """

    def __init__(self, source_country_code: str):
        """
        Initialize the UK VFS Bot.

        Args:
            source_country_code: ISO 3166-1 alpha-2 code for the source country.
        """
        super().__init__(source_country_code, "GB")
        self.appointment_param_keys = [
            "visa_center",
            "visa_category",
            "visa_sub_category",
        ]

    def login(self, page: Page, email: str, password: str) -> None:
        """
        Perform login on the UK VFS website.

        Args:
            page: Playwright page object.
            email: VFS account email.
            password: VFS account password.
        """
        try:
            # Wait for login form - UK VFS may have different selectors
            page.wait_for_selector("input[type='email'], #mat-input-0", timeout=30000)
            
            # Try different selector patterns
            email_input = page.locator("input[type='email'], #mat-input-0").first
            password_input = page.locator("input[type='password'], #mat-input-1").first

            email_input.fill(email)
            password_input.fill(password)

            # Click sign in button
            sign_in_button = page.get_by_role("button", name="Sign In")
            if not sign_in_button.is_visible():
                sign_in_button = page.get_by_role("button", name="Login")
            sign_in_button.click()
            
            # Wait for successful login
            page.wait_for_selector(
                "role=button >> text=Start New Booking, role=button >> text=Book Appointment",
                timeout=30000
            )
            
        except Exception as e:
            raise LoginError(f"Login failed: {e}")

    def pre_login_steps(self, page: Page) -> None:
        """
        Handle cookie consent and other pre-login steps.

        Args:
            page: Playwright page object.
        """
        try:
            # Try to reject/accept cookies
            cookie_buttons = [
                "Reject All",
                "Accept All",
                "I Accept",
                "Continue"
            ]
            
            for button_name in cookie_buttons:
                try:
                    button = page.get_by_role("button", name=button_name)
                    if button.is_visible(timeout=3000):
                        button.click()
                        logging.debug(f"Clicked '{button_name}' button")
                        break
                except Exception:
                    continue
                    
        except Exception:
            pass

    def check_for_appointment(
        self, page: Page, appointment_params: Dict[str, str]
    ) -> List[AppointmentSlot]:
        """
        Check for available appointments on the UK VFS website.

        Args:
            page: Playwright page object.
            appointment_params: Dictionary containing appointment parameters.

        Returns:
            List of available AppointmentSlot objects.
        """
        slots = []
        
        try:
            # Click Start New Booking
            booking_button = page.get_by_role("button", name="Start New Booking")
            if not booking_button.is_visible():
                booking_button = page.get_by_role("button", name="Book Appointment")
            booking_button.click()

            # Handle form fields - UK VFS may have different structure
            visa_center = appointment_params.get("visa_center", "")
            visa_category = appointment_params.get("visa_category", "")
            visa_sub_category = appointment_params.get("visa_sub_category", "")
            
            # Select dropdowns
            dropdowns = page.query_selector_all("mat-form-field, select")
            
            if len(dropdowns) >= 1:
                dropdowns[0].click()
                page.wait_for_selector(f'mat-option:has-text("{visa_center}"), option:has-text("{visa_center}")', timeout=10000).click()
            
            if len(dropdowns) >= 2:
                dropdowns[1].click()
                page.wait_for_selector(f'mat-option:has-text("{visa_category}"), option:has-text("{visa_category}")', timeout=10000).click()
                
            if len(dropdowns) >= 3:
                dropdowns[2].click()
                page.wait_for_selector(f'mat-option:has-text("{visa_sub_category}"), option:has-text("{visa_sub_category}")', timeout=10000).click()

            # Wait for availability check
            page.wait_for_timeout(3000)
            
            # Look for appointment slots
            try:
                alert_selectors = ["div.alert", ".appointment-date", ".available-slot"]
                
                for selector in alert_selectors:
                    try:
                        page.wait_for_selector(selector, timeout=5000)
                        appointment_elements = page.query_selector_all(selector)
                        
                        for element in appointment_elements:
                            text = element.text_content()
                            date = extract_date_from_string(text)
                            time = extract_time_from_string(text)
                            
                            if date:
                                slots.append(AppointmentSlot(
                                    date=date,
                                    time=time or "09:00",
                                    location=f"VFS Global - {visa_center}",
                                    appointment_type="Biometric Submission"
                                ))
                        
                        if slots:
                            break
                    except Exception:
                        continue
                        
            except Exception:
                pass

        except Exception as e:
            logging.error(f"Error checking appointments: {e}")
            
        return slots
