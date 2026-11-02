
# TRIBUNE_TEMPLATE = {
#     "domain": "tribuneindia.com",
#     "url_identifier": "/news/", 
#     "selectors": {
#         # Removed global 'h2 a, h3 a' to stop picking up section landing pages
#         "homepage_links": "h2 a, .story-title a, .news-title a",#".news-title a, .story-card a, .card-title a, .listing-story a",   
#         "title": "h1.story-title, h1, .article-title",
#         "subheading": "h2.story-desc, .sub-heading, h2",
#         "author": ".author-name, .author, .byline",
#         "date_meta": ".article-date, time, .pub-date",
#         "article_body": ".story-desc p, .article-body p, .content-body p, article p",
#         "images": "img.post-featured-img, img.main-img, figure img"
#     }
# }

TRIBUNE_TEMPLATE = {
    "domain": "tribuneindia.com",
    "url_identifier": "/news/", 
    "selectors": {
        "homepage_links": "h2 a, .story-title a, .news-title a",   
        "title": "h1.story-title, h1, .article-title",
        "subheading": "h2.story-desc, .sub-heading, h2",
        "author": ".author-name, .author, .byline",
        "date_meta": ".article-date, time, .pub-date",
        "article_body": "p, .story-desc p, .article-body p, .content-body p, article p",
        
        # Removed the redundant class to prevent double-scraping
        "images": "img.main-img, figure img"
    }
}


# https://www.tribuneindia.com/news/chandigarh/hill-slip-disrupts-rail-traffic-on-kalka-shimla-route-kalka-howrah-mail-delayed-for-stranded-passengers/