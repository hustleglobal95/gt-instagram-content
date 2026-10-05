#!/usr/bin/env python3
"""Validate the machine-readable Instagram conversion design system and brief bank."""
import json
import pathlib
import re
import sys

SYSTEM = pathlib.Path("studio_design_system.json")
BRIEFS = pathlib.Path("studio_conversion_briefs.json")


def fail(message):
    print("DESIGN SYSTEM INVALID: " + message)
    raise SystemExit(1)


def load(path):
    try:
        return json.loads(path.read_text())
    except Exception as exc:
        fail(f"cannot read {path}: {exc}")


def words(value):
    return len(re.findall(r"[A-Za-z0-9']+", str(value or "")))


def approx_one(values):
    return abs(sum(float(v) for v in values) - 1.0) <= 0.001


def main():
    system = load(SYSTEM)
    bank = load(BRIEFS)

    canvas = system.get("canvas") or {}
    if (canvas.get("feed_width"), canvas.get("feed_height")) != (1080, 1350):
        fail("feed canvas must remain 1080x1350")

    archetypes = system.get("archetypes") or {}
    if not archetypes:
        fail("no archetypes defined")
    if not approx_one([a.get("share_of_rotation", 0) for a in archetypes.values()]):
        fail("archetype shares must total 1.0")

    mix = system.get("feed_mix") or {}
    if not approx_one([mix.get("sell_or_demo", 0), mix.get("process_or_proof", 0), mix.get("point_of_view", 0)]):
        fail("feed mix must total 1.0")

    services = set(system.get("services") or [])
    goals = set((system.get("conversion") or {}).get("allowed_goals") or [])
    ctas = set((system.get("conversion") or {}).get("allowed_ctas") or [])
    max_hook = int(system["type"]["display"]["max_words"])
    max_support = int(system["type"]["support"]["max_words"])

    briefs = bank.get("briefs")
    if not isinstance(briefs, list) or len(briefs) < 8:
        fail("brief bank must contain at least eight conversion concepts")

    seen = set()
    for brief in briefs:
        bid = str(brief.get("id", "")).strip()
        if not bid or bid in seen:
            fail(f"missing or duplicate brief id {bid!r}")
        seen.add(bid)

        if brief.get("approved") is not False:
            fail(f"{bid} must stay unapproved until final artwork exists")
        if brief.get("archetype") not in archetypes:
            fail(f"{bid} uses unsupported archetype")
        if brief.get("service") not in services:
            fail(f"{bid} uses unsupported service")
        if brief.get("conversion_goal") not in goals:
            fail(f"{bid} uses unsupported conversion goal")
        if brief.get("cta") not in ctas:
            fail(f"{bid} uses unsupported CTA")
        if words(brief.get("hook")) > max_hook:
            fail(f"{bid} hook is longer than {max_hook} words")
        if words(brief.get("support")) > max_support:
            fail(f"{bid} support is longer than {max_support} words")
        if len(str(brief.get("visual_concept", "")).strip()) < 80:
            fail(f"{bid} visual concept is not specific enough")
        if not str(brief.get("buyer", "")).strip():
            fail(f"{bid} has no buyer")

    print(f"design system valid: {len(archetypes)} archetypes / {len(briefs)} briefs / {len(services)} services")
    return 0


if __name__ == "__main__":
    sys.exit(main())
