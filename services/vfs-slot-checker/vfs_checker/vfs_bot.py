"""
Abstract base class for VFS Bot implementations.
"""

import logging
import os
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from dataclasses import dataclass

from playwright.sync_api import Page, sync_playwright, BrowserContext
from playwright_stealth import Stealth

from .config import get_config_value
from .captcha_solver import CaptchaSolver, extract_turnstile_sitekey, inject_turnstile_token


# Create stealth instance for applying to browser contexts
stealth = Stealth()

# Create global CAPTCHA solver instance
captcha_solver = CaptchaSolver(
    api_key=os.getenv("CAPTCHA_API_KEY"),
    service=os.getenv("CAPTCHA_SERVICE", "2captcha"),
)


class LoginError(Exception):
    """Exception raised when login fails."""
    pass


class SlotCheckError(Exception):
    """Exception raised when slot checking fails."""
    pass


@dataclass
class AppointmentSlot:
    """Represents an available appointment slot."""
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None


class VfsBot(ABC):
    """
    Abstract base class for VFS Bot implementations.

    Provides common functionalities like login, pre-login steps, and appointment checking.
    Subclasses are responsible for implementing country-specific logic.
    """

    def __init__(self, source_country_code: str, destination_country_code: str):
        """
        Initialize the VFS Bot.

        Args:
            source_country_code: ISO 3166-1 alpha-2 code for the source country.
            destination_country_code: ISO 3166-1 alpha-2 code for the destination country.
        """
        self.source_country_code = source_country_code.upper()
        self.destination_country_code = destination_country_code.upper()
        self.appointment_param_keys: List[str] = []
        self.logger = logging.getLogger(self.__class__.__name__)
        self.captcha_solver = captcha_solver

    def check_slots(
        self,
        email: str,
        password: str,
        appointment_params: Dict[str, str],
        headless: bool = True
    ) -> List[AppointmentSlot]:
        """
        Check for available appointment slots.

        Args:
            email: VFS account email.
            password: VFS account password.
            appointment_params: Dictionary of appointment parameters.
            headless: Whether to run browser in headless mode.
                     NOTE: VFS blocks headless browsers, so we use a virtual display instead.

        Returns:
            List of available AppointmentSlot objects.

        Raises:
            LoginError: If login fails.
            SlotCheckError: If slot checking fails.
        """
        self.logger.info(
            f"Starting VFS slot check for {self.source_country_code}-{self.destination_country_code}"
        )

        # Get VFS URL
        url_key = f"{self.source_country_code}-{self.destination_country_code}"
        vfs_url = get_config_value("vfs-url", url_key)
        
        if not vfs_url:
            raise SlotCheckError(
                f"No VFS URL configured for {self.source_country_code} to {self.destination_country_code}"
            )

        browser_type = get_config_value("browser", "type", "chromium")
        slots = []
        
        # VFS blocks headless browsers, so we need to run in non-headless mode
        # with either a real display or a virtual display (Xvfb)
        use_virtual_display = headless and os.name != 'nt'  # Use Xvfb on Linux/Mac if headless requested
        virtual_display = None
        
        if use_virtual_display:
            try:
                from pyvirtualdisplay import Display
                virtual_display = Display(visible=False, size=(1920, 1080))
                virtual_display.start()
                self.logger.info("Started virtual display (Xvfb)")
            except Exception as e:
                self.logger.warning(f"Could not start virtual display: {e}. Running with real display.")
                use_virtual_display = False

        try:
            with sync_playwright() as p:
                # Use better args to avoid detection
                launch_args = [
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-infobars",
                    "--window-size=1920,1080",
                    "--start-maximized",
                ]
                
                # IMPORTANT: Always launch non-headless because VFS blocks headless
                # The virtual display (Xvfb) makes it "invisible" without being headless
                browser = getattr(p, browser_type).launch(
                    headless=False,  # Never use headless for VFS - they block it
                    args=launch_args,
                )
                
                # Create context with realistic viewport and user agent
                context = browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    locale="en-NG",
                    timezone_id="Africa/Lagos",
                )
                
                # Apply stealth to the browser context
                stealth.apply_stealth_sync(context)
                page = context.new_page()
                
                # Add init script to intercept Turnstile BEFORE page loads
                # This captures the sitekey when turnstile.render() is called
                page.add_init_script("""
                    // Store captured sitekeys globally BEFORE any scripts load
                    window.__capturedTurnstileSitekeys = [];
                    
                    // Intercept property definition for 'turnstile' to catch early access
                    let _turnstileValue = null;
                    Object.defineProperty(window, 'turnstile', {
                        get: function() { return _turnstileValue; },
                        set: function(val) {
                            _turnstileValue = val;
                            // Wrap render when turnstile is defined
                            if (val && val.render) {
                                const originalRender = val.render;
                                val.render = function(container, params) {
                                    if (params && params.sitekey) {
                                        window.__capturedTurnstileSitekeys.push(params.sitekey);
                                        console.log('[VFS-Bot] Captured Turnstile sitekey:', params.sitekey);
                                    }
                                    return originalRender.apply(this, arguments);
                                };
                            }
                        },
                        configurable: true
                    });
                """)

                try:
                    page.goto(vfs_url, timeout=60000)
                    self.pre_login_steps(page)
                    
                    self.login(page, email, password)
                    self.logger.info("Logged in successfully")

                    self.logger.info(f"Checking appointments for {appointment_params}")
                    slots = self.check_for_appointment(page, appointment_params)
                    
                    if slots:
                        self.logger.info(f"Found {len(slots)} available slot(s)")
                    else:
                        self.logger.info("No appointments found for the specified criteria")
                        
                except Exception as e:
                    self.logger.error(f"Error during slot check: {e}")
                    if "login" in str(e).lower() or "sign in" in str(e).lower():
                        raise LoginError(f"Login failed: {e}")
                    raise SlotCheckError(f"Slot check failed: {e}")
                finally:
                    context.close()
                    browser.close()
        finally:
            # Stop virtual display if we started one
            if virtual_display:
                try:
                    virtual_display.stop()
                    self.logger.info("Stopped virtual display")
                except:
                    pass

        return slots

    @abstractmethod
    def login(self, page: Page, email: str, password: str) -> None:
        """
        Perform login on the VFS website.

        Args:
            page: Playwright page object.
            email: VFS account email.
            password: VFS account password.

        Raises:
            LoginError: If login fails.
        """
        raise NotImplementedError("Subclasses must implement login logic")

    @abstractmethod
    def pre_login_steps(self, page: Page) -> None:
        """
        Perform any pre-login steps (e.g., cookie acceptance).

        Args:
            page: Playwright page object.
        """
        pass

    @abstractmethod
    def check_for_appointment(
        self, page: Page, appointment_params: Dict[str, str]
    ) -> List[AppointmentSlot]:
        """
        Check for available appointments.

        Args:
            page: Playwright page object.
            appointment_params: Dictionary of appointment parameters.

        Returns:
            List of available AppointmentSlot objects.
        """
        raise NotImplementedError("Subclasses must implement appointment checking logic")
