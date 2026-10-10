#!/usr/bin/env python3
"""Hold the view's ported drawing order against the game's own code.

index.html draws the view from the board's bytes with a port of the game's
display-list order: $AAF3 walks the nine cells round the worm in its own order,
$B008 puts each record after the last one $B045 says it must be drawn after.
A port is a claim about the game, so this runs both and compares them:

  the game   $AAF3, $B045, $B0A5 and $B2C8 in SkoolKit's Z80 simulator, on the
             board bytes in the committed listing.json, with the nine cells
             round the worm poked into the window table and the worm's position
             inside its cell poked into $7FF5 and $7FF7
  the page   the block of index.html that holds the ports, run by node

Everything it needs is committed: no game image, no snapshot, no emulator. Run
it as a script; it exits 1 on the first difference it finds.

  python3 games/spectrum/fat-worm-blows-a-sparky/test_view_order.py
"""
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = HERE
while not os.path.isfile(os.path.join(ROOT, "kit", "spectrum", "simulate.py")):
    parent = os.path.dirname(ROOT)
    if parent == ROOT:
        sys.exit("test_view_order.py must run from inside the repository")
    ROOT = parent
sys.path.insert(0, os.path.join(ROOT, "kit", "spectrum"))
sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
import simulate  # noqa: E402
import port_check  # noqa: E402

HEAD, SP = 0xEB7E, 0xEFF0
BOARD = (0x6464, 0x757A)
# The view this was written for, square $6F56 at x 124 y 164; the two busiest the board has,
# which put eleven and ten records in the list and give $B008 an insertion point past the
# first; the square a game starts in; one whose window holds a handler record; one that lists
# a de-bugger pad, which the game keeps in the list and draws nothing for; and the busy view
# again with the bottom height of its first record knocked to $FF, the byte $A5B3 writes when
# a spindle is collected, so that the record has to leave the list.
VIEWS = [(0x6F56, 124, 164), (0x65E3, 128, 128), (0x6E68, 128, 128), (0x64AE, 128, 128), (0x6D11, 0, 0),
         (0x6DDF, 128, 128),                      # lists the pad at $6E03, which draws nothing
         (0x65E3, 128, 128, [(0x65EC, 0xFF)])]    # the item at $65EB with its bottom at $FF
SEED = 20261006
POOL = 240          # records in the random pool: every pair of them is compared
TYPES = [0x01, 0x06, 0x14, 0x20, 0x31, 0x40, 0x42, 0x52, 0x80, 0x90, 0xC0, 0xC3, 0xD8, 0xE0, 0xE2, 0xE3,
         0xE8, 0xF4, 0xF5, 0xF6, 0xF7]

# The page's side, run by kit/scripts/port_check.py after the FW block of index.html.
PAGE = r"""
const ram = game.listing().ram;
const cells = FW.walkBoard(ram);
const rec = a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], top: a[4], bottom: a[5], type: a[6] });
const key = r => [r.x1, r.y1, r.x2, r.y2, r.top, r.bottom, r.type];
const out = { views: [], nine: [], pairs: [], insert: [] };
for (const [cell, x, y, pokes] of request.views) {
  const ram2 = Uint8Array.from(ram);
  for (const [a, v] of (pokes || [])) ram2[a] = v;
  const grid = pokes && pokes.length ? FW.walkBoard(ram2) : cells;
  const records = FW.viewRecords(grid, cell, x, y);
  out.views.push({ records: records.map(key), ordered: FW.orderRecords(records).map(r => records.indexOf(r)) });
  out.nine.push([].concat(...FW.nine(grid, cell)));
}
for (const [a, b] of request.pairs) out.pairs.push(FW.compareRecords(rec(a), rec(b)));
for (const recs of request.insert) {
  const rs = recs.map(rec);
  out.insert.push(FW.orderRecords(rs).map(r => rs.indexOf(r)));
}
return out;
"""


def ram():
    """The page's own image: every byte listing.json records, and nothing else."""
    return port_check.image(HERE)


def links(mem, a):
    if not BOARD[0] <= a < BOARD[1]:
        return None
    return {k: mem[a + o] | mem[a + o + 1] << 8 for k, o in (("e", 0), ("n", 2), ("w", 4), ("s", 6))}


def nine(mem, c):
    """The nine cells the view is taken from, which is what the game's window table holds:
    the centre's own four links, and for the rest the links of the cells in the centre row.

    The game's own starting window, cell_grid_template at $6400, is the check on this rule:
    its nine round the centre are the nine below. A cell is 0 where the board has none.
    """
    def at(a, k):
        return (links(mem, a) or {}).get(k, 0)

    n, s, w, e = at(c, "n"), at(c, "s"), at(c, "w"), at(c, "e")
    return [[at(n, "w") or at(w, "n"), n, at(n, "e") or at(e, "n")],
            [w, c, e],
            [at(s, "w") or at(w, "s"), s, at(s, "e") or at(e, "s")]]


def template(mem):
    """The nine the game's own starting window holds round its centre, cell $64AE."""
    return [[mem[0x6400 + 10 * r + 2 * q] | mem[0x6401 + 10 * r + 2 * q] << 8 for q in (1, 2, 3)]
            for r in (1, 2, 3)]


def read_record(m, a):
    w = lambda o: m[a + o] | m[a + o + 1] << 8
    sw = lambda o: w(o) - 0x10000 if w(o) & 0x8000 else w(o)
    # (source address, x1, y1, x2, y2, top, bottom, type, this record's own address)
    return (w(0x0A), sw(2), sw(4), sw(6), sw(8), m[a + 0x0C], m[a + 0x0D], m[a + 0x0E], a)


def run_game(mem, cell, x, y, pokes=()):
    """$AAF3 for one view: (the board records in creation order, in drawing order, and the
    board bytes the walk wrote). The last are the records that run a routine as the walk
    passes them ($AF49): they ripple a block's height, and the page does not port them, so
    the page is asked for the same board the game ended up with."""
    grid = nine(mem, cell)
    if not grid[1][1]:
        return None, None
    m = bytearray(mem)
    for r, row in enumerate(grid):
        for q, a in enumerate(row):
            i = 0x6432 + 2 * ((r + 1) * 5 + (q + 1))    # the nine's slots in the 5x5 table
            m[i], m[i + 1] = a & 0xFF, a >> 8
    for a, v in pokes:                                   # the board as the view's caller has it
        m[a] = v
    m[0x7FF5], m[0x7FF7] = x, y                          # the worm inside its cell
    m[0x7C71], m[0x7C72], m[0x7C73] = 0, 0x74, 0x7C      # no objects: the page draws none
    out, changed, n, after = simulate.run(bytes(m), 0xAAF3, max_ins=400000, sp=SP)
    if out["PC"] != simulate.RET:
        sys.exit(f"$AAF3 did not return for {cell:04X} ({n} instructions)")
    recs, a = [], after[HEAD] | after[HEAD + 1] << 8
    while a:
        recs.append(read_record(after, a))
        if not after[a + 1]:        # the list ends at the link whose high byte is 0
            break
        a = after[a] | after[a + 1] << 8
    board = [r for r in recs if BOARD[0] <= r[0] < BOARD[1]]
    # $B008's five call sites run as $AF73 accepts each record, so allocation order is
    # creation order, and that is the order the page's viewRecords() must produce too.
    touched = [c for c in changed if BOARD[0] <= c[0] < BOARD[1]]
    return [r[:8] for r in sorted(board, key=lambda r: r[8])], [r[:8] for r in board], touched


def write_record(m, addr, rec):
    """Poke a 15-byte display-list record: x1, y1, x2, y2, top, bottom, type."""
    m[addr:addr + 15] = [0] * 15
    for i, v in enumerate(rec[:7]):
        if i < 4:
            m[addr + 2 + 2 * i], m[addr + 3 + 2 * i] = v & 0xFF, (v >> 8) & 0xFF
        else:
            m[addr + 0x0C + (i - 4)] = v & 0xFF


def simulator_once(mem):
    Sim = simulate.simulator()
    m = list(mem)
    sim = Sim(m, config={"fast_djnz": False, "fast_ldir": False})
    r = sim.registers
    sp = SP - 2
    m[sp], m[sp + 1] = simulate.RET & 255, simulate.RET >> 8
    return sim, r, m, sp


def step(sim, r, addr, ix=0, iy=0, sp=0):
    """Call one routine with IX (and IY) and run to the return."""
    r[8], r[9] = (ix >> 8) & 0xFF, ix & 0xFF
    r[10], r[11] = (iy >> 8) & 0xFF, iy & 0xFF
    r[12] = sp
    r[24] = addr
    n = 0
    while r[24] != simulate.RET and n < 20000:
        sim.run()
        n += 1
    if r[24] != simulate.RET:
        sys.exit(f"${addr:04X} did not return")


def insert_order(mem, recs):
    """$B008's list for one sequence of records: their places in the order it draws them."""
    sim, r, m, sp = simulator_once(mem)
    m[HEAD] = m[HEAD + 1] = 0
    at = [0xEC00 + 15 * i for i in range(len(recs))]
    for a, rec in zip(at, recs):
        write_record(m, a, rec)
    for a in at:
        step(sim, r, 0xB008, ix=a, sp=sp)
    order, a = [], m[HEAD] | m[HEAD + 1] << 8
    while a:
        order.append(at.index(a))
        if not m[a + 1]:            # the list ends at the link whose high byte is 0
            break
        a = m[a] | m[a + 1] << 8
    if len(order) != len(at):
        sys.exit(f"$B008 lost a record: {len(order)} of {len(at)} are in the list")
    return order


def comparator(mem, pairs):
    """$B045's answer for each pair, one simulator for all of them: 1 after, -1 before, 0 none."""
    Sim = simulate.simulator()
    m = list(mem)
    sim = Sim(m, config={"fast_djnz": False, "fast_ldir": False})
    r = sim.registers
    sp = SP - 2
    m[sp], m[sp + 1] = simulate.RET & 255, simulate.RET >> 8
    out = []
    for ix, iy in pairs:
        for addr, rec in ((0xEC00, ix), (0xEC10, iy)):
            m[addr:addr + 15] = [0] * 15
            for i, v in enumerate(rec[:7]):          # x1, y1, x2, y2, top, bottom, type
                off = 2 + 2 * i if i < 4 else 0x0C + (i - 4)
                hi, lo = (v >> 8) & 0xFF, v & 0xFF
                if i < 4:
                    m[addr + off], m[addr + off + 1] = lo, hi
                else:
                    m[addr + off] = v & 0xFF
        r[8], r[9] = 0xEC, 0x00
                      # IX (high byte first)
        r[10], r[11] = 0xEC, 0x10                    # IY
        r[12] = sp
        r[24] = 0xB045
        n = 0
        while r[24] != simulate.RET and n < 20000:
            sim.run()
            n += 1
        if r[24] != simulate.RET:
            sys.exit("$B045 did not return")
        out.append(0 if r[1] & 0x40 else (1 if r[1] & 0x01 else -1))
    return out


def random_records(rng, n):
    """An honest record: edges near the window, a top that is a height the board uses, and a
    type from the board's own set. A narrow spread of sizes so that pairs meet, overlap and
    sit apart about as often as they do on the board."""
    out = []
    for _ in range(n):
        x1, y1 = rng.randint(-320, 250), rng.randint(-200, 150)
        w, d = rng.choice([16, 32, 48, 80, 128, 200, 256]), rng.choice([16, 32, 48, 80, 128, 200, 256])
        top = rng.choice([0, 1, 2, 16, 32, 48, 64, 80, 128, 144, 160, 176, 224, 240, 248])
        out.append((x1, y1, x1 + w, y1 + d, top, rng.choice([0, max(0, top - 1), top]),
                    rng.choice(TYPES)))
    return out


def main():
    try:
        simulate.simulator()
    except SystemExit:
        if os.environ.get("KIT_REQUIRE_TOOLS"):
            raise
        print("no SkoolKit: the oracle of test_view_order.py is missing, so it is skipped "
              "(python3 kit/scripts/tools.py --platform spectrum get-skoolkit installs it)")
        return 0

    mem = ram()
    game = [run_game(mem, *v[:3], v[3] if len(v) > 3 else ()) for v in VIEWS]
    for v, (created, _, _) in zip(VIEWS, game):
        if created is None:
            sys.exit(f"the board has no cell at the centre of the view {v[0]:04X}")
    # Ask the page for the board the game's walk left behind, not the tape's: the difference
    # is what the records that run a routine wrote, and the page does not port those.
    asks = [[v[0], v[1], v[2], [list(p) for p in (v[3] if len(v) > 3 else ())]
             + [[a, after] for a, _, after in touched]]
            for v, (_, _, touched) in zip(VIEWS, game)]

    rng = random.Random(SEED)
    real = [tuple(r[1:8]) for created, _, _ in game for r in created]
    # Every pair of the board records the views list, and every pair of a pool of random ones,
    # so each branch of $B045 is met by records that meet, overlap and sit apart in every way.
    pool = random_records(rng, POOL) + real
    pairs = [(list(a), list(b)) for a in pool for b in pool]

    # Whole lists through $B008, so the insertion and not only the pair decisions are held to
    # it: random records in random orders, some of them type $FA, which $B008 steps over. That
    # step-over cannot change the order of the page's own records, which are never type $FA
    # (no board item is), so no list here tells it apart from no step-over at all.
    fire = list(rng.choice(real)) + [0, 0, 0, 0, 40, 0, 0xFA]
    lists = [[[list(rng.choice(pool)), list(rng.choice(pool))][rng.randint(0, 1)] for _ in range(rng.randint(2, 14))]
             for _ in range(300)]
    lists += [[list(rng.choice(real)) for _ in range(rng.randint(1, 6))] + [fire] * rng.randint(1, 3)
              for _ in range(60)]

    page = port_check.ask(HERE, "index.html", "FW", PAGE,
                          {"views": asks, "pairs": [list(p) for p in pairs], "insert": lists})

    bad = 0

    # 0. The nine-cell rule is the game's own window rule, checked against the window the game
    #    itself starts from ($6400, copied to $6432 by $7617).
    if nine(mem, 0x64AE) != template(mem):
        bad += 1
        print("x  the nine-cell rule no longer reproduces cell_grid_template\n"
              f"     rule     {[[hex(a) for a in r] for r in nine(mem, 0x64AE)]}\n"
              f"     template {[[hex(a) for a in r] for r in template(mem)]}")

    # 1. The nine cells the page takes the view from are the cells the window holds.
    for i, v in enumerate(VIEWS):
        cell, x, y = v[:3]
        want = [a for row in nine(mem, cell) for a in row]
        if page["nine"][i] != want:
            bad += 1
            print(f"x  {cell:04X}: the page's nine cells are {[hex(a) for a in page['nine'][i]]}, "
                  f"the links' are {[hex(a) for a in want]}")

    # 2. The same records, in the same creation order, and drawn in the same order.
    for i, v in enumerate(VIEWS):
        cell, x, y = v[:3]
        created, drawn, touched = game[i]
        if page["views"][i]["records"] != [list(r[1:8]) for r in created]:
            bad += 1
            print(f"x  {cell:04X}: the page lists different records than $AAF3 did")
            for a, b in zip(page["views"][i]["records"], created):
                if list(a) != list(b[1:8]):
                    print(f"     page {a}\n     game {list(b)}")
        order = [created[j] for j in page["views"][i]["ordered"]]
        if order != list(drawn):
            bad += 1
            print(f"x  {cell:04X}: the page draws them in a different order than $B008 did\n"
                  f"     page {[hex(r[0]) for r in order]}\n     game {[hex(r[0]) for r in drawn]}")

    # 3. The comparator itself, over every pair of the views' records and over random ones.
    got = comparator(mem, pairs)
    if page["pairs"] != got:
        bad += 1
        wrong = [(a, b, p, g) for (a, b), p, g in zip(pairs, page["pairs"], got) if p != g]
        print(f"x  {len(wrong)} of {len(pairs)} pairs come out differently")
        for a, b, p, g in wrong[:5]:
            print(f"     ix {list(a)} iy {list(b)}: page {p}, game {g}")

    # 4. Whole lists through $B008: the insertion, the link order and the $FA step-over.
    for recs, want in zip(lists, page["insert"]):
        got = insert_order(mem, recs)
        if got != want:
            bad += 1
            print(f"x  a list of {len(recs)} records is drawn in another order\n"
                  f"     page {want}\n     game {got}")

    if bad:
        print(f"FAIL - {bad} check(s) differ from the game")
        return 1
    ripple = [t for _, (_, _, touched) in zip(VIEWS, game) for t in touched]
    print(f"ok - the page's view order matches the game: {len(VIEWS)} views, "
          f"{len(pairs)} record pairs through $B045 and {len(lists)} lists through $B008, "
          "no difference")
    print(f"     the walk itself wrote {len(ripple)} board byte(s), the records that run a routine: "
          + (", ".join(f"{a:04X} {b} -> {c}" for a, b, c in ripple) or "none"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
