#!/usr/bin/env python3
"""
Script to extract content from O'Reilly Learning platform
This attempts multiple methods to access chapter content
"""

import requests
from bs4 import BeautifulSoup
import json
import sys

def try_direct_access(url):
    """Try accessing the URL directly"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            # Look for main content areas
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content')
            if main_content:
                text = main_content.get_text(separator='\n', strip=True)
                return text[:5000]  # First 5000 chars
        return None
    except Exception as e:
        print(f"Error accessing {url}: {e}", file=sys.stderr)
        return None

def try_api_access(book_id, chapter):
    """Try accessing via O'Reilly API"""
    api_urls = [
        f"https://learning.oreilly.com/api/v2/retirement/urn:orm:book:{book_id}:chapter:{chapter}/",
        f"https://learning.oreilly.com/api/v1/content/{book_id}/chapters/{chapter}/",
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
    }
    
    for api_url in api_urls:
        try:
            response = requests.get(api_url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            continue
    return None

if __name__ == "__main__":
    # Chapter 6 URL
    url = "https://learning.oreilly.com/library/view/ai-frameworks-enabled/9798868814020/html/ch06.xhtml"
    book_id = "9798868814020"
    chapter = "ch06.xhtml"
    
    print("Attempting to extract content...")
    print(f"URL: {url}\n")
    
    # Try direct access
    content = try_direct_access(url)
    if content:
        print("=== DIRECT ACCESS SUCCESS ===")
        print(content)
        sys.exit(0)
    
    # Try API access
    api_data = try_api_access(book_id, chapter)
    if api_data:
        print("=== API ACCESS SUCCESS ===")
        print(json.dumps(api_data, indent=2))
        sys.exit(0)
    
    print("Could not access content directly.")
    print("Content is likely behind authentication.")
    print("\nRecommendation: Use web search results or manual extraction from Firefox browser.")
    sys.exit(1)
