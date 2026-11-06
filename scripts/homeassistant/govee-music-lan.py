"""Music mode in chosen colors for the Lounge light bars, over the home network (docs/party-lights.md).

Govee's public cloud API takes a color for music mode, but the H6046 ignores it. The Govee app
instead sends the bars its own 20-byte messages, which the bars also accept over the home network
wrapped in a "ptReal" command on UDP port 4003. The message layout comes from govee2mqtt-extended
(src/ble.rs SetMusicPalette, checked on an H607C):

    a3 00 01 02 41 <style> <n colors> <first 12 color bytes>
    a3 ff <remaining color bytes>
    33 05 13 <style> <sensitivity>

each padded to 19 bytes plus an XOR checksum. <style> is the bars' own id for a music style,
which is not the cloud API's number. Rhythm is 0x72 and Shiny 0x31 on the Govee lights mapped so
far; the H6046's ids are what this script is for finding out.

Usage: python3 govee-music-lan.py <bars IP> <style id, e.g. 0x72> <sensitivity 0-100> <#rrggbb[,#rrggbb...]>
"""

import base64
import json
import socket
import sys
import time

PORT = 4003


def frame(data: list[int]) -> bytes:
    data = (data + [0] * 19)[:19]
    check = 0
    for b in data:
        check ^= b
    return bytes(data + [check])


def music_frames(style: int, sensitivity: int, colors: list[tuple[int, int, int]]) -> list[bytes]:
    if not 1 <= len(colors) <= 7:
        raise ValueError("1 to 7 colors")
    flat = [v for c in colors for v in c]
    return [
        frame([0xA3, 0x00, 0x01, 0x02, 0x41, style, len(colors)] + flat[:12]),
        frame([0xA3, 0xFF] + flat[12:]),
        frame([0x33, 0x05, 0x13, style, max(0, min(100, sensitivity))]),
    ]


def parse_color(text: str) -> tuple[int, int, int]:
    h = text.strip().lstrip("#")
    if len(h) != 6:
        raise ValueError(f"not a #rrggbb color: {text}")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def message(frames: list[bytes]) -> bytes:
    command = [base64.b64encode(f).decode() for f in frames]
    return json.dumps({"msg": {"cmd": "ptReal", "data": {"command": command}}}).encode()


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__.strip().splitlines()[-1])
        return 2
    ip, style, sensitivity = sys.argv[1], int(sys.argv[2], 0), int(float(sys.argv[3]))
    colors = [parse_color(c) for c in sys.argv[4].split(",") if c.strip()]
    frames = music_frames(style, sensitivity, colors)
    payload = message(frames)
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        for attempt in range(2):  # the app sends twice; UDP has no answer to wait for
            s.sendto(payload, (ip, PORT))
            if attempt == 0:
                time.sleep(0.3)
    print(" | ".join(f.hex(" ") for f in frames))
    return 0


if __name__ == "__main__":
    sys.exit(main())
