# News Portal Web Extraction Pipeline

A highly concurrent, template-driven asynchronous web scraper and Django admin dashboard designed to discover, fetch, and map news articles into clean, structured JSON payloads.

Built with scalability in mind, this pipeline completely decouples the discovery logic, network fetching, and DOM parsing. You can scale to hundreds of news domains simply by adding new configurations through the Django Admin interface—no code changes required.

---

## Features

- **Dynamic Database Routing:** Automatically detects the target domain and fetches the correct CSS selector rules dynamically from the Django SQLite database.
- **Django Admin Interface:** A user-friendly dashboard to manage `Portals` (news websites), `States`, `Cities`, and CSS Selector mappings.
- **Two-Tier Extraction:**
  - _Phase 1 (Discovery):_ Scans local/state index pages for valid article links using configured CSS link selectors and URL identifiers.
  - _Phase 2 (Parsing):_ Fetches raw DOM and extracts elements (titles, authors, bodies, images) using robust fallback selectors.
- **Asynchronous Engine:** Utilizes `crawl4ai` and `asyncio` to execute rapid, non-blocking network requests, bypassing basic anti-bot measures.
- **Automated Persistence:** Dynamically saves raw HTML cache locally and writes structured, parsed JSON data directly to the Django SQLite database.
- **AI Rewrite Pipeline:** Integrates with the **Groq API** (`llama-3.3-70b-versatile`) to automatically rewrite articles into various styles (Humanized, SEO, Regional) and dynamically generate JSON metadata like SEO Titles, Meta Descriptions, Keywords, and Readability scores.
- **Editorial REST APIs:** Exposes robust APIs using Django REST Framework to support the Next.js custom frontend Editorial Approval workflows.

---

## Project Architecture

```text
news-portal/
├── dashboard/              # Django Admin Dashboard
│   ├── manage.py
│   ├── db.sqlite3          # SQLite Database storing configurations
│   └── masters/            # Django app for Models (State, City, TemplateConfig)
├── templates/              # Routing logic
│   └── __init__.py         # Fetches CSS templates dynamically from the database
├── scraper/                # Network operations
│   ├── discoverer.py       # Homepage link harvesting and heuristic fallbacks
│   └── fetcher.py          # Asynchronous DOM fetching using crawl4ai
├── mapper/                 # Data parsing operations
│   └── parser.py           # UniversalExtractor (BeautifulSoup mapping)
├── main.py                 # Core CLI orchestrator
├── pipeline/               # Groq AI Rewrite and Metadata Generation logic
│   └── rewriter/           # Dynamic SEO generation and rewrite prompts
└── output/                 # Extracted raw HTML cache organized by domain
```

---

## Setup & Installation

1. **Environment Variables:**
   You must set up your API keys to use the AI rewrite features.
   Create a `.env` file in the `news-portal/` directory:

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

2. **Activate Virtual Environment:**
   Ensure you have Python installed, then create and activate a virtual environment.

   ```bash
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   (Ensure required packages like `crawl4ai`, `beautifulsoup4`, `django`, `groq` are installed).

   ```bash
   pip install -r requirements.txt
   ```

4. **Run Django Migrations (If setting up for the first time):**
   ```bash
   cd dashboard
   python manage.py migrate
   cd ..
   ```

---

## How to Use the Django Admin Dashboard

The entire scraping pipeline relies on configurations stored in the database. Instead of hardcoding CSS selectors for every news site, you configure them via the dashboard.

1. **Start the Django Server:**
   ```bash
   cd dashboard
   python manage.py runserver
   ```
2. **Access the Admin Panel:**
   Open your browser and navigate to `http://127.0.0.1:8000/admin/`.
3. **Configure a News Template (`TemplateConfig`):**
   - Click on **Template configs** and "Add Template config".
   - **Domain:** The base domain (e.g., `ndtv.com` or `aajtak.in`).
   - **URL Identifier:** A unique path that identifies an article (e.g., `-news/` or `/story/`). This ensures the scraper ignores generic navigation links.
   - **Selectors (JSON):** Paste your exact CSS targets. Example:
     ```json
     {
       "domain": "ndtv.com",
       "url_identifier": "-news/",
       "selectors": {
         "homepage_links": ".NwsLstPg_ttl a",
         "title": "h1",
         "subheading": "h2",
         "author": "a.auth-title",
         "date_meta": ".story-date",
         "article_body": "div.story-content p",
         "images": "picture img"
       }
     }
     ```
4. **Link States & Cities:**
   - Use the **States** and **Cities** tables to map locations to your portals so your URL patterns (`{city}-news`) resolve correctly when launching scrapes from the UI.

---

## How to Run the Scraper (CLI)

Once your domain is configured in the database, you can run the scraper from your terminal.

```bash
# Basic Usage
python main.py --url https://www.ndtv.com/delhi-news --count 5

# Using the Keyword Filter
python main.py --url https://www.bhaskar.com/local/rajasthan/jaipur/ --count 3 --keyword jaipur
```

### CLI Arguments:

- `--url` _(Required)_: The target homepage or index URL to scrape articles from.
- `--count` _(Optional)_: The maximum number of articles to scrape from the provided URL (Default is 3).
- `--keyword` _(Optional)_: An explicit keyword that must exist in the discovered URLs or the landing page URL.

### Output

The scraper will automatically cache the raw HTML in the `output/` directory (e.g., `output/[domain]/html/article_1.html`).
The parsed, structured JSON data is **automatically saved directly into the Django database**.

You can view and manage the scraped articles in two ways:

1. **Django Admin Panel:** Navigate to `http://127.0.0.1:8000/admin/masters/scrapedarticle/` to view the data manually.
2. **Editorial REST APIs:**
   - `GET /masters/api/editor/article/` (Fetch all scraped articles pending editorial review)
   - `PATCH /masters/api/editor/article/<ID>/` (Submit human-edited changes, update SEO meta data, and Approve articles)
