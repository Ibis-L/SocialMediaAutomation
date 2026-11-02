NDTV_TEMPLATE = {
    "domain": "www.ndtv.com", 
    
    "url_identifier": "-news/", 
    
    "selectors": {
        "homepage_links": "a",       
        "title": "h1", 
        "subheading": "h2",      
        "author": "span[itemprop='author'], span[itemprop='name'], a.pst-by_lnk",       
        "date_meta": "span[itemprop='dateModified'], meta[itemprop='datePublished']",
        "article_body": "div#ins_storybody p, div.ins_storybody p, div.story__content-main p, div.sp-cn p, div[itemprop='articleBody'] p", 
        "images": "div#ins_storybody img, div.story__content img, picture img"
    }
}