#!/usr/bin/env python3
"""Hold the Characters tab's ports against what the game did in the emulator.

The game was run from its tape in the kit's own Spectrum (kit/spectrum/machine.js,
with SkoolKit's 48K ROM) on 11 October 2026: twice for 400,000 frames with nobody
typing, once from the start at Valheim and once with you put at place 62 beside
Saga, and once typing "who" now and then from the start. What it printed is
recorded below; the tape and the snapshots stay in the gitignored work/.

  who        VH.who, the port of lines 6210-6235, against the 15 answers "who"
             gave, from the columns every figure stood at when it was typed
  attacks    VH.attacks against every pair seen to attack or throw something,
             on its own turn or told by another (counterattacks after a throw
             left out): each pair's goodness, from listing.json, did not change
             in either run
  gives      VH.gives against every pair seen to give something
  step       VH.step against the goodness steps seen from the start with nothing
             poked: Loki's byte 17 went from 31 to 15 when he fought back at
             Skadi's throw, ordered by you, and the next such step at Odin
             stopped the game with "B Integer out of range, 1356:8"

  python3 games/spectrum/valhalla/test_characters.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "scripts", "port_check.py")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_characters.py must run from inside the repository")
    ROOT = parent
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
import port_check  # noqa: E402

WHO = [
    ({"Thor": 4, "Leer": 8, "Loki": 10, "Skadi": 12, "you": 27, "Idun": 31},
     ["    ^Thor", "        ^Leer", "          ^Loki", "            ^Skadi         ^you", "                           Idun^"]),
    ({"Thor": 4, "Leer": 7, "Skadi": 11, "you": 27, "Idun": 30},
     ["    ^Thor", "       ^Leer", "           ^Skadi          ^you", "                          Idun^"]),
    ({"Leer": 2, "Skadi": 3, "Thor": 4, "you": 27, "Idun": 28},
     ["  ^Leer", "   ^Skadi", "    ^Thor                  ^you", "                        Idun^"]),
    ({"Leer": 2, "Thor": 4, "Loki": 24, "you": 27},
     ["  ^Leer", "    ^Thor               ^Loki", "                           ^you"]),
    ({"Thor": 2, "Skadi": 19, "Loki": 22, "you": 27},
     ["  ^Thor            ^Skadi", "                      ^Loki^you"]),
    ({"Thor": 2, "Skadi": 3, "Loki": 24, "you": 27},
     ["  ^Thor", "   ^Skadi               ^Loki", "                           ^you"]),
    ({"Loki": 0, "Thor": 4, "you": 27},
     ["^Loki", "    ^Thor                  ^you"]),
    ({"Loki": 1, "Thor": 3, "Leer": 12, "you": 27},
     [" ^Loki", "   ^Thor    ^Leer          ^you"]),
    ({"Thor": 9, "Leer": 10, "Skadi": 26, "you": 27},
     ["         ^Thor", "          ^Leer           ^Skadi", "                           ^you"]),
    ({"Leer": 1, "Skadi": 2, "Loki": 4, "Thor": 8, "you": 27},
     [" ^Leer", "  ^Skadi", "    ^Loki", "        ^Thor              ^you"]),
    ({"Loki": 9, "Skadi": 11, "Thor": 20, "you": 27},
     ["         ^Loki", "           ^Skadi   ^Thor  ^you"]),
    ({"Loki": 8, "Thor": 15, "Frantic": 19, "you": 27},
     ["        ^Loki  ^Thor", "                   ^Frantic^you"]),
    ({"Thor": 19, "Loki": 25, "you": 27},
     ["                   ^Thor ^Loki", "                           ^you"]),
    ({"Thor": 0, "Skadi": 14, "you": 27},
     ["^Thor         ^Skadi       ^you"]),
    ({"Loki": 15, "Thor": 22, "Leer": 25, "you": 27},
     ["               ^Loki  ^Thor", "                         ^Leer", "                           ^you"]),
]

ATTACKS = [("Boldir", "Frantic"), ("Boldir", "Hel"), ("Boldir", "Klepto"), ("Gastro", "Skadi"), ("Glut", "you"),
           ("Gore", "Boldir"), ("Gripe", "Saga"), ("Gripe", "you"), ("Heimdal", "Nidhog"), ("Hel", "Boldir"),
           ("Hel", "Tyr"), ("Hel", "you"), ("Idun", "Loki"), ("Kon", "you"), ("Krank", "you"), ("Leer", "Skadi"),
           ("Leer", "Thor"), ("Loki", "Skadi"), ("Loki", "Thor"), ("Loki", "you"), ("Mary", "Gripe"),
           ("Nidhog", "Saga"), ("Nidhog", "you"), ("Rankle", "Thor"), ("Rankle", "you"), ("Saga", "Gripe"),
           ("Skadi", "Leer"), ("Skadi", "Loki"), ("Snake", "you"), ("Talis", "Nidhog"), ("Thor", "Gastro"),
           ("Thor", "Kon"), ("Thor", "Leer"), ("Thor", "Loki"), ("Thor", "Nidhog"), ("Thor", "Rankle"),
           ("Tyr", "Hel"), ("Tyr", "Nidhog")]

GIVES = [("Boldir", "Saga"), ("Boldir", "you"), ("Gastro", "Kon"), ("Heimdal", "Glut"), ("Idun", "Thor"),
         ("Kon", "Gastro"), ("Krank", "Nidhog"), ("Krank", "Rankle"), ("Mary", "Saga"), ("Mary", "you"),
         ("Nidhog", "Krank"), ("Saga", "Boldir"), ("Saga", "Skadi"), ("Saga", "you"), ("Thor", "Idun"),
         ("Thor", "you")]

# Loki's byte 17 before the step, the victim's goodness, and what the game left
STEPS = [(31, 13, 15), (15, 13, "error B")]

PAGE = r"""
const ram = game.listing().ram, CHR = 0xBC2B, DICT = 0xAFE8;
const word = n => { const a = DICT + 11 * (n - 1); let s = ''; for (let i = 1; i <= ram[a]; i++) s += String.fromCharCode(ram[a + i]); return s; };
const num = {}; for (let n = 1; n <= 39; n++) num[n === 1 ? 'you' : word(n)] = n;
const good = name => ram[CHR + 20 * (num[name] - 1) + 16] >> 4;
const gap = (a, b) => VH.gap(good(a), good(b));
return {
  who: request.who.map(cols => { const names = new Array(32).fill(''); for (const [k, v] of Object.entries(cols)) names[v] = k; return VH.who(names); }),
  attacks: request.attacks.map(([a, b]) => [gap(a, b), VH.attacks(gap(a, b))]),
  gives: request.gives.map(([a, b]) => [gap(a, b), VH.gives(gap(a, b))]),
  steps: request.steps.map(([byte, victim]) => VH.step(byte, victim)),
};
"""


def main():
    got = port_check.ask(HERE, "reference/valhalla-page.js", "VH", PAGE,
                         {"who": [c for c, _ in WHO], "attacks": ATTACKS, "gives": GIVES,
                          "steps": [s[:2] for s in STEPS]})
    for (cols, lines), have in zip(WHO, got["who"]):
        if have != lines:
            print(f"not ok - who with {cols}: the page prints {have}, the game printed {lines}")
            return 1
    for (a, b), (f, yes) in zip(ATTACKS, got["attacks"]):
        if not yes:
            print(f"not ok - {a} attacked {b}, {f} apart in goodness, and the page says it would not")
            return 1
    for (a, b), (f, yes) in zip(GIVES, got["gives"]):
        if not yes:
            print(f"not ok - {a} gave something to {b}, {f} apart in goodness, and the page says it would not")
            return 1
    for (byte, victim, want), have in zip(STEPS, got["steps"]):
        if have != want:
            print(f"not ok - a step of byte {byte} after a victim of goodness {victim}: the page says {have}, "
                  f"the game left {want}")
            return 1
    print(f"ok - test_characters.py: {len(WHO)} answers of who, {len(ATTACKS)} pairs that attacked, {len(GIVES)} "
          f"that gave and {len(STEPS)} goodness steps seen in the emulator agree with the page's rules")
    return 0


if __name__ == "__main__":
    sys.exit(main())
