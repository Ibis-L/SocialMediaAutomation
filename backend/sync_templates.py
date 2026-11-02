import os
import sys

# --- Initialize Django ---
sys.path.append(os.path.join(os.path.dirname(__file__), 'dashboard'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
import django
django.setup()

from masters.models import TemplateConfig
from templates import TEMPLATES

def sync_templates():
    print("Syncing templates to database...")
    count = 0
    
    # Use a set to track unique domains we've processed (since www. and non-www. both point to same template)
    processed = set()
    
    for domain, config in TEMPLATES.items():
        clean_domain = config.get("domain", domain)
        if clean_domain in processed:
            continue
            
        processed.add(clean_domain)
        
        obj, created = TemplateConfig.objects.get_or_create(
            domain=clean_domain,
            defaults={
                'name': clean_domain.split('.')[0].capitalize(),
                'url_identifier': config.get("url_identifier", "/"),
                'selectors': config.get("selectors", {}),
                'status': 'Active'
            }
        )
        
        if created:
            print(f"Added {clean_domain} to database!")
            count += 1
        else:
            # Update selectors in case they changed
            obj.selectors = config.get("selectors", {})
            obj.url_identifier = config.get("url_identifier", "/")
            obj.save()
            print(f"Updated {clean_domain} in database!")
            
    print(f"Sync complete! Added {count} new templates.")

if __name__ == "__main__":
    sync_templates()
