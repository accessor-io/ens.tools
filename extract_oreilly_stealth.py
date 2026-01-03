#!/usr/bin/env python3
"""
Stealth browser script to access O'Reilly Learning content
Uses Camoufox for undetectable automation
"""

try:
    from camoufox import Camoufox
    CAMOUFOX_AVAILABLE = True
except ImportError:
    CAMOUFOX_AVAILABLE = False
    print("Camoufox not installed. Install with: pip install camoufox")

from bs4 import BeautifulSoup
import time
import sys

def extract_chapter_content_camoufox(chapter_url: str, wait_time: int = 15):
    """
    Extract content from O'Reilly chapter using Camoufox stealth browser
    
    Args:
        chapter_url: Full URL to the chapter
        wait_time: Seconds to wait for content to load
    """
    if not CAMOUFOX_AVAILABLE:
        print("ERROR: Camoufox is not installed.")
        print("Install it with: pip install camoufox")
        return None
    
    try:
        with Camoufox(headless=False) as browser:
            page = browser.new_page()
            
            print(f"Navigating to: {chapter_url}")
            page.goto(chapter_url)
            
            # Wait for content to load
            print(f"Waiting {wait_time} seconds for content to load...")
            time.sleep(wait_time)
            
            # Try to find and click "Start" button if on book landing page
            try:
                start_button = page.locator('text=Start').first
                if start_button.is_visible(timeout=5000):
                    print("Clicking Start button...")
                    start_button.click()
                    time.sleep(5)
            except Exception as e:
                print(f"No Start button found or already on chapter page: {e}")
            
            # Scroll to load content (simulate human behavior)
            print("Scrolling to load content...")
            for i in range(5):
                page.evaluate("window.scrollBy(0, 500)")
                time.sleep(1)
            
            # Wait a bit more for dynamic content
            time.sleep(3)
            
            # Extract content
            content = page.content()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            
            # Try multiple selectors for main content
            main_content = (
                soup.find('main') or 
                soup.find('article') or 
                soup.find('div', {'role': 'main'}) or
                soup.find('div', class_='content') or
                soup.find('div', id='content')
            )
            
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
                return text
            else:
                # Fallback: return all text, filtered
                all_text = soup.get_text(separator='\n', strip=True)
                # Remove navigation and header/footer noise
                lines = [line for line in all_text.split('\n') if len(line.strip()) > 20]
                return '\n'.join(lines)
                
    except Exception as e:
        print(f"Error extracting content: {e}")
        import traceback
        traceback.print_exc()
        return None

def extract_chapter_content_selenium(chapter_url: str):
    """
    Alternative: Extract using Selenium with stealth configuration
    Requires: pip install selenium selenium-stealth
    """
    try:
        from selenium import webdriver
        from selenium.webdriver.firefox.options import Options
        from selenium_stealth import stealth
    except ImportError:
        print("Selenium stealth not available. Install with: pip install selenium selenium-stealth")
        return None
    
    options = Options()
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference('useAutomationExtension', False)
    options.set_preference("media.peerconnection.enabled", False)
    
    driver = webdriver.Firefox(options=options)
    
    try:
        # Overwrite navigator.webdriver
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        driver.get(chapter_url)
        time.sleep(15)  # Wait for content
        
        content = driver.page_source
        soup = BeautifulSoup(content, 'html.parser')
        
        main_content = soup.find('main') or soup.find('article')
        if main_content:
            return main_content.get_text(separator='\n', strip=True)
        return soup.get_text(separator='\n', strip=True)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        # Default: Chapter 7: Unpacking Ethereum
        url = "https://learning.oreilly.com/library/view/ai-frameworks-enabled/9798868814020/html/ch07.xhtml"
    
    print("="*80)
    print("O'Reilly Content Extractor - Stealth Mode")
    print("="*80)
    print(f"URL: {url}\n")
    
    # Try Camoufox first (best option)
    if CAMOUFOX_AVAILABLE:
        print("Using Camoufox (stealth Firefox)...")
        content = extract_chapter_content_camoufox(url, wait_time=15)
    else:
        print("Camoufox not available. Trying Selenium...")
        content = extract_chapter_content_selenium(url)
    
    if content and len(content) > 100:
        print("\n" + "="*80)
        print("EXTRACTED CONTENT (first 2000 chars):")
        print("="*80)
        print(content[:2000])
        print("\n... (truncated)")
        
        # Save to file
        filename = f"chapter_content_{int(time.time())}.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✓ Full content saved to: {filename}")
        print(f"✓ Content length: {len(content)} characters")
    else:
        print("\n✗ Failed to extract content")
        print("Possible reasons:")
        print("  - Content is behind authentication")
        print("  - Content loads in protected iframe")
        print("  - Need to login first")
        print("\nRecommendation: Use Firefox browser manually and copy/paste content")
