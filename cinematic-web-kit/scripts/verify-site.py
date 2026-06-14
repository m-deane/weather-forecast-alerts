#!/usr/bin/env python3
"""verify-site.py — headless-Chrome (CDP) verification harness for the photography site.

Prerequisites (this script does NOT launch Chrome or the web server itself):

  1. Static server:   python3 -m http.server 8123          (from the repo root)
  2. Headless Chrome already running with remote debugging enabled:
       chrome --headless=new --remote-debugging-port=9222 --remote-allow-origins=*
     (any Chrome/Chromium binary; the established pattern in BUILD-LOG.md)

  Requires the `websocket-client` package (import name: websocket).

What it does, per page (the 10 canonical URLs on http://localhost:8123):
  - Page.navigate, wait for load, drain CDP events
  - collect Runtime.consoleAPICalled errors and Runtime.exceptionThrown exceptions
  - extract every <a href>; verify each *internal* href resolves to HTTP 200
    (via urllib against localhost:8123); external/mailto/fragment links skipped
  - Page.captureScreenshot -> /tmp/site_{slug}.png

Then three lightbox checks on /portfolio/sea/:
  - click the first `.jgrid a` (Runtime.evaluate dispatching a MouseEvent)
  - confirm a lightbox element becomes visible
  - press Escape (Input.dispatchKeyEvent) and confirm the lightbox closes

Prints a summary table; exits 1 on any failure.
"""

import base64
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    import websocket  # websocket-client
except ImportError:
    print("FATAL: pip install websocket-client", file=sys.stderr)
    sys.exit(1)

BASE = "http://localhost:8123"
DEBUG_HTTP = "http://localhost:9222"
PATHS = [
    "/",
    "/portfolio/",
    "/portfolio/highlands/",
    "/portfolio/mountains/",
    "/portfolio/desert/",
    "/portfolio/sea/",
    "/portfolio/wild/",
    "/prints/",
    "/about/",
    "/contact/",
]
LOAD_SETTLE_SECONDS = 2.5
LIGHTBOX_SELECTORS = (
    ".lightbox, #lightbox, [data-lightbox], dialog[open], .lb, [role='dialog']"
)


def slug_for(path):
    return path.strip("/").replace("/", "-") or "home"


class CDPSession:
    """Minimal Chrome DevTools Protocol client over one page websocket."""

    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=120)
        self._next_id = 0
        self.events = []

    def call(self, method, params=None):
        self._next_id += 1
        msg_id = self._next_id
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(f"CDP {method}: {msg['error']}")
                return msg.get("result", {})
            self.events.append(msg)

    def pump(self, seconds):
        """Drain events for `seconds` (collecting console/exception events)."""
        deadline = time.time() + seconds
        self.ws.settimeout(0.25)
        try:
            while time.time() < deadline:
                try:
                    self.events.append(json.loads(self.ws.recv()))
                except websocket.WebSocketTimeoutException:
                    continue
        finally:
            self.ws.settimeout(30)

    def take_console_problems(self):
        """Pop console errors + uncaught exceptions from the event buffer."""
        problems, keep = [], []
        for ev in self.events:
            method = ev.get("method")
            if method == "Runtime.exceptionThrown":
                d = ev["params"]["exceptionDetails"]
                problems.append("exception: " + (d.get("text", "") + " " + str(
                    (d.get("exception") or {}).get("description", ""))).strip()[:200])
            elif method == "Runtime.consoleAPICalled" and ev["params"].get("type") in ("error", "assert"):
                args = ev["params"].get("args", [])
                text = " ".join(str(a.get("value", a.get("description", ""))) for a in args)
                problems.append("console.error: " + text[:200])
            else:
                keep.append(ev)
        self.events = keep
        return problems

    def evaluate(self, expression):
        result = self.call("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        })
        if "exceptionDetails" in result:
            raise RuntimeError(f"evaluate failed: {result['exceptionDetails'].get('text')}")
        return result.get("result", {}).get("value")

    def navigate(self, url):
        self.call("Page.navigate", {"url": url})
        self.pump(LOAD_SETTLE_SECONDS)

    def screenshot(self, out_path):
        result = self.call("Page.captureScreenshot", {"format": "png"})
        with open(out_path, "wb") as fh:
            fh.write(base64.b64decode(result["data"]))

    def press_escape(self):
        for kind in ("keyDown", "keyUp"):
            self.call("Input.dispatchKeyEvent", {
                "type": kind, "key": "Escape", "code": "Escape",
                "windowsVirtualKeyCode": 27, "nativeVirtualKeyCode": 27,
            })

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


def attach_to_page():
    """Find (or create) a page target on the already-running Chrome."""
    with urllib.request.urlopen(DEBUG_HTTP + "/json", timeout=10) as resp:
        targets = json.load(resp)
    pages = [t for t in targets if t.get("type") == "page" and t.get("webSocketDebuggerUrl")]
    if not pages:
        req = urllib.request.Request(DEBUG_HTTP + "/json/new?about:blank", method="PUT")
        with urllib.request.urlopen(req, timeout=10) as resp:
            pages = [json.load(resp)]
    return CDPSession(pages[0]["webSocketDebuggerUrl"])


def http_status(url):
    request = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=10) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except (urllib.error.URLError, OSError):
        return None


def check_internal_links(hrefs, page_url):
    """Return list of failure strings for internal hrefs that don't resolve to 200."""
    failures = []
    seen = set()
    for href in hrefs:
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        absolute = urllib.parse.urljoin(page_url, href)
        parsed = urllib.parse.urlparse(absolute)
        if parsed.netloc != "localhost:8123":
            continue  # external link — out of scope
        target = parsed._replace(fragment="").geturl()
        if target in seen:
            continue
        seen.add(target)
        status = http_status(target)
        if status != 200:
            failures.append(f"{href} -> {status if status is not None else 'unreachable'}")
    return failures


JS_GET_HREFS = (
    "JSON.stringify(Array.from(document.querySelectorAll('a[href]'))"
    ".map(a => a.getAttribute('href')))"
)

JS_CLICK_JGRID = """(() => {
  const a = document.querySelector('.jgrid a');
  if (!a) return 'NO_TARGET';
  a.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
  return 'CLICKED';
})()"""

JS_LIGHTBOX_VISIBLE = """(() => {
  const candidates = document.querySelectorAll(%s);
  for (const el of candidates) {
    const cs = getComputedStyle(el);
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden' &&
                    parseFloat(cs.opacity || '1') > 0.05 &&
                    (el.offsetWidth > 0 || el.offsetHeight > 0 || el.open === true);
    if (visible) return true;
  }
  return false;
})()""" % json.dumps(LIGHTBOX_SELECTORS)


def main():
    rows = []  # (label, ok, detail)

    try:
        session = attach_to_page()
    except Exception as e:
        print(f"FATAL: cannot attach to Chrome at {DEBUG_HTTP} — is it running with "
              f"--remote-debugging-port=9222 --remote-allow-origins=* ?\n  {e}", file=sys.stderr)
        sys.exit(1)

    session.call("Page.enable")
    session.call("Runtime.enable")

    for path in PATHS:
        url = BASE + path
        slug = slug_for(path)
        problems = []
        hrefs = []
        try:
            session.events.clear()
            session.navigate(url)
            status = http_status(url)
            if status != 200:
                problems.append(f"page HTTP {status if status is not None else 'unreachable'}")
            problems.extend(session.take_console_problems())
            hrefs = session.evaluate(JS_GET_HREFS)
            hrefs = json.loads(hrefs) if hrefs else []
            problems.extend(check_internal_links(hrefs, url))
            session.screenshot(f"/tmp/site_{slug}.png")
        except Exception as e:
            problems.append(f"harness error: {e}")
        rows.append((path, not problems,
                     "; ".join(problems) if problems else f"OK ({len(hrefs)} links)"))
        for p in problems:
            print(f"[{path}] {p}")

    # ---- Lightbox checks on /portfolio/sea/ ----
    sea_url = BASE + "/portfolio/sea/"
    try:
        session.events.clear()
        session.navigate(sea_url)

        click_result = session.evaluate(JS_CLICK_JGRID)
        rows.append(("lightbox: click .jgrid a", click_result == "CLICKED",
                     click_result or "evaluate returned nothing"))

        session.pump(0.8)
        # Force a compositor frame: headless tabs may starve rAF/transitions,
        # leaving computed opacity at its start value despite the open state.
        session.call("Page.captureScreenshot", {"format": "png"})
        session.pump(0.3)
        opened = bool(session.evaluate(JS_LIGHTBOX_VISIBLE))
        rows.append(("lightbox: visible after click", opened,
                     "visible" if opened else "no visible lightbox element"))

        session.press_escape()
        session.pump(0.8)
        session.call("Page.captureScreenshot", {"format": "png"})
        session.pump(0.3)
        still_open = bool(session.evaluate(JS_LIGHTBOX_VISIBLE))
        rows.append(("lightbox: Escape closes", not still_open,
                     "closed" if not still_open else "still visible after Escape"))
    except Exception as e:
        rows.append(("lightbox checks", False, f"harness error: {e}"))

    session.close()

    # ---- Summary ----
    print("\n" + "=" * 72)
    print(f"{'CHECK':<36} {'RESULT':<6} DETAIL")
    print("-" * 72)
    failed = 0
    for label, ok, detail in rows:
        if not ok:
            failed += 1
        print(f"{label:<36} {'PASS' if ok else 'FAIL':<6} {detail}")
    print("-" * 72)
    print(f"{len(rows) - failed}/{len(rows)} checks passed; screenshots in /tmp/site_*.png")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
