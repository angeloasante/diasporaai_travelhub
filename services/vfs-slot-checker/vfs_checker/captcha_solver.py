"""
CAPTCHA Solver module for VFS Slot Checker.

Supports multiple CAPTCHA solving services:
- 2Captcha (https://2captcha.com)
- CapSolver (https://capsolver.com)

For Cloudflare Turnstile CAPTCHAs used by VFS Global.
"""

import logging
import os
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CaptchaSolution:
    """Result of a CAPTCHA solve attempt."""
    success: bool
    token: Optional[str] = None
    error: Optional[str] = None
    cost: Optional[float] = None
    solve_time: Optional[float] = None


class CaptchaSolver:
    """
    Unified CAPTCHA solver that supports multiple backends.
    
    Usage:
        solver = CaptchaSolver(api_key="your-api-key", service="2captcha")
        solution = solver.solve_turnstile(
            sitekey="0x4AAAAAAAA...",
            url="https://visa.vfsglobal.com/..."
        )
        if solution.success:
            # Use solution.token
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        service: str = "2captcha",  # "2captcha" or "capsolver"
    ):
        """
        Initialize the CAPTCHA solver.
        
        Args:
            api_key: API key for the CAPTCHA service. If not provided,
                     will try to read from environment variables:
                     - CAPTCHA_API_KEY (generic)
                     - TWOCAPTCHA_API_KEY
                     - CAPSOLVER_API_KEY
            service: Which service to use ("2captcha" or "capsolver")
        """
        self.service = service.lower()
        
        # Try to get API key from various sources
        self.api_key = api_key or os.getenv("CAPTCHA_API_KEY")
        
        if not self.api_key:
            if self.service == "2captcha":
                self.api_key = os.getenv("TWOCAPTCHA_API_KEY")
            elif self.service == "capsolver":
                self.api_key = os.getenv("CAPSOLVER_API_KEY")
        
        self._solver = None
        if self.api_key:
            self._init_solver()
    
    def _init_solver(self):
        """Initialize the underlying solver library."""
        if self.service == "2captcha":
            try:
                from twocaptcha import TwoCaptcha
                self._solver = TwoCaptcha(self.api_key)
                logger.info("Initialized 2Captcha solver")
            except ImportError:
                logger.error("2captcha-python not installed. Run: pip install 2captcha-python")
        elif self.service == "capsolver":
            try:
                import capsolver
                capsolver.api_key = self.api_key
                self._solver = capsolver
                logger.info("Initialized CapSolver")
            except ImportError:
                logger.error("capsolver not installed. Run: pip install capsolver")
    
    @property
    def is_configured(self) -> bool:
        """Check if the solver is properly configured."""
        return self.api_key is not None and self._solver is not None
    
    def solve_turnstile(
        self,
        sitekey: str,
        url: str,
        action: Optional[str] = None,
        data: Optional[str] = None,
    ) -> CaptchaSolution:
        """
        Solve a Cloudflare Turnstile CAPTCHA.
        
        Args:
            sitekey: The Turnstile sitekey (starts with 0x...)
            url: The page URL where the CAPTCHA appears
            action: Optional action parameter
            data: Optional cData parameter
            
        Returns:
            CaptchaSolution with the token if successful
        """
        if not self.is_configured:
            return CaptchaSolution(
                success=False,
                error="CAPTCHA solver not configured. Set CAPTCHA_API_KEY environment variable."
            )
        
        start_time = time.time()
        
        try:
            if self.service == "2captcha":
                return self._solve_turnstile_2captcha(sitekey, url, action, data, start_time)
            elif self.service == "capsolver":
                return self._solve_turnstile_capsolver(sitekey, url, action, data, start_time)
            else:
                return CaptchaSolution(
                    success=False,
                    error=f"Unknown service: {self.service}"
                )
        except Exception as e:
            logger.error(f"CAPTCHA solve error: {e}")
            return CaptchaSolution(
                success=False,
                error=str(e),
                solve_time=time.time() - start_time
            )
    
    def _solve_turnstile_2captcha(
        self,
        sitekey: str,
        url: str,
        action: Optional[str],
        data: Optional[str],
        start_time: float,
    ) -> CaptchaSolution:
        """Solve Turnstile using 2Captcha."""
        logger.info(f"Solving Turnstile with 2Captcha for {url}")
        
        try:
            result = self._solver.turnstile(
                sitekey=sitekey,
                url=url,
                action=action,
                data=data,
            )
            
            solve_time = time.time() - start_time
            logger.info(f"2Captcha solved in {solve_time:.1f}s")
            
            return CaptchaSolution(
                success=True,
                token=result.get("code") if isinstance(result, dict) else result,
                solve_time=solve_time,
            )
        except Exception as e:
            return CaptchaSolution(
                success=False,
                error=str(e),
                solve_time=time.time() - start_time,
            )
    
    def _solve_turnstile_capsolver(
        self,
        sitekey: str,
        url: str,
        action: Optional[str],
        data: Optional[str],
        start_time: float,
    ) -> CaptchaSolution:
        """Solve Turnstile using CapSolver."""
        logger.info(f"Solving Turnstile with CapSolver for {url}")
        
        try:
            task_payload: Dict[str, Any] = {
                "type": "AntiTurnstileTaskProxyLess",
                "websiteURL": url,
                "websiteKey": sitekey,
            }
            
            if action:
                task_payload["action"] = action
            if data:
                task_payload["cdata"] = data
            
            result = self._solver.solve(task_payload)
            
            solve_time = time.time() - start_time
            logger.info(f"CapSolver solved in {solve_time:.1f}s")
            
            return CaptchaSolution(
                success=True,
                token=result.get("token"),
                solve_time=solve_time,
            )
        except Exception as e:
            return CaptchaSolution(
                success=False,
                error=str(e),
                solve_time=time.time() - start_time,
            )
    
    def get_balance(self) -> Optional[float]:
        """Get the current balance from the CAPTCHA service."""
        if not self.is_configured:
            return None
        
        try:
            if self.service == "2captcha":
                return float(self._solver.balance())
            elif self.service == "capsolver":
                result = self._solver.balance()
                return result.get("balance") if isinstance(result, dict) else None
        except Exception as e:
            logger.error(f"Failed to get balance: {e}")
            return None


def extract_turnstile_sitekey(page) -> Optional[str]:
    """
    Extract the Cloudflare Turnstile sitekey from a page.
    
    Args:
        page: Playwright page object
        
    Returns:
        The sitekey if found, None otherwise
    """
    try:
        # PRIORITY 1: Check Turnstile iframe src directly (most authoritative)
        iframe_sitekey = page.evaluate("""
            () => {
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                    const src = iframe.src || '';
                    if (src.includes('challenges.cloudflare') || src.includes('turnstile')) {
                        // Parse sitekey from URL params
                        let match = src.match(/[?&]sitekey=([^&]+)/);
                        if (match) return decodeURIComponent(match[1]);
                        // Also try k= parameter
                        match = src.match(/[?&]k=([^&]+)/);
                        if (match) return decodeURIComponent(match[1]);
                    }
                }
                return null;
            }
        """)
        if iframe_sitekey:
            return iframe_sitekey
        
        # PRIORITY 2: Try to find turnstile widget with data-sitekey
        selectors = [
            "[data-sitekey]",
            "[class*='cf-turnstile']",
            "#cf-turnstile",
        ]
        
        for selector in selectors:
            elements = page.locator(selector).all()
            for el in elements:
                sitekey = el.get_attribute("data-sitekey")
                if sitekey and sitekey.startswith('0x'):
                    return sitekey
        
        # PRIORITY 3: Try to extract from page source
        content = page.content()
        import re
        
        # Cloudflare Turnstile sitekeys typically start with 0x4AAAA
        # Match data-sitekey attribute first
        match = re.search(r'data-sitekey="(0x4[A-Za-z0-9_-]{25,50})"', content)
        if match:
            return match.group(1)
        
        # Fallback to any 0x sitekey in data-sitekey
        match = re.search(r'data-sitekey="(0x[A-Za-z0-9_-]+)"', content)
        if match:
            return match.group(1)
        
        # Try turnstile render call with sitekey
        match = re.search(r"turnstile\.render\([^,]+,\s*\{[^}]*sitekey:\s*['\"]([^'\"]+)['\"]", content)
        if match:
            return match.group(1)
        
        # PRIORITY 4: Check for sitekey in embedded scripts (turnstile config)
        match = re.search(r'sitekey["\']?\s*[:=]\s*["\']?(0x4[A-Za-z0-9_-]{25,50})', content)
        if match:
            return match.group(1)
            
    except Exception as e:
        logger.error(f"Failed to extract sitekey: {e}")
    
    return None


def inject_turnstile_token(page, token: str) -> bool:
    """
    Inject a solved Turnstile token into the page.
    
    Args:
        page: Playwright page object
        token: The solved CAPTCHA token
        
    Returns:
        True if injection was successful
    """
    try:
        # Comprehensive JavaScript injection that handles VFS Global's Angular app
        result = page.evaluate(f"""
            (token) => {{
                let injected = false;
                
                // Method 1: Find the hidden input field for turnstile response
                const selectors = [
                    'input[name="cf-turnstile-response"]',
                    '[name="cf-turnstile-response"]',
                    'input[name*="turnstile"]',
                    'textarea[name*="turnstile"]',
                ];
                
                for (const selector of selectors) {{
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {{
                        el.value = token;
                        el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        injected = true;
                        console.log('Injected token into:', selector);
                    }});
                }}
                
                // Method 2: Set token in window.turnstile if it exists
                if (window.turnstile) {{
                    try {{
                        // Find all widget containers and trigger callback
                        const widgets = document.querySelectorAll('[data-sitekey], .cf-turnstile, [class*="cf-turnstile"]');
                        widgets.forEach(widget => {{
                            const callback = widget.getAttribute('data-callback');
                            if (callback && typeof window[callback] === 'function') {{
                                window[callback](token);
                                injected = true;
                                console.log('Called callback:', callback);
                            }}
                        }});
                    }} catch(e) {{
                        console.error('Error calling turnstile callback:', e);
                    }}
                }}
                
                // Method 3: VFS-specific Angular form handling
                try {{
                    // VFS uses Angular reactive forms - we need to update the form control
                    const form = document.querySelector('form');
                    if (form) {{
                        // Create or update hidden input
                        let hiddenInput = form.querySelector('input[name="cf-turnstile-response"]');
                        if (!hiddenInput) {{
                            hiddenInput = document.createElement('input');
                            hiddenInput.type = 'hidden';
                            hiddenInput.name = 'cf-turnstile-response';
                            form.appendChild(hiddenInput);
                        }}
                        hiddenInput.value = token;
                        
                        // Also try to enable submit button
                        const submitBtn = form.querySelector('button[type="submit"], button:has-text("Sign In")');
                        if (submitBtn && submitBtn.disabled) {{
                            submitBtn.disabled = false;
                            submitBtn.removeAttribute('disabled');
                            console.log('Enabled submit button');
                        }}
                        injected = true;
                    }}
                }} catch(e) {{
                    console.error('Error with Angular form:', e);
                }}
                
                // Method 4: Dispatch custom event that VFS might be listening for
                try {{
                    window.dispatchEvent(new CustomEvent('turnstile-callback', {{ detail: token }}));
                    document.dispatchEvent(new CustomEvent('turnstile-solved', {{ detail: token }}));
                }} catch(e) {{}}
                
                // Method 5: Try to directly enable the sign-in button
                try {{
                    const buttons = document.querySelectorAll('button');
                    buttons.forEach(btn => {{
                        if (btn.textContent.toLowerCase().includes('sign in') || 
                            btn.textContent.toLowerCase().includes('login')) {{
                            btn.disabled = false;
                            btn.removeAttribute('disabled');
                            // Also remove any disabled class
                            btn.classList.remove('mat-button-disabled');
                        }}
                    }});
                }} catch(e) {{}}
                
                return injected;
            }}
        """, token)
        
        if result:
            logger.info("Token injection successful")
        else:
            logger.warning("Token injection may not have fully succeeded")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to inject token: {e}")
        return False
