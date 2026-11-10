#!/usr/bin/env python3
"""The Graphics tab's data, read from the game's own files: every 3D place's map and walls, every
portrait head and body with who wears it, and the ending's pictures. Writes the JSON between the
por-graphics tags of graphics.html.

  python3 games/c64/pool-of-radiance/scripts/graphics_data.py

It reads the files of the eight disk sides from work/files/<side>/, extracted with
`python3 kit/c64/disk.py extract work/disks/<side>.d64 work/files/<side>` for each side (work/ is
gitignored: the images are the contributor's own copy), and runs two of the game's routines on the
kit's 6502 in node: install_wall_def (dungeon, $1485), whose colours the page takes as they come out,
and draw_view (view part, $C183), to find each map's busiest view for the walk to start from.

Walls. A 3D area has three wall sets. LOAD PIECES (script command 55) names a WALLDEF and a WALLSET
file for each; WALLDEF holds five wall shapes of 156 character codes and their colours, packed,
and WALLSET the fifty characters they are drawn with, which go in the character set at $6A, $9C or
$CE for sets 0, 1 and 2. A wall's number on the map, 1 to 15, is set (number - 1) / 5, shape
(number - 1) % 5. New Phlan alone has its walls whole, in WALLS00 and SECSET00. The table MAPS below
is what each map's script sets up, read from the scripts (the addresses are in the comments): the
three WALLDEF numbers (None where the script keeps the set it had), the flags that stop a set's
characters being renumbered ($49E7-$49E9), the first wall colour by day and by night (WALLCOL0,
$49FD, 11 before the hour 14 and 8 from it, where the script compares the hour) and the second
(WALLCOL1, $49FE); bit 7 of a square's byte picks the second.
"""
import base64, glob, hashlib, json, os, re, subprocess, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bestiary_data import (side_files, flow, resolver, pairs, map_names, GAME, FILES, SIDES, HEAD, SAVE,
                           PICTURE, SETUP_MONSTER, ENCOUNTER_MENU, ADD_NPC, GET_TABLE, ENDS, IFS)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(GAME)))
HOUR = [11, 8]
# (side, GEO, WALLDEF numbers (decimal, as LOAD PIECES gives them), no-renumber flags, WALLCOL0 by
#  day and night, WALLCOL1, extra): the script lines that set them up
MAPS = [
    (3, 0x00, "WALLS00", [0, 0, 0], HOUR, 10, {}),               # ECL00 $9B0A-$9B11, $9920-$9934
    (6, 0x01, [2, 6, 6], [0, 0, 0], HOUR, 10, {}),               # ECL01 $B6C6, $B6DA-$B6EE
    (4, 0x02, [1, 3, 20], [0, 0, 0], [11, 11], 8, {}),           # ECL02 $9914-$9927
    (5, 0x03, [24, 25, 1], [1, 1, 0], HOUR, 9, {}),              # ECL03 $9A65-$9A78, $9C1C; flags from the bailey
    (5, 0x04, [24, 25, 1], [1, 1, 0], HOUR, 9, {}),              # ECL04 $9A65-$9A78, $A49F
    (5, 0x05, [24, 25, 1], [1, 1, 0], HOUR, 9, {}),              # ECL05 $9A65-$9A78, the sets kept
    (5, 0x06, [24, 25, 1], [1, 1, 0], HOUR, 9, {}),              # ECL06 $9B1F-$9B32, $9C5A-$9C6D
    (5, 0x07, [24, 25, 1], [1, 1, 0], [8, 8], 9, {}),            # ECL07 $9964-$996A, the sets kept
    (2, 0x09, [1, 9, 23], [0, 0, 0], HOUR, 9, {}),               # ECL09 $993B-$994E, $A0C0
    (4, 0x0A, [21, 22, 20], [1, 1, 0], [8, 8], 9,                # ECL0A $9914-$991A, $9A72-$9A85
     {"mc1": 11, "band": [0x40, 8, 0x42]}),                      #   $9A8C, $9AA0
    (8, 0x0D, [17, 18, None], [0, 0, 0], [8, 8], 8, {}),         # ECL0D $9914-$9928
    (3, 0x0E, [1, 3, 5], [0, 0, 0], HOUR, 10, {}),               # ECL0E $B593-$B5B4
    (2, 0x0F, [1, 19, 23], [0, 0, 0], HOUR, 9, {}),              # ECL0F $99C8-$99E2, $9BA7
    (8, 0x10, [9, 20, 23], [0, 0, 0], HOUR, 8, {}),              # ECL10 $9914-$992D, $9C1B
    (7, 0x11, [7, 8, 23], [0, 0, 0], HOUR, 13, {}),              # ECL11 $9DA5-$9DBF, $9EE7
    (1, 0x12, [1, 3, 5], [0, 0, 0], HOUR, 8, {}),                # ECL12 $9978, $9A1A-$9A28; WALLCOL1 from
                                                                 #   the Cadorna house or the wilderness
    (2, 0x14, [2, 4, 1], [0, 0, 0], HOUR, 9, {}),                # ECL14 $9A71-$9A92
    (4, 0x15, [1, 5, 9], [0, 0, 0], HOUR, 10, {}),               # ECL15 $9A6F-$9A83, $AE44-$AE57
    (7, 0x16, [1, 3, None], [0, 0, 0], [8, 8], 9, {}),           # ECL16 $9C0D, $9C3C
    (7, 0x17, [1, 3, None], [0, 0, 0], [8, 8], 9, {}),           # ECL17 $9BFD, $A479
    (1, 0x18, [1, 3, 5], [0, 0, 0], HOUR, 10, {}),               # ECL18 $B6A3-$B6C4
    (6, 0x19, [17, 17, 17], [0, 0, 0], [8, 8], 8, {}),           # ECL19 $AEFC-$AF0A
    (7, 0x1A, [7, 8, 23], [0, 0, 0], [8, 8], 8, {}),             # ECL1A $B14D-$B153
    (8, 0x1B, [17, 17, 17], [0, 0, 0], [8, 8], 8, {}),           # ECL1B $AC8A-$AC98
    (6, 0x1C, [1, 2, 9], [0, 0, 0], HOUR, 10, {}),               # ECL1C $B696-$B6B8
    (8, 0x1D, [3, 20, 1], [0, 0, 0], HOUR, 10, {}),              # ECL1D $9C62, $AF30-$AF4B
    (8, 0x1E, [9, 17, 23], [0, 0, 0], HOUR, 8, {}),              # ECL10 $9D65-$9D6C
    (1, 0x1F, [1, 3, 5], [0, 0, 0], HOUR, 10, {}),               # ECL18 $B6B6-$B6DD
    (8, 0x20, [18, 17, 1], [0, 0, 0], HOUR, 8,                   # ECL1D $9C71, $AF60
     {"band": [0x40, 8, 0x42]}),                                 #   $AF59
]

NODE = r"""
const ROOT = process.argv[1], GAME = process.argv[2], req = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const { game } = require(ROOT + '/kit/scripts/port_check.js');
const g = game(GAME);
g.lib('cpu6502');
const { CPU } = globalThis.C64Cpu;
const b = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
function memory(...parts) {
  const m = new Uint8Array(65536);
  for (const p of parts) { const L = g.listing('parts/' + p + '/listing.json'); for (let a = 0; a < 65536; a++) if (L.has[a]) m[a] = L.ram[a]; }
  return m;
}
const BASE = memory('resident', 'dungeon', 'view', 'tables');
// install_wall_def ($1485) for each WALLDEF in each set, with and without its flag: the characters
// and the unpacked colours it leaves in WALLS
const out = { walldefs: {}, starts: [] };
for (const [n, file] of Object.entries(req.walldefs)) {
  const got = [];
  for (const set of [0, 1, 2]) for (const flag of [0, 1]) {
    const M = BASE.slice();
    M.set(b(file), 0x8C00); M[0x2B70] = set; M[0x49E7 + set] = flag;
    new CPU(M).call(0x1485, {}, { maxSteps: 5e6 });
    const c = 0xED50 + 780 * set, k = 0xF674 + 780 * set;
    got.push({ set, flag, chars: Buffer.from(M.subarray(c, c + 780)).toString('base64'), colours: Buffer.from(M.subarray(k, k + 780)).toString('base64') });
  }
  out.walldefs[n] = got;
}
// each map's busiest view: the most different characters draw_view ($C183) puts in its buffer
for (const m of req.maps) {
  const M = BASE.slice();
  M.set(b(m.geo), 0x0400); M.set(b(m.walls), 0xED50);
  M[0x49FD] = m.c0; M[0x49FE] = m.c1; M[0x6DDB] = 0xFF;
  let best = null;
  for (let sq = 0; sq < 256; sq++) for (let f = 0; f < 4; f++) {
    M[0xC04B] = sq & 15; M[0xC04C] = sq >> 4; M[0xC04D] = f;
    new CPU(M).call(0xC183, {}, { maxSteps: 5e6 });
    const seen = new Set(M.subarray(0xEC00, 0xEC79));
    if (!best || seen.size > best[0]) best = [seen.size, sq & 15, sq >> 4, f];
  }
  out.starts.push(best.slice(1));
}
process.stdout.write(JSON.stringify(out));
"""


def b64(x):
    return base64.b64encode(bytes(x)).decode()


def one(prefix):
    """Each file of a kind once, by number: files of one name are the same on every side."""
    out = {}
    for (s, n), data in side_files(prefix).items():
        if n in out and out[n][0] != data:
            sys.exit(f"{prefix}{n:02X} differs between sides")
        out.setdefault(n, (data, []))[1].append(s)
    return out


def run_node(req):
    r = subprocess.run(["node", "-e", NODE, ROOT, GAME], input=json.dumps(req), capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)
    return json.loads(r.stdout)


def install(walldefs, sets, flags):
    """WALLS ($ED50-$FF97) as install_wall_def leaves it for these sets, from its results."""
    w = bytearray(4680)
    for s, n in enumerate(sets):
        if n is None:
            continue
        r = next(x for x in walldefs[n] if x["set"] == s and x["flag"] == flags[s])
        w[780 * s:780 * s + 780] = base64.b64decode(r["chars"])
        w[2340 + 780 * s:2340 + 780 * s + 780] = base64.b64decode(r["colours"])
    return w


def main():
    walldefs, wallsets, geos = one("WALLDEF"), one("WALLSET"), side_files("GEO")
    if not geos:
        sys.exit("no GEO files under " + FILES + ": extract the disk sides first (see -h)")
    secsets, walls00 = one("SECSET"), one("WALLS")[0][0]
    charset = open(os.path.join(FILES, SIDES[0], "CHARSET"), "rb").read()[2:]
    names = map_names()

    # the game's own installer, for every WALLDEF in every set
    used = sorted({n for m in MAPS if m[2] != "WALLS00" for n in m[2] if n is not None})
    req = {"walldefs": {n: b64(walldefs[n][0]) for n in used}, "maps": []}
    inst = {int(k): v for k, v in run_node(req)["walldefs"].items()}
    for n, got in inst.items():
        # the colours do not depend on the set or the flag; the characters are the file's own, 0, 50 or
        # 100 added to each from $6A for its set unless the flag says not to
        cols = {x["colours"] for x in got}
        assert len(cols) == 1, n
        raw = walldefs[n][0][:780]
        for x in got:
            want = bytes((c + (0 if x["flag"] else 50 * x["set"])) & 255 if c >= 0x6A else c for c in raw)
            assert base64.b64decode(x["chars"]) == want, (n, x["set"], x["flag"])

    maps = []
    for side, geo, sets, flags, c0, c1, extra in MAPS:
        w = walls00 if sets == "WALLS00" else install(inst, sets, flags)
        req["maps"].append({"geo": b64(geos[(side, geo)]), "walls": b64(w), "c0": c0[0], "c1": c1})
    starts = run_node({"walldefs": {}, "maps": req["maps"]})["starts"]

    # which shapes each WALLDEF has that some map draws
    drawn = defaultdict(set)
    for side, geo, sets, flags, c0, c1, extra in MAPS:
        g = geos[(side, geo)]
        nums = {v for i in range(256) for v in (g[i] >> 4, g[i] & 15, g[256 + i] >> 4, g[256 + i] & 15) if v}
        for v in nums:
            s, k = (v - 1) // 5, (v - 1) % 5
            if sets == "WALLS00":
                drawn["WALLS00"].add(v - 1)         # New Phlan's fifteen shapes are one file
            else:
                drawn[sets[s]].add(k)
    for (side, geo, sets, flags, c0, c1, extra), st in zip(MAPS, starts):
        e = {"side": side, "geo": geo, "name": names.get((side, geo), ""), "b64": b64(geos[(side, geo)]),
             "sets": None if sets == "WALLS00" else sets, "flags": flags, "c0": c0, "c1": c1, "start": st}
        e.update(extra)
        maps.append(e)

    walls = {"charset": b64(charset[:512]), "secset02": b64(secsets[2][0]), "secset00": b64(secsets[0][0]),
             "walls00": b64(walls00), "maps": maps,
             "defs": {str(n): {"chars": b64(walldefs[n][0][:780]), "colours": inst[n][0]["colours"],
                               "set": b64(wallsets[n][0]), "drawn": sorted(drawn[n])} for n in used},
             "drawn00": sorted(drawn["WALLS00"])}

    # portraits
    heads, bodies = one("HEAD"), one("BODY")
    gen = json.load(open(os.path.join(GAME, "parts", "gen", "listing.json")))
    gb = {}
    for r in gen["records"]:
        for i, v in enumerate(r.get("b") or []):
            gb[r["a"] + i] = v
    creation = {"bodies": [gb[0x133B + i] for i in range(12)], "heads": [gb[0x1347 + i] for i in range(14)]}
    mons, ecls = side_files("MON"), side_files("ECL")
    npcs, scenes = [], defaultdict(set)
    for (s, e), b in sorted(ecls.items()):
        if e >= 0x64:
            continue
        cmds = flow(b)
        of = resolver(b, cmds)
        head, prev = None, None
        for at, cmd, ops in cmds:
            if prev in ENDS:
                head = None             # a new stretch of script: the head it shows is set again
            prev = None if cmd in IFS else cmd
            if cmd == SAVE and ops[1] == (1, HEAD):
                head = {v for v, _ in of(ops[0])}
            if cmd == GET_TABLE and ops[2] == (1, HEAD):
                head = {v for v, _ in of((1, HEAD))}
            if cmd == PICTURE and head:
                for hd in head - {255}:
                    for body, _ in of(ops[0]):
                        if body != 255:
                            scenes[(hd, body)].add((s, e))
            if cmd in (SETUP_MONSTER, ENCOUNTER_MENU) and head:
                for hd in head - {255}:
                    for body, _ in of(ops[2]):
                        scenes[(hd, body)].add((s, e))
            if cmd == ADD_NPC:
                for m, _ in of(ops[0]):
                    r = mons.get((s, m))
                    if r:
                        nm = bytes(x & 0x7F for x in r[:15]).split(b"\0")[0].decode()
                        npcs.append({"name": nm, "head": r[0xFE], "body": r[0xFF], "side": s, "ecl": e,
                                     "demo": (s, e) == (1, 0x1E)})
    place = lambda s, e: names.get((s, e), "")
    portraits = {"heads": {f"{n:02X}": {"b64": b64(d), "sides": sorted(ss)} for n, (d, ss) in sorted(heads.items())},
                 "bodies": {f"{n:02X}": {"b64": b64(d), "sides": sorted(ss)} for n, (d, ss) in sorted(bodies.items())},
                 "creation": creation, "npcs": npcs,
                 "scenes": []}
    # a pair is kept where both files are on the script's side: Zhentil Outpost's SETUP MONSTER with
    # head $39 and close-up $0B (ECL1C, $A30E-$A314) names a BODY0B no side has, at distance 2, where
    # the close-up is not shown, and a COMBAT follows
    for (h, bd), w in sorted(scenes.items()):
        w = [[s, e, place(s, e)] for s, e in sorted(w) if h in heads and bd in bodies and s in heads[h][1] and s in bodies[bd][1]]
        if w:
            portraits["scenes"].append({"head": h, "body": bd, "where": w})

    # the ending: FINAL's pictures and tables, all on disk 3 side A
    final = open(os.path.join(FILES, SIDES[4], "FINAL"), "rb").read()[2:]
    at = lambda a, n=1: final[a - 0x800:a - 0x800 + n]
    msgs = []
    for i in range(14):
        a = at(0x0D38 + i)[0] | at(0x0D46 + i)[0] << 8
        t = bytearray()
        while at(a)[0]:
            t.append(at(a)[0])
            a += 1
        msgs.append(t.decode("latin1"))
    pic = lambda n: b64(open(os.path.join(FILES, SIDES[4], f"PIC{n:02X}"), "rb").read()[2:])
    sec = lambda n: b64(open(os.path.join(FILES, SIDES[4], f"SECSET{n:02X}"), "rb").read()[2:])
    spelle = open(os.path.join(FILES, SIDES[4], "SPELLE20"), "rb").read()[2:]
    ending = {"pic34": pic(0x34), "pic35": pic(0x35), "pic36": pic(0x36), "sprites": pic(0x3A),
              "secset07": sec(7), "secset08": sec(8), "backs": b64(spelle[:900]), "messages": msgs,
              "sprite_x": list(at(0x086C, 6)), "sprite_y": list(at(0x0872, 6)),
              "image_sets": [list(at(0x0B83, 5)), list(at(0x0B8B, 5))], "flash": list(at(0x0ABE, 4)),
              "fade": [list(at(0x0B21 + x)) + list(at(0x0B26 + x)) + list(at(0x0B2B + x)) for x in range(5, 0, -1)]}

    data = {"walls": walls, "portraits": portraits, "ending": ending}
    page = os.path.join(GAME, "graphics.html")
    t = open(page).read()
    js = json.dumps(data, separators=(",", ":"))
    new, n = re.subn(r'(<script type="application/json" id="por-graphics">).*?(</script>)',
                     lambda m: m.group(1) + js + m.group(2), t, flags=re.S)
    if n != 1:
        sys.exit("graphics.html has no por-graphics tag")
    open(page, "w").write(new)
    unused = {n: [k for k in range(5) if k not in drawn[n]] for n in used if len(drawn[n]) < 5}
    print(f"{len(maps)} maps, {len(used)} wall sets, {len(heads)} heads, {len(bodies)} bodies, "
          f"{len(npcs)} NPCs, {len(scenes)} head and body pairs in scripts; shapes no map draws: {unused}; "
          f"{len(js):,} bytes")


if __name__ == "__main__":
    if "-h" in sys.argv[1:]:
        print(__doc__)
        sys.exit()
    main()
