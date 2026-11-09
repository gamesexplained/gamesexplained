#!/usr/bin/env python3
"""Check the mine walkthrough on maps.html against the game's own rules.

The route is the JSON the page's player draws (script#mn-route): for each stop, Bond's
path in characters, (x, y) being his left column and head row. The object table comes
from the mine's listing ($BD00: present, taken, x, x high, row, type, width, height, 64
of each). For each stop the test checks the place where it ends:
- a pick-up: EXAMINE finds that object first ($36F6: tile row (y + 4) / 2, tile
  column (x - 1) / 2 to four more, objects counted up from 17);
- the plank: map row $0D, map column $DC to $FF ($398F);
- the winch: map row $0D in the right part ($3F7C);
- a blast: the rock it names is the one USE dynamite marks ($3827: within -8 to +5
  tiles, rock falls counted down from 15);
- the digits: the right part, above map row $55 ($389C), after May Day and the winch;
- the end: map column $15 or less, carrying the detonator ($2564).
Run: python3 games/c64/a-view-to-a-kill/test_mine_route.py"""
import json, re, sys
from pathlib import Path

here = Path(__file__).parent
page = (here / "maps.html").read_text()
S = json.loads(re.search(r'<script type="application/json" id="mn-route">(.*?)</script>', page, re.S).group(1))
mem = bytearray(0x10000)
for r in json.loads((here / "parts/mine/listing.json").read_text())["records"]:
    for i, v in enumerate(r.get("b", [])):
        mem[r["a"] + i] = v
B = 0xBD00
objs = {i: dict(x=mem[B + 128 + i], row=mem[B + 256 + i], type=mem[B + 320 + i]) for i in range(64) if mem[B + i]}
NUM = {"winch rope": 52, "number 6": 47, "number 3": 44, "winch drum": 53, "number 1": 42, "hook": 51,
       "winch": 58, "number 4": 45, "number 7": 48, "detonator": 50, "grapnel gun": 49, "lighter": 56, "plank": 54}
DYN = {"Take a stick of dynamite": 17, "Take a second stick of dynamite": 18}
gone, fails = set(), []
mayday = parts = digits = False


def examine(x, y):
    mc, mr = x + 2, y - 1
    lo = (((mc - 3) & 0xFF) >> 1) | (0x80 if mc >= 0x100 else 0)
    for i in range(17, 64):
        o = objs.get(i)
        if not o or i in gone or o["row"] != (mr + 5) // 2:
            continue
        if o["x"] >= lo and ((o["x"] - 5) & 0xFF) < lo:
            return i


def marked(x, y):
    c, r = (x + 2) // 2, (y - 1) // 2
    for i in range(15, -1, -1):
        o = objs.get(i)
        if o and i not in gone and -8 <= o["x"] - c <= 5 and -8 <= o["row"] - r <= 5:
            return i


for n, s in enumerate(S, 1):
    t, (x, y) = s["t"], s["p"][-1]
    want = DYN.get(t) or next((v for k, v in NUM.items() if t.startswith("Take the " + k)), None)
    if want is not None:
        got = examine(x, y)
        if got != want:
            fails.append(f"stop {n} ({t}): EXAMINE at {x},{y} finds {got}, not {want}")
        if want == 50 and not (parts and digits):
            fails.append(f"stop {n}: the detonator before the winch and the digits")
        gone.add(want)
    elif t.startswith("Lay the plank"):
        if not (y - 1 == 0x0D and 0xDC <= x + 2 <= 0xFF):
            fails.append(f"stop {n}: the plank laid from {x},{y}")
    elif t.startswith("Free May Day") or t.startswith("Blast"):
        rock = 3 if t.startswith("Free") else 14
        if marked(x, y) != rock:
            fails.append(f"stop {n} ({t}): dynamite at {x},{y} marks rock {marked(x, y)}, not {rock}")
        gone.add(rock)
        mayday = mayday or rock == 3
    elif t.startswith("Fit the four"):
        if not (y - 1 == 0x0D and x + 2 >= 0x100):
            fails.append(f"stop {n}: the winch fitted from {x},{y}")
        if not mayday or not {51, 52, 53, 58} <= gone:
            fails.append(f"stop {n}: a winch part missing, or May Day still trapped")
        parts = True
    elif t.startswith("Enter 6, 7, 1, 3, 4"):
        if not (x + 2 >= 0x100 and y - 1 < 0x55):
            fails.append(f"stop {n}: digits entered at {x},{y}")
        if not {47, 48, 42, 44, 45} <= gone:
            fails.append(f"stop {n}: a number not yet taken")
        digits = True
    elif t.startswith("Walk left"):
        if x + 2 > 0x15 or 50 not in gone:
            fails.append(f"stop {n}: the end test needs the detonator at map column $15, Bond ends at {x},{y}")
print(f"{len(S)} stops checked")
for f in fails:
    print("FAIL", f)
sys.exit(1 if fails else 0)
