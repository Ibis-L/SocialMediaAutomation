HT_TEMPLATE = {
    "domain": "hindustantimes.com",
    "url_identifier": "/india-news/", 
    "selectors": {
        "homepage_links": "h3 a, .hdg3 a",   
        "title": "h1.hdg1, h1, .story-title", 
        "subheading": ".shortDisc, .sortDec, h2.sortDec, h2, .artIntro", 
        "author": ".byLineAuthor a, .infoName, .author, .authorName",
        "date_meta": ".dateTime, .secTime, .pub-time, .text-dt",
        
        # Added .storyBody and .artContent based on the site's internal tracking JS
        "article_body": ".storyBody .artContent p, .storyBody p, .artContent p, .nwStoryDetails p, .pageIntro, .detail p, article p", 
        
        # Scoped strictly to the main body to prevent pulling sidebar ad/thumbnail images
        "images": ".storyLeadImg img, .storyBody picture img, .artContent picture img, .lead-img img, article picture img"
    }
}