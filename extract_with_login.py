#!/usr/bin/env python3
"""
O'Reilly content extractor with login support
SECURITY NOTE: Credentials are used only for automation, not stored
"""

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import sys

# SECURITY WARNING: These credentials are only used for automation
# They are not stored permanently and are only in this script
EMAIL = "clthorbe@gmail.com"
PASSWORD = "LYjzFgA6_cKYZ,D"  # You may want to use environment variables instead

def extract_chapter_content(chapter_url: str, auto_login: bool = False):
    """
    Extract content from O'Reilly chapter using Selenium Firefox
    
    Args:
        chapter_url: URL to extract
        auto_login: If True, attempt to login automatically
    """
    # Setup Firefox Options with stealth settings
    options = Options()
    
    # Disable automation flags
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference('useAutomationExtension', False)
    options.set_preference("media.peerconnection.enabled", False)
    
    # Use a more realistic user agent
    options.set_preference("general.useragent.override", 
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0")
    
    print("Launching Firefox with stealth configuration...")
    driver = webdriver.Firefox(options=options)
    
    try:
        # Overwrite navigator.webdriver flag
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        # Navigate to login page first if auto-login
        if auto_login:
            print("Navigating to login page...")
            driver.get("https://learning.oreilly.com/accounts/login/")
            time.sleep(3)
            
            try:
                # Find email field
                email_field = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "email"))
                )
                email_field.send_keys(EMAIL)
                
                # Find password field
                password_field = driver.find_element(By.ID, "password")
                password_field.send_keys(PASSWORD)
                
                # Click login button
                login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Sign in')]")
                login_button.click()
                
                print("Login submitted, waiting for redirect...")
                time.sleep(10)
            except Exception as e:
                print(f"Auto-login failed: {e}")
                print("Please login manually in the browser window")
                input("Press ENTER after logging in...")
        else:
            # Manual login
            print("Navigating to login page for manual login...")
            driver.get("https://learning.oreilly.com/accounts/login/")
            print("\n" + "="*80)
            print("Please login manually in the Firefox window.")
            print("After logging in, the script will navigate to the chapter.")
            print("="*80)
            input("Press ENTER after you've logged in...")
        
        print(f"\nNavigating to chapter: {chapter_url}")
        driver.get(chapter_url)
        
        # Wait for content to load
        print("Waiting for content to load (15 seconds)...")
        time.sleep(15)
        
        # Try to find and click "Start" button if present
        try:
            start_button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Start')]"))
            )
            print("Found Start button, clicking...")
            start_button.click()
            time.sleep(5)
        except:
            print("No Start button found or already on chapter page")
        
        # Scroll to load content
        print("Scrolling to load content...")
        for i in range(10):  # More scrolling for dynamic content
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(1)
        
        # Wait a bit more
        time.sleep(5)
        
        # Get page source
        content = driver.page_source
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        
        # Try multiple selectors for main content
        main_content = (
            soup.find('main') or 
            soup.find('article') or 
            soup.find('div', {'role': 'main'}) or
            soup.find('div', class_='content') or
            soup.find('div', id='content') or
            soup.find('body')
        )
        
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
            return text
        else:
            # Fallback: return all text
            return soup.get_text(separator='\n', strip=True)
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        print("\n" + "="*80)
        print("Content extraction complete!")
        print("Browser will stay open for 30 seconds so you can verify...")
        print("="*80)
        time.sleep(30)
        print("Closing browser...")
        driver.quit()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        # Default: Chapter 7: Unpacking Ethereum
        url = "https://learning.oreilly.com/library/view/ai-frameworks-enabled/9798868814020/html/ch07.xhtml"
    
    # Check if user wants auto-login
    auto_login = "--auto-login" in sys.argv or "-a" in sys.argv
    
    print("="*80)
    print("O'Reilly Content Extractor - Selenium Firefox")
    print("="*80)
    print(f"URL: {url}")
    print(f"Auto-login: {auto_login}")
    print("="*80 + "\n")
    
    content = extract_chapter_content(url, auto_login=auto_login)
    
    if content and len(content) > 500:
        print("\n" + "="*80)
        print("EXTRACTED CONTENT (first 3000 chars):")
        print("="*80)
        print(content[:3000])
        print("\n... (truncated)")
        
        # Save to file
        filename = f"chapter_07_content_{int(time.time())}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✓ Full content saved to: {filename}")
        print(f"✓ Content length: {len(content)} characters")
    else:
        print("\n✗ Failed to extract meaningful content")
        print("Content might be in a protected iframe")
        print("\nRecommendation: Use manual copy/paste method instead")
