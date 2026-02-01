"""
VFS Bot implementation for Germany (DE).
"""

import logging
import os
from typing import Dict, List, Optional

from playwright.sync_api import Page

from .vfs_bot import VfsBot, AppointmentSlot, LoginError
from .date_utils import extract_date_from_string, extract_time_from_string


class VfsBotDE(VfsBot):
    """
    VFS Bot implementation for Germany appointments.
    
    Handles the specific workflow and selectors for the German VFS website.
    """

    def __init__(self, source_country_code: str):
        """
        Initialize the Germany VFS Bot.

        Args:
            source_country_code: ISO 3166-1 alpha-2 code for the source country.
        """
        super().__init__(source_country_code, "DE")
        self.appointment_param_keys = [
            "visa_center",
            "visa_category", 
            "visa_sub_category",
        ]

    def login(self, page: Page, email: str, password: str) -> None:
        """
        Perform login on the German VFS website.

        Args:
            page: Playwright page object.
            email: VFS account email.
            password: VFS account password.
        """
        import time
        import re
        
        # Store captured sitekey from network requests
        captured_sitekeys = []
        
        def handle_request(request):
            """Intercept requests to capture Turnstile sitekey"""
            url = request.url
            # Turnstile requests include sitekey in URL
            if 'challenges.cloudflare' in url or 'turnstile' in url:
                match = re.search(r'[?&]sitekey=([^&]+)', url)
                if match:
                    sk = match.group(1)
                    captured_sitekeys.append(sk)
                    logging.info(f"Captured sitekey from network request: {sk[:25]}...")
        
        # Listen for network requests
        page.on("request", handle_request)
        
        def remove_overlay():
            """Remove OneTrust overlay - call before every interaction"""
            page.evaluate("""
                // Remove all OneTrust elements completely
                document.querySelectorAll('#onetrust-consent-sdk, .onetrust-pc-dark-filter, [class*="onetrust"], [id*="onetrust"]').forEach(el => el.remove());
                // Also set display none on any remaining
                document.querySelectorAll('.ot-fade-in').forEach(el => el.style.display = 'none');
            """)
        
        try:
            # Wait for login form to appear (up to 30 seconds)
            logging.info("Waiting for login form to appear...")
            email_input = None
            
            for attempt in range(30):
                try:
                    remove_overlay()  # Remove overlay on each attempt
                    el = page.locator("input[formcontrolname='username']").first
                    if el.is_visible(timeout=1000):
                        email_input = el
                        logging.info(f"Login form found after {attempt + 1} seconds")
                        break
                except:
                    pass
                time.sleep(1)
            
            if not email_input:
                # Try alternative selectors
                email_selectors = [
                    "input#email",
                    "input[type='email']",
                    "input[placeholder*='email' i]",
                    "#mat-input-0",
                ]
                
                for selector in email_selectors:
                    try:
                        el = page.locator(selector).first
                        if el.is_visible(timeout=2000):
                            email_input = el
                            logging.info(f"Found email input with selector: {selector}")
                            break
                    except:
                        continue
            
            if not email_input:
                # Debug: log what inputs are visible
                all_inputs = page.locator("input").all()
                logging.error(f"Could not find email input. Found {len(all_inputs)} inputs total")
                for i, inp in enumerate(all_inputs):
                    try:
                        logging.error(f"  Input {i}: type={inp.get_attribute('type')}, id={inp.get_attribute('id')}, visible={inp.is_visible()}")
                    except:
                        pass
                raise LoginError("Could not find email input field")
            
            # Find password input
            password_selectors = [
                "input[formcontrolname='password']",  # Primary - this is the visible one
                "input[type='password']:visible",
                "input[type='password']",
                "#mat-input-1",
            ]
            
            password_input = None
            for selector in password_selectors:
                try:
                    el = page.locator(selector).first
                    if el.is_visible(timeout=3000):
                        password_input = el
                        logging.info(f"Found password input with selector: {selector}")
                        break
                except Exception:
                    continue
            
            if not password_input:
                raise LoginError("Could not find password input field")

            # Fill credentials using Playwright's native methods which properly trigger Angular forms
            # Angular reactive forms require actual keyboard events, not just DOM value changes
            logging.info(f"Filling email: {email[:3]}***{email[-10:]}")
            remove_overlay()
            
            # Determine the correct modifier key (Meta for macOS, Control for others)
            import platform
            mod_key = "Meta" if platform.system() == "Darwin" else "Control"
            
            # Use page.keyboard.type() which properly triggers Angular form controls
            # This simulates real keyboard input character by character
            try:
                # Click to focus the email field
                email_input.click()
                time.sleep(0.2)
                
                # Clear any existing value
                page.keyboard.press(f"{mod_key}+a")
                page.keyboard.press("Backspace")
                time.sleep(0.1)
                
                # Type email character by character - this triggers Angular properly
                page.keyboard.type(email, delay=30)
                time.sleep(0.3)
                
                # Verify email was typed
                typed_email = email_input.input_value()
                logging.info(f"Email field value length after typing: {len(typed_email)}")
                
                logging.info("Email filled using page.keyboard.type()")
            except Exception as e:
                logging.warning(f"Email keyboard fill failed: {e}, using JavaScript fallback")
                # JavaScript fallback with Angular-specific event dispatching
                page.evaluate(f"""
                    const emailInput = document.querySelector('input[formcontrolname="username"]');
                    if (emailInput) {{
                        emailInput.focus();
                        emailInput.value = '';
                        emailInput.value = '{email}';
                        emailInput.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: '{email}', inputType: 'insertText' }}));
                        emailInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        emailInput.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                    }}
                """)
            
            logging.info("Filling password...")
            remove_overlay()
            
            try:
                # Scroll password field into view and verify it's visible
                password_input.scroll_into_view_if_needed()
                time.sleep(0.2)
                
                # Click directly on the password input to focus it
                password_input.click()
                time.sleep(0.3)
                
                # Verify we have focus on the password field
                focused_element = page.evaluate("() => document.activeElement?.getAttribute('formcontrolname') || document.activeElement?.tagName")
                logging.info(f"Active element after password click: {focused_element}")
                
                # Clear any existing value
                page.keyboard.press(f"{mod_key}+a")
                page.keyboard.press("Backspace")
                time.sleep(0.1)
                
                # Type password character by character
                page.keyboard.type(password, delay=30)
                time.sleep(0.3)
                
                # Verify password was typed
                typed_password = password_input.input_value()
                logging.info(f"Password field value length after typing: {len(typed_password)}")
                
                # Click elsewhere to trigger blur/validation (click on form, not Tab)
                page.locator("form").first.click(position={"x": 10, "y": 10})
                time.sleep(0.3)
                
                logging.info("Password filled using page.keyboard.type()")
            except Exception as e:
                logging.warning(f"Password keyboard fill failed: {e}, using JavaScript fallback")
                page.evaluate(f"""
                    const passInput = document.querySelector('input[formcontrolname="password"]');
                    if (passInput) {{
                        passInput.focus();
                        passInput.value = '';
                        passInput.value = '{password}';
                        passInput.dispatchEvent(new InputEvent('input', {{ bubbles: true, data: '{password}', inputType: 'insertText' }}));
                        passInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        passInput.dispatchEvent(new Event('blur', {{ bubbles: true }}));
                    }}
                """)
            
            time.sleep(0.5)
            
            # Verify fields were filled
            email_value = email_input.input_value()
            password_value = password_input.input_value()
            logging.info(f"Email field has {len(email_value)} chars, password field has {len(password_value)} chars")
            
            # NEW APPROACH: Try to click Sign In immediately - this may trigger Turnstile to render
            # VFS's Angular app might only render Turnstile when form interaction happens
            logging.info("Attempting to click Sign In to trigger CAPTCHA...")
            
            try:
                sign_in_btn = page.locator("button:has-text('Sign In')").first
                
                # Check if button is already enabled (no CAPTCHA needed)
                if not sign_in_btn.is_disabled():
                    logging.info("Sign In button is enabled - clicking...")
                    sign_in_btn.click()
                    time.sleep(3)
                    
                    # Check if we navigated away from login
                    if "login" not in page.url.lower():
                        logging.info("Login successful without CAPTCHA!")
                        return  # Success!
                else:
                    logging.info("Sign In button is disabled - CAPTCHA likely required")
                    
                    # NUCLEAR OPTION: Try to submit form directly via Angular
                    # This bypasses the disabled button and forces form submission
                    login_result = page.evaluate(f"""
                        () => {{
                            try {{
                                // Method 1: Find Angular form and submit it directly
                                const form = document.querySelector('form');
                                if (form) {{
                                    // Try to mark form as valid and submit
                                    form.classList.remove('ng-invalid');
                                    form.classList.add('ng-valid', 'ng-dirty', 'ng-touched');
                                    
                                    // Enable the submit button
                                    const btn = form.querySelector('button[type="submit"]');
                                    if (btn) {{
                                        btn.disabled = false;
                                        btn.removeAttribute('disabled');
                                    }}
                                    
                                    // Dispatch submit event
                                    const submitEvent = new Event('submit', {{ bubbles: true, cancelable: true }});
                                    form.dispatchEvent(submitEvent);
                                    return 'form_submitted';
                                }}
                                
                                // Method 2: Try to call VFS's login API directly
                                // This would bypass the form entirely
                                return 'no_form_found';
                            }} catch(e) {{
                                return 'error: ' + e.message;
                            }}
                        }}
                    """)
                    logging.info(f"Form submit attempt result: {login_result}")
                    time.sleep(2)
                    
                    # Check if we navigated
                    if "login" not in page.url.lower():
                        logging.info("Login successful after form submit!")
                        return
                    
                    # Check if Turnstile rendered after the submit attempt
                    iframe_after_submit = page.evaluate("""
                        () => {
                            const iframes = document.querySelectorAll('iframe');
                            for (const f of iframes) {
                                if (f.src && f.src.includes('challenges.cloudflare')) {
                                    return f.src;
                                }
                            }
                            return null;
                        }
                    """)
                    if iframe_after_submit:
                        logging.info(f"Turnstile rendered after submit! iframe src: {iframe_after_submit[:60]}...")
                    
            except Exception as e:
                logging.warning(f"Initial Sign In attempt failed: {e}")

            # Try direct API login as last resort (before CAPTCHA checks)
            # This might work if VFS's API doesn't require CAPTCHA token
            try:
                api_login_result = page.evaluate(f"""
                    async () => {{
                        try {{
                            const response = await fetch('https://lift-api.vfsglobal.com/user/login', {{
                                method: 'POST',
                                headers: {{
                                    'Content-Type': 'application/json',
                                    'Origin': 'https://visa.vfsglobal.com',
                                    'Referer': 'https://visa.vfsglobal.com/'
                                }},
                                body: JSON.stringify({{
                                    username: '{email}',
                                    password: '{password}',
                                    missionCode: 'NGA',
                                    countryCode: 'DEU'
                                }})
                            }});
                            const data = await response.json();
                            return {{ status: response.status, data: data }};
                        }} catch(e) {{
                            return {{ error: e.message }};
                        }}
                    }}
                """)
                logging.info(f"Direct API login attempt: {api_login_result}")
                
                if api_login_result and isinstance(api_login_result, dict):
                    if api_login_result.get('status') == 200:
                        logging.info("Direct API login succeeded! Refreshing page...")
                        page.reload()
                        time.sleep(3)
                        if "login" not in page.url.lower():
                            return  # Success!
            except Exception as e:
                logging.warning(f"Direct API login failed: {e}")

            # Check for any sitekeys captured by init script from turnstile.render() calls
            early_captured_sitekeys = page.evaluate("""
                () => window.__capturedTurnstileSitekeys || []
            """)
            if early_captured_sitekeys:
                logging.info(f"Init script captured {len(early_captured_sitekeys)} sitekey(s): {early_captured_sitekeys[0][:25]}...")
                captured_sitekeys.extend(early_captured_sitekeys)

            # Check for and solve Cloudflare Turnstile CAPTCHA on the login form
            from .captcha_solver import extract_turnstile_sitekey, inject_turnstile_token
            
            logging.info("Checking for Turnstile CAPTCHA on login form...")
            
            # Wait longer for CAPTCHA widget to fully load - Turnstile can be slow
            # Extended wait time since Turnstile loads asynchronously
            turnstile_ready = False
            for wait_attempt in range(15):  # Extended to 15 seconds
                time.sleep(1)
                
                # Check for newly captured sitekeys from init script
                new_sitekeys = page.evaluate("() => window.__capturedTurnstileSitekeys || []")
                if new_sitekeys and new_sitekeys not in captured_sitekeys:
                    for sk in new_sitekeys:
                        if sk not in captured_sitekeys:
                            captured_sitekeys.append(sk)
                            logging.info(f"Captured sitekey during wait: {sk[:25]}...")
                
                # Check multiple indicators that Turnstile is ready
                ready_status = page.evaluate("""
                    () => {
                        // Check 1: iframe with cloudflare src
                        const iframes = document.querySelectorAll('iframe');
                        for (const f of iframes) {
                            if (f.src && f.src.includes('challenges.cloudflare')) {
                                return { ready: true, method: 'iframe_src' };
                            }
                        }
                        
                        // Check 2: data-sitekey attribute exists
                        const widget = document.querySelector('[data-sitekey]');
                        if (widget) {
                            return { ready: true, method: 'data_sitekey', sitekey: widget.getAttribute('data-sitekey') };
                        }
                        
                        // Check 3: window.turnstile is available and has widgets
                        if (window.turnstile) {
                            // Try to find rendered widgets via internal API
                            try {
                                const containers = document.querySelectorAll('[class*="cf-turnstile"], [id*="cf-turnstile"]');
                                if (containers.length > 0) {
                                    return { ready: true, method: 'turnstile_container' };
                                }
                            } catch(e) {}
                        }
                        
                        // Check 4: Turnstile checkbox is visible
                        const checkbox = document.querySelector('[aria-label*="Cloudflare"]');
                        if (checkbox) {
                            return { ready: true, method: 'checkbox' };
                        }
                        
                        return { ready: false };
                    }
                """)
                
                if ready_status.get('ready'):
                    logging.info(f"Turnstile widget ready after {wait_attempt + 1}s (method: {ready_status.get('method')})")
                    if ready_status.get('sitekey'):
                        logging.info(f"Found sitekey directly: {ready_status.get('sitekey')[:25]}...")
                    turnstile_ready = True
                    break
                    
                logging.info(f"Waiting for Turnstile widget to render... ({wait_attempt + 1}/15)")
            
            # If Turnstile not ready yet, try to trigger it manually
            if not turnstile_ready:
                logging.info("Turnstile not ready - attempting to trigger render...")
                
                # VFS uses Angular - try to find and trigger their captcha service
                # Also try to get the sitekey from Angular's environment/config
                sitekey_from_angular = page.evaluate("""
                    () => {
                        // Method 1: Check for VFS's Angular environment service
                        try {
                            // Angular apps often store config in ng-state or similar
                            const ngState = document.querySelector('script#ng-state');
                            if (ngState) {
                                const state = JSON.parse(ngState.textContent);
                                if (state && state.turnstileSiteKey) return state.turnstileSiteKey;
                            }
                        } catch(e) {}
                        
                        // Method 2: Check window.__env or similar global config
                        const configKeys = ['__env', 'environment', 'ENV', 'appConfig', '__APP_CONFIG__'];
                        for (const key of configKeys) {
                            try {
                                if (window[key]) {
                                    const cfg = window[key];
                                    if (cfg.turnstileSiteKey) return cfg.turnstileSiteKey;
                                    if (cfg.turnstile && cfg.turnstile.siteKey) return cfg.turnstile.siteKey;
                                    if (cfg.captcha && cfg.captcha.siteKey) return cfg.captcha.siteKey;
                                }
                            } catch(e) {}
                        }
                        
                        // Method 3: Try to access Angular's injector to get config service
                        try {
                            const appRoot = document.querySelector('app-root');
                            if (appRoot && appRoot.__ngContext__) {
                                // Angular stores component context here
                                // Try to find environment config in the injector
                            }
                        } catch(e) {}
                        
                        // Method 4: Check for any element with ng-reflect that might have sitekey
                        const allElements = document.querySelectorAll('*');
                        for (const el of allElements) {
                            for (const attr of el.attributes) {
                                if (attr.name.includes('sitekey') || attr.name.includes('siteKey')) {
                                    if (attr.value && attr.value.startsWith('0x')) {
                                        return attr.value;
                                    }
                                }
                            }
                        }
                        
                        return null;
                    }
                """)
                
                if sitekey_from_angular:
                    logging.info(f"Found sitekey from Angular: {sitekey_from_angular[:25]}...")
                    captured_sitekeys.append(sitekey_from_angular)
                
                # VFS uses volt-recaptcha - try to trigger Angular to render it
                page.evaluate("""
                    () => {
                        // Find the volt-recaptcha element and try to trigger Angular
                        const voltEl = document.getElementById('volt-recaptcha');
                        if (voltEl) {
                            console.log('[VFS-Bot] Found volt-recaptcha element');
                            
                            // Try to trigger Angular change detection
                            try {
                                const appRoot = document.querySelector('app-root');
                                if (appRoot) {
                                    // Dispatch an event to trigger Angular's zone
                                    appRoot.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            } catch(e) {}
                            
                            // If turnstile is available, try to render it on volt-recaptcha
                            if (window.turnstile && window.turnstile.render) {
                                console.log('[VFS-Bot] Attempting to render turnstile on volt-recaptcha');
                                try {
                                    // Check if there's a parent container with sitekey
                                    const container = voltEl.closest('[data-sitekey]') || voltEl.parentElement;
                                    if (container && !container.querySelector('iframe[src*="cloudflare"]')) {
                                        window.turnstile.render(container);
                                    }
                                } catch(e) {
                                    console.log('[VFS-Bot] Turnstile render error:', e);
                                }
                            }
                        }
                    }
                """)
                time.sleep(2)
                
                # Check if any sitekeys were captured after trigger attempt
                new_sitekeys = page.evaluate("() => window.__capturedTurnstileSitekeys || []")
                if new_sitekeys:
                    for sk in new_sitekeys:
                        if sk not in captured_sitekeys:
                            captured_sitekeys.append(sk)
                            logging.info(f"Captured sitekey after trigger: {sk[:25]}...")
                
                # First try to click on the Turnstile area to trigger it
                try:
                    # Look for Turnstile container and click it
                    turnstile_containers = page.locator('[class*="cf-turnstile"], [id*="cf-turnstile"], .captcha-container, [id="volt-recaptcha"]').all()
                    for container in turnstile_containers:
                        try:
                            if container.is_visible():
                                box = container.bounding_box()
                                if box:
                                    # Click in the center of the container
                                    page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)
                                    logging.info("Clicked on Turnstile container to trigger render")
                                    time.sleep(2)
                                    break
                        except:
                            pass
                except Exception as e:
                    logging.warning(f"Could not click Turnstile container: {e}")
                
                page.evaluate("""
                    () => {
                        // Try to find and trigger Turnstile render
                        if (window.turnstile && window.turnstile.render) {
                            const containers = document.querySelectorAll('[class*="cf-turnstile"], [id*="cf-turnstile"], .captcha-container');
                            containers.forEach(c => {
                                try {
                                    // Check if already rendered
                                    if (!c.querySelector('iframe')) {
                                        window.turnstile.render(c);
                                    }
                                } catch(e) {}
                            });
                        }
                    }
                """)
                time.sleep(3)  # Give extra time after manual trigger
            
            # Debug: Get all iframes on page
            iframe_count = page.locator("iframe").count()
            logging.info(f"Found {iframe_count} iframes on page")
            
            # Look for Turnstile elements - expanded selectors
            turnstile_selectors = [
                "iframe[src*='challenges.cloudflare']",
                "iframe[src*='turnstile']",
                "iframe[title*='challenge']",
                "iframe[title*='Cloudflare']",
                "[class*='cf-turnstile']",
                "[data-sitekey]",
                "#cf-turnstile",
                "div[class*='turnstile']",
                # VFS-specific selectors
                ".captcha-container",
                "div[class*='captcha']",
                "div[class*='Captcha']",
            ]
            
            captcha_found = False
            captcha_element = None
            for selector in turnstile_selectors:
                try:
                    count = page.locator(selector).count()
                    if count > 0:
                        captcha_found = True
                        captcha_element = selector
                        logging.info(f"Found Turnstile CAPTCHA element: {selector} ({count} found)")
                        break
                except:
                    pass
            
            # If not found by selector, check page HTML for turnstile indicators
            if not captcha_found:
                page_html = page.content()
                turnstile_indicators = ['turnstile', 'cf-turnstile', 'challenges.cloudflare', 'data-sitekey']
                for indicator in turnstile_indicators:
                    if indicator in page_html.lower():
                        logging.info(f"Found '{indicator}' in page HTML - CAPTCHA likely present")
                        captcha_found = True
                        break
            
            # Also check if Sign In button is disabled (common when CAPTCHA not solved)
            try:
                sign_in_disabled = page.locator("button:has-text('Sign In')").first.is_disabled()
                if sign_in_disabled:
                    logging.info("Sign In button is disabled - likely waiting for CAPTCHA")
                    captcha_found = True
            except:
                pass
            
            if captcha_found and self.captcha_solver.is_configured:
                logging.info("Attempting to solve Turnstile CAPTCHA...")
                
                # FIRST: Check for sitekeys captured from network requests
                if captured_sitekeys:
                    sitekey = captured_sitekeys[0]
                    logging.info(f"Using sitekey from network request: {sitekey[:25]}...")
                else:
                    # SECOND: Check for captured sitekeys from our JS interceptor
                    captured_sitekey = page.evaluate("""
                        () => {
                            if (window.__capturedTurnstileSitekeys && window.__capturedTurnstileSitekeys.length > 0) {
                                return window.__capturedTurnstileSitekeys[0];
                            }
                            return null;
                        }
                    """)
                    if captured_sitekey:
                        logging.info(f"Found sitekey from JS interceptor: {captured_sitekey[:25]}...")
                        sitekey = captured_sitekey
                    else:
                        # THIRD: Extract sitekey - try multiple methods
                        sitekey = extract_turnstile_sitekey(page)
                
                # NEW PRIORITY: Try to get sitekey from window.turnstile internal state
                if not sitekey:
                    logging.info("Checking window.turnstile for sitekey...")
                    sitekey = page.evaluate("""
                        () => {
                            // Method 0: Check Angular's injected environment config (VFS-specific)
                            try {
                                // VFS Angular apps inject config into window
                                const configKeys = ['environment', '__env', 'appConfig', 'config', 'ENV'];
                                for (const key of configKeys) {
                                    if (window[key]) {
                                        const cfg = JSON.stringify(window[key]);
                                        // Look for any 0x sitekey pattern
                                        const match = cfg.match(/(0x[A-Za-z0-9_-]{30,70})/);
                                        if (match) {
                                            console.log('Found sitekey in', key, ':', match[1]);
                                            return match[1];
                                        }
                                    }
                                }
                            } catch(e) {}
                            
                            // Method 1: Check if turnstile has any rendered widgets with config
                            if (window.turnstile) {
                                // Try to access internal widget registry
                                try {
                                    // Turnstile stores widgets internally, try to access
                                    for (const key in window.turnstile) {
                                        const val = window.turnstile[key];
                                        if (val && typeof val === 'object') {
                                            // Look for sitekey in widget config
                                            if (val.sitekey) return val.sitekey;
                                            // Check nested objects
                                            for (const k2 in val) {
                                                if (val[k2] && val[k2].sitekey) return val[k2].sitekey;
                                            }
                                        }
                                    }
                                } catch(e) {}
                                
                                // Try to call turnstile.getWidgetIds() if available
                                try {
                                    if (window.turnstile.getWidgetIds) {
                                        const ids = window.turnstile.getWidgetIds();
                                        console.log('Turnstile widget IDs:', ids);
                                    }
                                } catch(e) {}
                            }
                            
                            // Method 2: Check volt-recaptcha element specifically (VFS-specific)
                            const voltScript = document.getElementById('volt-recaptcha');
                            if (voltScript) {
                                // Check the element itself for sitekey
                                const sk = voltScript.getAttribute('data-sitekey') || 
                                           voltScript.getAttribute('sitekey');
                                if (sk) return sk;
                                
                                // Check parent for sitekey
                                const parent = voltScript.closest('[data-sitekey]');
                                if (parent) return parent.getAttribute('data-sitekey');
                                
                                // Check siblings and children
                                const container = voltScript.parentElement;
                                if (container) {
                                    const sitekeyEl = container.querySelector('[data-sitekey]');
                                    if (sitekeyEl) return sitekeyEl.getAttribute('data-sitekey');
                                }
                                
                                // Check for any nearby iframe that might have loaded
                                const nearbyIframe = voltScript.parentElement?.querySelector('iframe');
                                if (nearbyIframe && nearbyIframe.src) {
                                    const match = nearbyIframe.src.match(/[?&]sitekey=([^&]+)/);
                                    if (match) return decodeURIComponent(match[1]);
                                }
                            }
                            
                            // Method 3: Look for any Angular service that might have the config
                            try {
                                // Check for sitekey in any global config
                                if (window.environment && window.environment.turnstileSiteKey) {
                                    return window.environment.turnstileSiteKey;
                                }
                                if (window.__env && window.__env.turnstileSiteKey) {
                                    return window.__env.turnstileSiteKey;
                                }
                            } catch(e) {}
                            
                            // Method 4: Parse from script tags that may contain config
                            const scripts = document.querySelectorAll('script:not([src])');
                            for (const s of scripts) {
                                const text = s.textContent || '';
                                // Look for turnstile sitekey patterns
                                const match = text.match(/turnstile[^}]*sitekey['":\s]+(['"]?)(0x[A-Za-z0-9_-]+)\1/i);
                                if (match) return match[2];
                                // Also look for any 0x4 sitekey (Cloudflare format)
                                const match2 = text.match(/(0x4[A-Za-z0-9_-]{25,50})/);
                                if (match2) return match2[1];
                            }
                            
                            return null;
                        }
                    """)
                    if sitekey:
                        logging.info(f"Found sitekey via window.turnstile: {sitekey[:25]}...")
                
                # Extract sitekey - try multiple methods
                sitekey = extract_turnstile_sitekey(page)
                
                if not sitekey:
                    # Try to get sitekey from page HTML directly
                    import re
                    page_html = page.content()
                    
                    # Pattern 1: data-sitekey attribute
                    match = re.search(r'data-sitekey="(0x[^"]+)"', page_html)
                    if match:
                        sitekey = match.group(1)
                        logging.info(f"Found sitekey via data-sitekey attr: {sitekey[:20]}...")
                    
                    # Pattern 2: sitekey in script
                    if not sitekey:
                        # Prefer sitekeys starting with 0x4AAAA (Cloudflare Turnstile format)
                        match = re.search(r'sitekey["\']?\s*[:=]\s*["\']?(0x4[a-zA-Z0-9_-]+)', page_html)
                        if match:
                            sitekey = match.group(1)
                            logging.info(f"Found sitekey in script: {sitekey[:20]}...")
                        else:
                            # Fallback to any 0x sitekey
                            match = re.search(r'sitekey["\']?\s*[:=]\s*["\']?(0x[a-zA-Z0-9_-]+)', page_html)
                            if match:
                                sitekey = match.group(1)
                                logging.info(f"Found sitekey in script: {sitekey[:20]}...")
                    
                    # Pattern 3: Look for Cloudflare Turnstile sitekey patterns (0x4AAAA...)
                    if not sitekey:
                        # Cloudflare Turnstile sitekeys typically start with 0x4AAAA
                        matches = re.findall(r'0x4[A-Za-z0-9_-]{25,50}', page_html)
                        if matches:
                            for m in matches:
                                if len(m) >= 30:  # Valid sitekeys are 30+ chars
                                    sitekey = m
                                    logging.info(f"Found Cloudflare sitekey pattern: {sitekey[:25]}...")
                                    break
                    
                    # Pattern 4: Turnstile render call
                    if not sitekey:
                        match = re.search(r'turnstile\.render\([^)]*sitekey["\']?\s*:\s*["\']?([^"\']+)', page_html)
                        if match:
                            sitekey = match.group(1)
                            logging.info(f"Found sitekey in render call: {sitekey[:20]}...")
                
                # PRIORITY: Check Turnstile iframe src directly (most reliable)
                if not sitekey:
                    logging.info("Checking Turnstile iframe src for sitekey...")
                    iframe_sitekey = page.evaluate("""
                        () => {
                            const iframes = document.querySelectorAll('iframe');
                            for (const iframe of iframes) {
                                const src = iframe.src || '';
                                if (src.includes('challenges.cloudflare') || src.includes('turnstile')) {
                                    // Parse sitekey from URL params
                                    const match = src.match(/[?&]sitekey=([^&]+)/);
                                    if (match) return decodeURIComponent(match[1]);
                                    // Also try k= parameter
                                    const kMatch = src.match(/[?&]k=([^&]+)/);
                                    if (kMatch) return decodeURIComponent(kMatch[1]);
                                }
                            }
                            return null;
                        }
                    """)
                    if iframe_sitekey:
                        sitekey = iframe_sitekey
                        logging.info(f"Found sitekey in iframe src: {sitekey[:25]}...")
                
                # Try fetching sitekey from Angular main.js bundle dynamically
                if not sitekey:
                    logging.info("Trying to fetch sitekey from Angular bundle...")
                    try:
                        import requests
                        # First get the bundle URL from the page dynamically
                        main_js_url = page.evaluate("""
                            () => {
                                const scripts = document.querySelectorAll('script[src*="main."]');
                                for (const s of scripts) {
                                    if (s.src.includes('main.') && s.src.includes('.js')) {
                                        return s.src;
                                    }
                                }
                                // Fallback to known pattern
                                return null;
                            }
                        """)
                        
                        if not main_js_url:
                            # Fallback URL with version pattern
                            main_js_url = "https://liftassets.vfsglobal.com/_angular/main.f89019679083d24e.js?v=8.0.15"
                        
                        logging.info(f"Fetching Angular bundle: {main_js_url}")
                        resp = requests.get(main_js_url, timeout=10, headers={
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        })
                        if resp.status_code == 200:
                            bundle_content = resp.text
                            import re
                            
                            # IMPORTANT: The 0x2/0x3 strings in VFS bundle are NOT real Cloudflare sitekeys
                            # They appear to be obfuscated variable names. Real Cloudflare Turnstile 
                            # sitekeys start with 0x4AAAA... Skip the 0x2/0x3 patterns.
                            
                            # Only look for standard Cloudflare Turnstile sitekeys (0x4...)
                            matches = re.findall(r'0x4[A-Za-z0-9_-]{25,50}', bundle_content)
                            
                            if matches:
                                for m in matches:
                                    if len(m) >= 30:
                                        sitekey = m
                                        logging.info(f"Found 0x4 sitekey in bundle: {sitekey[:25]}...")
                                        break
                                
                                if sitekey:
                                    logging.info(f"Total 0x4 sitekeys found: {len(matches)}")
                            else:
                                logging.info("No valid 0x4 Cloudflare sitekeys found in bundle")
                    except Exception as e:
                        logging.warning(f"Failed to fetch Angular bundle: {e}")
                
                # NOTE: The strings starting with 0x2/0x3 in VFS bundle are NOT valid Cloudflare 
                # Turnstile sitekeys - they appear to be obfuscated JavaScript variable names.
                # Real Cloudflare Turnstile sitekeys typically start with 0x4AAAA...
                
                # Last resort: Try to get sitekey from window at runtime
                    sitekey = page.evaluate("""
                        () => {
                            // Check if turnstile.render was called - we can intercept it
                            // Look for the sitekey in any way possible
                            
                            // Try to find it in the Angular service
                            try {
                                const allElements = document.querySelectorAll('*');
                                for (const el of allElements) {
                                    for (const attr of el.attributes || []) {
                                        if (attr.value && attr.value.startsWith('0x') && attr.value.length > 30) {
                                            return attr.value;
                                        }
                                    }
                                }
                            } catch(e) {}
                            
                            // Check local/session storage
                            try {
                                for (let i = 0; i < localStorage.length; i++) {
                                    const key = localStorage.key(i);
                                    const val = localStorage.getItem(key);
                                    if (val && val.includes('0x')) {
                                        const match = val.match(/(0x[A-Za-z0-9_-]{30,50})/);
                                        if (match) return match[1];
                                    }
                                }
                            } catch(e) {}
                            
                            return null;
                        }
                    """)
                    if sitekey:
                        logging.info(f"Found sitekey via deep search: {sitekey[:25]}...")
                
                if not sitekey:
                    # Try JavaScript extraction - more aggressive
                    sitekey = page.evaluate("""
                        () => {
                            // Try data-sitekey attribute
                            const el = document.querySelector('[data-sitekey]');
                            if (el) return el.getAttribute('data-sitekey');
                            
                            // Look in window for turnstile config
                            if (window.turnstileConfig && window.turnstileConfig.sitekey) {
                                return window.turnstileConfig.sitekey;
                            }
                            
                            // Check window.turnstile for rendered widgets
                            if (window.turnstile && window.turnstile.getResponse) {
                                // Widget exists but we need sitekey, not response
                            }
                            
                            // Look for VFS-specific volt-recaptcha config
                            const voltScript = document.querySelector('#volt-recaptcha');
                            if (voltScript) {
                                // Check parent element for data-sitekey
                                let parent = voltScript.parentElement;
                                while (parent) {
                                    const sk = parent.getAttribute && parent.getAttribute('data-sitekey');
                                    if (sk) return sk;
                                    parent = parent.parentElement;
                                }
                            }
                            
                            // Check all elements for data-sitekey (might be dynamically added)
                            const allWithSitekey = document.querySelectorAll('[data-sitekey]');
                            if (allWithSitekey.length > 0) {
                                return allWithSitekey[0].getAttribute('data-sitekey');
                            }
                            
                            // Look in iframe src (now that we waited for it)
                            const iframes = document.querySelectorAll('iframe');
                            for (const iframe of iframes) {
                                const src = iframe.src || '';
                                if (src.includes('challenges.cloudflare')) {
                                    const match = src.match(/[?&]sitekey=([^&]+)/);
                                    if (match) return match[1];
                                }
                            }
                            
                            // Try to find turnstile widget ID and get its sitekey
                            if (window.turnstile) {
                                // Look for any turnstile widget containers
                                const containers = document.querySelectorAll('[id^="cf-chl"], [class*="cf-turnstile"]');
                                for (const c of containers) {
                                    const sk = c.getAttribute('data-sitekey');
                                    if (sk) return sk;
                                }
                            }
                            
                            // Check Angular environment/config
                            try {
                                // VFS uses Angular - check for injected config
                                const appRoot = document.querySelector('app-root');
                                if (appRoot && appRoot.__ngContext__) {
                                    const ctx = JSON.stringify(appRoot.__ngContext__);
                                    const match = ctx.match(/(0x[A-Za-z0-9_-]{20,50})/);
                                    if (match) return match[1];
                                }
                            } catch(e) {}
                            
                            // Look for any 0x... string in the page that could be a sitekey
                            const html = document.documentElement.innerHTML;
                            const match = html.match(/['"](0x[A-Za-z0-9_-]{20,50})['"]/);
                            if (match) return match[1];
                            
                            // Check all script contents
                            const scripts = document.querySelectorAll('script:not([src])');
                            for (const s of scripts) {
                                const text = s.textContent || s.innerHTML || '';
                                const m = text.match(/sitekey['":\s]+(0x[A-Za-z0-9_-]+)/i);
                                if (m) return m[1];
                                
                                // Also look for any 0x pattern
                                const m2 = text.match(/(0x[A-Za-z0-9_-]{25,50})/);
                                if (m2) return m2[1];
                            }
                            
                            return null;
                        }
                    """)
                    
                    if sitekey:
                        logging.info(f"Found sitekey via JavaScript: {sitekey[:20]}...")
                
                # LAST RESORT: Try to manually trigger Turnstile and capture sitekey
                if not sitekey:
                    logging.info("Attempting to trigger Turnstile widget manually...")
                    
                    # Wait a bit and check if widget renders after interaction
                    page.mouse.move(500, 500)  # Move mouse to trigger any lazy loading
                    time.sleep(2)
                    
                    # Check iframe again after interaction
                    sitekey = page.evaluate("""
                        () => {
                            // Recheck iframes - they may have loaded now
                            const iframes = document.querySelectorAll('iframe');
                            for (const iframe of iframes) {
                                const src = iframe.src || '';
                                if (src.includes('challenges.cloudflare') || src.includes('turnstile')) {
                                    let match = src.match(/[?&]sitekey=([^&]+)/);
                                    if (match) return decodeURIComponent(match[1]);
                                    match = src.match(/[?&]k=([^&]+)/);
                                    if (match) return decodeURIComponent(match[1]);
                                }
                            }
                            
                            // Check captured sitekeys again
                            if (window.__capturedTurnstileSitekeys && window.__capturedTurnstileSitekeys.length > 0) {
                                return window.__capturedTurnstileSitekeys[0];
                            }
                            
                            // Final attempt: check data-sitekey anywhere in DOM
                            const el = document.querySelector('[data-sitekey]');
                            if (el) return el.getAttribute('data-sitekey');
                            
                            return null;
                        }
                    """)
                    if sitekey:
                        logging.info(f"Found sitekey after manual trigger: {sitekey[:25]}...")
                
                if sitekey:
                    logging.info(f"Found Turnstile sitekey: {sitekey[:20]}...")
                    
                    # Solve the CAPTCHA
                    solution = self.captcha_solver.solve_turnstile(
                        sitekey=sitekey,
                        url=page.url
                    )
                    
                    if solution.success and solution.token:
                        logging.info(f"CAPTCHA solved in {solution.solve_time:.1f}s!")
                        
                        # Inject the token
                        inject_turnstile_token(page, solution.token)
                        
                        # Also try to call turnstile callback if exists
                        page.evaluate(f"""
                            (token) => {{
                                // Set hidden input value
                                document.querySelectorAll('input[name*="turnstile"]').forEach(el => el.value = token);
                                
                                // Try to trigger turnstile success callback
                                if (window.turnstile && window.turnstile.getResponse) {{
                                    // Widget already has response
                                }}
                                
                                // Try callback function
                                const callbacks = document.querySelectorAll('[data-callback]');
                                callbacks.forEach(el => {{
                                    const cbName = el.getAttribute('data-callback');
                                    if (window[cbName]) window[cbName](token);
                                }});
                            }}
                        """, solution.token)
                        
                        time.sleep(2)  # Wait for CAPTCHA to process
                    else:
                        logging.error(f"CAPTCHA solve failed: {solution.error}")
                else:
                    logging.warning("Could not find Turnstile sitekey - dumping page info for debugging")
                    
                    # Debug: dump all iframes and their sources (including now-loaded ones)
                    iframe_info = page.evaluate("""
                        () => {
                            const iframes = document.querySelectorAll('iframe');
                            return Array.from(iframes).map(f => ({
                                src: f.src,
                                id: f.id,
                                className: f.className,
                                title: f.title,
                                dataSitekey: f.getAttribute('data-sitekey')
                            }));
                        }
                    """)
                    logging.info(f"Iframes found: {iframe_info}")
                    
                    # Check for sitekey in iframe src NOW (after waiting)
                    for iframe in iframe_info:
                        src = iframe.get('src', '')
                        if 'challenges.cloudflare' in src:
                            import re
                            match = re.search(r'[?&]sitekey=([^&]+)', src)
                            if match:
                                sitekey = match.group(1)
                                logging.info(f"Found sitekey in iframe src: {sitekey}")
                                # Try to solve with found sitekey
                                solution = self.captcha_solver.solve_turnstile(sitekey=sitekey, url=page.url)
                                if solution.success and solution.token:
                                    logging.info(f"CAPTCHA solved in {solution.solve_time:.1f}s!")
                                    inject_turnstile_token(page, solution.token)
                                    time.sleep(2)
                                break
                    
                    # Dump all script src URLs to find turnstile loader
                    script_info = page.evaluate("""
                        () => {
                            const scripts = document.querySelectorAll('script');
                            return Array.from(scripts).map(s => s.src).filter(s => s);
                        }
                    """)
                    logging.info(f"External scripts: {script_info}")
                    
                    # Look for any element with 'turnstile' or 'captcha' in class/id
                    captcha_elements = page.evaluate("""
                        () => {
                            const els = document.querySelectorAll('[class*="turnstile"], [class*="captcha"], [id*="turnstile"], [id*="captcha"], [data-sitekey]');
                            return Array.from(els).map(e => ({
                                tag: e.tagName,
                                id: e.id,
                                className: e.className,
                                dataSitekey: e.getAttribute('data-sitekey'),
                                innerHTML: e.innerHTML.substring(0, 500)
                            }));
                        }
                    """)
                    logging.info(f"Captcha-related elements: {captcha_elements}")
                    
                    # Take debug screenshot - use absolute path to tmp folder
                    screenshot_path = '/Users/travismoore/Desktop/ai-chatbot/travelhub/services/vfs-slot-checker/tmp/captcha_debug.png'
                    page.screenshot(path=screenshot_path)
                    logging.info(f"Debug screenshot saved to {screenshot_path}")
            elif captcha_found:
                logging.warning("Turnstile CAPTCHA found but solver not configured!")
            else:
                logging.info("No Turnstile CAPTCHA detected on login form")

            # Find and click sign in button
            logging.info("Looking for Sign In button...")
            remove_overlay()  # Remove overlay before clicking button
            
            sign_in_selectors = [
                "button:has-text('Sign In')",
                "button:has-text('LOGIN')",
                "button:has-text('Login')",
                "button[type='submit']",
                "button.mat-raised-button",
                "button.mat-primary",
                ".login-btn",
                "[data-testid='login-button']",
            ]
            
            sign_in_btn = None
            for selector in sign_in_selectors:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible(timeout=1000):
                        sign_in_btn = btn
                        logging.info(f"Found sign in button: {selector}")
                        break
                except Exception:
                    continue
            
            if sign_in_btn:
                remove_overlay()  # Remove again right before click
                
                # Check if button is disabled
                is_disabled = sign_in_btn.is_disabled()
                logging.info(f"Sign In button disabled: {is_disabled}")
                
                if is_disabled:
                    logging.info("Button is disabled - trying to enable it...")
                    # Try to enable the button and trigger Turnstile
                    page.evaluate("""
                        () => {
                            // Find and enable the button
                            const btn = document.querySelector('button[type="submit"]') || 
                                       document.querySelector('button.mat-raised-button') ||
                                       Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));
                            if (btn) {
                                btn.disabled = false;
                                btn.removeAttribute('disabled');
                                btn.classList.remove('mat-button-disabled');
                                console.log('Button enabled');
                            }
                            
                            // Try to trigger Turnstile if it exists but hasn't rendered
                            if (window.turnstile) {
                                try {
                                    // Get all containers that might need Turnstile
                                    const containers = document.querySelectorAll('#volt-recaptcha, .captcha-container, [class*="turnstile"]');
                                    containers.forEach(c => {
                                        if (!c.querySelector('iframe[src*="cloudflare"]')) {
                                            console.log('Triggering turnstile.render on', c);
                                            // Try to render with a known callback
                                            window.turnstile.render(c, {
                                                callback: function(token) {
                                                    console.log('Turnstile solved, token:', token.substring(0, 20));
                                                    // Try to submit form
                                                    const form = document.querySelector('form');
                                                    if (form) form.submit();
                                                }
                                            });
                                        }
                                    });
                                } catch(e) {
                                    console.log('Turnstile render error:', e);
                                }
                            }
                        }
                    """)
                    time.sleep(3)  # Wait for Turnstile to potentially render/solve
                
                # Check button state again
                try:
                    is_still_disabled = page.locator("button:has-text('Sign In')").first.is_disabled()
                    logging.info(f"Sign In button still disabled after enable attempt: {is_still_disabled}")
                except:
                    pass
                
                # Use JavaScript click to bypass overlay
                page.evaluate("""
                    const btn = document.querySelector('button[type="submit"]') || 
                               document.querySelector('button.mat-raised-button') ||
                               Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));
                    if (btn) btn.click();
                """)
                logging.info("Clicked sign in button via JavaScript")
                
                # Wait and check if Turnstile challenge appears
                time.sleep(2)
                
                # Check if Turnstile iframe now has src (rendered after form interaction)
                iframe_check = page.evaluate("""
                    () => {
                        const iframes = document.querySelectorAll('iframe');
                        for (const f of iframes) {
                            if (f.src && f.src.includes('challenges.cloudflare')) {
                                return f.src;
                            }
                        }
                        return null;
                    }
                """)
                
                if iframe_check:
                    logging.info(f"Turnstile iframe appeared after click: {iframe_check[:50]}...")
                    # Extract sitekey and solve if we can
                    import re
                    match = re.search(r'[?&]sitekey=([^&]+)', iframe_check)
                    if match:
                        sitekey = match.group(1)
                        logging.info(f"Found sitekey in iframe: {sitekey[:25]}...")
                        
                        # Try to solve
                        if self.captcha_solver.is_configured:
                            solution = self.captcha_solver.solve_turnstile(sitekey=sitekey, url=page.url)
                            if solution.success and solution.token:
                                logging.info(f"CAPTCHA solved after form click: {solution.solve_time:.1f}s")
                                inject_turnstile_token(page, solution.token)
                                time.sleep(2)
                                # Click again after solving
                                page.evaluate("""
                                    const btn = document.querySelector('button[type="submit"]');
                                    if (btn) btn.click();
                                """)
                            else:
                                logging.warning(f"CAPTCHA solve failed: {solution.error}")
            else:
                logging.warning("Could not find sign in button, trying Enter key")
                # Use JavaScript to submit form
                page.evaluate("""
                    const form = document.querySelector('form');
                    if (form) form.submit();
                """)
            
            # Wait for page to respond
            logging.info("Waiting for login response...")
            time.sleep(5)
            
            # Check for error messages (but ignore "*" which is just required field indicator)
            error_selectors = [
                "mat-error",
                ".error-message",
                ".alert-danger",
                "text=Invalid credentials",
                "text=incorrect password",
                "text=Account locked",
                "text=User not found",
            ]
            
            for selector in error_selectors:
                try:
                    error = page.locator(selector).first
                    if error.is_visible(timeout=1000):
                        error_text = error.inner_text().strip()
                        # Ignore empty or just asterisk (required field indicators)
                        if error_text and error_text != "*" and len(error_text) > 2:
                            logging.error(f"Login error displayed: {error_text}")
                            raise LoginError(f"VFS login error: {error_text}")
                except Exception:
                    continue
            
            # Wait for successful login - check multiple indicators
            logging.info("Checking if login was successful...")
            
            # First check if URL changed (indicates successful login)
            current_url = page.url
            if "dashboard" in current_url or "booking" in current_url:
                logging.info(f"Login successful! Redirected to: {current_url}")
                return
            
            # Wait for dashboard elements
            success_selectors = [
                "text=Start New Booking",
                "text=My Applications",
                "text=Dashboard",
                "text=Welcome",
                ".dashboard",
                "[routerlink*='dashboard']",
            ]
            
            for selector in success_selectors:
                try:
                    el = page.locator(selector).first
                    if el.is_visible(timeout=5000):
                        logging.info(f"Login successful! Found: {selector}")
                        return
                except:
                    continue
            
            # Still on login page? Check URL again after waiting
            time.sleep(3)
            if "login" not in page.url.lower():
                logging.info(f"Login appears successful. URL: {page.url}")
                return
            
            # Take screenshot for debugging - save to project tmp folder
            screenshot_path = '/Users/travismoore/Desktop/ai-chatbot/travelhub/services/vfs-slot-checker/tmp/vfs_login_failed.png'
            page.screenshot(path=screenshot_path)
            logging.error(f"Login may have failed. Screenshot saved to: {screenshot_path}")
            logging.error(f"Current URL: {page.url}")
            logging.error(f"Page title: {page.title()}")
            
            # Get any visible text that might indicate the problem
            try:
                body_text = page.locator('body').inner_text()[:500]
                logging.error(f"Page content preview: {body_text}")
            except:
                pass
            
            raise LoginError(f"Login timeout - still on login page. Check screenshot at {screenshot_path}")
            
        except LoginError:
            raise
        except Exception as e:
            raise LoginError(f"Login failed: {e}")

    def pre_login_steps(self, page: Page) -> None:
        """
        Handle cookie consent, Cloudflare challenges, and other pre-login steps.

        Args:
            page: Playwright page object.
        """
        import time
        from .captcha_solver import extract_turnstile_sitekey, inject_turnstile_token
        
        try:
            # Wait for page to load
            logging.info("Waiting for page to load...")
            time.sleep(3)
            
            # FIRST: Handle cookie consent - this MUST happen before anything else
            # The overlay blocks all interactions until dismissed
            logging.info("Handling cookie consent...")
            
            # Try clicking the accept button
            cookie_selectors = [
                "#onetrust-accept-btn-handler",
                "button:has-text('Accept All Cookies')",
                "button:has-text('Accept All')",
                "button:has-text('Accept')",
                "#accept-recommended-btn-handler",
                ".onetrust-accept-btn-handler",
            ]
            
            cookie_clicked = False
            for selector in cookie_selectors:
                try:
                    btn = page.locator(selector)
                    if btn.is_visible(timeout=1000):
                        btn.click(force=True)
                        logging.info(f"Clicked cookie consent: {selector}")
                        cookie_clicked = True
                        time.sleep(1)
                        break
                except Exception as e:
                    logging.debug(f"Cookie selector {selector} failed: {e}")
                    continue
            
            # ALWAYS try to remove overlay via JavaScript - this is critical
            # Even if we clicked the button, the overlay might still be blocking
            logging.info("Removing cookie overlay via JavaScript...")
            page.evaluate("""
                // Remove the dark overlay
                document.querySelectorAll('.onetrust-pc-dark-filter').forEach(el => el.remove());
                // Remove the entire consent SDK container
                document.querySelectorAll('#onetrust-consent-sdk').forEach(el => el.remove());
                // Remove any other OneTrust elements
                document.querySelectorAll('[id*="onetrust"]').forEach(el => {
                    if (el.classList.contains('ot-fade-in') || el.id.includes('banner')) {
                        el.remove();
                    }
                });
                // Also try removing by class
                document.querySelectorAll('.ot-fade-in').forEach(el => el.remove());
            """)
            logging.info("Cookie overlay removal attempted")
            time.sleep(0.5)
            
            # Verify overlay is gone
            overlay_count = page.locator(".onetrust-pc-dark-filter").count()
            if overlay_count > 0:
                logging.warning(f"Overlay still present ({overlay_count} elements), trying again...")
                page.evaluate("document.querySelector('.onetrust-pc-dark-filter')?.remove()")
                page.evaluate("document.querySelector('#onetrust-consent-sdk')?.remove()")
            
            # Check for Cloudflare Turnstile CAPTCHA
            logging.info("Checking for Cloudflare challenges...")
            turnstile_found = False
            
            cf_challenge = page.locator("iframe[src*='challenges.cloudflare']").count()
            turnstile = page.locator("[id*='turnstile'], [class*='cf-turnstile'], [data-sitekey]").count()
            
            if cf_challenge > 0 or turnstile > 0:
                turnstile_found = True
                logging.info(f"Cloudflare Turnstile detected (cf={cf_challenge}, turnstile={turnstile})")
                
                # If solver is configured, solve it
                if self.captcha_solver.is_configured:
                    logging.info("Attempting to solve Turnstile CAPTCHA...")
                    sitekey = extract_turnstile_sitekey(page)
                    if sitekey:
                        solution = self.captcha_solver.solve_turnstile(sitekey=sitekey, url=page.url)
                        if solution.success and solution.token:
                            logging.info(f"CAPTCHA solved in {solution.solve_time:.1f}s")
                            inject_turnstile_token(page, solution.token)
                            time.sleep(3)
                else:
                    logging.warning("Turnstile found but no CAPTCHA solver configured")
            else:
                logging.info("No Cloudflare challenge detected")
                
        except Exception as e:
            logging.warning(f"Pre-login steps warning: {e}")
            # Continue anyway

    def check_for_appointment(
        self, page: Page, appointment_params: Dict[str, str]
    ) -> List[AppointmentSlot]:
        """
        Check for available appointments on the German VFS website.

        Args:
            page: Playwright page object.
            appointment_params: Dictionary containing:
                - visa_center: The VFS visa center name
                - visa_category: The visa category
                - visa_sub_category: The visa sub-category

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

            # Wait for and check appointment availability
            page.wait_for_timeout(3000)  # Wait for availability check
            
            # Look for appointment date alerts
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
                            time=time or "09:00",  # Default time if not specified
                            location=f"VFS Global - {visa_center}",
                            appointment_type="Biometric Submission"
                        ))
            except Exception:
                # No appointments found or alert elements don't exist
                pass

        except Exception as e:
            logging.error(f"Error checking appointments: {e}")
            
        return slots
