#!/usr/bin/env bash
# Generate responsive derivatives from the full-size masters (photos/pNN.jpg).
# Sizes per the amended handbook pipeline: thumb @600 · display @1400 (already
# shipped as pNN@1400.jpg) · zoom @2400. sips only ever downsamples here
# (masters are 2600px on the long edge).
set -euo pipefail
cd "$(dirname "$0")/.."

for f in photos/p[0-9][0-9].jpg; do
  base="${f%.jpg}"
  for size in 600 2400; do
    out="${base}@${size}.jpg"
    if [ ! -f "$out" ]; then
      sips -Z "$size" -s formatOptions 82 "$f" --out "$out" >/dev/null
      echo "wrote $out"
    fi
  done
done

# Embed IPTC/XMP copyright + PLUS licensor into every master and derivative
# (invisible; Google Images Licensable-badge signal + attribution on escaped copies).
if command -v exiftool >/dev/null 2>&1; then
  WEB="https://helwyr55-matt-deane-photography.static.hf.space/prints/"
  exiftool -overwrite_original -q -P \
    -IPTC:By-line="Matthew Deane" \
    -IPTC:CopyrightNotice="© Matthew Deane. All rights reserved." \
    -IPTC:Credit="Matt Deane Photography" \
    -XMP-dc:Creator="Matthew Deane" \
    -XMP-dc:Rights="© Matthew Deane. All rights reserved." \
    -XMP-xmpRights:Marked=True \
    -XMP-xmpRights:WebStatement="$WEB" \
    -XMP-plus:Licensor="[{LicensorName=Matt Deane Photography,LicensorURL=$WEB}]" \
    photos/*.jpg && echo "tagged copyright metadata"
else
  echo "exiftool not found — skipped copyright metadata (install with: brew install exiftool)"
fi
echo "done"
