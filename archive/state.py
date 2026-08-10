"""Durable 'already posted' state so the connector never double-posts."""
import os, json
import requests

DB_URL = os.environ.get("REPLIT_DB_URL", "").strip()
KEY = "gt_posted"
FILE = "posted_state.json"

def load():
    if DB_URL:
        try:
            r = requests.get(f"{DB_URL}/{KEY}", timeout=15)
            if r.status_code == 200 and r.text:
                return json.loads(r.text)
            return {}
        except Exception:
            return {}
    if os.path.exists(FILE):
        try:
            return json.load(open(FILE))
        except Exception:
            return {}
    return {}

def save(state):
    if DB_URL:
        try:
            requests.post(DB_URL, data={KEY: json.dumps(state)}, timeout=15)
            return
        except Exception:
            pass
    json.dump(state, open(FILE, "w"), indent=2)
