#!/usr/bin/env python3
"""One frame of the screen, recorded so that a page can draw it and a test can check the drawing.

A screen split by raster interrupts changes the video chip's registers, and often the sprite
pointers, several times a frame, so one read of them draws the wrong picture. This records
one whole frame of the running machine: the registers as the frame begins, then every write
to the video chip, to CIA 2's port A (the video bank) and to any sprite pointer, each with the
raster line and cycle it happened on, and the RAM and colour RAM as the frame began.
site/lib/c64.js draws it (C64.renderFrame), line by line with the state in force; `compare`
checks that drawing against the emulator's own picture of the same frame.

Usage:
  frame.py capture <out.json>            the next whole frame of the machine as it stands, and
                                         the emulator's picture of it beside it (<out>.png)
  frame.py compare <frame.json> [<shot.png>]   draw it with site/lib/c64.js and count the
                                         pixels that differ from the picture, line by line;
                                         writes <frame>-diff.png
  frame.py trim <frame.json> <out.json>  keep only the memory the drawing reads, for a page
  frame.py test [--keep]                 the kit's own test: a program with a split of every
                                         kind, captured, drawn and compared. It resets the
                                         machine: not during a game you mean to keep

Needs the emulator (`tools.py vice`) for capture and test, and a JavaScript runtime for the
drawing: node, or on macOS the system's own JavaScriptCore. The frame file holds a copy of the
game's memory, so it stays in the game's work/ folder; `trim` makes the excerpt a page embeds.
"""
import base64, json, os, shutil, struct, subprocess, sys, tempfile, time, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
C64JS = os.path.join(ROOT, "site", "lib", "c64.js")
sys.path.insert(0, HERE)

STANDARDS = {"PAL": (312, 63), "NTSC": (263, 65), "NTSC-OLD": (262, 64), "PAL-N": (312, 65)}


# --- the emulator -------------------------------------------------------------
class Machine:
    def __init__(self):
        from vice import connect, call
        self.rpc, self._call = connect(), call

    def j(self, tool, args=None):
        return json.loads(self._call(self.rpc, tool, args or {}))

    def paused(self):
        return self.j("vice_ping")["execution"] == "paused"

    def pause(self):
        """Stop between two instructions (vice.pause: never vice_execution_pause alone)."""
        from vice import pause
        if not pause(self.rpc):
            raise RuntimeError("the machine did not stop")

    def read(self, a, n, bank="ram"):
        out = b""
        while n > 0:
            k = min(n, 0x8000)
            r = self.j("vice_memory_read", {"address": f"${a:04X}", "size": k, "encoding": "hex", "bank": bank})
            out += bytes.fromhex(r["data_hex"]); a += k; n -= k
        return out

    def stopwatch(self):
        return self.j("vice_cycles_stopwatch", {"action": "read"})["cycles"]

    def vic(self):
        v = self.j("vice_vicii_get_state")
        return v["raster_line"], v["registers"][:47]


# registers that change by themselves (the raster, the light pen, the interrupt latch, the
# collisions): never logged as writes; $D011's bit 7 reads the raster's ninth bit
SELF_CHANGING = {0x12, 0x13, 0x14, 0x19, 0x1E, 0x1F}


def io_visible(port):
    """Whether the CPU sees the I/O chips at $D000, from its port's direction and data bytes."""
    ddr, data = port
    eff = (data & ddr | ~ddr & 7) & 7              # lines set as inputs read high
    return bool(eff & 4 and eff & 3)


def capture(out, shot=None):
    """Record the next whole frame. Returns the frame as a dict and writes it to out."""
    m = Machine()
    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    lines, cycles = STANDARDS.get(std, STANDARDS["PAL"])
    m.pause()
    theirs = [c for c in m.j("vice_checkpoint_list")["checkpoints"] if c.get("enabled")]
    for c in theirs:                        # the game's own checkpoints would stop the frame early
        m.j("vice_checkpoint_toggle", {"checkpoint_num": c["checkpoint_num"], "enabled": False})
    ours = []
    try:
        m.j("vice_frame_advance", {"frames": 1})          # to the emulator's vertical sync: on a PAL chip
        for _ in range(600):                   # the top of a frame, unless its picture is out of step
            if m.vic()[0] < lines - 8:         # (picture_lines_low, below); then the sync comes a line
                break                          # or more early, and a few instructions more reach the top
            m.j("vice_execution_step", {"count": 1})
        m.j("vice_cycles_stopwatch", {"action": "reset"})
        line0, vic0 = m.vic()
        ram0 = m.read(0, 0x10000)
        colour0 = bytes(b & 15 for b in m.read(0xD800, 0x400, "io"))
        cia0 = list(m.read(0xDD00, 3, "io"))
        cpu0 = list(m.read(0, 2, "cpu"))
        charrom = m.read(0xD000, 0x1000, "rom")      # for this machine's own checks; trim drops it
        ranges = [(0xD000, 0xD3FF, "vic"), (0xDD00, 0xDDFF, "cia2")] + \
                 [(b * 0x4000 + s * 0x400 + 0x3F8, b * 0x4000 + s * 0x400 + 0x3FF, "pointers")
                  for b in range(4) for s in range(16)]
        for lo, hi, what in ranges:
            n = m.j("vice_checkpoint_add", {"start": f"${lo:04X}", "end": f"${hi:04X}",
                                             "store": True, "exec": False, "stop": True})["checkpoint_num"]
            ours.append((n, lo, hi, what))
        hits = {n: 0 for n, *_ in ours}
        samples = [(0, line0)]            # (stopwatch, raster line): the phase is pinned from these
        writes = []                       # [stopwatch after the store, address, value]
        vic, cia2, ram = list(vic0), [cia0[0], cia0[2]], {}
        while True:
            r = m.j("vice_frame_advance", {"frames": 1})
            sw = m.stopwatch()
            line, regs = m.vic()
            samples.append((sw, line))
            if "before" not in r.get("message", ""):
                break                          # the frame boundary: the frame is complete
            now = {c["checkpoint_num"]: c["hit_count"] for c in m.j("vice_checkpoint_list")["checkpoints"]}
            fired = [(lo, hi, what) for n, lo, hi, what in ours if now.get(n, 0) != hits[n]]
            hits.update({n: now.get(n, 0) for n, *_ in ours})
            io = io_visible(m.read(0, 2, "cpu")) if any(w in ("vic", "cia2") for *_, w in fired) else False
            for lo, hi, what in fired:
                if what == "vic" and io:
                    for i in range(47):
                        v, old = regs[i], vic[i]
                        if i in SELF_CHANGING or (v & 0x7F if i == 0x11 else v) == (old & 0x7F if i == 0x11 else old):
                            continue
                        writes.append([sw, 0xD000 + i, v]); vic[i] = v
                elif what == "cia2" and io:          # only the two bits that choose the video bank:
                    port = m.read(0xDD00, 3, "io")   # the serial bus moves the others by itself
                    for i, v in ((0, port[0]), (1, port[2])):
                        if v & 3 != cia2[i] & 3:
                            writes.append([sw, 0xDD00 + 2 * i, v]); cia2[i] = v
                elif what != "cia2":           # sprite pointers, or the RAM under the I/O area
                    for a, v in zip(range(lo, hi + 1), m.read(lo, hi - lo + 1)):
                        if ram.get(a, ram0[a]) != v:
                            writes.append([sw, a, v]); ram[a] = v
        end_sw = samples[-1][0]
        if shot:
            m.j("vice_display_screenshot", {"path": os.path.abspath(shot), "format": "PNG"})
        end_line, end_vic = m.vic()
        ram1 = m.read(0, 0x10000)
        colour1 = bytes(b & 15 for b in m.read(0xD800, 0x400, "io"))
        for _ in range(400):                   # more samples for the phase: a few lines' worth
            m.j("vice_execution_step", {"count": 1})
            samples.append((m.stopwatch(), m.vic()[0]))
            if len(samples) > 60 and phase(samples, lines, cycles)[1] == 0:
                break
    finally:
        for n, *_ in ours:
            m.j("vice_checkpoint_delete", {"checkpoint_num": n})
        for c in theirs:
            m.j("vice_checkpoint_toggle", {"checkpoint_num": c["checkpoint_num"], "enabled": True})
    o, spread = phase(samples, lines, cycles)
    total = lines * cycles
    # VICE draws each line into its picture at the row its own line counter names, and runs the
    # vertical sync when that counter wraps. The counter can be out of step with the beam: a
    # snapshot saved in a pause that stopped in the vertical sync, and loaded later, leaves it a
    # line ahead (kit/skills/c64/tool-vice-mcp/workarounds.md, pause-at-instruction). Then every
    # picture sits that many lines low, and the sync, where the frame ended, comes that many
    # lines before the top of the frame. That is where it comes in step on the 312-line chips;
    # an NTSC one runs it lower down, where its picture ends, so there it is not measured.
    boundary = (o + end_sw) % total // cycles
    low = None
    if lines == 312:
        low = (lines - boundary) % lines
        if low > lines // 2:
            low -= lines

    def when(sw):                       # the line and cycle (1 to cycles) of the store's write
        w = (o + sw - 1) % total
        return [w // cycles, w % cycles + 1]

    frame = {
        "schema": 1, "standard": std, "lines": lines, "cycles": cycles, "about": "",
        "vic": list(vic0), "cia2": [cia0[0], cia0[2]], "cpu": cpu0,
        "writes": [when(sw) + [a, v] for sw, a, v in writes],
        "colour": base64.b64encode(colour0).decode(),
        "ram": [{"a": 0, "b": base64.b64encode(ram0).decode()}],
        "charrom": base64.b64encode(charrom).decode(),
        "capture": {"phase_cycles_uncertain": spread, "frame_cycles": end_sw,
                    "frame_ended_on_line": boundary, "picture_lines_low": low,
                    "writes_account_for_end_state": all(
                        (a & 0x7F if i == 0x11 else a) == (b & 0x7F if i == 0x11 else b)
                        for i, (a, b) in enumerate(zip(vic, end_vic)) if i not in SELF_CHANGING),
                    "ram_bytes_changed_during_frame": sum(1 for a in range(0x10000) if ram0[a] != ram1[a]),
                    "colour_cells_changed_during_frame": sum(1 for a, b in zip(colour0, colour1) if a != b)},
    }
    with open(out, "w") as f:
        json.dump(frame, f, separators=(",", ":"))
    return frame


def phase(samples, lines, cycles):
    """The stopwatch's origin in cycles from the top of the frame, and how many other values fit.

    Each sample says the beam was on raster line L at stopwatch s, so the origin o lies in
    [L*cycles - s, L*cycles + cycles - 1 - s]; the samples' lines are unwrapped past the
    frame's last line in order. The video chip resets its counter to 0 a cycle later than it
    steps the others, so the first cycle of line 0 still reads as the last line."""
    lo, hi, prev, wraps = -10**9, 10**9, None, 0
    for s, L in samples:
        if prev is not None and L < prev:
            wraps += 1
        prev = L
        u = L + wraps * lines
        first = u * cycles + (1 if L == 0 else 0)
        last = u * cycles + cycles - 1 + (1 if L == lines - 1 else 0)
        lo, hi = max(lo, first - s), min(hi, last - s)
    if lo > hi:
        raise RuntimeError(f"the samples disagree about the beam's position ({lo} > {hi})")
    return lo, hi - lo


# --- drawing and comparing ----------------------------------------------------
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
DRIVER = r"""
const node = typeof require === 'function' && typeof process === 'object';
const args = node ? process.argv.slice(2) : arguments;
const read = node ? p => require('fs').readFileSync(p, 'utf8') : p => readFile(p);
const say = node ? t => process.stdout.write(t + '\n') : t => print(t);
if (node) (0, eval)(read(args[0])); else load(args[0]);
const r = C64.renderFrame(JSON.parse(read(args[1])));
say(JSON.stringify({ w: r.w, h: r.h, romReads: r.romReads }));
let h = '';
for (let i = 0; i < r.px.length; i++) h += r.px[i].toString(16);
say(h);
let reads = [];
for (let a = 0; a < 0x10000; a++) if (r.reads[a] && !(a && r.reads[a - 1])) reads.push(a);
say(reads.map(a => { let e = a; while (e + 1 < 0x10000 && r.reads[e + 1]) e++; return a + '-' + e; }).join(','));
"""


def js():
    node = shutil.which("node")
    if node:
        return [node]
    if os.path.exists(JSC):
        return [JSC]
    raise SystemExit("drawing a frame needs a JavaScript runtime: node, or on macOS the system's JavaScriptCore")


def render(frame_path):
    """(meta, pixels as colour indices, ranges of RAM read) from site/lib/c64.js's renderFrame."""
    runtime = js()
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(DRIVER)
    try:
        cmd = runtime + [f.name] + (["--"] if runtime[0] == JSC else []) + [C64JS, os.path.abspath(frame_path)]
        r = subprocess.run(cmd, capture_output=True, text=True)
    finally:
        os.unlink(f.name)
    if r.returncode or not r.stdout:
        raise SystemExit(f"the drawing failed:\n{r.stderr or r.stdout}")
    meta_line, px_line, reads_line = (r.stdout.splitlines() + ["", ""])[:3]
    reads = [tuple(int(x) for x in run.split("-")) for run in reads_line.split(",") if run]
    return json.loads(meta_line), bytes(int(c, 16) for c in px_line), reads


def read_png(path):
    """(width, height, rows of (r, g, b)) from an 8-bit RGB or RGBA PNG, such as VICE writes."""
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat = 8, b""
    while pos < len(data):
        n, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        if kind == b"IHDR":
            w, h, depth, ctype, _, _, inter = struct.unpack(">IIBBBBB", body)
            assert depth == 8 and ctype in (2, 6) and not inter, "only 8-bit RGB(A) PNGs"
            bpp = 3 if ctype == 2 else 4
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    raw, stride, prev, rows = zlib.decompress(idat), w * bpp, bytearray(w * bpp), []
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b, c = prev[i], prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append([tuple(line[x * bpp:x * bpp + 3]) for x in range(w)])
        prev = line
    return w, h, rows


def write_png(path, w, h, rgb):
    raw = b"".join(b"\x00" + bytes(v for p in rgb[y * w:(y + 1) * w] for v in p) for y in range(h))
    chunk = lambda k, d: struct.pack(">I", len(d)) + k + d + struct.pack(">I", zlib.crc32(k + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def compare(frame_path, shot_path=None, quiet=False):
    """Draw the frame and count the pixels that differ from the emulator's picture of it.
    The picture's colours are matched to colour numbers by what the drawing mostly has under
    each (VICE computes its palette, so no table is assumed). Returns the number that differ,
    not counting the two kinds of difference the drawing does not try to reproduce (below)."""
    shot_path = shot_path or os.path.splitext(frame_path)[0] + ".png"
    F = json.load(open(frame_path))
    meta, px, reads = render(frame_path)
    w, h, rows = read_png(shot_path)
    if (w, h) != (meta["w"], meta["h"]):
        raise SystemExit(f"the picture is {w}x{h}, the drawing {meta['w']}x{meta['h']}: VICE's border setting?")
    # the drawing's line y is the picture's line y + low when the emulator's picture sits low
    # (capture measures it; frame files from before it did have none, and are taken as 0)
    cap = F.get("capture", {})
    low = cap.get("picture_lines_low") or 0
    shown = range(max(0, -low), min(h, h - low))
    votes = {}
    for y in shown:
        for x in range(w):
            k = (rows[y + low][x], px[y * w + x])
            votes[k] = votes.get(k, 0) + 1
    best = {}
    for (rgb, i), n in votes.items():
        if n > best.get(rgb, (None, -1))[1]:
            best[rgb] = (i, n)
    colour_of = {rgb: i for rgb, (i, _) in best.items()}
    # two kinds of difference the drawing does not try to reproduce: the grey pixel VICE draws
    # where a colour register changes within a line, and the first pixels after a mid-line change
    # of mode, scroll, character base or video bank, where the chip's own delays apply
    dots, switches = set(), {}
    for line, cyc, a, v in F["writes"]:
        if not 16 <= line < 16 + h:
            continue
        if 0xD020 <= a <= 0xD02E:
            dots.add((line - 16, 8 * (cyc - 13)))
        elif a in (0xD011, 0xD016, 0xD018, 0xDD00, 0xDD02):
            switches.setdefault(line - 16, []).append(8 * (cyc - 13))
    bad, grey, near, unseen, per_line, out = 0, 0, 0, 0, {}, []
    for y in range(h):
        for x in range(w):
            if y not in shown:
                unseen += 1; out.append((0, 64, 255)); continue
            rgb = rows[y + low][x]
            if colour_of[rgb] == px[y * w + x]:
                out.append(tuple(v // 3 for v in rgb)); continue
            if (y, x) in dots:
                grey += 1; out.append((255, 255, 0)); continue
            if any(0 <= x - s < 16 for s in switches.get(y, [])):
                near += 1; out.append((255, 160, 0)); continue
            bad += 1; per_line[y + 16] = per_line.get(y + 16, 0) + 1
            out.append((255, 0, 64))
    diff = os.path.splitext(frame_path)[0] + "-diff.png"
    write_png(diff, w, h, out)
    if not quiet:
        if low:
            n, s = abs(low), "s" if abs(low) > 1 else ""
            print(f"the emulator's picture sits {n} line{s} {'lower' if low > 0 else 'higher'} than the frame: "
                  f"its frame ended on line {cap.get('frame_ended_on_line')}, not 0, because its line counter "
                  "is out of step with the beam (kit/skills/c64/tool-vice-mcp/workarounds.md, "
                  f"pause-at-instruction). Each line of the drawing is compared with the picture's line {n} "
                  f"{'below' if low > 0 else 'above'} it; the drawing's {'last' if low > 0 else 'first'} "
                  f"{'line has' if n == 1 else f'{n} lines have'} none, and {'is' if n == 1 else 'are'} not compared")
        print(f"{w * h - unseen - bad - grey - near} of {w * h - unseen} pixels match the emulator's picture; {bad} differ"
              + (f"; {grey} are VICE's grey dot where a colour register changed mid-line" if grey else "")
              + (f"; {near} are within 16 pixels of a mid-line change of mode, scroll or memory, "
                 f"which the drawing does not follow to the pixel" if near else "")
              + f" ({diff}: differences red, grey dots yellow, mode changes orange"
              + (", lines not compared blue)" if unseen else ")"))
        if per_line:
            worst = sorted(per_line.items(), key=lambda kv: -kv[1])[:12]
            print("  lines that differ most: " + ", ".join(f"{l}: {n}" for l, n in worst))
            # A picture that sits a line or two off differs only along edges. capture measures
            # the known cause, the emulator's line counter out of step, as picture_lines_low;
            # a frame file from before it did has none. Say so, rather than send anyone after
            # the drawing.
            for dy in (-2, -1, 1, 2):
                d = low + dy
                off = sum(1 for y in range(max(0, -d), min(h, h - d)) for x in range(w)
                          if colour_of.get(rows[y + d][x], -1) != px[y * w + x] and (y, x) not in dots
                          and not any(0 <= x - s < 16 for s in switches.get(y, [])))
                if off == 0:
                    print(f"  the emulator's picture sits {abs(d)} line{'s' if abs(d) > 1 else ''} "
                          f"{'lower' if d > 0 else 'higher'} than the drawing, and there it matches at every "
                          "pixel the drawing models: the picture is offset, not the drawing wrong. "
                          + ("The frame file is older than capture's measure of the offset; capture it again"
                             if "picture_lines_low" not in cap else
                             f"Capture measured {low}, so something other than the line counter moved it"))
                    break
        if meta["romReads"] and not F.get("charrom"):
            print("  the frame shows the character ROM, which the frame file does not hold: those glyphs are blank")
    return bad


def trim(frame_path, out_path):
    """The frame with only the RAM the drawing reads, and no character ROM: the excerpt a page embeds."""
    F = json.load(open(frame_path))
    meta, _, reads = render(frame_path)
    ram = bytearray(0x10000)
    for r in F["ram"]:
        b = base64.b64decode(r["b"]); ram[r["a"]:r["a"] + len(b)] = b
    F["ram"] = [{"a": lo, "b": base64.b64encode(bytes(ram[lo:hi + 1])).decode()} for lo, hi in reads]
    F.pop("charrom", None)
    with open(out_path, "w") as f:
        json.dump(F, f, separators=(",", ":"))
    kept = sum(hi - lo + 1 for lo, hi in reads)
    print(f"wrote {out_path}: {kept} bytes of RAM in {len(reads)} runs, {os.path.getsize(out_path) // 1024} KB"
          + ("; it shows the character ROM, which a page cannot embed" if meta["romReads"] else ""))


# --- the kit's own test ------------------------------------------------------------
# One frame with a split of every kind the renderer models, band by band. Each band waits for
# its raster line and makes its writes one after another, so some land mid-line, which is part
# of the test: the capture records each write's cycle and the drawing has to honour it.
BANDS = [
    (8, [(0xD011, 0x1B), (0xD016, 0x08), (0xD018, 0x18), (0xDD00, 0x03), (0xD020, 6), (0xD021, 0),
         (0xD015, 0xFF), (0xD010, 0x08), (0xD017, 0x02), (0xD01D, 0x02), (0xD01C, 0x02), (0xD01B, 0x04),
         (0xD025, 2), (0xD026, 7),
         (0xD000, 40), (0xD001, 60), (0xD027, 1), (0x07F8, 0xC0),       # sprite 0, used twice
         (0xD002, 90), (0xD003, 150), (0xD028, 5),                      # 1: expanded, multicolour
         (0xD004, 200), (0xD005, 195), (0xD029, 3),                     # 2: behind the text
         (0xD006, 330 - 256), (0xD007, 80), (0xD02A, 4),                # 3: X past 255, under the border
         (0xD008, 10), (0xD009, 100), (0xD02B, 7),                      # 4: under the left border
         (0xD00A, 180), (0xD00B, 40), (0xD02C, 8),                      # 5: across the top border's edge
         (0xD00C, 120), (0xD00D, 6), (0xD02D, 13),                      # 6 and 7: Y under 56, so each shows
         (0xD00E, 250), (0xD00F, 20), (0xD02E, 2)]),                    # twice: at the top and 256 lines down
    (70, [(0xD021, 11)]),
    (74, [(0xD016, 0x0D)]),                                            # X scroll 5 alone
    (77, [(0xD016, 0x1D)]),                                            # multicolour on, scroll held
    (80, [(0xD016, 0x0D)]),                                            # and off again
    (83, [(0xD016, 0x08)]),
    (90, [(0xD016, 0x1B), (0xD022, 2), (0xD023, 5)]),                  # multicolour text, X scroll 3
    (100, [(0xD001, 120), (0xD000, 60), (0x07F8, 0xC3), (0xD027, 14), (0xD01C, 0x03)]),  # sprite 0 again
    (114, [(0xD011, 0x5B), (0xD016, 0x08), (0xD022, 4), (0xD023, 5), (0xD024, 6)]),       # extended colour
    (138, [(0xDD00, 0x02), (0xD018, 0x18), (0xD011, 0x3B)]),          # bank 1: bitmap $6000, matrix $4400
    (162, [(0xD016, 0x18)]),                                            # multicolour bitmap
    (186, [(0xDD00, 0x03), (0xD011, 0x1B), (0xD016, 0x07), (0xD018, 0x14)]),  # ROM font, 38 columns, X 7
    (210, [(0xD011, 0x1C), (0xD018, 0x18), (0xD016, 0x08)]),          # Y scroll 4: the bad lines move
    (230, [(0xD020, 2), (0xD021, 9)]),                                  # colours changed mid-line
    (249, [(0xD011, 0x14)]),                                            # 24 rows here opens the borders
    (290, [(0xD011, 0x1B)]),
]


def test_program():
    src = ["        sei", "        lda #$35", "        sta $01"]
    for n, (line, writes) in enumerate(BANDS):
        src += [f"w{n}:     bit $d011", f"        {'bpl' if line > 255 else 'bmi'} w{n}",
                "        lda $d012", f"        cmp #{line & 0xFF}", f"        bne w{n}"]
        for a, v in writes:
            src += [f"        lda #{v & 0xFF}", f"        sta ${a:04x}"]
    src += ["        jmp w0"]
    from asm import assemble
    return assemble("\n".join(src), 0xC000)[0]


def test_memory():
    """(address, bytes) to write before the program starts: screens, fonts, a bitmap, sprites."""
    shapes = bytes((k * 29 + i * 13 ^ (0xFF if i % 9 < 2 else 0)) & 0xFF for k in range(16) for i in range(64))
    return [
        (0x0400, bytes((r * 40 + c) & 0xFF for r in range(25) for c in range(40))),
        (0x2000, bytes((n * 37 + r * 91 ^ (0x81 if r in (0, 7) else 0)) & 0xFF for n in range(256) for r in range(8))),
        (0x3000, shapes), (0x3FFF, b"\xAA"),
        (0x4400, bytes((r * 40 + c) * 7 & 0xFF for r in range(25) for c in range(40))),
        (0x47F8, bytes(range(0x40, 0x48))), (0x5000, shapes),
        (0x6000, bytes((i * 73 + (i >> 3) * 5) & 0xFF for i in range(8000))), (0x7FFF, b"\x55"),
        (0xD800, bytes((r + c * 3) & 15 for r in range(25) for c in range(40))),
    ]


def test(keep=False):
    """Run the kit's test program, capture a frame of it, draw it and compare. True if it passes."""
    from vice import poke
    m = Machine()
    for c in m.j("vice_checkpoint_list")["checkpoints"]:
        m.j("vice_checkpoint_delete", {"checkpoint_num": c["checkpoint_num"]})
    m.j("vice_machine_config_set", {"resources": {"WarpMode": 0}})
    m._call(m.rpc, "vice_machine_reset", {"mode": "hard", "run_after": True})
    m._call(m.rpc, "vice_execution_run", {})        # a machine paused before the reset stays paused
    for _ in range(100):
        if bytes((0x12, 0x05, 0x01, 0x04, 0x19, 0x2E)) in m.read(0x0400, 1000, "cpu"):
            break
        time.sleep(0.1)
    else:
        raise SystemExit("no READY. prompt within 10 s of a hard reset; is the machine running?")
    m.pause()
    for a, data in test_memory():
        for o in range(0, len(data), 4096):
            poke(m.rpc, a + o, data[o:o + 4096])
    poke(m.rpc, 0xC000, test_program())
    m.j("vice_registers_set", {"register": "PC", "value": 0xC000})
    m._call(m.rpc, "vice_execution_run", {})
    time.sleep(0.5)
    out = os.path.join(ROOT, "tools", "logs", "frame-test")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, "test.json")
    f = capture(path, os.path.join(out, "test.png"))
    c = f["capture"]
    print(f"captured the test frame: {len(f['writes'])} writes, the beam's position known "
          + ("to the cycle" if not c['phase_cycles_uncertain'] else f"to within {c['phase_cycles_uncertain'] + 1} cycles")
          + f", the writes {'account for' if c['writes_account_for_end_state'] else 'DO NOT account for'} "
          f"the registers at the end")
    if len(f["writes"]) < len(BANDS):            # every band changes a register: fewer writes means
        print(f"FAIL: {len(f['writes'])} writes captured, at least {len(BANDS)} expected: "   # the program
              "the test program did not run (was the machine left paused?)")                 # never ran
        return False
    bad = compare(path)
    if bad == 0 and not keep:                    # a failure keeps its files, to be looked at
        for name in ("test.json", "test.png", "test-diff.png"):
            if os.path.exists(os.path.join(out, name)):
                os.remove(os.path.join(out, name))
    print("PASS" if bad == 0 else f"FAIL: {bad} pixels differ; kept in {out}")
    return bad == 0


if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
    elif argv[0] == "test":
        sys.exit(0 if test("--keep" in argv) else 1)
    elif argv[0] == "compare":
        sys.exit(1 if compare(argv[1], argv[2] if len(argv) > 2 else None) else 0)
    elif argv[0] == "trim":
        trim(argv[1], argv[2])
    elif argv[0] == "capture":
        f = capture(argv[1], os.path.splitext(argv[1])[0] + ".png")
        c = f["capture"]
        print(f"wrote {argv[1]}: {len(f['writes'])} writes; the beam's position known "
              + ("to the cycle" if not c['phase_cycles_uncertain'] else f"to within {c['phase_cycles_uncertain'] + 1} cycles")
              + f"; the writes {'account for' if c['writes_account_for_end_state'] else 'DO NOT account for'} "
              f"the registers at the end; {c['ram_bytes_changed_during_frame']} bytes of RAM and "
              f"{c['colour_cells_changed_during_frame']} colour cells changed during the frame")
        if c["picture_lines_low"]:
            n = abs(c["picture_lines_low"])
            print(f"  the emulator's picture of it sits {n} line{'s' if n > 1 else ''} "
                  f"{'low' if c['picture_lines_low'] > 0 else 'high'}: its line counter is out of step with the "
                  "beam. The frame file is right, and compare allows for the offset; every screenshot of this "
                  "machine state is offset the same way, and so is every snapshot saved from it "
                  "(kit/skills/c64/tool-vice-mcp/workarounds.md, pause-at-instruction)")
