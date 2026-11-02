from urllib.parse import urlparse
from .aajtak import AAJTAK_TEMPLATE
from .dainik_bhaskar import DAINIK_BHASKAR_TEMPLATE
from .ndtv import NDTV_TEMPLATE
from .hindustantimes import HT_TEMPLATE
from .tribune import TRIBUNE_TEMPLATE
from .punjabkesari import PUNJAB_KESARI_TEMPLATE
from .techdesk import TECHDESK_TEMPLATE


TEMPLATES = {
    "aajtak.in": AAJTAK_TEMPLATE,
    "www.aajtak.in": AAJTAK_TEMPLATE,
    
    "bhaskar.com": DAINIK_BHASKAR_TEMPLATE,
    "www.bhaskar.com": DAINIK_BHASKAR_TEMPLATE,
    
    "ndtv.com": NDTV_TEMPLATE,
    "www.ndtv.com": NDTV_TEMPLATE,
    
    "hindustantimes.com": HT_TEMPLATE,
    "www.hindustantimes.com": HT_TEMPLATE,
    
    "tribuneindia.com": TRIBUNE_TEMPLATE,
    "www.tribuneindia.com": TRIBUNE_TEMPLATE,
    
    "punjabkesari.in": PUNJAB_KESARI_TEMPLATE,
    "www.punjabkesari.in": PUNJAB_KESARI_TEMPLATE,
    
    "indianexpress.com": TECHDESK_TEMPLATE,
    "www.indianexpress.com": TECHDESK_TEMPLATE,
}

def get_template_for_url(url: str) -> dict:
    """
    Parses an incoming URL string, extracts the core network location (domain),
    and resolves the correct extraction template dynamically.
    """
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    
    template = TEMPLATES.get(domain)
    
    if not template:
        raise ValueError(f"No extraction template registered for domain: {domain}")
        
    return template
