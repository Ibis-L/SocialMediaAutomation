PROMPTS = {
    "basic": """
Rewrite the article in clear English.
Keep every fact exactly the same.
Do not shorten.
Do not add information.
Output ONLY the rewritten text, nothing else.
""",

    "humanized": """
Rewrite the article naturally like a professional journalist.

Requirements:
- Human sounding
- Keep all facts
- Better flow
- No AI style
- Same meaning

Output ONLY the rewritten text, nothing else.
""",

    "seo": """
Rewrite the article for SEO.

Requirements:
- Preserve all facts
- Improve readability
- Use engaging sentences
- Keep important keywords
- Do not stuff keywords

Output ONLY the rewritten text, nothing else.
""",

    "regional": """
Rewrite the article in simple Indian English.

Requirements:
- Natural
- Easy to read
- Preserve every fact

Output ONLY the rewritten text, nothing else.
""",

    "metadata_generation": """
You are an expert SEO and content analyst.
Given the following rewritten news article, generate metadata and analysis in strict JSON format.
The JSON must contain the exact following keys:
- "seo_title": An SEO-optimized headline (max 60 characters)
- "seo_desc": An SEO-optimized meta description (max 160 characters)
- "seo_keywords": A comma-separated string of 5-8 relevant SEO keywords
- "sentiment": A single string classifying the article's sentiment ("Positive", "Neutral", or "Negative")
- "readability": An integer between -100 and 100 representing readability (higher means more readable, 0 is average)
- "seo_score": An integer between 0 and 100 representing how well the article is optimized for SEO

Do NOT wrap the response in markdown blocks (e.g. ```json). Output ONLY the raw JSON object.
"""
}