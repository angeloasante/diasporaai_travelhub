"""Test VFS with non-headless (visible browser works, so we use that)."""
import os
os.environ["CAPTCHA_API_KEY"] = "8df5c49183f1f60974b11d76e660ad7e"
os.environ["CAPTCHA_SERVICE"] = "2captcha"

import time
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

stealth = Stealth()

print("Testing VFS with NON-HEADLESS mode (headless=False)...")
print("This requires a display but bypasses bot detection.\n")

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,  # NON-HEADLESS works!
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--window-size=1920,1080",
        ],
    )
    
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        locale="en-NG",
        timezone_id="Africa/Lagos",
    )
    
    stealth.apply_stealth_sync(context)
    page = context.new_page()
    
    print('Navigating to VFS...')
    response = page.goto('https://visa.vfsglobal.com/nga/en/deu/login', timeout=60000)
    print(f'Response: {response.status if response else "None"}')
    
    # Don't wait for networkidle - just wait a few seconds
    time.sleep(8)
    print(f'Title: {page.title()}')
    
    content = page.content()
    if "session expired" in content.lower():
        print("\n❌ Still blocked even in non-headless!")
    else:
        # Handle cookies
        try:
            btn = page.locator('#onetrust-accept-btn-handler')
            if btn.is_visible(timeout=3000):
                btn.click()
                print("Clicked cookie consent")
                time.sleep(2)
        except:
            pass
        
        # Check for login form
        email_input = page.locator("input[formcontrolname='username']")
        if email_input.count() > 0:
            print("\n✅ SUCCESS! Login form found!")
            print(f"Email input visible: {email_input.first.is_visible()}")
        
        inputs = page.locator('input').count()
        print(f'Total inputs: {inputs}')
    
    page.screenshot(path='/tmp/vfs_nonheadless.png')
    print('Screenshot: /tmp/vfs_nonheadless.png')
    
    time.sleep(3)
    browser.close()

print('\nDone!')
