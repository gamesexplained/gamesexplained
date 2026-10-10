#!/usr/bin/env python3
"""Hold the page's port of the word matcher against the game's own code.

index.html's typing widget looks each word up with VH.findWord, a port of
find_word ($D937) and next_entry ($DA11): the word against the 255 rows of the
dictionary d$, allowing one wrong, missing or extra letter. This runs both on the
same words and compares what each returns, the dictionary row (A) and the
final-"s" flag (bit 1 of the editor's flags at $D2B4):

  the game   $D937 in SkoolKit's Z80 simulator on the committed listing.json, with
             the word in word_buffer ($D321) and the editor's variables as the
             ENTER handler sets them for a new word (end_of_word, $D81C)
  the page   the VH block of index.html, run by node

The words: every word of the dictionary that can be typed (not those with an
apostrophe or CHR$ 128), each with an "s" added, and three random
misspellings of each (a letter changed, dropped, added or two swapped), and 100
random strings, from a fixed seed. Everything it needs is committed. Run it as a
script; it exits 1 when the two differ.

  python3 games/spectrum/valhalla/test_parser.py
"""
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "spectrum", "simulate.py")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_parser.py must run from inside the repository")
    ROOT = parent
sys.path.insert(0, os.path.join(ROOT, "kit", "spectrum"))
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
import simulate  # noqa: E402
import port_check  # noqa: E402

FIND_WORD, DICT, IX = 0xD937, 0xAFE8, 0xD2B4
SEED = 20261010

PAGE = r"""
const ram = game.listing().ram;
const dict = ram.subarray(0xAFE8, 0xAFE8 + 255 * 11 + 16);
return request.words.map(w => {
  const r = VH.findWord(Array.from(w, ch => ch.charCodeAt(0)), dict);
  return [r.code, r.finalS ? 1 : 0];
});
"""


def words(mem):
    out = []
    for n in range(255):
        r = mem[DICT + 11 * n: DICT + 11 * n + 11]
        w = bytes(r[1:1 + r[0]]).decode("latin1").lower()
        if w.isalpha() and w.isascii():         # a word with "'" or CHR$ 128 in it cannot be typed
            out.append(w)
    return out


def cases(mem):
    rng, abc = random.Random(SEED), "abcdefghijklmnopqrstuvwxyz"
    out = set()
    for w in words(mem):
        out.update((w, w + "s"))
        for _ in range(3):
            i, k = rng.randrange(len(w) + 1), rng.randrange(4)
            if k == 0 and i < len(w):
                out.add(w[:i] + rng.choice(abc) + w[i + 1:])
            elif k == 1 and i < len(w) and len(w) > 1:
                out.add(w[:i] + w[i + 1:])
            elif k == 2:
                out.add(w[:i] + rng.choice(abc) + w[i:])
            elif k == 3 and i < len(w) - 1:
                out.add(w[:i] + w[i + 1] + w[i] + w[i + 2:])
    for _ in range(100):
        out.add("".join(rng.choice(abc) for _ in range(rng.randrange(1, 9))))
    return sorted(out)


def game(mem, w):
    pokes = {0xD321: list(w.encode()) + [0] * (64 - len(w)),   # word_buffer, cleared after the word
             IX: [0x04],                                        # flags: a word is being collected
             0xD2B7: [len(w)],                                  # its length
             0xD2C7: [0], 0xD2C5: [0], 0xD2C4: [0],             # best count, entry number, best code
             0xD2C2: [DICT & 255, DICT >> 8]}                   # the entry being tried
    regs, _, n, after = simulate.run(bytes(mem), FIND_WORD, {"DE": DICT, "IX": IX}, pokes,
                                     max_ins=2_000_000)
    if regs["PC"] != simulate.RET:
        sys.exit(f"find_word did not return for {w!r} ({n} instructions)")
    return [regs["A"], (after[IX] >> 1) & 1]


def main():
    try:
        simulate.simulator()
    except SystemExit:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise
        print("no SkoolKit: the oracle of test_parser.py is missing, so it is skipped "
              "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit installs it)")
        return 0
    mem = port_check.image(HERE)
    todo = cases(mem)
    ours = [game(mem, w) for w in todo]
    found = sum(1 for a, _ in ours if a)
    # cases that have to succeed: every word of the dictionary is found as itself
    got = dict(zip(todo, ours))
    for w in words(mem):
        row = got[w][0]
        r = mem[DICT + 11 * (row - 1): DICT + 11 * row] if row else b"\0"
        if bytes(r[1:1 + r[0]]).decode("latin1").lower() != w:
            sys.exit(f"not ok - the game's matcher does not find {w!r} as itself (row {row})")
    page = port_check.ask(HERE, "index.html", "VH", PAGE, {"words": todo})
    for w, a, b in zip(todo, ours, page):
        if a != b:
            print(f"not ok - {w!r}: the game gives row {a[0]} (final s {a[1]}), the page {b[0]} (final s {b[1]})")
            return 1
    print(f"ok - test_parser.py: {len(todo)} words, {found} of them found, the page's matcher agrees on every one")
    return 0


if __name__ == "__main__":
    sys.exit(main())
