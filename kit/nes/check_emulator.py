#!/usr/bin/env python3
"""Test the kit's NES against kit/EMULATOR.md, with a test cartridge of its own.

    python3 kit/scripts/tools.py --platform nes check-emulator     (the usual way in)
    python3 kit/nes/check_emulator.py [--keep]

The machine is jsnes inside the kit's server (kit/nes/jsnes_server.mjs), and every check goes
through kit/nes/jsnes.py, the client a script uses, so what passes here is what a script gets.
Needs the server up (`tools.py jsnes`) and nothing else: no game. It puts in a test cartridge
assembled below, an NROM-128 board (16 KB of PRG at $C000 and its mirror at $8000, 8 KB of
CHR), sent to the server as bytes and never written to disk, and measures the four phases on
it. Whatever cartridge was in is taken out. It restarts the server once (phase 2, "after a
restart") and leaves it running with the test cartridge in. `--keep` leaves this run's
snapshots in tools/nes-home/snapshots.

The test program runs with the PPU's NMI and the APU's frame interrupt both on, one pass a
frame:

  $10/$11  passes   +1 a pass
  $12/$13  frames   +1 an NMI, the start of each vertical blank; the NMI also sends the
                    sprite page, $0200, to the PPU through $4014
  $14      x        -1 a pass while Left is held: each pass reads controller 1 itself,
                    through $4016, eight reads
  $15      key      bit 1 is Left, as this pass read it
  $16      pad      the eight buttons as this pass read them, A in bit 7, Right in bit 0
  $17      never    counts calls of `never`, which nothing calls
  $18/$19  irqs     +1 an IRQ: the APU's frame interrupt, every 29,830 cycles in its
                    four-step mode, acknowledged by reading $4015

Before it turns the picture on it writes four palette entries and three tiles of nametable 0
through $2006 and $2007, which phase 1 reads back from the PPU's memory.

Every check has a name. The summary lists the names that failed, and
kit/skills/nes/tool-jsnes/workarounds.md says, per name, what to do instead. Run it after
installing, and again after a new jsnes release or a change to the server.

A check fails for what the machine does, never for how fast the host runs it: counts are
compared with the test program's own counters, and the host's speed is reported on lines of
its own, NOTEs when it is slow, which fail nothing.
"""
import json, os, random, struct, subprocess, sys, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
from jsnes import JsnesError, connect, DEFAULT_PORT, FRAME_CYCLES   # noqa: E402
from asm6502 import assemble   # noqa: E402
from m6502 import decode   # noqa: E402
import snapshot   # noqa: E402  kit/nes/snapshot.py, the reader the listing uses

PORT = DEFAULT_PORT        # KIT_JSNES_PORT, which the launcher's --port sets
SNAPDIR = os.path.join(ROOT, "tools", "nes-home", "snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
RESULT = "nes.json"        # each platform's check writes its own file here; `status` prints the last
WORKAROUNDS = "kit/skills/nes/tool-jsnes/workarounds.md"
SNAPS = ("emutest_p1", "emutest_stopped", "emutest_running", "emutest_c_stopped", "emutest_c_running",
         "emutest_rollback")
APU_FRAME_IRQ = 29830      # cycles between two frame interrupts in four-step mode (jsnes, src/papu/index.js)

BASE = 0xC000
SRC = r'''
passes = $10
frames = $12
xpos   = $14
key    = $15
pad    = $16
never  = $17
irqs   = $18
reset:  sei
        cld
        ldx #$ff
        txs
        lda #0
        sta $2000           ; NMI off
        sta $2001           ; picture off
        lda #$40
        sta $4017           ; the APU's frame interrupt off while setting up
w1:     bit $2002           ; two vertical blanks, until the PPU takes writes
        bpl w1
w2:     bit $2002
        bpl w2
        lda #$3f            ; four palette entries from $3F00
        sta $2006
        lda #$00
        sta $2006
        ldx #0
pal:    lda palette,x
        sta $2007
        inx
        cpx #4
        bne pal
        lda #$20            ; tiles 1, 2, 3 at the top left of nametable 0
        sta $2006
        lda #$00
        sta $2006
        lda #1
        sta $2007
        lda #2
        sta $2007
        lda #3
        sta $2007
        ldx #0
        lda #$ff
oamclr: sta $0200,x         ; every sprite off the screen
        inx
        bne oamclr
        lda #$40            ; but sprite 0: tile 1 at x $50, y $40
        sta $0200
        lda #1
        sta $0201
        lda #0
        sta $0202
        lda #$50
        sta $0203
        lda #0
        sta passes
        sta passes+1
        sta frames
        sta frames+1
        sta never
        sta irqs
        sta irqs+1
        lda #$80
        sta xpos
        lda #0
        sta $2005
        sta $2005
        lda #$1e
        sta $2001           ; background and sprites on
        lda #$80
        sta $2000           ; NMI at each vertical blank
        lda #$00
        sta $4017           ; the APU's frame counter: four steps, its interrupt on
        cli
loop:   lda frames
wait:   cmp frames          ; one pass a frame
        beq wait
top:    inc passes
        bne kscan
        inc passes+1
kscan:  lda #1              ; controller 1, as a game reads it
        sta $4016
        lda #0
        sta $4016
        ldx #8
rd:     lda $4016
        lsr a
        rol pad
        dex
        bne rd
got:    lda pad
        and #$02            ; Left: A, B, Select, Start, Up, Down, Left, Right puts it in bit 1
        sta key
        beq nokey
        dec xpos
nokey:  jmp loop
neverr: inc never
        rts
nmi:    pha
        lda #2
        sta $4014           ; the sprite page to the PPU
        inc frames
        bne nmidone
        inc frames+1
nmidone: lda #0
        sta $2005
        sta $2005
        pla
        rti
irq:    pha
        lda $4015           ; acknowledges the frame interrupt
        inc irqs
        bne irqdone
        inc irqs+1
irqdone: pla
        rti
palette: .byte $0f, $16, $27, $18
'''
CODE, LABELS = assemble(SRC, org=BASE)
START, LOOP, TOP, GOT, NEVERR = (LABELS[k] for k in ("reset", "loop", "top", "got", "neverr"))
NMI, IRQ = LABELS["nmi"], LABELS["irq"]
PASSES, FRAMES, XPOS, KEY, PAD, IRQS = (LABELS[k] for k in ("passes", "frames", "xpos", "key", "pad", "irqs"))
PALETTE = bytes([0x0F, 0x16, 0x27, 0x18])


def prg():
    """The 16 KB of PRG: the program at $C000, the vectors at its end."""
    p = bytearray(16384)
    p[:len(CODE)] = CODE
    p[0x3FFA:0x4000] = struct.pack("<HHH", NMI, START, IRQ)
    return bytes(p)


def chr_rom():
    """8 KB of CHR: tile 1 solid in colour 1, tile 2 in colour 2, tile 3 in colour 3."""
    c = bytearray(8192)
    for t, (lo, hi) in ((1, (0xFF, 0)), (2, (0, 0xFF)), (3, (0xFF, 0xFF))):
        c[t * 16:t * 16 + 8] = bytes([lo]) * 8
        c[t * 16 + 8:t * 16 + 16] = bytes([hi]) * 8
    return bytes(c)


def test_cartridge():
    """The test cartridge as an iNES image: one 16 KB PRG bank, one 8 KB CHR bank, mapper 0,
    vertical mirroring. Built in memory and sent to the server, never written to disk."""
    return b"NES\x1a" + bytes([1, 1, 0x01, 0]) + bytes(8) + prg() + chr_rom()


results = []
speed = {}     # the host: how fast the machine runs here. Never a check
notes = []     # what was said about the host; repeated in the summary


def check(name, ok, what, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name:26} {what}" + (f"  [{detail}]" if detail != "" else ""), flush=True)
    results.append((name, bool(ok)))


def note(text):
    """Something about the host, not the emulator: said, kept for the summary, failing nothing."""
    print(f"NOTE  {text}", flush=True)
    notes.append(text)


def phase(title):
    def deco(f):
        def wrapped(*a, **k):
            print(f"\n=== {title}", flush=True)
            try:
                return f(*a, **k)
            except Exception as e:
                check("no-exception", False, f"{title} ran to the end", repr(e))
                traceback.print_exc()
        return wrapped
    return deco


def snap_path(name):
    return os.path.join(SNAPDIR, name + ".json.gz")


def clean():
    for name in SNAPS:
        try:
            os.remove(snap_path(name))
        except FileNotFoundError:
            pass


def tools(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), "--platform", "nes",
                           *args], capture_output=True, text=True).stdout.strip()


def background(m, **run_args):
    """m.run(**run_args) on a thread of its own, so that another connection can act while it runs."""
    box = {}

    def go():
        try:
            box["r"] = m.run(**run_args)
        except Exception as e:
            box["e"] = repr(e)
    t = threading.Thread(target=go, daemon=True)
    t.start()
    return t, box


def wait_running(other, secs=5.0):
    """True once the server says a run is in progress."""
    t0 = time.time()
    while time.time() - t0 < secs:
        if other.status()["running"]:
            return True
        time.sleep(0.002)
    return False


def sample(m):
    """The machine as the determinism checks compare it: the 2 KB of RAM, the registers with the
    cycle count, the PPU's 16 KB and its sprite table, and every chip the server reports (all but
    its frame count, which is the server's)."""
    r = m.registers()
    c = m.chips()
    c.pop("frames", None)
    return {"ram": m.read(0, 0x800), "ppu": m.read(0, 0x4000, space="ppu"), "oam": m.read(0, 0x100, space="oam"),
            "registers": {k: r[k] for k in ("pc", "a", "x", "y", "s", "p", "cycles")}, "chips": c}


def differ(a, b):
    """What differs between two samples, in a few words."""
    out = []
    for part in ("ram", "ppu", "oam"):
        if a[part] != b[part]:
            d = [i for i in range(len(a[part])) if a[part][i] != b[part][i]]
            out.append(f"{len(d)} bytes of {part} from ${d[0]:04X}")
    out += [f"{k} {a['registers'][k]} against {b['registers'][k]}" for k in a["registers"]
            if a["registers"][k] != b["registers"][k]]
    out += [k for k in a["chips"] if a["chips"][k] != b["chips"].get(k)]
    return "; ".join(out) or "identical"


def stop_after_passes(m, path, n=100):
    """Load `path`, then run to the nth arrival at the loop's top after it: a stopping
    checkpoint with an ignore count. The first instruction of a run is never stopped on, so
    a load at the top counts from the next arrival, as the machine that saved it would."""
    m.load(path)
    m.delete()
    m.checkpoint(TOP, ignore=n - 1, temporary=True)
    r = m.run()
    if r["reason"] != "checkpoint" or r["pc"] != TOP:
        raise RuntimeError(f"the run to pass {n} ended on {r['reason']} at ${r['pc']:04X}")
    return sample(m)


def setup(m):
    """The test cartridge in and powered on; returns once its program runs."""
    m.delete()
    m.cartridge(data=test_cartridge(), name="kit test cartridge")
    m.release_buttons()
    m.frames(8)
    if m.word(PASSES) == 0:
        raise RuntimeError("the test program did not run: the pass counter is still zero")


def fresh(m):
    """Start each phase on a running test program, so that one failure does not fail the next."""
    try:
        m.delete()
        m.release_buttons()
        p0 = m.word(PASSES)
        m.frames(3)
        if m.read(BASE, len(CODE)) == CODE and (m.word(PASSES) - p0) & 0xFFFF >= 2:
            return
    except JsnesError:
        pass
    print("   (the test program is not running: setting it up again)", flush=True)
    setup(m)


# ---------------------------------------------------------------------------
@phase("start: the test cartridge in, powered on")
def p_start(m):
    h = m.call("hello")
    print(f"   server protocol {h['protocol']}, jsnes {h['jsnes']}, {h['model']}, node {h['node']}")
    m.delete()
    r = m.cartridge(data=test_cartridge(), name="kit test cartridge")
    c = r["cartridge"]
    check("cartridge", c["mapper"] == 0 and c["prg_kb"] == 16 and c["chr_kb"] == 8 and r["registers"]["pc"] in (0x8000, START),
          "an iNES image sent as bytes goes in, and the server describes it",
          f"mapper {c['mapper']}, PRG {c['prg_kb']} KB, CHR {c['chr_kb']} KB, {c['mirroring']}, CRC32 {c['crc32_body']}")
    try:
        m.codemap("stop")
        m.sound("stop")
    except JsnesError:
        pass                                     # none was running
    m.release_buttons()
    m.write(0x0300, b"KIT!")
    check("write-read", m.read(0x0300, 4) == b"KIT!" and m.read(0x0B00, 4) == b"KIT!",
          "RAM written reads back identical, and through its mirror at $0B00", "4 bytes at $0300")
    m.frames(60)
    passes, frames = m.word(PASSES), m.word(FRAMES)
    check("program-runs", passes >= 50 and abs(passes - frames) <= 1,
          "the test program runs one pass a frame", f"passes {passes}, frames {frames} after 60 frames")


@phase("phase 1: static inspection")
def p1(m):
    t = time.time()
    img = m.read(0, 0x10000)
    ms = (time.time() - t) * 1000
    io = m.call("read", address=0x2000, length=8)
    check("read-64k", len(img) == 0x10000 and img[BASE:BASE + len(CODE)] == CODE and img[0x8000:0xC000] == img[0xC000:]
          and io["io"],
          "all 64 KB in one call, NROM-128's PRG at $8000 and its mirror at $C000; the PPU's registers read as "
          "0 and are flagged, without touching the chip", f"{len(img)} bytes in {ms:.0f} ms")
    p, c = m.read(0, 16384, space="prg"), m.read(0, 8192, space="chr")
    check("read-banked", p == prg() and c == chr_rom() and p == img[0xC000:],
          "the cartridge's PRG and CHR read by their offset in the image, whichever bank the mapper selected",
          f"{len(p)} bytes of PRG, {len(c)} of CHR, as the image has them")
    pal = m.read(0x3F00, 4, space="ppu")
    names = m.read(0x2000, 3, space="ppu")
    mirror = m.read(0x2800, 3, space="ppu")       # vertical mirroring: $2800 is $2000
    oam = m.read(0, 256, space="oam")
    check("read-ppu", pal == PALETTE and names == bytes([1, 2, 3]) and mirror == names and oam == img[0x0200:0x0300],
          "the PPU's memory and sprite table: the palette and nametable the program wrote, the nametable through "
          "its mirror, and the sprite page the NMI sent", f"palette {pal.hex(' ')}; tiles {names.hex(' ')}; "
          f"$2800 {mirror.hex(' ')}; sprite 0 {oam[:4].hex(' ')}")
    r = m.registers()
    check("registers", all(k in r for k in ("pc", "a", "x", "y", "s", "p", "flags", "cycles")),
          "the CPU's registers and the cycle count in one call",
          f"PC ${r['pc']:04X} A ${r['a']:02X} X ${r['x']:02X} Y ${r['y']:02X} S ${r['s']:02X} {r['flags']}")
    c1, c2 = m.chips(), m.chips()
    ppu = c1["ppu"]
    ok = (ppu["ctrl"] == 0x80 and ppu["mask"] == 0x1E and 0 <= ppu["scanline"] <= 261 and len(ppu["palette"]) == 32
          and set(c1["controllers"]["1"]) == {"a", "b", "select", "start", "up", "down", "left", "right"}
          and c2["ppu"] == ppu)
    check("chip-state", ok, "the PPU's registers, scanline and palette, and the controllers, by name; "
          "a second read sees the same", f"PPUCTRL ${ppu['ctrl']:02X} PPUMASK ${ppu['mask']:02X} "
          f"line {ppu['scanline']} dot {ppu['dot']}, mapper {c1['mapper']}")
    path = snap_path("emutest_p1")
    s = m.save(path)
    ram = snapshot.read(path)
    head = snapshot.header(path)
    live = m.read(0, 0x10000)
    pc = m.registers()["pc"]
    # the RAM and the cartridge's space as the CPU sees them; the RAM's mirrors and the chips' range
    # are zero in the file, which holds only what is each address's own (kit/nes/snapshot.py)
    same = ram[:0x800] == live[:0x800] and ram[0x800:0x6000] == bytes(0x5800) and ram[0x6000:] == live[0x6000:]
    pp = snapshot.ppu(path) == m.read(0, 0x4000, space="ppu") and snapshot.oam(path) == m.read(0, 256, space="oam")
    check("snapshot-python", same and pp and head["pc"] == pc,
          "a snapshot read by kit/nes/snapshot.py matches the live machine: the CPU's view, the PPU's memory and OAM",
          f"{s['bytes']} bytes on disk; CPU {'match' if same else 'DIFFER'}, PPU {'match' if pp else 'DIFFER'}; "
          f"PC ${head['pc']:04X} in the file, ${pc:04X} live")
    shot = snap_path("emutest_p1").replace(".json.gz", ".png")
    sh = m.screenshot(shot)
    raw = open(shot, "rb").read()
    w, hgt = struct.unpack(">II", raw[16:24])
    os.remove(shot)
    check("screenshot", raw[:8] == b"\x89PNG\r\n\x1a\n" and (w, hgt) == (256, 240),
          "the last frame as a PNG, 256 by 240", f"{len(raw)} bytes, frame {sh['frames']}")


STOP = {}      # the stopped snapshot and the machine it must give, for the check after a restart


@phase("phase 2: state management")
def p2(m):
    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    stopped = snap_path("emutest_stopped")
    m.save(stopped)
    r0 = m.registers()

    running = snap_path("emutest_running")
    other = connect(port=PORT, timeout=30)
    t, box = background(m, seconds=20)
    got = wait_running(other)
    time.sleep(0.05)
    saved = other.save(running) if got else {}
    other.call("stop")
    t.join(60)
    other.close()
    rr = box.get("r") or {}
    begun = rr.get("cycles", 0) - rr.get("ran", 0)
    check("save-running", got and begun < saved.get("cycles", -1) < rr.get("cycles", 0) and rr.get("reason") == "stopped",
          "a snapshot saved from a second connection while a run is in progress",
          f"saved at cycle {saved.get('cycles')} of a run from {begun} to {rr.get('cycles')}; "
          f"the run ended on {rr.get('reason') or box.get('e')}")

    m.load(stopped)
    r1 = m.registers()
    time.sleep(0.3)
    r2 = m.registers()
    st = m.status()
    check("load-paused", r1["pc"] == r0["pc"] == TOP and r1["cycles"] == r0["cycles"] and r2 == r1 and not st["running"],
          "a load leaves the machine stopped at the loaded state, and nothing moves until a run",
          f"PC ${r1['pc']:04X} (saved ${r0['pc']:04X}), cycles {r1['cycles']} (saved {r0['cycles']}); "
          f"{'the same' if r2 == r1 else 'MOVED'} 0.3 s later")

    cp = m.checkpoint(TOP, stop=False)
    m.frames(5)
    before = m.hits(cp)
    m.load(stopped)
    listed = any(c["checkpoint"] == cp for c in m.checkpoints())
    m.frames(10)
    after = m.hits(cp)
    check("checkpoints-survive-load", listed and after - before >= 9,
          "a counting checkpoint set before a load goes on counting after it",
          f"{before} hits before the load, {after} after it and 10 frames")

    for label, path in (("stopped", stopped), ("running", running)):
        seen = [stop_after_passes(m, path) for _ in range(3)]
        check(f"determinism-{label}", seen[0] == seen[1] == seen[2],
              f"three loads of a snapshot saved from a {label} machine reach the 100th pass identical "
              "(RAM, PPU memory, OAM, registers, cycle count, chips)",
              f"first and second {differ(seen[0], seen[1])}; first and third {differ(seen[0], seen[2])}")
        STOP[label] = (path, seen[0])

    pairs = []
    for label in ("stopped", "running"):
        m.load(stopped)
        m.delete()
        if label == "stopped":                      # stopped by a checkpoint, as a script stops it
            m.checkpoint(TOP, temporary=True)
            m.run()
        else:                                       # stopped part way through a frame, as a pause stops it
            m.run(cycles=54321)
        path = snap_path(f"emutest_c_{label}")
        m.save(path)
        m.checkpoint(TOP, ignore=99, temporary=True)
        m.run()
        original = sample(m)
        loaded = stop_after_passes(m, path)
        pairs.append((label, original == loaded, differ(original, loaded)))
    check("load-continues-exactly", all(ok for _, ok, _ in pairs),
          "the machine that saved, and a load of what it saved, reach the 100th pass after the save identical",
          "; ".join(f"saved {label}: {d}" for label, _, d in pairs))

    m.load(stopped)
    m.delete()
    t0 = time.time()
    r = m.run(frames=600)
    dt = time.time() - t0
    x = 10.0 / dt if dt else 0.0
    speed["unhooked_x_real_time"] = round(x, 1)
    check("warp", r["reason"] == "frames" and r["frames"] == 600,
          "600 frames in one call, as fast as the host runs them: the server never paces the machine",
          f"10 s of the machine's time in {dt:.2f} s, {x:.1f}x real time")
    if x < 2:
        note(f"the machine ran at {x:.1f}x real time with nothing hooked: a title screen that takes a minute "
             "on a real NES takes about as long here")


def p2_restart(m):
    """The same snapshot after the server has been stopped and started again; returns the new connection."""
    print("\n=== phase 2, after a restart", flush=True)
    if "stopped" not in STOP:
        check("determinism-restart", False, "a restarted server gives the same machine", "phase 2 left no reference")
        return m
    path, ref = STOP["stopped"]
    m.close()
    port = ("--port", str(PORT))
    print("  ", tools("stop", "jsnes", *port).replace("\n", "\n   "))
    print("  ", tools("jsnes", *port).replace("\n", "\n   "))
    try:
        m = connect(port=PORT, timeout=60)
        m.cartridge(data=test_cartridge(), name="kit test cartridge")   # the snapshot names it; it was sent as bytes
        again = stop_after_passes(m, path)
        check("determinism-restart", again == ref,
              "a new server process, the same snapshot and the same 100 passes give the same machine", differ(again, ref))
    except Exception as e:
        check("determinism-restart", False, "a new server process gives the same machine", repr(e))
        m = connect(port=PORT, timeout=60)
    return m


@phase("phase 3: live measurement")
def p3(m):
    m.delete()
    top = m.checkpoint(TOP, stop=False)
    never = m.checkpoint(NEVERR, stop=False)
    nmi = m.checkpoint(NMI, stop=False)
    irq = m.checkpoint(IRQ, stop=False)
    store = m.checkpoint(PASSES, kind="write", stop=False)
    load = m.checkpoint(0x4016, kind="read", stop=False)
    p0, f0, i0, c0 = m.word(PASSES), m.word(FRAMES), m.word(IRQS), m.registers()["cycles"]
    r = m.run(frames=300)
    dp, df, di = ((m.word(a) - b) & 0xFFFF for a, b in ((PASSES, p0), (FRAMES, f0), (IRQS, i0)))
    dc = m.registers()["cycles"] - c0
    h = {c["checkpoint"]: c["hits"] for c in m.checkpoints()}
    check("counting-checkpoint", dp >= 290 and abs(h[top] - dp) <= 1,
          "a checkpoint that counts without stopping, on the loop's top, against the program's own pass counter",
          f"{h[top]} hits, {dp} passes in 300 frames; the run ended on {r['reason']}")
    check("never-runs", h[never] == 0, "a checkpoint on a routine nothing calls stays at zero", h[never])
    check("irq-count", h[nmi] == df and abs(df - r["frames"]) <= 1 and h[irq] == di and abs(di - dc / APU_FRAME_IRQ) <= 1,
          "checkpoints on the NMI handler and the IRQ handler count once an interrupt: the NMI once a frame, "
          "the APU's frame interrupt every 29,830 cycles",
          f"NMI {h[nmi]} hits in {r['frames']} frames, the program counted {df}; IRQ {h[irq]} hits, the program "
          f"counted {di}, {dc / APU_FRAME_IRQ:.1f} expected")
    check("watch-store", abs(h[store] - dp) <= 1, "a write checkpoint counts the stores to the pass counter",
          f"{h[store]} stores, {dp} passes")
    check("watch-load", abs(h[load] - 8 * dp) <= 8,
          "a read checkpoint counts the program's reads of $4016, controller 1, eight a pass", f"{h[load]} reads, {dp} passes")
    per = dc / df if df else 0.0
    check("cycle-counter", abs(per - FRAME_CYCLES) < 2,
          "the cycle counter against the program's frame counter: an NTSC frame is 29,780.5 cycles",
          f"{dc} cycles over {df} frames, {per:.1f} a frame")

    m.delete()
    t0 = time.time()
    m.run(frames=120)
    bare = time.time() - t0
    m.codemap("start")
    m.codemap("zap")
    t0 = time.time()
    m.run(frames=120)
    rec = time.time() - t0
    ran = {a: (n, c) for a, n, c in m.codemap("stop")["instructions"]}
    img = bytearray(0x10000)
    img[BASE:BASE + len(CODE)] = CODE
    wrong = [f"{n} ${LABELS[n]:04X}" for n in ("loop", "wait", "top", "kscan", "rd", "got", "nokey", "nmi", "nmidone", "irq")
             if LABELS[n] not in ran or ran[LABELS[n]][0] != decode(img, LABELS[n])[2]]
    check("code-map", not wrong and NEVERR not in ran and ran.get(TOP, (0, 0))[1] >= 115,
          "every address an instruction started at, with its length and its count, in one call",
          f"{len(ran)} addresses ran; `never` {'absent' if NEVERR not in ran else 'PRESENT'}; "
          f"{'each of the loop labels there, its length right' if not wrong else 'missing or wrong: ' + ', '.join(wrong)}; "
          f"120 frames took {bare:.2f} s, {rec:.2f} s recording")
    speed["code_map_cost"] = round(rec / bare, 2) if bare else None

    m.delete()
    top = m.checkpoint(TOP, stop=False)
    other = connect(port=PORT, timeout=30)
    t, box = background(m, seconds=60)
    got = wait_running(other)
    counts, states, waits = [], [], []
    for _ in range(5):
        t0 = time.time()
        counts.append(other.hits(top))
        states.append(other.status()["running"])
        other.registers()
        other.read(PASSES, 2)
        other.chips()
        waits.append(time.time() - t0)
        time.sleep(0.1)
    t0 = time.time()
    other.call("stop")
    t.join(60)
    stopped_in = time.time() - t0
    after = other.status()
    other.close()
    rr = box.get("r") or {}
    check("count-while-running", got and all(states) and all(b > a for a, b in zip(counts, counts[1:])),
          "while one connection runs the machine, a second reads hit counts, registers, memory and chips, "
          "and the counts grow", f"counts {', '.join(map(str, counts))}; five calls took {max(waits) * 1000:.0f} ms at most")
    check("stop-while-running", rr.get("reason") == "stopped" and not after["running"],
          "`stop` from a second connection ends a run, and the run's own reply says so",
          f"the run ended on {rr.get('reason') or box.get('e')} after {rr.get('ran')} cycles, "
          f"{stopped_in * 1000:.0f} ms after the stop")
    if max(waits) > 0.5:
        note(f"a call made during a run waited {max(waits) * 1000:.0f} ms: calls are answered between two "
             "slices of 30,000 cycles, and this host runs a slice slowly")


@phase("phase 4: frame stepping with inputs")
def p4(m):
    m.delete()
    m.release_buttons()
    m.checkpoint(TOP, temporary=True)
    r = m.run()
    check("exact-stop", r["reason"] == "checkpoint" and r["pc"] == TOP == m.registers()["pc"],
          "a stopping checkpoint stops on its own instruction, before it runs",
          f"stopped at ${r['pc']:04X} on {r['reason']}, the checkpoint at ${TOP:04X}")

    found = []
    for label, at in (("NMI", NMI), ("IRQ", IRQ)):
        m.delete()
        m.checkpoint(TOP, temporary=True)
        m.run()
        s0 = m.registers()["s"]
        m.checkpoint(at, temporary=True)
        r = m.run(max_cycles=200000)
        regs = m.registers()
        found.append((label, r["reason"] == "checkpoint" and r["pc"] == at and regs["flags"][5] == "I"
                      and (s0 - regs["s"]) & 0xFF == 3, f"{label} at ${r['pc']:04X} on {r['reason']}, "
                      f"S ${s0:02X} to ${regs['s']:02X}, {regs['flags']}"))
    check("exact-stop-interrupt", all(ok for _, ok, _ in found),
          "a stopping checkpoint on an interrupt handler's first instruction stops there, with the three bytes "
          "pushed and I set, before the instruction runs", "; ".join(d for _, _, d in found))

    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    m.button("left")
    r = m.until(GOT)
    pad = m.read(PAD, 1)[0]
    check("input-lands", r["reason"] == "until" and pad == 0x02,
          "Left pressed while stopped is down when the program next reads controller 1 through $4016",
          f"the program's reads gave ${pad:02X} (bit 1: Left, and nothing else)")

    r1 = m.step()
    r2 = m.step(2)
    check("step-instruction", r1["reason"] == r2["reason"] == "step" and r1["pc"] == GOT + 2
          and r1["next"]["address"] == GOT + 2 and r2["pc"] == GOT + 6,
          "a step returns when it is done, with the new PC and the next instruction",
          f"one step from ${GOT:04X} to ${r1['pc']:04X} ({r1['next']['text']}), two more to ${r2['pc']:04X}")

    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    cp = m.checkpoint(TOP, stop=False)
    m.frames(1)
    xs, per = [], []
    t0 = time.time()
    for _ in range(10):
        h0 = m.hits(cp)
        m.frames(1)
        per.append(m.hits(cp) - h0)
        xs.append(m.read(XPOS, 1)[0])
    step_ms = (time.time() - t0) * 100
    speed["frame_step_ms"] = round(step_ms, 1)
    moved = [(xs[i] - xs[i + 1]) & 0xFF for i in range(len(xs) - 1)]
    check("frame-step", all(n == 1 for n in per) and all(d == 1 for d in moved),
          "ten one-frame advances with Left held: the loop's top is reached once a frame, and x moves one step a frame",
          f"hits a frame {','.join(map(str, per))}; x {' '.join(f'{x:02X}' for x in xs)}; {step_ms:.0f} ms a step with its reads")

    m.button("left", down=False)
    m.frames(2)
    xa, ka = m.read(XPOS, 1)[0], m.read(KEY, 1)[0]
    m.frames(5)
    xb = m.read(XPOS, 1)[0]
    held = m.call("buttons")["held"]
    check("input-released", xa == xb and ka == 0 and not held["1"] and not held["2"],
          "released when the script says: the program reads Left as up and x stays where it was",
          f"x ${xa:02X}, then ${xb:02X} five frames on; the program's key byte ${ka:02X}; buttons held {held}")

    m.delete()
    cp = m.checkpoint(TOP)
    ok, err = 0, None
    t0 = time.time()
    try:
        for _ in range(100):
            r = m.run(max_cycles=200000)
            m.read(PASSES, 2)
            m.registers()
            ok += r["reason"] == "checkpoint" and r["pc"] == TOP
    except JsnesError as e:
        err = str(e)
    dt = time.time() - t0
    m.delete(cp)
    check("unpaced-calls", ok == 100 and err is None,
          "a hundred runs back to back, with reads between and no pacing, each stopping on the armed checkpoint",
          f"{ok} of 100 {err or ''}; {300 / dt:.0f} calls a second")

    m.delete()
    other = connect(port=PORT, timeout=30)
    rnd = random.Random(12345)
    held_y = tried = 0
    places = set()
    while tried < 30:
        t, box = background(m)
        wait_running(other)
        time.sleep(rnd.uniform(0.001, 0.03))
        other.call("stop")
        t.join(60)
        places.add(m.registers()["pc"])
        tried += 1
        v = (tried * 37 + 11) & 0xFF          # the test program never uses Y
        m.set_registers(y=v)
        m.frames(1)
        held_y += m.registers()["y"] == v
    other.close()
    check("pause-at-instruction", held_y == 30,
          "thirty stops from a second connection at varied moments each land between two instructions, "
          "and a register set there holds through the next frame",
          f"Y held after {held_y} of {tried} stops, at {len(places)} different addresses")

    m.keep("emutest")
    s0 = sample(m)
    m.frames(5)
    m.back("emutest")
    s1 = sample(m)
    t0 = time.time()
    for _ in range(20):
        m.keep("emutest")
        m.back("emutest")
    pair = (time.time() - t0) / 20 * 1000
    path = snap_path("emutest_rollback")
    t0 = time.time()
    for _ in range(5):
        m.save(path)
        m.load(path)
    filepair = (time.time() - t0) / 5 * 1000
    check("rollback", s0 == s1, "keep the machine, run on, go back: the machine is the one kept",
          f"{differ(s0, s1)}; keep and back {pair:.1f} ms a pair, save and load through a file {filepair:.0f} ms a pair")


def main():
    if "-h" in sys.argv or "--help" in sys.argv:   # it replaces the cartridge: never on a request for usage
        print(__doc__)
        return
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SNAPDIR, exist_ok=True)
    clean()
    try:
        m = connect(port=PORT, timeout=60)
        h = m.call("hello")
    except JsnesError as e:
        sys.exit(f"{e}\nthen run check-emulator again.")
    build = f"jsnes {h['jsnes']} in the kit's server (protocol {h['protocol']}), node {h['node']}, on {sys.platform}"
    print(build)
    started = time.time()
    p_start(m)
    if not any(n == "program-runs" and ok for n, ok in results):
        print("\nthe test program never ran; stopping here")
        sys.exit(1)
    for step in (p1, p3, p4, p2):
        fresh(m)
        step(m)
    m = p2_restart(m)
    try:
        m.delete()
        m.release_buttons()
    except Exception:
        pass
    m.close()
    if "--keep" not in sys.argv:
        clean()
    failed = sorted({n for n, ok in results if not ok})
    passed = sorted({n for n, ok in results if ok} - set(failed))
    summary = {"build": build, "when": time.strftime("%Y-%m-%d %H:%M"), "seconds": round(time.time() - started),
               "passed": passed, "failed": failed, "speed": speed, "notes": notes}
    with open(os.path.join(OUT, RESULT), "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n=== {len(results) - sum(1 for _, ok in results if not ok)} passed, "
          f"{sum(1 for _, ok in results if not ok)} failed, {summary['seconds']} s")
    if failed:
        print("failed: " + " ".join(failed))
        print(f"read {WORKAROUNDS} for each of these, and only these")
    else:
        print(f"nothing failed; {WORKAROUNDS} does not apply to this build")
    if notes:
        print("about the host, not the emulator, and no check fails for it:")
        for n in notes:
            print(f"  {n}")
        print(f"  read \"A slow host\" in {WORKAROUNDS}")
    print(f"written to {os.path.relpath(os.path.join(OUT, RESULT), ROOT)}")


if __name__ == "__main__":
    main()
