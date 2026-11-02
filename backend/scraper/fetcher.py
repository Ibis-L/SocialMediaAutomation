import os
import random
from  dotenv import load_dotenv
import json
import urllib.parse
import aiohttp
from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from __init__ import get_logger

logger = get_logger("scraper.fetcher")

load_dotenv()
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "fallback_or_raise_error_here")
BLOCKLIST_FILE = "blocked_domains.json"
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"
]

def load_blocked_domains() -> set:
    """Loads the persistent blocklist from a local JSON file."""
    if os.path.exists(BLOCKLIST_FILE):
        try:
            with open(BLOCKLIST_FILE, "r") as f:
                return set(json.load(f))
        except Exception as e:
            logger.error(f"Failed to read blocklist file: {e}")
    return set()

def save_blocked_domain(domain: str):
    """Dynamically appends a newly discovered blocked domain to the persistent storage."""
    domains = load_blocked_domains()
    if domain not in domains:
        domains.add(domain)
        try:
            with open(BLOCKLIST_FILE, "w") as f:
                json.dump(list(domains), f, indent=4)
            logger.info(f"Permanently registered '{domain}' to the persistent blocklist.")
        except Exception as e:
            logger.error(f"Failed to write to blocklist file: {e}")

def _is_blocked_domain(url: str) -> bool:
    """Extracts netloc and checks it against the persistent self-learning blocklist."""
    try:
        parsed_url = urllib.parse.urlparse(url)
        netloc = parsed_url.netloc
        blocked_set = load_blocked_domains()
        return any(domain in netloc for domain in blocked_set)
    except Exception:
        return False

async def _fetch_via_scraperapi(url: str) -> str:
    logger.info(f"Routing via ScraperAPI (blocked domain detected): {url}")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "https://api.scraperapi.com",
                params={"api_key": SCRAPER_API_KEY, "url": url},
                timeout=aiohttp.ClientTimeout(total=60),
            ) as response:
                text = await response.text()
                if response.status == 200 and len(text) > 500:
                    return text
                raise RuntimeError(f"ScraperAPI fetch failed: status={response.status}")
        except Exception as e:
            raise RuntimeError(f"ScraperAPI connection error: {str(e)}")

async def fetch_clean_html(url: str) -> str:
    """Executes network requests using adaptive routing based on block history."""
    logger.info(f"Launching request worker instance for: {url}")

    if _is_blocked_domain(url):
        try:
            html = await _fetch_via_scraperapi(url)
            logger.debug(f"Successful ScraperAPI extraction for: {url}")
            return html
        except Exception as e:
            logger.error(f"ScraperAPI fetch failed for {url}: {e}")
            raise RuntimeError(f"Extraction Pipeline Failure: {e}")

    # Standard free tier crawling mechanism
    browser_config = BrowserConfig(
        browser_type="chromium",
        headless=True,
        verbose=False,
        user_agent=random.choice(USER_AGENTS),
    )
    run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, delay_before_return_html=3.0)
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        if result.success:
            logger.debug(f"Successful extraction matrix resolution from target path: {url}")
            return result.html
        else:
            logger.error(f"Network processing anomaly on URL target path: {url}")
            raise RuntimeError(f"Extraction Pipeline Failure: {result.error_message}")
