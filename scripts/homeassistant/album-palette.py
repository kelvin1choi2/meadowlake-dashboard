"""The party lights' colors from an album cover (docs/party-lights.md).

Home Assistant runs this (shell_command.party_album_palette in party-lights.yaml) whenever the
Lounge zone's album changes. It reads the cover from Home Assistant itself and prints up to five
colors, most prominent first, as "#rrggbb,#rrggbb,...". Each color is one that covers part of the
cover (the average of a patch of near-identical pixels), never brightened or mixed. Near-black is
left out because the bars would just go dark, unless the cover is nothing but dark.

Usage: python3 album-palette.py <entity_picture>
<entity_picture> is the zone's picture address, usually /api/media_player_proxy/...?token=...
"""

import io
import math
import sys
import urllib.request

PORTS = (80, 8123)  # Home Assistant listens on one of these on the host it runs on
SIZE = 48
COUNT = 5


def fetch(picture: str) -> bytes:
    if picture.startswith("http"):
        return urllib.request.urlopen(picture, timeout=10).read()
    last = None
    for port in PORTS:
        try:
            return urllib.request.urlopen(f"http://127.0.0.1:{port}{picture}", timeout=10).read()
        except Exception as e:  # try the next port
            last = e
    raise last or RuntimeError("no port")


def saturation(c):
    hi = max(c)
    return 0 if hi == 0 else (hi - min(c)) / hi


def palette(pixels, count=COUNT):
    buckets = {}
    for r, g, b, a in pixels:
        if a < 128:
            continue
        key = (r >> 4, g >> 4, b >> 4)
        s = buckets.setdefault(key, [0, 0, 0, 0])
        s[0] += r
        s[1] += g
        s[2] += b
        s[3] += 1
    scored = []
    total = sum(s[3] for s in buckets.values()) or 1
    for r, g, b, n in buckets.values():
        if n / total < 0.01:  # a stray speck, not a color of the cover
            continue
        c = (r / n, g / n, b / n)
        value = max(c) / 255
        scored.append((n * (0.15 + saturation(c)) * value, value < 0.12, c))
    scored.sort(key=lambda x: (x[1], -x[0]))  # near-black last
    picked = []
    for _, dark, c in scored:
        if len(picked) >= count or (dark and picked):
            break
        if all(math.dist(p, c) > 60 for p in picked):
            picked.append(c)
    return ["#%02x%02x%02x" % tuple(round(max(0, min(255, x))) for x in p) for p in picked]


def main() -> int:
    if len(sys.argv) < 2 or not sys.argv[1].strip() or sys.argv[1] == "None":
        return 1
    from PIL import Image

    img = Image.open(io.BytesIO(fetch(sys.argv[1].strip()))).convert("RGBA").resize((SIZE, SIZE))
    data = img.tobytes()
    colors = palette(zip(data[0::4], data[1::4], data[2::4], data[3::4]))
    if not colors:
        return 1
    print(",".join(colors))
    return 0


if __name__ == "__main__":
    sys.exit(main())
