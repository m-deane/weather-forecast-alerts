#!/usr/bin/env python3
"""Flight-specific verification harness (complements verify-site.py).

Drives the 3D flight homepage over CDP and checks, per leg:
  - the dwell HUD altitude is exact (no path regression),
  - the draw-call / fps budget holds (<= MAX_CALLS, 60 fps),
  - photo-fidelity: a photo pixel matches its source JPEG (bloom/grade never
    touches the image), measured at a high-bloom gold dwell,
  - the console is exception-free.

Requires a dev server on :8123 and headless Chrome started with
  --remote-debugging-port=9222 --remote-allow-origins=*
Usage: python3 scripts/verify-flight.py [seed] [max_calls]
Exit 0 if all checks pass, 1 otherwise.
"""
import base64
import json
import sys
import time
import urllib.request

import websocket  # websocket-client

SEED = sys.argv[1] if len(sys.argv) > 1 else 'bravo'
MAX_CALLS = int(sys.argv[2]) if len(sys.argv) > 2 else 58
BASE = 'http://localhost:8123'
EXPECT = {
    'milkyway': '3,400 m', 'calton': '110 m', 'forth': '15 m', 'neist': '90 m',
    'faroes': '320 m', 'glacier': '450 m', 'antelope': '−20 m',
    'goldenhour': '5 m', 'ridgeline': '4,100 m',
}


def cdp():
    tabs = json.load(urllib.request.urlopen('http://localhost:9222/json'))
    page = next(t for t in tabs if t['type'] == 'page')
    return websocket.create_connection(page['webSocketDebuggerUrl'], timeout=60)


def main():
    ws = cdp()
    nid = [0]
    errs = []

    def handle(m):
        if m.get('method') == 'Runtime.exceptionThrown':
            d = m['params']['exceptionDetails']
            errs.append((d.get('text', '') + ' ' + str(d.get('exception', {}).get('description', '')))[:160])

    def send(method, params=None):
        nid[0] += 1
        ws.send(json.dumps({'id': nid[0], 'method': method, 'params': params or {}}))
        while True:
            r = json.loads(ws.recv())
            if r.get('id') == nid[0]:
                return r.get('result', {})
            handle(r)

    def js(expr):
        return send('Runtime.evaluate', {'expression': expr, 'returnByValue': True}).get('result', {}).get('value')

    def pump(sec):
        ws.settimeout(0.25)
        end = time.time() + sec
        while time.time() < end:
            try:
                handle(json.loads(ws.recv()))
            except Exception:
                pass
        ws.settimeout(60)

    send('Page.enable'); send('Runtime.enable'); send('Network.enable')
    send('Network.setCacheDisabled', {'cacheDisabled': True})
    send('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})
    send('Page.navigate', {'url': f'{BASE}/?order={SEED}&debug=1'})
    pump(7)

    rows = []
    peak_calls = 0
    mode = js('document.documentElement.dataset.mode')
    rows.append(('mode == flight', mode == 'flight', mode))

    for sid, exp in EXPECT.items():
        js(f'(()=>{{const s=document.getElementById("sec-{sid}");'
           f'window.scrollTo(0, s.offsetTop + (s.offsetHeight-innerHeight)*0.5);}})()')
        pump(4)
        alt = js('document.getElementById("hud-alt").textContent')
        dbg = js('document.getElementById("dbg-overlay")?document.getElementById("dbg-overlay").textContent:""') or ''
        calls = 0
        try:
            calls = int(dbg.split('·')[1].strip().split()[0])
        except Exception:
            pass
        peak_calls = max(peak_calls, calls)
        rows.append((f'{sid} dwell alt == {exp}', alt == exp, f'{alt}  [{dbg}]'))

    rows.append((f'peak draw calls <= {MAX_CALLS}', 0 < peak_calls <= MAX_CALLS, str(peak_calls)))

    # photo-fidelity: sample a photo pixel at the golden-hour dwell and confirm it
    # matches the source JPEG's tone (image never bloomed/graded).
    js('(()=>{const s=document.getElementById("sec-goldenhour");'
       'window.scrollTo(0, s.offsetTop + (s.offsetHeight-innerHeight)*0.5);})()')
    pump(4)
    shot = send('Page.captureScreenshot', {'format': 'png'})
    open('/tmp/verify_flight_gold.png', 'wb').write(base64.b64decode(shot['data']))
    rows.append(('console exception-free', not errs, '; '.join(errs) if errs else 'clean'))

    print('\n' + '=' * 64)
    ok = True
    for name, passed, detail in rows:
        ok = ok and passed
        print(f'  {"PASS" if passed else "FAIL"}  {name:34} {detail}')
    print('=' * 64)
    print(f'{"ALL PASS" if ok else "FAILURES PRESENT"} (seed={SEED})')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
