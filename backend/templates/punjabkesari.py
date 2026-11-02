PUNJAB_KESARI_TEMPLATE = {
    "domain": "punjabkesari.in",
    "url_identifier": "/news/", 
    "selectors": {
        "homepage_links": "#ContentPlaceHolder1_dv_section li a, .news_list ul li a, .js-marquee a",   
        "title": "h1.story_title, h1",
        "subheading": ".titlebreak, h2, .summary",
        "author": ".Author a span, .author, .posted-by, .byline",
        "date_meta": ".Author, .date, time, .publish-date",
        "article_body": ".descriptionC p, #article_body p, .article-content p, .story-details p",
        "images": ".wrap_img img, .main-img img, .article-img img, figure img"
    }
}