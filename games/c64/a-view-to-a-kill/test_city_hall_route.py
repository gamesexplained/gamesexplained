#!/usr/bin/env python3
"""Check that the City Hall route on maps.html can be walked.

The doors come from the page's own map (the K, T and star markers). The
route below is the page's solution 2, one move per walk or door. For each
move the test needs a path through open doors and lifts, and for each
door the key, the tool or the item that opens it, taken earlier. Run:
python3 games/c64/a-view-to-a-kill/test_city_hall_route.py
It checks the order and the geometry. Fire times and weight were played
in the emulator and are not checked here."""
import json, re, sys
from collections import deque
from pathlib import Path

page = (Path(__file__).parent / "maps.html").read_text()
a = page.index('id="ch-map"')
svg = page[a:page.index("</svg>", a)]
doors = {}
for m in re.finditer(r'<text x="([\d.]+)" y="([\d.]+)" font-size="9" text-anchor="middle" fill="#fff" font-weight="700">([^<]*)', svg):
    left = int((float(m.group(2)) - 43) // 62) * 15 + int((float(m.group(1)) - 10) // 64) + 1
    doors[(left, left + 1)] = m.group(3)
WALLS = {(54, 55)}
WEST, EAST = [4, 19, 34, 49, 64], [12, 27, 42, 57, 72]


def neighbours(r, opened):
    for n in (r - 1, r + 1):
        k = (min(r, n), max(r, n))
        if 1 <= n <= 75 and (r - 1) // 15 == (n - 1) // 15 and k not in WALLS and (k not in doors or k in opened):
            yield n
    if r == 75 and (75, 76) in opened:
        yield 76
    if r in WEST or r in EAST:
        if r not in (64, 72):
            yield r + 15
        if r not in (4, 12):
            yield r - 15


def reachable(a, b, opened):
    seen, q = {a}, deque([a])
    while q:
        r = q.popleft()
        if r == b:
            return True
        for n in neighbours(r, opened):
            if n not in seen:
                seen.add(n); q.append(n)
    return False


# The route is the JSON the page animates (script#ch-route): ["stage", title, goal],
# ["go", room], ["take", items], ["use", item, room], ["open", left, right, what opens it].
ROUTE = json.loads(re.search(r'<script type="application/json" id="ch-route">(.*?)</script>', page, re.S).group(1))
ITEM_ROOMS = {}
for m in re.finditer(r'<text x="([\d.]+)" y="([\d.]+)" font-size="8.5"[^>]*>(\d+)</text>', svg):
    ITEM_ROOMS[int(m.group(3))] = int((float(m.group(2)) - 38) // 62) * 15 + int((float(m.group(1)) - 10) // 64) + 1
TOOL_FODDER = {44, 45, 46, 60, 47, 48, 49, 58, 59, 62, 63, 81, 72, 73, 91, 69, 78, 79, 80}


FIRE = {int(m.group(1)): float(m.group(2)) for m in re.finditer(r'data-n="(\d+)" data-ft="([\d.]+)"', page)}


def shortest(a, b, opened):
    """The rooms the page's animation walks from a to b, as the player does."""
    prev, q = {a: None}, deque([a])
    while q:
        r = q.popleft()
        for n in neighbours(r, opened):
            if n not in prev:
                prev[n] = r; q.append(n)
    out = []
    while b != a:
        out.append(b); b = prev[b]
    return out[::-1]


def check_fire(errors):
    """Walk the route at an even pace over the 28.9 minutes played: no room entered may already
    be burning, and cupboard key 37 and item 21 must be used before their deadlines."""
    rooms, pos, opened = [], 8, set()
    for step in ROUTE:
        if step[0] == "go":
            for n in shortest(pos, step[1], opened):
                rooms.append(n); pos = n
        elif step[0] == "open":
            opened.add((step[1], step[2]))
    minutes = 28.9 / len(rooms)
    pos, opened, hops = 8, set(), 0
    for step in ROUTE:
        if step[0] == "go":
            for n in shortest(pos, step[1], opened):
                hops += 1; pos = n
                if FIRE.get(n, 99) <= hops * minutes:
                    errors.append(f"room {n} is already burning when Bond enters at about {hops * minutes:.1f} minutes")
        elif step[0] == "open":
            opened.add((step[1], step[2]))
        elif step[0] == "use" and step[1] in (37, 21):
            limit = FIRE[step[2]]
            if hops * minutes >= limit:
                errors.append(f"item {step[1]} used at about {hops * minutes:.1f} minutes, after room {step[2]} burns at {limit}")


def main():
    pos, held, opened, tool_uses, errors = 8, {54}, set(), 0, []
    for step in ROUTE:
        if step[0] == "go":
            if not reachable(pos, step[1], opened):
                errors.append(f"no way from room {pos} to room {step[1]}")
            pos = step[1]
        elif step[0] == "stage":
            pass
        elif step[0] == "take":
            for it in step[1]:
                if ITEM_ROOMS.get(it) != pos:
                    errors.append(f"item {it} is in room {ITEM_ROOMS.get(it)}, taken in room {pos}")
            held |= set(step[1])
        elif step[0] == "use":
            if step[1] not in held:
                errors.append(f"item {step[1]} used before it is taken")
            if pos != step[2]:
                errors.append(f"item {step[1]} used in room {pos}, not {step[2]}")
        else:
            _, l, r, how = step
            if (l, r) not in doors:
                errors.append(f"no door between rooms {l} and {r}")
            if pos not in (l, r):
                errors.append(f"door {l}-{r} opened from room {pos}")
            if how == "tool":
                tool_uses += 2
                if 43 not in held:
                    errors.append(f"door {l}-{r}: tool not taken yet")
            elif how == "56+57":
                if not {56, 57} <= held:
                    errors.append("room 62: items 56 and 57 not both held")
            elif how not in held:
                errors.append(f"door {l}-{r}: key {how} not taken yet")
            opened.add((l, r))
    if pos != 76:
        errors.append(f"the route ends in room {pos}, not 76")
    if not {84, 85, 86, 87, 88, 89} <= held:
        errors.append("kit pieces missing")
    check_fire(errors)
    spare = len(held & TOOL_FODDER) - tool_uses
    if spare < 0:
        errors.append(f"tool needs {tool_uses} items, route took {len(held & TOOL_FODDER)}")
    for e in errors:
        print("FAIL:", e)
    if errors:
        sys.exit(1)
    print(f"OK: {len(ROUTE)} moves walkable, {tool_uses} tool items needed, {len(held & TOOL_FODDER)} taken")


main()
