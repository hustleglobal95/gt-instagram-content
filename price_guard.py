"""Owner rule, 28 September 2026: no marketing piece shows a price.

Every Instagram and Facebook publisher in this repo calls refuse_if_price() on
the text it is about to send, and threads_publish.js does the same for Threads.
It cannot read text inside an image or a video; that is checked when a piece is
approved, before it enters a queue.
"""
import re
import sys

PRICE = re.compile(
    r"[$€£¥]\s?\d"
    r"|\b\d[\d,.]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b",
    re.I,
)


def find_price(*texts):
    for t in texts:
        m = PRICE.search(str(t or ""))
        if m:
            return m.group(0)
    return None


def refuse_if_price(label, *texts):
    hit = find_price(*texts)
    if hit:
        print("REFUSING TO POST: the %s shows a price (%r). No marketing piece shows a price." % (label, hit))
        sys.exit(1)
