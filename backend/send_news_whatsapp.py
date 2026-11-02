import asyncio
import os
import sys
import random
import requests
import uuid
import argparse
from datetime import datetime, timezone

# --- Initialize Django ---
sys.path.append(os.path.join(os.path.dirname(__file__), 'dashboard'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
import django
django.setup()

from asgiref.sync import sync_to_async
from masters.models import TemplateConfig, ScrapedArticle
from main import run_pipeline

async def generate_and_send(phone_number: str, count: int, folder: str = None):
    print(f"--- Starting News to WhatsApp Integration ---")
    print(f"Target Phone: {phone_number}")
    print(f"Article Count: {count}")
    
    # 1. Select random active templates from DB
    active_templates = await sync_to_async(list)(TemplateConfig.objects.filter(status='Active'))
    if not active_templates:
        print("No active templates found in database. Please add them in the Django dashboard.")
        return
    
    template = random.choice(active_templates)
    print(f"Selected random portal: {template.name} ({template.domain})")
    
    homepage = f"https://{template.domain}"
    if not template.domain.startswith("www."):
        homepage = f"https://www.{template.domain}"
        
    start_time = datetime.now(timezone.utc)
    
    # 2. Run the pipeline to scrape articles
    print(f"Initiating scrape for {count} articles...")
    await run_pipeline(target_homepage=homepage, n_articles_to_scrape=count)
    
    # 3. Fetch newly scraped articles from DB
    @sync_to_async
    def get_articles():
        new_arts = list(ScrapedArticle.objects.filter(
            template=template,
            scraped_at__gte=start_time
        ).order_by('-scraped_at')[:count])
        
        if len(new_arts) < count:
            print(f"Only found {len(new_arts)} new articles (others might be duplicates or pipeline failed).")
            print(f"Fetching additional latest articles from the database to meet the requested count of {count}...")
            existing_arts = list(ScrapedArticle.objects.exclude(
                id__in=[a.id for a in new_arts]
            ).order_by('-scraped_at')[:(count - len(new_arts))])
            return new_arts + existing_arts
        return new_arts

    new_articles = await get_articles()

    if not new_articles:
        print("No articles found in the database. Exiting.")
        return

    # 4. Format message
    msg_lines = ["*Latest News Updates* 📰\n"]
    for i, article in enumerate(new_articles, 1):
        title = article.title.strip() if article.title else "News Article"
        url = article.source_url
        msg_lines.append(f"*{i}. {title}*\nRead more: {url}\n")
    
    message = "\n".join(msg_lines)
    
    print("\n--- Generated Message ---")
    print(message)
    print("-------------------------\n")
    
    # 5. Handle "specific folder" requirement
    if folder:
        try:
            os.makedirs(folder, exist_ok=True)
            filename = f"task_{phone_number.replace('+', '')}_{int(datetime.now().timestamp())}.txt"
            filepath = os.path.join(folder, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"Phone: {phone_number}\n")
                f.write(f"Message:\n{message}")
            print(f"Task successfully saved to specific folder: {filepath}")
        except Exception as e:
            print(f"Error saving task to folder: {e}")

    # 6. Queue Task Directly into Django Database
    @sync_to_async
    def queue_task():
        from masters.models import WhatsAppDevice, WhatsAppTask
        device = WhatsAppDevice.objects.first()
        if not device:
            print("Failed to queue task: No WhatsApp devices registered in the Django database.")
            print("Please add a device via the Next.js Dashboard or Django Admin first.")
            return False
            
        WhatsAppTask.objects.create(
            device=device,
            contact_number=phone_number,
            message=message,
            status='PENDING'
        )
        return True

    print("Queueing task to local Django Database...")
    success = await queue_task()
    if success:
        print("Successfully queued task to the database!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape news and send via WhatsApp")
    parser.add_argument("--phone", type=str, required=True, help="Target phone number (with country code, e.g., +919876543210)")
    parser.add_argument("--count", type=int, default=3, help="Number of articles to scrape")
    parser.add_argument("--folder", type=str, default=None, help="Specific folder path to save a local copy of the task")
    
    args = parser.parse_args()
    
    asyncio.run(generate_and_send(args.phone, args.count, args.folder))
