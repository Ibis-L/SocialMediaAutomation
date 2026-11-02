TECHDESK_TEMPLATE = {
    "domain": "indianexpress.com",
    "url_identifier": "/article/technology/", 
    "selectors": {
        "homepage_links": "h2 a, h3 a, .title a, .m-article-featured__title a",   
        "title": "h1.native_story_title, h1, .m-story-header__title, .story-heading",
        "subheading": "h2.synopsis, .m-story-header__synopsis, .story-synopsis",
        "author": ".editor, .author_name a, .m-story-header__author, .author-nm",
        "date_meta": "span.article-date, time, .updated-time",
        "article_body": "#pcl-full-content p, .full-details p, .story_details p, .story-body p",
        "images": "span.custom-caption img, figure img, .m-story-featured-image img, .story-picture img"
    }
}
