#!/usr/bin/env python3
"""check-meta.py — static metadata audit for the photography site.

Walks the 10 expected page paths (as local files relative to the repo root)
and reports PASS/FAIL per check for each page:

  - has <title> (non-empty)
  - <meta name="description"> (non-empty content)
  - og:title, og:description, og:image (and the og:image path exists on disk)
  - exactly one <h1> OR exactly one element with class "page-title"
  - <html lang="..."> attribute
  - viewport meta
  - skip-nav link (an <a href="#..."> whose href targets an in-page anchor,
    appearing with a class/text matching "skip")
  - <link rel="stylesheet"> to /assets/css/tokens.css

A page file that does not exist is reported as MISSING (not a crash).
Exit code: 1 if any check FAILs or any page is MISSING, else 0.

Usage: python3 scripts/check-meta.py [site-root]   (default: repo root = parent of scripts/)

Stdlib only (html.parser, pathlib).
"""

import sys
from html.parser import HTMLParser
from pathlib import Path

PAGES = [
    "index.html",
    "portfolio/index.html",
    "portfolio/highlands/index.html",
    "portfolio/mountains/index.html",
    "portfolio/desert/index.html",
    "portfolio/sea/index.html",
    "portfolio/wild/index.html",
    "prints/index.html",
    "about/index.html",
    "contact/index.html",
]

CHECKS = [
    "title",
    "meta-description",
    "og:title",
    "og:description",
    "og:image",
    "og:image-exists",
    "single-h1-or-page-title",
    "lang-attr",
    "viewport",
    "skip-nav",
    "tokens-css",
]


class MetaAuditParser(HTMLParser):
    """Collects everything the checks need in a single pass."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_text = ""
        self._in_title = False
        self.meta = {}          # name/property -> content
        self.lang = None
        self.h1_count = 0
        self.page_title_count = 0
        self.stylesheets = []   # href values of <link rel=stylesheet>
        self.anchors = []       # (href, class, text) for <a> tags
        self._anchor_stack = []  # capture link text for skip-nav detection

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html" and self.lang is None:
            self.lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key.lower()] = (a.get("content") or "").strip()
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            if "stylesheet" in rel:
                self.stylesheets.append(a.get("href") or "")
        elif tag == "a":
            self._anchor_stack.append(
                {"href": a.get("href") or "", "class": a.get("class") or "", "text": ""}
            )
        if "page-title" in (a.get("class") or "").split():
            self.page_title_count += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "a" and self._anchor_stack:
            self.anchors.append(self._anchor_stack.pop())

    def handle_data(self, data):
        if self._in_title:
            self.title_text += data
        if self._anchor_stack:
            self._anchor_stack[-1]["text"] += data


def run_checks(page_rel: str, root: Path):
    """Return dict check-name -> (bool, detail) or None if the file is missing."""
    path = root / page_rel
    if not path.is_file():
        return None
    parser = MetaAuditParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    # flush any unclosed <a>
    parser.anchors.extend(parser._anchor_stack)

    m = parser.meta
    results = {}
    results["title"] = (bool(parser.title_text.strip()), parser.title_text.strip()[:60])
    results["meta-description"] = (bool(m.get("description")), "")
    results["og:title"] = (bool(m.get("og:title")), "")
    results["og:description"] = (bool(m.get("og:description")), "")
    og_image = m.get("og:image", "")
    results["og:image"] = (bool(og_image), og_image)

    if og_image:
        # Resolve absolute URLs / root-relative / page-relative to a disk path.
        candidate = og_image
        for prefix in ("https://", "http://"):
            if candidate.startswith(prefix):
                candidate = "/" + candidate[len(prefix):].split("/", 1)[-1] \
                    if "/" in candidate[len(prefix):] else "/"
                break
        if candidate.startswith("/"):
            disk = root / candidate.lstrip("/")
        else:
            disk = path.parent / candidate
        results["og:image-exists"] = (disk.is_file(), str(disk.relative_to(root)) if disk.is_file() else f"not on disk: {candidate}")
    else:
        results["og:image-exists"] = (False, "no og:image to resolve")

    h1_ok = parser.h1_count == 1 or parser.page_title_count == 1
    results["single-h1-or-page-title"] = (
        h1_ok, f"h1={parser.h1_count}, .page-title={parser.page_title_count}")
    results["lang-attr"] = (bool(parser.lang), parser.lang or "")
    results["viewport"] = (bool(m.get("viewport")), "")

    skip = any(
        a["href"].startswith("#") and a["href"] != "#"
        and ("skip" in a["class"].lower() or "skip" in a["text"].lower())
        for a in parser.anchors
    )
    results["skip-nav"] = (skip, "")

    tokens = any("assets/css/tokens.css" in href for href in parser.stylesheets)
    results["tokens-css"] = (tokens, "")
    return results


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    any_bad = False
    for page in PAGES:
        results = run_checks(page, root)
        if results is None:
            print(f"\n== {page} == MISSING (file not found)")
            any_bad = True
            continue
        fails = [c for c in CHECKS if not results[c][0]]
        status = "ALL PASS" if not fails else f"{len(fails)} FAIL"
        print(f"\n== {page} == {status}")
        for check in CHECKS:
            ok, detail = results[check]
            mark = "PASS" if ok else "FAIL"
            suffix = f"  ({detail})" if detail and not ok else ""
            print(f"  {mark}  {check}{suffix}")
        if fails:
            any_bad = True
    print()
    print("RESULT:", "FAIL — see above" if any_bad else "all pages pass")
    sys.exit(1 if any_bad else 0)


if __name__ == "__main__":
    main()
