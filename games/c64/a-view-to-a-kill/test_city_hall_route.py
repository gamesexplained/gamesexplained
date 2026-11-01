#!/usr/bin/env python3
"""Check that the City Hall route on maps.html can be walked.

The doors come from the page's own map (the K, T and star markers). The
route below is the page's solution 2, one move per walk or door. For each
move the test needs a path through open doors and lifts, and for each
door the key, the tool or the item that opens it, taken earlier. Run:
python3 games/c64/a-view-to-a-kill/test_city_hall_route.py
It checks the order and the geometry. Fire times and weight were played
in the emulator and are not checked here."""
import re, sys
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


# ("go", room) walk, ("take", items) pick up, ("open", left room, right room, what opens it)
ROUTE = [
    ("go", 9), ("take", [30]), ("go", 8), ("open", 7, 8, 30), ("go", 7), ("take", [43]), ("go", 6), ("take", [24]),
    ("go", 9), ("open", 9, 10, 24), ("go", 11), ("take", [44, 45, 46]), ("open", 11, 12, "tool"), ("go", 13), ("take", [60]),
    ("go", 14), ("take", [32]),
    ("go", 27), ("go", 28), ("take", [47, 48]), ("go", 26), ("open", 25, 26, "tool"), ("go", 25), ("take", [31]),
    ("go", 24), ("take", [56]), ("go", 22), ("take", [49, 37]), ("open", 21, 22, 32),
    ("go", 6), ("open", 5, 6, "tool"), ("go", 5), ("take", [89, 57]),
    ("go", 43), ("take", [81]), ("go", 28), ("open", 28, 29, 31), ("go", 29), ("open", 29, 30, "tool"), ("go", 30),
    ("take", [21, 58, 59]), ("go", 8),
    ("go", 19), ("go", 35), ("take", [62, 63]), ("go", 37), ("take", [25]), ("go", 48), ("open", 47, 48, 25), ("go", 46),
    ("take", [38]), ("go", 33), ("take", [84]), ("go", 50), ("open", 50, 51, "tool"), ("go", 51), ("take", [33]),
    ("go", 65), ("take", [29]), ("go", 66), ("take", [69]),
    ("go", 56), ("open", 55, 56, 33), ("go", 55), ("take", [86, 39]), ("go", 72), ("open", 71, 72, "tool"), ("go", 70),
    ("take", [78, 79, 80]), ("go", 38), ("open", 37, 38, "tool"),
    ("go", 65), ("take", [85, 36]), ("go", 63), ("open", 62, 63, "tool"), ("go", 62), ("open", 61, 62, "56+57"), ("go", 61),
    ("take", [88, 72, 73, 91]),
    ("go", 57), ("open", 57, 58, 29), ("go", 58), ("open", 58, 59, "tool"), ("go", 60), ("take", [40]),
    ("go", 72), ("open", 72, 73, 36), ("go", 73), ("take", [87]), ("go", 75),
]
TOOL_FODDER = {44, 45, 46, 60, 47, 48, 49, 58, 59, 62, 63, 81, 72, 73, 91, 69, 78, 79, 80}


def main():
    pos, held, opened, tool_uses, errors = 8, set(), set(), 0, []
    for step in ROUTE:
        if step[0] == "go":
            if not reachable(pos, step[1], opened):
                errors.append(f"no way from room {pos} to room {step[1]}")
            pos = step[1]
        elif step[0] == "take":
            held |= set(step[1])
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
    if not (reachable(75, 75, opened) and (75, 76) in doors):
        errors.append("room 76 door missing")
    if not {84, 85, 86, 87, 88, 89} <= held:
        errors.append("kit pieces missing")
    spare = len(held & TOOL_FODDER) - tool_uses
    if spare < 0:
        errors.append(f"tool needs {tool_uses} items, route took {len(held & TOOL_FODDER)}")
    for e in errors:
        print("FAIL:", e)
    if errors:
        sys.exit(1)
    print(f"OK: {len(ROUTE)} moves walkable, {tool_uses} tool items needed, {len(held & TOOL_FODDER)} taken")


main()
