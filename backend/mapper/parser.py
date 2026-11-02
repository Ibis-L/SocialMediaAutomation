from bs4 import BeautifulSoup
from __init__ import get_logger

logger = get_logger("mapper.parser")

class UniversalExtractor:
    """
    Decoupled engine that maps custom domain templates over 
    live DOM components to output sanitized database objects.
    """
    def __init__(self, template: dict):
        self.template = template
        self.selectors = template["selectors"]
        logger.debug(f"Parser engine initialized with template boundaries for: {template.get('domain')}")

    def parse_dom(self, raw_html: str) -> dict:
        logger.debug("Parsing document node fragment streams using BeautifulSoup components.")
        soup = BeautifulSoup(raw_html, "html.parser")
        
        title_sel = self.selectors.get("title")
        title = soup.select_one(title_sel) if title_sel else None
        
        subheading_sel = self.selectors.get("subheading")
        subheading = soup.select_one(subheading_sel) if subheading_sel else None
        
        author_sel = self.selectors.get("author")
        author = soup.select_one(author_sel) if author_sel else None

        date_meta_sel = self.selectors.get("date_meta")
        meta_items = soup.select(date_meta_sel) if date_meta_sel else []
        date_string = " | ".join([item.get_text(strip=True) for item in meta_items]) if meta_items else None

        article_body_sel = self.selectors.get("article_body")
        body_paragraphs = soup.select(article_body_sel) if article_body_sel else []
        clean_body = "\n\n".join([p.get_text(strip=True) for p in body_paragraphs if p.get_text(strip=True)])

        images_sel = self.selectors.get("images")
        image_elements = soup.select(images_sel) if images_sel else []
        extracted_images = []
        for img in image_elements:
            src = img.get("src") or img.get("data-src")
            title_text = img.get("title") or img.get("alt")
            if src:
                extracted_images.append({"url": src, "caption": title_text})

        return {
            "domain": self.template["domain"],
            "title": title.get_text(strip=True) if title else None,
            "subheading": subheading.get_text(strip=True) if subheading else None,
            "author": author.get_text(strip=True) if author else "Editorial Team",
            "published_updated_date": date_string,
            "body_content": clean_body,
            "media_assets": extracted_images
        }