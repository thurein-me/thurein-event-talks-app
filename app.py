from flask import Flask, jsonify, render_template
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
import html
import re

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS = "http://www.w3.org/2005/Atom"


def strip_html(raw_html: str) -> str:
    """Strip HTML tags and return plain text, truncated for tweet."""
    clean = re.sub(r"<[^>]+>", " ", raw_html)
    clean = html.unescape(clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def parse_feed(xml_bytes: bytes) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    entries = []

    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title_el = entry.find(f"{{{ATOM_NS}}}title")
        updated_el = entry.find(f"{{{ATOM_NS}}}updated")
        link_el = entry.find(f"{{{ATOM_NS}}}link[@rel='alternate']")
        content_el = entry.find(f"{{{ATOM_NS}}}content")
        id_el = entry.find(f"{{{ATOM_NS}}}id")

        title = title_el.text if title_el is not None else "Untitled"
        updated_raw = updated_el.text if updated_el is not None else ""
        link = link_el.get("href", "#") if link_el is not None else "#"
        content_html = content_el.text if content_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""

        # Parse date
        try:
            dt = datetime.fromisoformat(updated_raw.replace("Z", "+00:00"))
            date_str = dt.strftime("%B %d, %Y")
        except Exception:
            date_str = updated_raw

        # Extract plain text for tweet preview (max ~200 chars)
        plain = strip_html(content_html)
        tweet_text = plain[:200] + ("..." if len(plain) > 200 else "")

        # Extract category labels from h3 headings
        categories = re.findall(r"<h3[^>]*>(.*?)</h3>", content_html, re.IGNORECASE | re.DOTALL)
        categories = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in categories]

        entries.append(
            {
                "id": entry_id,
                "title": title,
                "date": date_str,
                "updated": updated_raw,
                "link": link,
                "content_html": content_html,
                "tweet_text": tweet_text,
                "categories": categories,
            }
        )

    return entries


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/feed")
def get_feed():
    try:
        req = urllib.request.Request(
            FEED_URL,
            headers={"User-Agent": "BQReleaseNotes/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_bytes = response.read()

        entries = parse_feed(xml_bytes)
        return jsonify({"ok": True, "entries": entries, "count": len(entries)})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5050)
