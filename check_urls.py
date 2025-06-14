#!/usr/bin/env python3
"""Check all URLs in the config file to ensure they're accessible."""

import yaml
import requests
import time
import sys

def check_url(url):
    """Check if a URL is accessible."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        return response.status_code, None
    except requests.RequestException as e:
        return None, str(e)

def main():
    # Load config
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    print("Checking all URLs in config.yaml...\n")
    
    failed_urls = []
    
    for location in config.get('locations', []):
        area = location.get('area', 'Unknown')
        print(f"\n--- {area} ---")
        
        # Check proxy URL
        proxy_url = location.get('area_proxy_url')
        if proxy_url:
            print(f"Proxy: {proxy_url}")
            status, error = check_url(proxy_url)
            if status == 200:
                print("  ✓ OK")
            else:
                print(f"  ✗ Failed: {status or error}")
                failed_urls.append((area, 'Proxy', proxy_url, status or error))
            time.sleep(1)
        
        # Check munro URLs
        munros = location.get('munros', [])
        for munro in munros:
            name = munro.get('name')
            url = munro.get('url')
            if url:
                print(f"{name}: {url}")
                status, error = check_url(url)
                if status == 200:
                    print("  ✓ OK")
                else:
                    print(f"  ✗ Failed: {status or error}")
                    failed_urls.append((area, name, url, status or error))
                time.sleep(1)
    
    # Summary
    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    if failed_urls:
        print(f"\n{len(failed_urls)} URLs failed:\n")
        for area, name, url, error in failed_urls:
            print(f"- {area} / {name}: {error}")
            print(f"  URL: {url}")
    else:
        print("\n✓ All URLs are accessible!")
    
    return 1 if failed_urls else 0

if __name__ == "__main__":
    sys.exit(main()) 