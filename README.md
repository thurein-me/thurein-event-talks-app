# 📊 BigQuery Release Notes Viewer

A lightweight web application built with **Python Flask** that fetches the latest [BigQuery release notes](https://docs.cloud.google.com/bigquery/docs/release-notes) from Google Cloud's live Atom feed and presents them in a clean, modern UI — with the ability to share any update directly on **X (Twitter)**.

---

## ✨ Features

- 🔄 **Live feed** — fetches directly from Google Cloud's Atom XML feed
- 🔁 **Refresh button** with animated spinner
- 🏷️ **Category filter pills** — filter by Feature, Change, Fix, Deprecation, etc.
- 🔍 **Live search** — filter entries by keyword as you type
- ⏱️ **Relative timestamps** — "Today", "4d ago", "2w ago"
- 🐦 **Share on X (Twitter)** — pre-filled tweet composer with character counter
- 🔗 **Deep links** to the exact Google Cloud release note anchor
- 📱 **Responsive** — works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3 · Flask |
| XML Parsing | `xml.etree.ElementTree` (stdlib) |
| HTTP Client | `urllib.request` (stdlib) |
| Frontend | Vanilla HTML · CSS · JavaScript (no frameworks) |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |

> No database. No frontend framework. No external Python dependencies beyond Flask.

---

## 📁 Project Structure

```
bq-release-notes/
├── app.py                  # Flask server — fetches & parses the XML feed
├── templates/
│   └── index.html          # Single-page HTML template
├── static/
│   ├── css/
│   │   └── style.css       # Dark-mode styles, animations, layout
│   └── js/
│       └── app.js          # All client-side logic (fetch, render, filter, modal)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/thurein-me/thurein-event-talks-app.git
   cd thurein-event-talks-app
   ```

2. **Install Flask**
   ```bash
   pip install flask
   ```

3. **Run the app**
   ```bash
   python3 app.py
   ```

4. **Open your browser**
   ```
   http://localhost:5050
   ```

The feed loads automatically on startup. Click **Refresh** anytime to pull the latest updates.

---

## 🔌 API

The server exposes two routes:

| Route | Method | Description |
|---|---|---|
| `/` | `GET` | Serves the HTML page |
| `/api/feed` | `GET` | Fetches, parses, and returns release notes as JSON |

### Example `/api/feed` response

```json
{
  "ok": true,
  "count": 47,
  "entries": [
    {
      "id": "tag:google.com,2016:bigquery-release-notes#July_01_2026",
      "title": "July 01, 2026",
      "date": "July 01, 2026",
      "updated": "2026-07-01T00:00:00-07:00",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#July_01_2026",
      "content_html": "<h3>Feature</h3><p>You can now use pre-trained TimesFM models...</p>",
      "tweet_text": "Feature You can now use pre-trained TimesFM models in BigQuery ML...",
      "categories": ["Feature"]
    }
  ]
}
```

---

## 🏗️ How It Works

```
Browser  ──GET /api/feed──►  Flask  ──HTTPS──►  Google Cloud XML Feed
                                │                        │
                                │◄───────── XML ─────────┘
                                │   parse + transform
                                │
Browser  ◄──── JSON ───────────┘
   │
   └── JavaScript renders cards, pills, search, tweet modal
```

> **Why Flask instead of fetching directly from the browser?**  
> Google Cloud's feed doesn't include CORS headers, so browsers block direct cross-origin requests. Flask acts as a server-side proxy, which has no such restriction.

---

## 🐦 Tweeting an Update

1. Click the **Share** button on any release note card
2. A modal opens with a pre-filled tweet (truncated to fit within 280 characters)
3. Edit the text as you like — the character counter warns you as you approach the limit
4. Click **Post to X** — a Twitter compose window opens in a popup with your text and the release note link pre-loaded

> No Twitter API key required. Uses Twitter's public [Web Intent URL](https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent).

---

## 📡 Data Source

- **Feed URL:** `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`
- **Format:** Atom 1.0 (XML)
- **Updated by:** Google Cloud (no fixed schedule — whenever a release note is published)

---

## 📄 License

MIT
