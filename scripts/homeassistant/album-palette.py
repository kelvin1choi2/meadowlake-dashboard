"""The party lights' colors from an album cover (docs/party-lights.md).

Home Assistant runs this (shell_command.party_album_palette in party-lights.yaml) whenever the
Lounge zone's album changes. It reads the cover from Home Assistant itself and prints up to five
colors, most prominent first, as "#rrggbb,#rrggbb,...". Colors are made as bright as they can be
while keeping their hue, since LEDs can't show dark colors; a black-and-white cover gives white.

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


def vivid(c):
    hi = max(c)
    return (255, 255, 255) if hi == 0 else tuple(v * 255 / hi for v in c)


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
    for r, g, b, n in buckets.values():
        c = (r / n, g / n, b / n)
        value = max(c) / 255
        scored.append((n * (0.15 + saturation(c)) * (0.05 if value < 0.15 else value), c))
    scored.sort(key=lambda x: -x[0])
    picked = []
    for _, c in scored:
        if len(picked) >= count:
            break
        v = (255, 255, 255) if saturation(c) < 0.15 else vivid(c)
        if all(math.dist(p, v) > 80 for p in picked):
            picked.append(v)
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
