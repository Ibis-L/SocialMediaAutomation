from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from __init__ import get_logger
from scraper.fetcher import fetch_clean_html, _is_blocked_domain, save_blocked_domain

logger = get_logger("scraper.discoverer")

def _is_valid_domain(url: str, domain_filter: str) -> bool:
    try:
        return domain_filter in urlparse(url).netloc
    except Exception:
        return False

async def discover_homepage_articles(homepage_url: str, link_selector: str, domain_filter: str, url_identifier: str, limit: int = 5, require_keyword: str = None) -> list:
    """
    Scans landing indices. Automatically updates the global blocklist if a free crawl fails to yield results.
    """
    logger.info(f"Targeting root landing index page asset: {homepage_url}")

    try:
        cleaned_html = await fetch_clean_html(homepage_url)
    except Exception as e:
        logger.critical(f"Abrupt termination during landing page traversal on: {homepage_url} - {e}")
        return []

    soup = BeautifulSoup(cleaned_html, "html.parser")
    elements = soup.select(link_selector)

    discovered_urls = []
    seen_urls = set()

    for el in elements:
        href = el.get("href")
        if href:
            full_url = urljoin(homepage_url, href)
            if full_url not in seen_urls and _is_valid_domain(full_url, domain_filter) and url_identifier in full_url:
                if require_keyword and require_keyword not in full_url:
                    continue
                discovered_urls.append(full_url)
                seen_urls.add(full_url)
        if len(discovered_urls) >= limit:
            break

    # Layered Fallback Heuristics
    if not discovered_urls:
        logger.warning(f"Primary rules found 0 links. Activating layered fallback heuristic...")
        all_elements = soup.select("a")
        
        for el in all_elements:
            href = el.get("href")
            if href:
                full_url = urljoin(homepage_url, href)
                if full_url not in seen_urls and _is_valid_domain(full_url, domain_filter):
                    parsed_url = urlparse(full_url)
                    is_match = False
                    
                    if url_identifier in full_url:
                        is_match = True
                    elif parsed_url.path.count('-') >= 4:
                        is_match = True
                        
                    if is_match:
                        if require_keyword and require_keyword not in full_url:
                            continue
                        discovered_urls.append(full_url)
                        seen_urls.add(full_url)
            if len(discovered_urls) >= limit:
                break

    if not discovered_urls:
        logger.error("Fallback heuristic also failed. Target domain is completely dark or heavily protected.")
        
        if not _is_blocked_domain(homepage_url):
            try:
                target_domain = urlparse(homepage_url).netloc
                if target_domain:
                    logger.warning(f"🚨 Free tier failed to extract elements from {target_domain}. Moving domain to permanent blocklist.")
                    save_blocked_domain(target_domain)
            except Exception as e:
                logger.error(f"Failed parsing domain for block registration: {e}")
    else:
        logger.info(f"Successfully discovered {len(discovered_urls)} valid article assets from target home index.")

    return discovered_urls