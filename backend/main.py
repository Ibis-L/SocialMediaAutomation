import asyncio
import os
import sys
import json
import argparse
from __init__ import get_logger
from templates import get_template_for_url 
from scraper.discoverer import discover_homepage_articles
from scraper.fetcher import fetch_clean_html
from mapper.parser import UniversalExtractor
import urllib.robotparser
from urllib.parse import urlparse
import signal

logger = get_logger(__name__)
shutdown_event = asyncio.Event()

def _signal_handler(sig, frame):
    logger.info("\n[Shutdown Initiated] Graceful exit requested. Finishing current task...")
    shutdown_event.set()

signal.signal(signal.SIGINT, _signal_handler)

def check_robots_allowed(url: str, user_agent: str = "*") -> bool:
    """Verifies compliance with the target domain's robots.txt directives."""
    try:
        parsed_url = urlparse(url)
        robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception as e:
        logger.warning(f"Robots.txt check failed for {url} ({e}). Assuming allowed.")
        return True

# --- Initialize Django ---
sys.path.append(os.path.join(os.path.dirname(__file__), 'dashboard'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
import django
django.setup()

from masters.models import ScrapedArticle, TemplateConfig, ScrapeLog
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = get_logger("main_orchestrator")

@sync_to_async
def save_article_to_db(domain, link, title_val, extracted_payload):
    try:
        db_template = TemplateConfig.objects.get(domain=domain)
    except TemplateConfig.DoesNotExist:
        db_template = None
        
    from pipeline.title_dedup import title_to_hash
    t_hash = title_to_hash(title_val) if title_val else None

    # Check for duplicate URL
    if ScrapedArticle.objects.filter(source_url=link).exists():
        ScrapeLog.objects.create(template=db_template, url=link, status='DUPE', message='Duplicate article URL caught')
        return False
        
    # Check for duplicate title hash
    if t_hash and ScrapedArticle.objects.filter(title_hash=t_hash).exists():
        ScrapeLog.objects.create(template=db_template, url=link, status='DUPE', message='Duplicate article Title caught')
        return False
        
    ScrapedArticle.objects.create(
        template=db_template,
        source_url=link,
        title=title_val,
        title_hash=t_hash,
        content=extracted_payload
    )
    ScrapeLog.objects.create(template=db_template, url=link, status='NEW')
    return True

@sync_to_async
def log_scrape_error(domain, link, message):
    try:
        db_template = TemplateConfig.objects.get(domain=domain)
    except TemplateConfig.DoesNotExist:
        db_template = None
    ScrapeLog.objects.create(template=db_template, url=link, status='ERROR', message=message)

@sync_to_async
def update_template_scraped_time(domain):
    TemplateConfig.objects.filter(domain=domain).update(last_scraped_at=timezone.now())

async def run_pipeline(target_homepage: str, n_articles_to_scrape: int, target_keyword: str = None):
    
    logger.info(f"Starting pipeline for {target_homepage} (Target: {n_articles_to_scrape} articles).")

    try:
        from masters.models import TemplateConfig
        from asgiref.sync import sync_to_async
        clean_target = target_homepage.replace("www.", "").replace("https://", "").replace("http://", "").strip("/")
        
        @sync_to_async
        def get_db_template(target):
            return TemplateConfig.objects.get(domain__icontains=target)
            
        db_template = await get_db_template(clean_target)
        active_template = {
            "domain": db_template.domain,
            "url_identifier": db_template.url_identifier,
            "selectors": db_template.selectors
        }
        logger.info(f"Successfully resolved template for domain: {active_template['domain']} from DB")
    except Exception as e:
        logger.warning(f"Could not fetch from DB, falling back to static templates. Error: {e}")
        try:
            active_template = get_template_for_url(target_homepage)
            logger.info(f"Successfully resolved template for domain: {active_template['domain']} from static files")
        except ValueError as e2:
            logger.critical(str(e2))
            return

    clean_domain = active_template['domain'].replace("www.", "")
    site_name = clean_domain.split('.')[0] 
    
    json_out_dir = os.path.join("output", site_name, "json")
    html_out_dir = os.path.join("output", site_name, "html")
    
    os.makedirs(json_out_dir, exist_ok=True)
    os.makedirs(html_out_dir, exist_ok=True)

    import random
    cautious_mode = False
    if not check_robots_allowed(target_homepage):
        logger.warning(f"Robots.txt restricts {target_homepage}. Engaging Cautious Mode (high latency).")
        cautious_mode = True

    discovered_links = await discover_homepage_articles(
        homepage_url=target_homepage,
        link_selector=active_template["selectors"]["homepage_links"],
        domain_filter=active_template["domain"],
        url_identifier=active_template.get("url_identifier", "/"),
        limit=n_articles_to_scrape,
        require_keyword=target_keyword
    )

    if not discovered_links:
        logger.warning("No article URLs were discovered on the homepage. Exiting.")
        return

    extractor_engine = UniversalExtractor(template=active_template)
    
    for i, link in enumerate(discovered_links, start=1):
        if shutdown_event.is_set():
            logger.info("Graceful shutdown flag detected. Stopping batch early.")
            break

        if cautious_mode:
            dynamic_backoff = random.uniform(3.0, 6.0)
            logger.info(f"[CAUTIOUS MODE] Targeting {link} in {dynamic_backoff:.1f} seconds...")
        else:
            dynamic_backoff = random.uniform(1.0, 3.0)
            logger.info(f"Targeting {link} in {dynamic_backoff:.1f} seconds...")
            
        await asyncio.sleep(dynamic_backoff)

        logger.info(f"Processing target [{i}/{len(discovered_links)}]: {link}")
        try:
            cleaned_html = await fetch_clean_html(link)
            
            html_filename = f"article_{i}.html"
            with open(os.path.join(html_out_dir, html_filename), "w", encoding="utf-8") as f:
                f.write(cleaned_html)
                
            extracted_payload = extractor_engine.parse_dom(cleaned_html)
            
            if extracted_payload.get("body_content"):
                unwanted_phrases = ["Subscribe Now", "Subscribe to get features"]
                for phrase in unwanted_phrases:
                    extracted_payload["body_content"] = extracted_payload["body_content"].replace(phrase, "")
                
                paragraphs = [p.strip() for p in extracted_payload["body_content"].split('\n') if p.strip()]
                if paragraphs and len(paragraphs[0].split()) <= 5:
                    paragraphs.pop(0)
                extracted_payload["body_content"] = "\n\n".join(paragraphs)
                
            NULL_THRESHOLD = 0.50 
            total_fields = len(extracted_payload)
            null_fields = sum(1 for value in extracted_payload.values() if not value)
            null_ratio = (null_fields / total_fields) if total_fields > 0 else 1.0
            
            if null_ratio > NULL_THRESHOLD:
                logger.warning(f"Data quality failed ({null_ratio*100:.1f}% null). Skipping.")
                continue 
            
            title_val = extracted_payload.get("title")
            is_title_empty = not title_val or str(title_val).strip() == "" or str(title_val).strip().lower() == "null"
            
            if is_title_empty:
                logger.warning(f"Target [{i}/{len(discovered_links)}] yielded empty title. Skipping save.")
                # Delete the HTML cache file we just wrote since the article is invalid
                try:
                    os.remove(os.path.join(html_out_dir, html_filename))
                except Exception:
                    pass
                continue
                
            extracted_payload["source_origin_url"] = link
            
            # --- Save to Django Database ---
            is_new = await save_article_to_db(active_template['domain'], link, title_val, extracted_payload)
            
            if is_new:
                logger.info(f"Successfully saved article #{i} to the database")
                # Write JSON for frontend panel
                json_filename = f"article_{i}.json"
                with open(os.path.join(json_out_dir, json_filename), "w", encoding="utf-8") as f:
                    json.dump(extracted_payload, f, indent=4, ensure_ascii=False)
            else:
                logger.info(f"Article #{i} is a duplicate, skipped saving.")

        except Exception as e:
            logger.error(f"Pipeline failure on path {link}: {e}", exc_info=True)
            await log_scrape_error(active_template['domain'], link, str(e))

    await update_template_scraped_time(active_template['domain'])
    logger.info("Batch extraction pipeline run completed successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Modular Async News Scraper")
    parser.add_argument("--url", type=str, required=True, help="The target homepage URL (e.g., https://www.aajtak.in)")
    parser.add_argument("--keyword", type=str, default=None, help="Explicit keyword that must exist in article URLs")
    parser.add_argument("--count", type=int, default=3, help="Number of articles to scrape (default: 3)")
    
    args = parser.parse_args()
    
    asyncio.run(run_pipeline(target_homepage=args.url, n_articles_to_scrape=args.count, target_keyword=args.keyword))
    # To Start => python main.py --url https://www.aajtak.in --count 2