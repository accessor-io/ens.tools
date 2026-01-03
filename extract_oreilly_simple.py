#!/usr/bin/env python3
"""
Simple browser script to access O'Reilly Learning content
Uses Selenium with basic stealth configuration
"""

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import sys

def extract_chapter_content(chapter_url: str):
    """
    Extract content from O'Reilly chapter using Selenium Firefox
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
        
        print(f"Navigating to: {chapter_url}")
        driver.get(chapter_url)
        
        # Wait for user to login manually
        print("\n" + "="*80)
        print("IMPORTANT: Please login to O'Reilly in the Firefox window that opened.")
        print("The browser will stay open for 2 minutes so you can login.")
        print("After logging in, navigate to the chapter if needed.")
        print("The script will automatically extract content after 2 minutes.")
        print("="*80)
        
        # Give user time to login (2 minutes)
        print("\nWaiting 2 minutes for you to login and navigate to content...")
        print("(You can close the browser window early if you want to stop)")
        for i in range(120):  # 2 minutes = 120 seconds
            time.sleep(1)
            if (i + 1) % 30 == 0:
                remaining = 120 - (i + 1)
                print(f"Still waiting... {remaining} seconds remaining")
        
        print("\nExtracting content now...")
        
        # Refresh to ensure we have the latest content
        driver.refresh()
        
        # Wait for content to load
        print("Waiting for content to load (10 seconds)...")
        time.sleep(10)
        
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
        for i in range(5):
            driver.execute_script("window.scrollBy(0, 500);")
            time.sleep(1)
        
        # Wait a bit more
        time.sleep(3)
        
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
        print("Browser will close in 5 seconds...")
        print("="*80)
        time.sleep(5)
        print("Closing browser...")
        driver.quit()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        # Default: Chapter 7: Unpacking Ethereum
        url = "https://learning.oreilly.com/library/view/ai-frameworks-enabled/9798868814020/html/ch07.xhtml"
    
    print("="*80)
    print("O'Reilly Content Extractor - Selenium Firefox")
    print("="*80)
    print(f"URL: {url}\n")
    
    content = extract_chapter_content(url)
    
    if content and len(content) > 100:
        print("\n" + "="*80)
        print("EXTRACTED CONTENT (first 2000 chars):")
        print("="*80)
        print(content[:2000])
        print("\n... (truncated)")
        
        # Save to file
        filename = f"chapter_07_content_{int(time.time())}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✓ Full content saved to: {filename}")
        print(f"✓ Content length: {len(content)} characters")
    else:
        print("\n✗ Failed to extract meaningful content")
        print("Content might be in a protected iframe or requires login")
