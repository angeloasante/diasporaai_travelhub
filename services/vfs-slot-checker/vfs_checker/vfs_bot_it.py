"""
VFS Bot implementation for Italy (IT).
"""

import logging
from typing import Dict, List

from playwright.sync_api import Page

from .vfs_bot import VfsBot, AppointmentSlot, LoginError
from .date_utils import extract_date_from_string, extract_time_from_string


class VfsBotIT(VfsBot):
    """
    VFS Bot implementation for Italy appointments.
    
    Handles the specific workflow and selectors for the Italian VFS website.
    """

    def __init__(self, source_country_code: str):
        """
        Initialize the Italy VFS Bot.

        Args:
            source_country_code: ISO 3166-1 alpha-2 code for the source country.
        """
        super().__init__(source_country_code, "IT")
        self.appointment_param_keys = [
            "visa_center",
            "visa_category",
            "visa_sub_category",
        ]

    def login(self, page: Page, email: str, password: str) -> None:
        """
        Perform login on the Italian VFS website.

        Args:
            page: Playwright page object.
            email: VFS account email.
            password: VFS account password.
        """
        try:
            # Wait for login form
            page.wait_for_selector("#mat-input-0", timeout=30000)
            
            email_input = page.locator("#mat-input-0")
            password_input = page.locator("#mat-input-1")

            email_input.fill(email)
            password_input.fill(password)

            page.get_by_role("button", name="Sign In").click()
            
            # Wait for successful login
            page.wait_for_selector("role=button >> text=Start New Booking", timeout=30000)
            
        except Exception as e:
            raise LoginError(f"Login failed: {e}")

    def pre_login_steps(self, page: Page) -> None:
        """
        Handle cookie consent and other pre-login steps.

        Args:
            page: Playwright page object.
        """
        try:
            # Try to reject cookies if the button exists
            reject_button = page.get_by_role("button", name="Reject All")
            if reject_button.is_visible(timeout=5000):
                reject_button.click()
                logging.debug("Rejected all cookie policies")
        except Exception:
            pass

    def check_for_appointment(
        self, page: Page, appointment_params: Dict[str, str]
    ) -> List[AppointmentSlot]:
        """
        Check for available appointments on the Italian VFS website.

        Args:
            page: Playwright page object.
            appointment_params: Dictionary containing appointment parameters.

        Returns:
            List of available AppointmentSlot objects.
        """
        slots = []
        
        try:
            # Click Start New Booking
            page.get_by_role("button", name="Start New Booking").click()

            # Select Visa Centre
            visa_centre_dropdown = page.wait_for_selector("mat-form-field", timeout=10000)
            visa_centre_dropdown.click()
            
            visa_center = appointment_params.get("visa_center", "")
            visa_centre_option = page.wait_for_selector(
                f'mat-option:has-text("{visa_center}")', timeout=10000
            )
            visa_centre_option.click()

            # Select Visa Category
            visa_category_dropdown = page.query_selector_all("mat-form-field")[1]
            visa_category_dropdown.click()
            
            visa_category = appointment_params.get("visa_category", "")
            visa_category_option = page.wait_for_selector(
                f'mat-option:has-text("{visa_category}")', timeout=10000
            )
            visa_category_option.click()

            # Select Visa Sub-Category
            visa_subcategory_dropdown = page.query_selector_all("mat-form-field")[2]
            visa_subcategory_dropdown.click()
            
            visa_sub_category = appointment_params.get("visa_sub_category", "")
            visa_subcategory_option = page.wait_for_selector(
                f'mat-option:has-text("{visa_sub_category}")', timeout=10000
            )
            visa_subcategory_option.click()

            # Wait for availability check
            page.wait_for_timeout(3000)
            
            # Look for appointment slots
            try:
                page.wait_for_selector("div.alert", timeout=10000)
                appointment_elements = page.query_selector_all("div.alert")
                
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
            except Exception:
                pass

        except Exception as e:
            logging.error(f"Error checking appointments: {e}")
            
        return slots
