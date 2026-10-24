#!/usr/bin/env python3
"""One frame of the screen, recorded so that a page can draw it and a test can check the drawing.

A screen split by raster interrupts changes the video chip's registers, and often the sprite
pointers, several times a frame, so one read of them draws the wrong picture. This records
one whole frame of the running machine: the registers as the frame begins, then every write
to the video chip, to CIA 2's port A (the video bank) and to any sprite pointer, each with the
raster line and cycle it happened on, and the RAM and colour RAM as the frame began. A
register's value is as the chip reads it back after the store, so its unused bits read as 1:
$D01A written as $01 is recorded as $F1, and $D018 always has bit 0 set. Quote what the game
writes from the instruction that stores it.
site/lib/c64.js draws it (C64.renderFrame), line by line with the state in force; `compare`
checks that drawing against the emulator's own picture of the same frame.

Usage:
  frame.py capture <out.json> [--watch $lo-$hi ...]   the next whole frame of the machine as it
                                         stands, and the emulator's picture of it beside it
                                         (<out>.png). Writes to RAM are recorded only to the sprite
                                         pointers: --watch adds a range the game rewrites while the
                                         beam draws (a character set changed under a split, then
                                         changed back), which ram_bytes_changed_during_frame cannot
                                         see. compare shows the need: characters drawn wrong in a
                                         band of lines
  frame.py compare <frame.json> [<shot.png>]   draw it with site/lib/c64.js and count the
                                         pixels that differ from the picture, line by line;
                                         writes <frame>-diff.png
  frame.py trim <frame.json> <out.json>  keep only the memory the drawing reads, for a page
  frame.py test [--keep]                 the kit's own test: a program with a split of every
                                         kind, captured, drawn and compared, then dma, collide and irq. It resets
                                         the machine: not during a game you mean to keep. It sets
                                         the video chip its standard is checked on (the 8565 for
                                         PAL), which a switch of standard changes
  frame.py dma [--record]                the cycles the video chip takes from the processor, on
                                         bad lines and for sprites, measured case by case and
                                         compared with kit/c64/fixtures/vic-dma.json, or written
                                         to it with --record. It resets the machine too
  frame.py collide [--record]            the sprite collisions ($D01E, $D01F), scene by scene and
                                         read to the cycle, compared with
                                         kit/c64/fixtures/vic-collide.json, or written to it with
                                         --record. It resets the machine too
  frame.py irq [--record]                the collision interrupts ($D019 bits 2 and 1): how often a
                                         handler is interrupted, for each place its read falls,
                                         compared with kit/c64/fixtures/vic-collide-irq.json, or
                                         written to it with --record. It resets the machine too
  frame.py nest [--record]               interrupts taken inside a handler that clears I: each one's
                                         kind and line, compared with kit/c64/fixtures/vic-nest.json,
                                         or written to it with --record. It resets the machine too

Needs the emulator (`tools.py vice`) for capture and test, and a JavaScript runtime for the
drawing: node, or on macOS the system's own JavaScriptCore. The frame file holds a copy of the
game's memory, so it stays in the game's work/ folder; `trim` makes the excerpt a page embeds.
"""
import base64, json, os, re, shutil, struct, subprocess, sys, tempfile, time, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
C64JS = os.path.join(ROOT, "site", "lib", "c64.js")
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))   # the 6502's assembler, shared

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
        """The raster line and the registers $D000-$D02E, read from the chip through the io bank.
        vice_vicii_get_state is not used: v3.13.2 reads its registers wherever the processor
        reads $D000, so it gave the RAM there with an Ultimax cartridge attached (the power-on
        pattern, line 256; Clowns, 11 October 2026) and with the I/O banked out ($01 = $34:
        zeros and line 0, which agreed with the chip's line at the top of the frame; Space Rogue,
        15 October 2026). Reported upstream as barryw/vice-mcp#33 (17 October 2026)."""
        io = self.read(0xD000, 47, "io")
        return (io[0x11] & 0x80) << 1 | io[0x12], list(io)

    def ultimax(self):
        """The 4 KB the video chip reads at $3000-$3FFF of every bank when an Ultimax cartridge
        (GAME held low, EXROM not: Commodore's MAX Machine games) is attached, or None: the
        cartridge's ROM at $F000-$FFFF, which the processor then sees in place of the KERNAL.
        With no cartridge VICE's cart bank reads what the processor sees, so a game that banks the
        KERNAL out ($01 = $35) shows its own RAM there in both: that is RAM, not a cartridge (it
        drew a game's sprites at $7B00 from its RAM at $FB00, 14 October 2026)."""
        cpu = self.read(0xF000, 0x1000, "cpu")
        if cpu == self.read(0xF000, 0x1000, "cart") and cpu != self.read(0xF000, 0x1000, "rom") \
                and cpu != self.read(0xF000, 0x1000, "ram"):
            return cpu
        return None


# registers that change by themselves (the raster, the light pen, the interrupt latch, the
# collisions): never logged as writes; $D011's bit 7 reads the raster's ninth bit
SELF_CHANGING = {0x12, 0x13, 0x14, 0x19, 0x1E, 0x1F}


def io_visible(port):
    """Whether the CPU sees the I/O chips at $D000, from its port's direction and data bytes."""
    ddr, data = port
    eff = (data & ddr | ~ddr & 7) & 7              # lines set as inputs read high
    return bool(eff & 4 and eff & 3)


def capture(out, shot=None, watch=()):
    """Record the next whole frame. Returns the frame as a dict and writes it to out. watch: more
    (lo, hi) ranges of RAM whose writes are recorded, as the sprite pointers' are."""
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
        ultimax = m.ultimax()                        # the cartridge's, which a page may embed
        ranges = [(0xD000, 0xD3FF, "vic"), (0xDD00, 0xDDFF, "cia2")] + \
                 [(b * 0x4000 + s * 0x400 + 0x3F8, b * 0x4000 + s * 0x400 + 0x3FF, "pointers")
                  for b in range(4) for s in range(16)] + [(lo, hi, "ram") for lo, hi in watch]
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
    # line ahead (pause() in kit/c64/vice.py, the pause-at-instruction check). Then every
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
    if ultimax:
        frame["ultimax"] = base64.b64encode(ultimax).decode()
    with open(out, "w") as f:
        json.dump(frame, f, separators=(",", ":"))
    return frame


def phase(samples, lines, cycles):
    """The stopwatch's origin in cycles from the top of the frame, and how many other values fit.

    Each sample says the beam was on raster line L at stopwatch s, so the origin o lies in
    [L*cycles - s, L*cycles + cycles - 1 - s]; the samples' lines are unwrapped past the
    frame's last line in order. The video chip resets its counter to 0 a cycle later than it
    steps the others, so the first cycle of line 0 still reads as the last line.

    The wraps are counted from the stopwatch, not from the line going down: two samples a whole
    frame or more apart (a stop that ran on past a frame boundary) show no drop in the line, and
    counting drops then put every later sample a frame out (seen on 2 October 2026 in a game's
    room with no raster interrupt of its own)."""
    if not samples:
        raise ValueError("phase needs at least one beam sample")
    lo, hi = -10**9, 10**9
    s0, L0 = samples[0]
    total = lines * cycles
    for s, L in samples:
        wraps = round(((s - s0) - (L - L0) * cycles) / total)
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
say(JSON.stringify({ w: r.w, h: r.h, line0: r.line0, romReads: r.romReads }));
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
    line0, lines = meta.get("line0", 16), F.get("lines", 312)
    # a write's cycle is known only as well as the capture knew the beam (phase_cycles_uncertain):
    # the window after a mid-line change widens by eight pixels for each cycle of doubt
    near_px = 16 + 8 * (cap.get("phase_cycles_uncertain") or 0)
    dots, switches = set(), {}
    for line, cyc, a, v in F["writes"]:
        y = (line - line0) % lines            # the picture's line (NTSC's last lines wrap past 0)
        if not 0 <= y < h:
            continue
        if 0xD020 <= a <= 0xD02E:
            dots.add((y, 8 * (cyc - 13)))
        elif a in (0xD011, 0xD016, 0xD018, 0xDD00, 0xDD02):
            switches.setdefault(y, []).append(8 * (cyc - 13))
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
            if any(0 <= x - s < near_px for s in switches.get(y, [])):
                near += 1; out.append((255, 160, 0)); continue
            bad += 1; per_line[(y + line0) % lines] = per_line.get((y + line0) % lines, 0) + 1
            out.append((255, 0, 64))
    diff = os.path.splitext(frame_path)[0] + "-diff.png"
    write_png(diff, w, h, out)
    if not quiet:
        if low:
            n, s = abs(low), "s" if abs(low) > 1 else ""
            print(f"the emulator's picture sits {n} line{s} {'lower' if low > 0 else 'higher'} than the frame: "
                  f"its frame ended on line {cap.get('frame_ended_on_line')}, not 0, because its line counter "
                  "is out of step with the beam (pause() in kit/c64/vice.py, the "
                  f"pause-at-instruction check). Each line of the drawing is compared with the picture's line {n} "
                  f"{'below' if low > 0 else 'above'} it; the drawing's {'last' if low > 0 else 'first'} "
                  f"{'line has' if n == 1 else f'{n} lines have'} none, and {'is' if n == 1 else 'are'} not compared")
        print(f"{w * h - unseen - bad - grey - near} of {w * h - unseen} pixels match the emulator's picture; {bad} differ"
              + (f"; {grey} are VICE's grey dot where a colour register changed mid-line" if grey else "")
              + (f"; {near} are within {near_px} pixels of a mid-line change of mode, scroll or memory, "
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
                          and not any(0 <= x - s < near_px for s in switches.get(y, [])))
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
    (8, [(0xD011, 0x1F), (0xD016, 0x08), (0xD018, 0x18), (0xDD00, 0x03), (0xD020, 6), (0xD021, 0),
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
    # VSP. Line 8's Y scroll of 7 keeps lines 48-50 from being bad lines. On line 50, $12 lands
    # inside the line (the first two writes take twelve cycles) and starts a bad line late, which
    # moves every row below sideways, and $1B makes line 51 an ordinary bad line; test() checks
    # that the write did land late. The borders are open there, so line 50 shows the blank font
    # at $2800, as a game hides that line: the drawing does not model its characters
    (50, [(0xD018, 0x1A), (0xD021, 0), (0xD011, 0x12), (0xD011, 0x1B), (0xD018, 0x18)]),
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


def test_bands(lines=312):
    """The bands for a chip of this many lines. NTSC's 263 lines have no line 290: the band that
    closes the borders again moves to five lines before the frame's end, still after line 251."""
    return [b if b[0] < lines else (lines - 5, b[1]) for b in BANDS]


def test_program(lines=312):
    src = ["        sei", "        lda #$35", "        sta $01"]
    for n, (line, writes) in enumerate(test_bands(lines)):
        src += [f"w{n}:     bit $d011", f"        {'bpl' if line > 255 else 'bmi'} w{n}",
                "        lda $d012", f"        cmp #{line & 0xFF}", f"        bne w{n}"]
        for a, v in writes:
            src += [f"        lda #{v & 0xFF}", f"        sta ${a:04x}"]
    src += ["        jmp w0"]
    from asm6502 import assemble
    return assemble("\n".join(src), 0xC000)[0]


def test_memory():
    """(address, bytes) to write before the program starts: screens, fonts, a bitmap, sprites."""
    shapes = bytes((k * 29 + i * 13 ^ (0xFF if i % 9 < 2 else 0)) & 0xFF for k in range(16) for i in range(64))
    return [
        (0x0400, bytes((r * 40 + c) & 0xFF for r in range(25) for c in range(40))),
        (0x2000, bytes((n * 37 + r * 91 ^ (0x81 if r in (0, 7) else 0)) & 0xFF for n in range(256) for r in range(8))),
        (0x2800, bytes(0x800)),                                         # the blank font for line 50
        (0x3000, shapes), (0x3FFF, b"\xAA"),
        (0x4400, bytes((r * 40 + c) * 7 & 0xFF for r in range(25) for c in range(40))),
        (0x47F8, bytes(range(0x40, 0x48))), (0x5000, shapes),
        (0x6000, bytes((i * 73 + (i >> 3) * 5) & 0xFF for i in range(8000))), (0x7FFF, b"\x55"),
        (0xD800, bytes((r + c * 3) & 15 for r in range(25) for c in range(40))),
    ]


# The video chip, by VICE's VICIIModel number, and the one each standard is checked on. x64sc
# starts as a PAL C64C, whose chip is the 8565; a switch of standard takes the older chip of the
# new one, so NTSC and back to PAL leaves a 6569. On 10 October 2026 (v3.13.2) the 6569 drew one
# pixel of the test frame differently, and the test failed. The MCP server cannot set the model,
# so vicii() asks VICE's monitor (kit/c64/codemap.py).
VICII = {0: "6569", 1: "8565", 2: "6569R1", 3: "6567", 4: "8562", 5: "6567R56A", 6: "6572"}
VICII_CHECKED = {"PAL": 1, "NTSC": 3, "NTSC-OLD": 5, "PAL-N": 6}


def vicii(m):
    """Set the video chip to the one its standard is checked on, and say which it is.

    One command to a connection: the monitor answers only a running machine, and right after
    vice_execution_run it leaves after the first command it reads. A command left unanswered when
    the connection closed (several sent at once, or one sent to a machine stopped over MCP) set
    the monitor resending its prompt to the closed connection and refusing every new one, until
    the emulator was restarted."""
    from codemap import monitor

    def model():
        r = re.search(r"VICIIModel=(\d+)", monitor('resourceget "VICIIModel"'))
        return int(r.group(1)) if r else None

    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    want = VICII_CHECKED.get(std, 1)
    m._call(m.rpc, "vice_execution_run", {})
    was = now = None
    if not m.paused():
        try:
            was = now = model()
            if was is not None and was != want:
                monitor(f'resourceset "VICIIModel" "{want}"')
                now = model()
        except OSError:
            pass
    if now != want:
        print(f"the video chip: {VICII.get(now, 'unknown')}, and VICE's monitor did not set it; the "
              f"test is checked on the {VICII[want]}, which a switch of standard can change")
    elif was != want:
        print(f"the video chip: the {VICII[want]}, set from the {VICII.get(was, was)} a switch of standard left")
    else:
        print(f"the video chip: the {VICII[want]}")


def fresh():
    """A machine just reset, stopped at the READY. prompt, with no checkpoints and no warp, and the
    video chip its standard is checked on."""
    m = Machine()
    for c in m.j("vice_checkpoint_list")["checkpoints"]:
        m.j("vice_checkpoint_delete", {"checkpoint_num": c["checkpoint_num"]})
    m.j("vice_machine_config_set", {"resources": {"WarpMode": 0}})
    vicii(m)
    m._call(m.rpc, "vice_machine_reset", {"mode": "hard", "run_after": True})
    m._call(m.rpc, "vice_execution_run", {})        # a machine paused before the reset stays paused
    for _ in range(100):
        if bytes((0x12, 0x05, 0x01, 0x04, 0x19, 0x2E)) in m.read(0x0400, 1000, "cpu"):
            break
        time.sleep(0.1)
    else:
        raise SystemExit("no READY. prompt within 10 s of a hard reset; is the machine running?")
    m.pause()
    return m


def late_bad_lines(F):
    """(line, cycle) of each write to $D011 that starts a bad line after the chip's check in cycle
    14 (VSP): on a line from $30 to $F7, a Y scroll that matches the line where the one before
    did not. A write in cycle 13 still meets that check, and one after cycle 53 leaves the line
    no fetch."""
    d011, out = F["vic"][0x11], []
    for line, cyc, a, v in F["writes"]:
        if a != 0xD011:
            continue
        if 0x30 <= line <= 0xF7 and 14 <= cyc <= 53 and (line & 7) == (v & 7) != (d011 & 7):
            out.append((line, cyc))
        d011 = v
    return out


def test(keep=False):
    """Run the kit's test program, capture a frame of it, draw it and compare; then measure the
    cycles the video chip takes and the sprite collisions and compare them with their fixtures
    (dma, collide) and the collision interrupts with theirs (irq). True if all four pass."""
    from vice import poke
    m = fresh()
    for a, data in test_memory():
        for o in range(0, len(data), 4096):
            poke(m.rpc, a + o, data[o:o + 4096])
    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    lines = STANDARDS.get(std, STANDARDS["PAL"])[0]
    print(f"the machine is {std}: {lines} lines")
    poke(m.rpc, 0xC000, test_program(lines))
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
    if len(f["writes"]) < len(test_bands(lines)):   # every band changes a register: fewer writes means
        print(f"FAIL: {len(f['writes'])} writes captured, at least {len(test_bands(lines))} expected: "   # the program
              "the test program did not run (was the machine left paused?)")                 # never ran
        return False
    late = late_bad_lines(f)
    if not late:
        print("FAIL: no write to $D011 started a bad line late, so the frame does not test VSP: "
              "the band on line 50 should land its $12 in cycles 14-53 of that line; "
              + ", ".join(f"line {w[0]} cycle {w[1]}: ${w[3]:02X}" for w in f["writes"]
                          if w[2] == 0xD011 and 48 <= w[0] <= 51))
        return False
    print("VSP: " + ", ".join(f"a bad line started late on line {y}, by a write in cycle {cyc}" for y, cyc in late))
    bad = compare(path)
    if bad == 0 and not keep:                    # a failure keeps its files, to be looked at
        for name in ("test.json", "test.png", "test-diff.png"):
            if os.path.exists(os.path.join(out, name)):
                os.remove(os.path.join(out, name))
    print("the picture: " + ("PASS" if bad == 0 else f"FAIL: {bad} pixels differ; kept in {out}"))
    held = dma_check()
    hit = collide_check()
    irq = irq_check()
    nest = nest_check()
    print("PASS" if bad == 0 and held and hit and irq and nest else "FAIL")
    return bad == 0 and held and hit and irq and nest


# --- the cycles the video chip takes from the processor -----------------------------------
# On a bad line the video chip reads a row of the screen and its colours, and on each line that
# shows a sprite it reads the sprite's pointer and three of its bytes. While it reads, and for
# three cycles before, it holds the processor. dma_measure() finds where and for how long: a
# program runs a stream of NOPs, each cycle of which is a read, with the chip set up one case
# at a time, and the stopwatch times each NOP by single steps. A NOP that took 2 + n cycles was
# held for n. Whether it was held from its first cycle or its second is told apart by a pass
# entered one cycle later, so each case runs until its passes agree on one cycle. A stream of
# stores across a bad line shows what a write does there. A whole frame of NOPs, timed at its
# two ends, gives what a frame costs. kit/c64/fixtures/vic-dma.json is the record: `test` checks
# the emulator against it, and kit/c64/test_machine_dma.js checks machine.js's model (its option
# dma) against it, with the same program.
DMA_FIXTURE = os.path.join(HERE, "fixtures", "vic-dma.json")
DMA_ORG, DMA_TABLE, DMA_SLIDE, DMA_NOPS, DMA_PATCH = 0xC000, 0xC800, 0x1000, 9800, 4000
FRAME_LINE = 280          # the whole-frame slide starts here: no bad line, and a frame later it
                          # has passed every line the chip fetches on
# A case is the chip as the program sets it, on every pass, from the table at DMA_TABLE:
#   d011     $D011, written at the end of each pass, so in force from the top of the next frame
#            ($0B, the default, has the display off; $1B on, with the vertical scroll at 3)
#   sprites  $D015; expand $D017; y every sprite's Y (their X is 100)
#   line     where the window cases' slide starts: the pass waits for it
#   patch    $D011 written by the whole-frame slide DMA_PATCH bytes in, partway down the frame
DMA_WINDOWS = [{"name": "a bad line", "d011": 0x1B, "line": 58}] + \
              [{"name": f"sprite {n}", "sprites": 1 << n, "y": 96, "line": 101} for n in range(8)] + \
              [{"name": "sprite 0 on the line its Y names", "sprites": 0x01, "y": 101, "line": 101},
               {"name": "sprites 0 and 2", "sprites": 0x05, "y": 96, "line": 101},
               {"name": "all eight sprites", "sprites": 0xFF, "y": 96, "line": 101}]
DMA_STORES = {"name": "a bad line, the processor storing", "d011": 0x1B, "line": 58}
DMA_FRAMES = [
    {"name": "the display on", "d011": 0x1B},
    {"name": "the display on, the vertical scroll 0", "d011": 0x18},
    {"name": "the display on, the vertical scroll 7", "d011": 0x1F},
    {"name": "the display off", "d011": 0x0B},
    {"name": "the display on, turned off partway down", "d011": 0x1B, "patch": 0x0B},
    {"name": "the display off, turned on partway down", "d011": 0x0B, "patch": 0x1B},
    {"name": "sprite 0, the display off", "sprites": 0x01, "y": 100},
    {"name": "sprite 0, the display on", "d011": 0x1B, "sprites": 0x01, "y": 100},
    {"name": "sprite 0 stretched (Y-expanded), the display off", "sprites": 0x01, "expand": 0x01, "y": 100},
    {"name": "sprite 0 stretched (Y-expanded), the display on", "d011": 0x1B, "sprites": 0x01, "expand": 0x01,
     "y": 100},
    {"name": "all eight sprites, the display off", "sprites": 0xFF, "y": 100},
    {"name": "all eight sprites, the display on", "d011": 0x1B, "sprites": 0xFF, "y": 100},
]
NOP, STA_ZP = (b"\xEA", 2), (b"\x85\x02", 3)      # an instruction's bytes and its cycles
# The slide's first three bytes, by the cycles they take (NOPs, BIT $EA, LDA $EAEA): a pass picks
# one once it has reached the slide, so that its fill starts in the cycle wanted.
ENTRIES = {6: b"\xEA\xEA\xEA", 5: b"\x24\xEA\xEA", 4: b"\xAD\xEA\xEA"}
FRAME_CYCLES = 312 * 63


def dma_program():
    """(code, labels): each pass sets the chip from the table, waits for the table's line, then
    jumps to the slide at DMA_SLIDE, DMA_NOPS bytes that end in a jump back to frame."""
    from asm6502 import assemble
    return assemble(f"""
            sei
            lda #$35
            sta $01
    frame:  lda ${DMA_TABLE:04x}
            sta $d011
            lda ${DMA_TABLE + 1:04x}
            sta $d015
            lda ${DMA_TABLE + 2:04x}
            sta $d017
            ldx #15
    pos:    lda ${DMA_TABLE + 5:04x},x
            sta $d000,x
            dex
            bpl pos
            lda #0
            sta $d010
    poll:   lda $d011
            and #$80
            cmp ${DMA_TABLE + 3:04x}
            bne poll
            lda $d012
            cmp ${DMA_TABLE + 4:04x}
            bne poll
            jmp ${DMA_SLIDE:04x}
    """, DMA_ORG)


def dma_table(case, line):
    """The table's bytes for a case: $D011, $D015, $D017, the line to wait for (bit 8, then
    the low byte), then $D000-$D00F."""
    return bytes([case.get("d011", 0x0B), case.get("sprites", 0), case.get("expand", 0),
                  0x80 if line > 255 else 0, line & 255] + [100, case.get("y", 0)] * 8)


def _stop_at(m, a, timeout=5.0):
    """From a stop, run to the instruction at a and stop before it. The stopwatch there."""
    n = m.j("vice_checkpoint_add", {"start": f"${a:04X}", "exec": True, "stop": True})["checkpoint_num"]
    try:
        m._call(m.rpc, "vice_execution_run", {})
        t0 = time.time()
        while not (any(c["checkpoint_num"] == n and c["hit_count"] for c in m.j("vice_checkpoint_list")["checkpoints"])
                   and m.paused()):
            if time.time() - t0 > timeout:
                raise RuntimeError(f"the program did not reach ${a:04X} within {timeout} s")
            time.sleep(0.005)
    finally:
        m.j("vice_checkpoint_delete", {"checkpoint_num": n})
    pc = m.j("vice_registers_get")["PC"]
    if pc != a:
        raise RuntimeError(f"stopped at ${pc:04X}, not at ${a:04X}")
    return m.stopwatch()


def _passes(m, labels, case, line, fill, first, limit=80, held=True, lines=None, tries=8):
    """Passes of a case. fill (an instruction of n cycles) is laid after the entry, which each
    pass picks when it reaches the slide so that pass i's fill starts i cycles later, modulo n,
    than pass 0's; the wait for the line alone would start each pass in the same cycle. Each
    pass stops `first` instructions into the fill and single steps to two instructions past the
    first one held, or `limit` steps with held False. Yields the stopwatch at each instruction
    boundary stepped, and appends (stopwatch, raster line) to lines if given."""
    from vice import poke
    code, n = fill
    _stop_at(m, labels["frame"])                  # out of the slide, so a fill of two-byte
    poke(m.rpc, DMA_TABLE, dma_table(case, line))  # instructions cannot leave it on an operand
    poke(m.rpc, DMA_SLIDE + 3, code * 100)
    try:
        for i in range(tries):
            at = _stop_at(m, DMA_SLIDE)               # the frame is an even number of cycles
            poke(m.rpc, DMA_SLIDE, ENTRIES[next(e for e in ENTRIES if (at + e - i) % n == 0)])
            times = [_stop_at(m, DMA_SLIDE + 3 + len(code) * first)]
            after = None
            while len(times) <= limit and (after is None or len(times) < after + 3):
                if lines is not None:
                    lines.append((times[-1], m.vic()[0]))
                m.j("vice_execution_step", {"count": 1})
                times.append(m.stopwatch())
                if held and after is None and times[-1] - times[-2] > n:
                    after = len(times) - 1
            if held and after is None:
                raise RuntimeError(f"{case['name']}: no instruction was held in {limit} steps")
            yield times
    finally:
        poke(m.rpc, DMA_SLIDE, NOP[0] * (3 + 100 * len(code)))


def _beam(m, labels):
    """The stopwatch's origin from the top of the frame (phase): passes with nothing fetched,
    stepped across the end of line 100, until they pin it to the cycle."""
    samples, spread = [], None
    for _ in _passes(m, labels, {}, 100, NOP, 6, limit=16, held=False, lines=samples):
        o, spread = phase(samples, 312, 63)
        if spread == 0:
            return o
    raise RuntimeError(f"the beam's position stayed uncertain by {spread} cycles")


def _at(p):
    """[line, cycle] of the cycle p cycles from the top of the frame."""
    return [p // 63, p % 63 + 1]


def _window(m, labels, o, case):
    """Where a case holds the processor: [line, cycle] of the first and the last cycle. A NOP
    that took 2 + n cycles was held for n, from its first cycle or its second; each pass
    leaves those two candidates for the first, and the passes run until one is left."""
    first, held = None, set()
    for i, times in enumerate(_passes(m, labels, case, case["line"], NOP, 0)):
        events = [(a, b - a - 2) for a, b in zip(times, times[1:]) if b - a > 2]
        if len(events) != 1:
            raise RuntimeError(f"{case['name']}: {len(events)} NOPs held in one pass, one expected")
        a, n = events[0]
        p = (o + a) % FRAME_CYCLES
        first = {p, p + 1} if first is None else first & {p, p + 1}
        held.add(n)
        if not first or len(held) > 1:
            raise RuntimeError(f"{case['name']}: the passes disagree (held for {sorted(held)} cycles)")
        if len(first) == 1 and i:
            p = first.pop()
            return {"first": _at(p), "last": _at(p + n - 1), "held": n}
    raise RuntimeError(f"{case['name']}: {i + 1} passes left the first cycle held uncertain")


def _stores(m, labels, o, case, window):
    """A stream of STA zero page (read, read, write) across a window, entered in each of its
    three phases. For each: [the first STA held, from the window's first cycle; how long]."""
    w0 = window["first"][0] * 63 + window["first"][1] - 1
    seen = {}
    for times in _passes(m, labels, case, case["line"], STA_ZP, 4, tries=9):
        a, n = next((a, b - a - 3) for a, b in zip(times, times[1:]) if b - a > 3)
        seen[(o + a) % FRAME_CYCLES - w0] = n
        if len(seen) == 3:
            return sorted([k, v] for k, v in seen.items())
    raise RuntimeError(f"{case['name']}: nine passes met the window in {len(seen)} of the three phases")


def _frame(m, labels, case):
    """What a whole frame of NOPs loses: (the cycles held, [line, cycle] of the patch's write)."""
    from vice import poke
    patch = case.get("patch")
    if patch is not None:
        poke(m.rpc, DMA_SLIDE + DMA_PATCH, bytes([0xA9, patch, 0x8D, 0x11, 0xD0]))
    poke(m.rpc, DMA_TABLE, dma_table(case, FRAME_LINE))
    try:
        _stop_at(m, labels["frame"])
        t0 = _stop_at(m, DMA_SLIDE)
        wrote = None
        if patch is not None:
            _stop_at(m, DMA_SLIDE + DMA_PATCH + 2)
            m.j("vice_execution_step", {"count": 1})
            wrote = m.stopwatch() - 1                 # the store's last cycle
        t1 = _stop_at(m, DMA_SLIDE + DMA_NOPS)
    finally:
        poke(m.rpc, DMA_SLIDE + DMA_PATCH, NOP[0] * 5)
    return t1 - t0 - 2 * DMA_NOPS + (4 if patch is not None else 0), wrote


def dma_measure():
    """Measure every case in the emulator. The record, as the fixture holds it."""
    from tools import vice_build
    from vice import poke
    m = fresh()
    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    if std != "PAL":
        raise SystemExit(f"the machine is {std}: the cases are written for PAL's 312 lines of 63 cycles")
    code, labels = dma_program()
    poke(m.rpc, DMA_ORG, code)
    slide = NOP[0] * DMA_NOPS + bytes([0x4C, labels["frame"] & 255, labels["frame"] >> 8])
    for i in range(0, len(slide), 4096):
        poke(m.rpc, DMA_SLIDE + i, slide[i:i + 4096])
    m.j("vice_registers_set", {"register": "PC", "value": DMA_ORG})
    m.j("vice_cycles_stopwatch", {"action": "reset"})
    o = _beam(m, labels)
    out = {"source": "kit/c64/frame.py dma --record", "recorded": time.strftime("%Y-%m-%d"),
           "emulator": f"VICE {m.j('vice_ping').get('version', '?')}, {vice_build()}", "standard": std,
           "program": {"org": DMA_ORG, "code": code.hex(), "frame": labels["frame"], "table": DMA_TABLE,
                       "slide": DMA_SLIDE, "nops": DMA_NOPS, "patch": DMA_PATCH, "frame_line": FRAME_LINE},
           "windows": [], "frames": []}
    for case in DMA_WINDOWS:
        w = dict(case, **_window(m, labels, o, case))
        print(f"{w['name']}: held {w['held']} cycles, line {w['first'][0]} cycle {w['first'][1]} "
              f"to line {w['last'][0]} cycle {w['last'][1]}", flush=True)
        out["windows"].append(w)
    out["stores"] = dict(DMA_STORES, passes=_stores(m, labels, o, DMA_STORES, out["windows"][0]))
    print(f"{DMA_STORES['name']}: " + ", ".join(f"the first STA held began {k:+d} cycles from the window, "
                                                 f"held {n}" for k, n in out["stores"]["passes"]), flush=True)
    for case in DMA_FRAMES:
        held, wrote = _frame(m, labels, case)
        f = dict(case, held=held)
        if wrote is not None:
            f["wrote"] = _at((o + wrote) % FRAME_CYCLES)
        print(f"a frame, {f['name']}: held {held} cycles"
              + (f" ($D011 written on line {f['wrote'][0]})" if wrote is not None else ""), flush=True)
        out["frames"].append(f)
    m._call(m.rpc, "vice_execution_run", {})
    return out


def dma_write(out):
    """The fixture, a case to a line."""
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v)}," for k, v in out.items() if k not in ("windows", "frames")]
    for key in ("windows", "frames"):
        rows = out[key]
        lines += [f' "{key}": ['] + [f"  {json.dumps(r)}" + ("," if i < len(rows) - 1 else "")
                                     for i, r in enumerate(rows)] + [" ]" + ("," if key == "windows" else "")]
    with open(DMA_FIXTURE, "w") as f:
        f.write("\n".join(lines + ["}"]) + "\n")


def dma_check():
    """Measure again and compare with the fixture. True if every case agrees."""
    want = json.load(open(DMA_FIXTURE))
    got = dma_measure()
    bad = []
    for key in ("windows", "frames"):
        if len(want[key]) != len(got[key]):
            bad.append(f"{key}: the fixture has {len(want[key])} cases, frame.py {len(got[key])}")
        for w, g in zip(want[key], got[key]):
            w, g = ({k: v for k, v in r.items() if k != "wrote"} for r in (w, g))   # where the
            if w != g:                                                            # wait left it
                bad.append(f"{g['name']}: the fixture has {w}, the emulator {g}")
    if want["stores"] != got["stores"]:
        bad.append(f"{got['stores']['name']}: the fixture has {want['stores']}, the emulator {got['stores']}")
    for b in bad:
        print("  " + b)
    print(f"the cycles the video chip takes: {'they agree with' if not bad else 'FAIL, they differ from'} "
          f"{os.path.relpath(DMA_FIXTURE, ROOT)} ({want['recorded']}, {want['emulator']})")
    return not bad


# --- the sprite collisions -----------------------------------------------------------------
# The video chip sets a bit in $D01E for each sprite whose pixel meets another sprite's, and in
# $D01F for each whose pixel meets the foreground of the graphics, as the beam draws them; a read
# clears the register. collide_measure() sets up one scene a case, each in the video bank at
# $4000: the screen at $4400 (its sprite pointers at $47F8), the sprite shapes at $4C00, the
# characters at $5000, a bitmap at $6000 and the byte $7FFF the chip shows where no row is
# fetched. Each pass of the program writes the chip's registers from a table, reads both
# registers on one line to clear them, and both again on a later line, and the reads are timed
# by single steps: [line, cycle] of the cycle each read was made in, and what it gave.
# kit/c64/fixtures/vic-collide.json is the record: `test` checks the emulator against it, and
# kit/c64/test_machine_collide.js checks site/lib/collide.js (machine.js's option collide)
# against it, case by case, at the same cycles.
COLLIDE_FIXTURE = os.path.join(HERE, "fixtures", "vic-collide.json")
COLLIDE_ORG, COLLIDE_TABLE = 0xC000, 0xC800
SCREEN, SHAPES, CHARS, BITMAP, IDLE = 0x4400, 0x4C00, 0x5000, 0x6000, 0x7FFF
SOLID, DOT, MC01, MC10 = 0x30, 0x31, 0x32, 0x33     # the sprite shapes, by pointer
# the glyphs: blank, solid, %01010101 rows, %10101010 rows, the left pixel, the top row
BLANK, FULL, G55, GAA, LEFT, TOP = range(6)


def collide_base():
    """The registers $D000-$D02E, [$DD00, $DD02], and memory as [address, bytes], that every
    case starts from: the display on with 25 rows and 40 columns, the Y scroll 3, bank 1, no
    sprite on, a blank screen in white."""
    regs = bytearray(47)
    regs[0x11], regs[0x16], regs[0x18] = 0x1B, 0x08, 0x14
    regs[0x20:0x2F] = bytes([14, 6, 1, 2, 3, 4, 5, 1, 7, 3, 4, 5, 8, 13, 2, 10])[:15]
    shapes = bytes([0xFF] * 63 + [0]) + bytes([0x80] + [0] * 63) + bytes([0x40] + [0] * 63) + bytes([0x80] + [0] * 63)
    glyphs = bytes(8) + bytes([0xFF] * 8) + bytes([0x55] * 8) + bytes([0xAA] * 8) + bytes([0x80] * 8) + bytes([0xFF] + [0] * 7)
    return regs, [0x96, 0x3F], [(SHAPES, shapes), (CHARS, glyphs), (0xD800, bytes([1] * 1000))]


def _sprite(regs, mem, n, x, y, shape):
    """Sprite n on at (x, y), showing shape."""
    regs[2 * n], regs[2 * n + 1] = x & 255, y
    regs[0x10] = regs[0x10] & ~(1 << n) | (x >> 8 & 1) << n
    regs[0x15] |= 1 << n
    mem.append((SCREEN + 0x3F8 + n, bytes([shape])))


def _cell(mem, row, col, code, colour=None):
    mem.append((SCREEN + 40 * row + col, bytes([code])))
    if colour is not None:
        mem.append((0xD800 + 40 * row + col, bytes([colour])))


def collide_cases():
    """The cases: each the base changed, the lines its reads are made on, and a delay before the
    second (the loop count of a DEX, BNE loop) that moves them along their line."""
    out = []

    def case(name, sprites=(), regs=None, mem=(), clear=8, read=300, at=None):
        r, cia2, _ = collide_base()
        m = list(mem)
        for s in sprites:
            _sprite(r, m, *s)
        for k, v in (regs or {}).items():
            r[k] = v
        out.append({"name": name, "regs": bytes(r), "cia2": cia2, "mem": m, "clear": clear, "read": read, "at": at})

    # sprite against sprite, a whole frame
    case("two sprites overlapping", [(0, 100, 100, SOLID), (1, 110, 105, SOLID)])
    case("two sprites side by side, not touching", [(0, 100, 100, SOLID), (1, 124, 100, SOLID)])
    case("two sprites overlapping by one pixel", [(0, 100, 100, SOLID), (1, 123, 100, SOLID)])
    case("two sprites overlapping in the left border", [(0, 0, 100, SOLID), (1, 0, 100, SOLID)])
    case("two sprites overlapping in the top border", [(0, 100, 20, SOLID), (1, 100, 20, SOLID)])
    case("two sprites overlapping at X 420, beyond the right border", [(0, 420, 100, SOLID), (1, 420, 100, SOLID)])
    case("two sprites overlapping at X 500, across the line's wrap", [(0, 500, 100, SOLID), (1, 500, 100, SOLID)])
    case("two sprites at X 505, past the line's end", [(0, 505, 100, SOLID), (1, 505, 100, SOLID)])
    case("two sprites past X 255", [(0, 300, 100, SOLID), (1, 310, 100, SOLID)])
    case("two sprites with Y below 56, met on their second showing", [(0, 100, 20, SOLID), (1, 100, 29, SOLID)],
         clear=260, read=310)
    case("a sprite stretched (X-expanded) meets a dot on its second pixel",
         [(0, 100, 100, DOT), (1, 101, 100, DOT)], regs={0x1D: 0x01})
    case("a sprite stretched (X-expanded) misses a dot past its second pixel",
         [(0, 100, 100, DOT), (1, 102, 100, DOT)], regs={0x1D: 0x01})
    case("a sprite stretched (Y-expanded) meets a dot on its second line",
         [(0, 100, 100, DOT), (1, 100, 101, DOT)], regs={0x17: 0x01})
    case("a sprite stretched (Y-expanded) misses a dot past its second line",
         [(0, 100, 100, DOT), (1, 100, 102, DOT)], regs={0x17: 0x01})
    case("a multicolour sprite's pair %01 meets a dot", [(0, 100, 100, MC01), (1, 101, 100, DOT)], regs={0x1C: 0x01})
    case("a multicolour sprite's pair %10 meets a dot on its second pixel",
         [(0, 100, 100, MC10), (1, 101, 100, DOT)], regs={0x1C: 0x01})
    case("a sprite's pixel against its own, alone", [(0, 100, 100, SOLID)])
    # sprite against the graphics, a whole frame: the cell at row 5, column 10 is at X 104, Y 93
    case("a sprite over a solid character", [(0, 104, 90, SOLID)], mem=[(SCREEN + 210, bytes([FULL]))])
    case("a sprite over a blank character", [(0, 104, 90, SOLID)])
    case("a sprite behind a solid character ($D01B)", [(0, 104, 90, SOLID)], regs={0x1B: 0x01},
         mem=[(SCREEN + 210, bytes([FULL]))])
    for name, code, colour, glyph_on in [
            ("multicolour characters: a cell's pairs %01", G55, 9, True),
            ("multicolour characters: a cell's pairs %10", GAA, 9, True),
            ("multicolour characters: a cell in hires (colour bit 3 clear), %01010101", G55, 1, True)]:
        m = []
        _cell(m, 5, 10, code, colour)
        case(name, [(0, 104, 90, SOLID)], regs={0x16: 0x18}, mem=m)
    case("extended colour: code $41 shows glyph 1", [(0, 104, 90, SOLID)], regs={0x11: 0x5B},
         mem=[(SCREEN + 210, bytes([0x40 | FULL]))])
    case("extended colour: code $C0 shows glyph 0", [(0, 104, 90, SOLID)], regs={0x11: 0x5B},
         mem=[(SCREEN + 210, bytes([0xC0])), (CHARS + 0x600, bytes([0xFF] * 8))])
    cell = BITMAP + 5 * 320 + 10 * 8                 # the bitmap's cell at row 5, column 10
    case("bitmap: a cell's bits set", [(0, 104, 90, SOLID)], regs={0x11: 0x3B, 0x18: 0x18},
         mem=[(cell, bytes([0xFF] * 8))])
    case("bitmap: a cell's bits clear", [(0, 104, 90, SOLID)], regs={0x11: 0x3B, 0x18: 0x18},
         mem=[(SCREEN + 210, bytes([0xFF]))])
    case("multicolour bitmap: pairs %01", [(0, 104, 90, SOLID)], regs={0x11: 0x3B, 0x16: 0x18, 0x18: 0x18},
         mem=[(cell, bytes([0x55] * 8))])
    case("multicolour bitmap: pairs %10", [(0, 104, 90, SOLID)], regs={0x11: 0x3B, 0x16: 0x18, 0x18: 0x18},
         mem=[(cell, bytes([0xAA] * 8))])
    case("the invalid mode, extended colour and bitmap: bits set", [(0, 104, 90, SOLID)],
         regs={0x11: 0x7B, 0x18: 0x18}, mem=[(cell, bytes([0xFF] * 8))])
    case("the invalid mode, extended colour and bitmap: the byte read with address bits 9 and 10 clear",
         [(0, 104, 90, SOLID)], regs={0x11: 0x7B, 0x18: 0x18}, mem=[(cell - BITMAP & ~0x600 | BITMAP, bytes([0xFF] * 8))])
    case("the invalid mode, extended colour and multicolour bitmap: pairs %01", [(0, 104, 90, SOLID)],
         regs={0x11: 0x7B, 0x16: 0x18, 0x18: 0x18}, mem=[(cell, bytes([0x55] * 8))])
    m = []
    _cell(m, 5, 10, GAA, 9)
    case("the invalid mode, extended colour and multicolour characters: pairs %10", [(0, 104, 90, SOLID)],
         regs={0x11: 0x5B, 0x16: 0x18}, mem=m)
    m = []
    _cell(m, 5, 10, G55, 9)
    case("the invalid mode, extended colour and multicolour characters: pairs %01", [(0, 104, 90, SOLID)],
         regs={0x11: 0x5B, 0x16: 0x18}, mem=m)
    case("the display off", [(0, 104, 90, SOLID)], regs={0x11: 0x0B}, mem=[(SCREEN + 210, bytes([FULL]))])
    case("38 columns: a character under the left border", [(0, 7, 90, SOLID)], regs={0x16: 0x00},
         mem=[(SCREEN + 200, bytes([FULL]))])
    case("40 columns: the same character in the window", [(0, 7, 90, SOLID)],
         mem=[(SCREEN + 200, bytes([FULL]))])
    case("24 rows: a character under the top border", [(0, 104, 33, SOLID)], regs={0x11: 0x13},
         mem=[(SCREEN + 10, bytes([FULL]))], read=100)
    case("25 rows: the same character in the window", [(0, 104, 33, SOLID)],
         mem=[(SCREEN + 10, bytes([FULL]))], read=100)
    case("the idle pattern above the first row, Y scroll 7", [(0, 104, 33, SOLID)], regs={0x11: 0x1F},
         mem=[(IDLE, b"\xFF")], read=100)
    case("the X scroll: a dot on the shifted pixel", [(0, 107, 90, DOT)], regs={0x16: 0x0B},
         mem=[(SCREEN + 210, bytes([LEFT]))])
    case("the X scroll: a dot a pixel to its left", [(0, 106, 90, DOT)], regs={0x16: 0x0B},
         mem=[(SCREEN + 210, bytes([LEFT]))])
    case("the Y scroll: a dot on the shifted line", [(0, 104, 92, DOT)], regs={0x11: 0x1D},
         mem=[(SCREEN + 210, bytes([TOP]))])
    case("the Y scroll: a dot a line above it", [(0, 104, 91, DOT)], regs={0x11: 0x1D},
         mem=[(SCREEN + 210, bytes([TOP]))])
    # when in the line a bit is set: a dot on the sprite's first line, line 101, read on that line
    # in a cycle chosen, with the dot at each X around the pixels the chip draws then. The read of
    # $D01F comes 7 cycles after that of $D01E.
    full = [(SCREEN, bytes([FULL] * 1000))]
    for cyc in (34, 46):
        for x in range(8 * (cyc - 15) - 12, 8 * (cyc - 15) + 13):
            case(f"timing, sprite against sprite: dots at X {x}, read in cycle {cyc}",
                 [(0, x, 100, DOT), (1, x, 100, DOT)], clear=99, read=101, at=cyc)
    for cyc in (41, 52):
        for x in range(8 * (cyc - 15) - 12, 8 * (cyc - 15) + 13):
            case(f"timing, sprite against the characters: a dot at X {x}, read in cycle {cyc}",
                 [(0, x, 100, DOT)], mem=full, clear=99, read=101, at=cyc - 7)
    return out


def collide_program():
    """(code, labels). Each pass writes $D000-$D02E, $DD02 and $DD00 from the table, waits for
    the clear line and reads $D01E and $D01F, waits for the read line, runs a DEX loop (X from
    the table, or set by the measurement to place the read in a cycle), and reads them again."""
    from asm6502 import assemble
    t = COLLIDE_TABLE
    return assemble(f"""
            sei
            lda #$35
            sta $01
    frame:  ldx #46
    regs:   lda ${t:04x},x
            sta $d000,x
            dex
            bpl regs
            lda ${t + 48:04x}
            sta $dd02
            lda ${t + 47:04x}
            sta $dd00
    w1:     lda $d011
            and #$80
            cmp ${t + 49:04x}
            bne w1
            lda $d012
            cmp ${t + 50:04x}
            bne w1
    clr:    lda $d01e
            lda $d01f
    w2:     lda $d011
            and #$80
            cmp ${t + 51:04x}
            bne w2
            lda $d012
            cmp ${t + 52:04x}
            bne w2
            ldx ${t + 53:04x}
    dl:     dex
            bne dl
    rd:     lda $d01e
            sta $02
            lda $d01f
            sta $03
            jmp frame
    """, COLLIDE_ORG)


def collide_table(c):
    return c["regs"] + bytes(c["cia2"]) + bytes([0x80 if c["clear"] > 255 else 0, c["clear"] & 255,
                                                0x80 if c["read"] > 255 else 0, c["read"] & 255, 1])


def _collide_beam(m, labels):
    """The stopwatch's origin from the top of the frame: steps through the wait for the read
    line, sampling the line, until the samples pin it to the cycle."""
    samples = []
    for _ in range(40):
        _stop_at(m, labels["w2"])
        for _ in range(30):
            samples.append((m.stopwatch(), m.vic()[0]))
            m.j("vice_execution_step", {"count": 1})
        o, spread = phase(samples, 312, 63)
        if spread == 0:
            return o
    raise RuntimeError(f"the beam's position stayed uncertain by {spread} cycles")


def _read(m, o):
    """Step the LDA the machine is stopped at: [line, cycle] of the cycle it read in, and A."""
    m.j("vice_execution_step", {"count": 1})
    return _at((o + m.stopwatch() - 1) % FRAME_CYCLES), m.j("vice_registers_get")["A"]


def _mem_record(mem):
    """Memory as the fixture keeps it: [address, hex], or [address, hex of one byte, count] for a
    run of one byte."""
    return [[a, b[:1].hex(), len(b)] if len(b) > 16 and b == b[:1] * len(b) else [a, b.hex()] for a, b in mem]


def collide_measure():
    """Run every case in the emulator. The record, as the fixture holds it."""
    from tools import vice_build
    from vice import poke
    m = fresh()
    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    if std != "PAL":
        raise SystemExit(f"the machine is {std}: the cases are written for PAL's 312 lines of 63 cycles")
    code, labels = collide_program()
    cases = collide_cases()
    poke(m.rpc, COLLIDE_ORG, code)
    poke(m.rpc, COLLIDE_TABLE, collide_table(cases[0]))
    m.j("vice_registers_set", {"register": "PC", "value": COLLIDE_ORG})
    _stop_at(m, labels["frame"])
    o = _collide_beam(m, labels)
    regs, cia2, base = collide_base()
    out = {"source": "kit/c64/frame.py collide --record", "recorded": time.strftime("%Y-%m-%d"),
           "emulator": f"VICE {m.j('vice_ping').get('version', '?')}, {vice_build()}", "standard": std,
           "program": {"org": COLLIDE_ORG, "code": code.hex(), "table": COLLIDE_TABLE},
           "base": {"regs": bytes(regs).hex(), "cia2": cia2, "mem": _mem_record(base)},
           "cases": []}
    for c in cases:
        _stop_at(m, labels["frame"])
        mem = bytearray(0x4000)
        colour = bytearray(1000)
        for a, b in base + c["mem"]:
            if a >= 0xD800:
                colour[a - 0xD800:a - 0xD800 + len(b)] = b
            else:
                mem[a - 0x4000:a - 0x4000 + len(b)] = b
        for i in range(0, 0x4000, 0x1000):
            poke(m.rpc, 0x4000 + i, mem[i:i + 0x1000])
        poke(m.rpc, 0xD800, colour)
        poke(m.rpc, COLLIDE_TABLE, collide_table(c))
        _stop_at(m, labels["frame"])             # one whole pass with the scene before the reads
        for tries in range(80):
            _stop_at(m, labels["clr"])
            c1, _ = _read(m, o)
            c2, _ = _read(m, o)
            if c["at"] is None:
                break
            # the DEX loop from here takes 5X - 1 cycles, and the LDA after it reads in its 4th: a
            # count that puts the read in the cycle wanted, when the poll left it a multiple of 5 away
            p = (o + _stop_at(m, labels["dl"])) % FRAME_CYCLES
            want = c["read"] * 63 + c["at"] - 1
            if (want - p - 2) % 5 == 0 and 1 <= (want - p - 2) // 5 <= 255:
                m.j("vice_registers_set", {"register": "X", "value": (want - p - 2) // 5})
                break
            # a pass of another length, so that the next one's poll leaves the read somewhere else
            m.j("vice_registers_set", {"register": "X", "value": 1 + tries % 7})
        else:
            raise RuntimeError(f"{c['name']}: eighty passes left the read out of reach of cycle {c['at']}")
        _stop_at(m, labels["rd"])
        r1, v1 = _read(m, o)
        if c["at"] is not None and r1 != [c["read"], c["at"]]:
            raise RuntimeError(f"{c['name']}: read on line {r1[0]} cycle {r1[1]}, not in cycle {c['at']}")
        m.j("vice_execution_step", {"count": 1})
        r2, v2 = _read(m, o)
        rec = {"name": c["name"], "regs": c["regs"].hex(), "mem": _mem_record(c["mem"]),
               "clear": [c1, c2], "read": [r1, r2], "d01e": v1, "d01f": v2}
        print(f"{c['name']}: $D01E ${v1:02X} (line {r1[0]} cycle {r1[1]}), $D01F ${v2:02X} "
              f"(line {r2[0]} cycle {r2[1]})", flush=True)
        out["cases"].append(rec)
    m._call(m.rpc, "vice_execution_run", {})
    return out


def collide_write(out):
    """The fixture, a case to a line."""
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v)}," for k, v in out.items() if k != "cases"]
    rows = out["cases"]
    lines += [' "cases": ['] + [f"  {json.dumps(r)}" + ("," if i < len(rows) - 1 else "") for i, r in enumerate(rows)]
    with open(COLLIDE_FIXTURE, "w") as f:
        f.write("\n".join(lines + [" ]", "}"]) + "\n")


def collide_check():
    """Measure again and compare with the fixture. True if every case agrees."""
    want = json.load(open(COLLIDE_FIXTURE))
    got = collide_measure()
    bad = []
    if len(want["cases"]) != len(got["cases"]):
        bad.append(f"the fixture has {len(want['cases'])} cases, frame.py {len(got['cases'])}")
    for w, g in zip(want["cases"], got["cases"]):
        if w["name"] != g["name"] or w["regs"] != g["regs"] or w["mem"] != g["mem"]:
            bad.append(f"{g['name']}: the case is not the fixture's ({w['name']})")
        elif (w["d01e"], w["d01f"]) != (g["d01e"], g["d01f"]):
            bad.append(f"{g['name']}: the fixture has ${w['d01e']:02X} ${w['d01f']:02X}, the emulator "
                       f"${g['d01e']:02X} ${g['d01f']:02X}")
    for b in bad:
        print("  " + b)
    print(f"the sprite collisions: {'they agree with' if not bad else 'FAIL, they differ from'} "
          f"{os.path.relpath(COLLIDE_FIXTURE, ROOT)} ({want['recorded']}, {want['emulator']})")
    return not bad


# --- the collision interrupts --------------------------------------------------------------
# A collision that sets a bit in $D01E or $D01F while the register is 0 sets bit 2 or bit 1 of
# $D019, and with that bit of $D01A on the chip interrupts the processor; a collision in a
# register that already has a bit set raises nothing. So a program that never reads the
# register is interrupted once, and a handler that reads it is interrupted again at the first
# collision after its read: how often depends on where in its line the read falls.
# irq_measure() runs two scenes the same on every frame: sprites 0 and 1 overlapping for 17
# lines, and sprite 0 alone over solid characters. The handler counts its interrupts, runs `pad`
# NOPs and reads the register; the count over ten frames is taken for each pad from 0 to 40,
# then with a handler that never reads. kit/c64/fixtures/vic-collide-irq.json is the record:
# `test` checks the emulator against it, and kit/c64/test_machine_collide.js checks machine.js's
# option collide against it, with the same programs.
IRQ_FIXTURE = os.path.join(HERE, "fixtures", "vic-collide-irq.json")
IRQ_ORG, IRQ_HANDLER, IRQ_COUNT, IRQ_PADS, IRQ_FRAMES = 0xC000, 0xC100, 0xC200, 41, 10
IRQ_SCENES = [{"name": "sprite against sprite", "reg": 0x1E, "bit": 0x04},
              {"name": "sprite against the characters", "reg": 0x1F, "bit": 0x02}]
IRQ_MEM = {0x1E: [(0x2000, bytes([0xFF] * 63))],
           0x1F: [(0x2000, bytes([0xFF] * 63)), (0x3000, bytes([0xFF] * 2048))]}


def irq_program(scene):
    """The set-up: the display on, the screen at $0400 with the characters at $1000 (the ROM's)
    or, for the characters scene, at $3000 (all solid); the sprites' shape at $2000; both
    registers read to clear them, the scene's interrupt enabled, and a loop."""
    from asm6502 import assemble
    bg = scene["reg"] == 0x1F
    return assemble(f"""
            sei
            lda #$35
            sta $01
            lda #${IRQ_HANDLER & 255:02x}
            sta $fffe
            lda #${IRQ_HANDLER >> 8:02x}
            sta $ffff
            lda #$7f
            sta $dc0d
            lda $dc0d
            lda #$1b
            sta $d011
            lda #$c8
            sta $d016
            lda #${0x1C if bg else 0x15:02x}
            sta $d018
            lda #$80
            sta $07f8
            sta $07f9
            lda #100
            sta $d000
            sta $d001
            lda #104
            sta $d002
            sta $d003
            lda #0
            sta $d010
            lda #${0x01 if bg else 0x03:02x}
            sta $d015
            lda $d01e
            lda $d01f
            lda #$0f
            sta $d019
            lda #${scene["bit"]:02x}
            sta $d01a
            cli
    loop:   jmp loop
    """, IRQ_ORG)[0]


def irq_handler(scene, pad, read=True):
    """Acknowledge, count the scene's interrupt, `pad` NOPs, read the register (or, with read
    False, three NOPs in its place) and return."""
    from asm6502 import assemble
    body = "\n".join(["nop"] * pad + ([f"lda $d0{scene['reg']:02x}"] if read else ["nop"] * 3))
    return assemble(f"""
            pha
            lda $d019
            sta $d019
            and #${scene["bit"]:02x}
            beq out
            inc ${IRQ_COUNT:04x}
            {body}
    out:    pla
            rti
    """, IRQ_HANDLER)[0]


def irq_measure():
    """Run both scenes in the emulator. The record, as the fixture holds it."""
    from tools import vice_build
    from vice import poke, frames
    out = None
    for scene in IRQ_SCENES:
        m = fresh()
        if out is None:
            std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
            if std != "PAL":
                raise SystemExit(f"the machine is {std}: the counts are written for PAL's 312 lines of 63 cycles")
            out = {"source": "kit/c64/frame.py irq --record", "recorded": time.strftime("%Y-%m-%d"),
                   "emulator": f"VICE {m.j('vice_ping').get('version', '?')}, {vice_build()}", "standard": std,
                   "org": IRQ_ORG, "handler": IRQ_HANDLER, "count": IRQ_COUNT, "frames": IRQ_FRAMES, "scenes": []}
        for a, b in IRQ_MEM[scene["reg"]]:
            poke(m.rpc, a, b)
        poke(m.rpc, IRQ_ORG, irq_program(scene))
        poke(m.rpc, IRQ_HANDLER, irq_handler(scene, 0))
        poke(m.rpc, IRQ_COUNT, bytes(1))
        m.j("vice_registers_set", {"register": "PC", "value": IRQ_ORG})
        frames(m.rpc, 1)
        counts = []
        for pad in range(IRQ_PADS):
            poke(m.rpc, IRQ_HANDLER, irq_handler(scene, pad))
            frames(m.rpc, 2)
            a = m.read(IRQ_COUNT, 1)[0]
            frames(m.rpc, IRQ_FRAMES)
            counts.append((m.read(IRQ_COUNT, 1)[0] - a) & 255)
        poke(m.rpc, IRQ_HANDLER, irq_handler(scene, 0, read=False))
        z = m.read(IRQ_COUNT, 1)[0]
        frames(m.rpc, 1)
        a = m.read(IRQ_COUNT, 1)[0]
        frames(m.rpc, 50)
        b = m.read(IRQ_COUNT, 1)[0]
        rec = {"name": scene["name"], "reg": scene["reg"], "program": irq_program(scene).hex(),
               "mem": _mem_record(IRQ_MEM[scene["reg"]]),
               "handlers": [irq_handler(scene, p).hex() for p in range(IRQ_PADS)],
               "never_read": irq_handler(scene, 0, read=False).hex(),
               "counts": counts, "never_read_counts": [(a - z) & 255, (b - a) & 255]}
        print(f"{scene['name']}: {IRQ_FRAMES} frames, pad 0 to {IRQ_PADS - 1}: {counts}; "
              f"never read: {rec['never_read_counts'][0]} in the next frame, {rec['never_read_counts'][1]} in 50 more",
              flush=True)
        out["scenes"].append(rec)
        m._call(m.rpc, "vice_execution_run", {})
    return out


def irq_write(out):
    """The fixture, a scene to a line."""
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v)}," for k, v in out.items() if k != "scenes"]
    rows = out["scenes"]
    lines += [' "scenes": ['] + [f"  {json.dumps(r)}" + ("," if i < len(rows) - 1 else "") for i, r in enumerate(rows)]
    with open(IRQ_FIXTURE, "w") as f:
        f.write("\n".join(lines + [" ]", "}"]) + "\n")


def irq_check():
    """Measure again and compare with the fixture. True if every count agrees."""
    want = json.load(open(IRQ_FIXTURE))
    got = irq_measure()
    bad = []
    for w, g in zip(want["scenes"], got["scenes"]):
        if (w["program"], w["handlers"]) != (g["program"], g["handlers"]):
            bad.append(f"{g['name']}: the programs are not the fixture's")
        elif (w["counts"], w["never_read_counts"]) != (g["counts"], g["never_read_counts"]):
            bad.append(f"{g['name']}: the fixture has {w['counts']} and {w['never_read_counts']}, the emulator "
                       f"{g['counts']} and {g['never_read_counts']}")
    for b in bad:
        print("  " + b)
    print(f"the collision interrupts: {'they agree with' if not bad else 'FAIL, they differ from'} "
          f"{os.path.relpath(IRQ_FIXTURE, ROOT)} ({want['recorded']}, {want['emulator']})")
    return not bad


# --- interrupts inside a handler ---------------------------------------------------------------
# A handler that clears I (CLI) is interrupted by the next interrupt due, as any code is. Games do
# it to let a timer's music go on while a long raster handler runs, and a collision raised then is
# latched by its own handler inside the long one; a model that runs each handler whole takes it
# after, when the long handler's read of $D01F has cleared it. nest_measure() runs one program: a
# raster interrupt at line 60 whose handler clears I, waits about 80 lines and reads $D01F before
# it returns; sprite 0 over solid characters from line 100, with the sprite-to-scenery interrupt
# on; and CIA 1's timer A every 1,500 cycles, started at line 32. Every other interrupt writes to a
# table what it was, $C1 for the timer and for a collision what $D01F read, and the line it was
# taken on, until 64 are written. kit/c64/fixtures/vic-nest.json is the record: `test` checks the
# emulator against it, and kit/c64/test_machine_nest.js checks machine.js's option nest against it.
NEST_FIXTURE = os.path.join(HERE, "fixtures", "vic-nest.json")
NEST_ORG, NEST_HANDLER, NEST_TABLE, NEST_FRAMES = 0xC000, 0xC100, 0xC200, 4
NEST_MEM = [(0x2000, bytes([0xFF] * 63)), (0x3000, bytes([0xFF] * 2048))]


def nest_program():
    """The set-up: the display on, the screen at $0400 with every character solid ($3000), sprite 0
    at (100, 100), the raster compare at line 60; at line 32 the timer started; both collision
    registers read, the raster and sprite-to-scenery interrupts enabled, and a loop."""
    from asm6502 import assemble
    return assemble(f"""
            sei
            lda #$35
            sta $01
            lda #${NEST_HANDLER & 255:02x}
            sta $fffe
            lda #${NEST_HANDLER >> 8:02x}
            sta $ffff
            lda #$7f
            sta $dc0d
            lda $dc0d
            lda #$1b
            sta $d011
            lda #$c8
            sta $d016
            lda #$1c
            sta $d018
            lda #$80
            sta $07f8
            lda #100
            sta $d000
            sta $d001
            lda #0
            sta $d010
            sta ${NEST_TABLE:04x}
            lda #$01
            sta $d015
            lda #60
            sta $d012
    sync:   lda $d012
            cmp #32
            bne sync
            lda #${1499 & 255:02x}
            sta $dc04
            lda #${1499 >> 8:02x}
            sta $dc05
            lda #$11
            sta $dc0e
            lda #$81
            sta $dc0d
            lda $d01e
            lda $d01f
            lda #$0f
            sta $d019
            lda #$03
            sta $d01a
            cli
    loop:   jmp loop
    """, NEST_ORG)[0]


def nest_handler():
    """The timer's interrupt written as $C1; the raster's: I cleared, about 80 lines of waiting,
    $D01F read; the collision's written as what $D01F read. The table: its count at NEST_TABLE,
    what each was from + $40, its line from + $80."""
    from asm6502 import assemble
    t = NEST_TABLE
    return assemble(f"""
            pha
            txa
            pha
            lda $dc0d
            bpl vic
            lda #$c1
            jsr rec
    vic:    lda $d019
            sta $d019
            lsr a
            bcc coll
            cli
            ldx #4
    w1:     ldy #0
    w2:     dey
            bne w2
            dex
            bne w1
            lda $d01f
            jmp out
    coll:   lsr a
            bcc out
            lda $d01f
            jsr rec
    out:    pla
            tax
            pla
            rti
    rec:    ldx ${t:04x}
            cpx #$40
            bcs full
            sta ${t + 0x40:04x},x
            lda $d012
            sta ${t + 0x80:04x},x
            inc ${t:04x}
    full:   rts
    """, NEST_HANDLER)[0]


def nest_measure():
    """Run the program in the emulator. The record, as the fixture holds it."""
    from tools import vice_build
    from vice import poke, frames
    m = fresh()
    std = str(m.j("vice_machine_config_get").get("video_standard", "PAL")).upper()
    if std != "PAL":
        raise SystemExit(f"the machine is {std}: the lines are written for PAL's 312 lines of 63 cycles")
    for a, b in NEST_MEM:
        poke(m.rpc, a, b)
    poke(m.rpc, NEST_ORG, nest_program())
    poke(m.rpc, NEST_HANDLER, nest_handler())
    m.j("vice_registers_set", {"register": "PC", "value": NEST_ORG})
    frames(m.rpc, NEST_FRAMES)
    n = m.read(NEST_TABLE, 1)[0]
    out = {"source": "kit/c64/frame.py nest --record", "recorded": time.strftime("%Y-%m-%d"),
           "emulator": f"VICE {m.j('vice_ping').get('version', '?')}, {vice_build()}", "standard": std,
           "org": NEST_ORG, "handler": NEST_HANDLER, "table": NEST_TABLE, "frames": NEST_FRAMES,
           "program": nest_program().hex(), "code": nest_handler().hex(), "mem": _mem_record(NEST_MEM),
           "what": list(m.read(NEST_TABLE + 0x40, n)), "lines": list(m.read(NEST_TABLE + 0x80, n))}
    m._call(m.rpc, "vice_execution_run", {})
    print(f"{n} interrupts inside the raster handler's wait and after it: "
          + " ".join(f"{'timer' if w == 0xC1 else f'$D01F={w:02X}'}@{y}" for w, y in zip(out["what"], out["lines"])), flush=True)
    return out


def nest_write(out):
    with open(NEST_FIXTURE, "w") as f:
        f.write("{\n" + ",\n".join(f" {json.dumps(k)}: {json.dumps(v)}" for k, v in out.items()) + "\n}\n")


def nest_check():
    """Measure again and compare with the fixture. True if every interrupt agrees."""
    want = json.load(open(NEST_FIXTURE))
    got = nest_measure()
    ok = (want["program"], want["code"]) == (got["program"], got["code"]) and \
        (want["what"], want["lines"]) == (got["what"], got["lines"])
    print(f"interrupts inside a handler: {'they agree with' if ok else 'FAIL, they differ from'} "
          f"{os.path.relpath(NEST_FIXTURE, ROOT)} ({want['recorded']}, {want['emulator']})")
    return ok


if __name__ == "__main__":
    argv = sys.argv[1:]
    # -h after a subcommand too: "capture -h" once captured a frame into a file named -h
    if not argv or "-h" in argv or "--help" in argv:
        print(__doc__)
    elif argv[0] == "test":
        sys.exit(0 if test("--keep" in argv) else 1)
    elif argv[0] == "dma":
        if "--record" in argv:
            dma_write(dma_measure())
            print(f"wrote {os.path.relpath(DMA_FIXTURE, ROOT)}")
        else:
            sys.exit(0 if dma_check() else 1)
    elif argv[0] == "collide":
        if "--record" in argv:
            collide_write(collide_measure())
            print(f"wrote {os.path.relpath(COLLIDE_FIXTURE, ROOT)}")
        else:
            sys.exit(0 if collide_check() else 1)
    elif argv[0] == "irq":
        if "--record" in argv:
            irq_write(irq_measure())
            print(f"wrote {os.path.relpath(IRQ_FIXTURE, ROOT)}")
        else:
            sys.exit(0 if irq_check() else 1)
    elif argv[0] == "nest":
        if "--record" in argv:
            nest_write(nest_measure())
            print(f"wrote {os.path.relpath(NEST_FIXTURE, ROOT)}")
        else:
            sys.exit(0 if nest_check() else 1)
    elif argv[0] == "compare":
        sys.exit(1 if compare(argv[1], argv[2] if len(argv) > 2 else None) else 0)
    elif argv[0] == "trim":
        trim(argv[1], argv[2])
    elif argv[0] == "capture":
        watch = [tuple(int(x.strip().lstrip("$"), 16) for x in w.split("-"))
                 for i, w in enumerate(argv) if i and argv[i - 1] == "--watch"]
        f = capture(argv[1], os.path.splitext(argv[1])[0] + ".png", watch)
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
                  "(pause() in kit/c64/vice.py, the pause-at-instruction check)")
