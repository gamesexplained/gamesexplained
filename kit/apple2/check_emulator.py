#!/usr/bin/env python3
"""Test the kit's Apple II against kit/EMULATOR.md, with a test program and a test disk of its own.

    python3 kit/scripts/tools.py --platform apple2 check-emulator     (the usual way in)
    python3 kit/apple2/check_emulator.py [--keep]

The machine is Apple2TS inside the kit's server (kit/apple2/apple2ts_server.mjs), and every check
goes through kit/apple2/apple2ts.py, the client a script uses, so what passes here is what a script
gets. Needs the server up (`tools.py apple2ts`) and nothing else: no game, no disk. It powers the
machine on, types at BASIC, writes a test program of about three hundred bytes to $6000, points
PC at it, and measures the four phases on that; then it writes a test disk and boots it. Anything
the machine was doing is lost. It restarts the server once (phase 2, "after a restart") and leaves
it running, powered on with no disk. `--keep` leaves this run's snapshots and the test disk in
tools/apple2-home/snapshots.

The test program (assembled below, so it is source and not a binary) owns the machine: no DOS, no
BASIC, no ROM calls once it starts. It writes a marker into each bank of memory (MARKERS), points
the 6502's vectors at its own handlers in language-card RAM, starts the Mockingboard's first 6522
(slot 4) interrupting every IRQ_PERIOD + 2 cycles, and runs one pass a frame, waiting for the
vertical blank ($C019, bit 7 low while the beam is in it):

  $70/$71  passes  +1 a pass
  $72/$73  frames  +1 at each start of the vertical blank (the label `vbl`)
  $74      xpos    -1 a pass while a key is held ($C010 bit 7), +1 a pass while button 0 is down
  $75      key     $C000 as this pass read it: bit 7 set when a key press is waiting
  $76      akd     $C010 as this pass read it (the read clears the strobe): bit 7 set while a key is down
  $77      never   counts calls of `never`, which nothing calls
  $78      btn0    $C061 as this pass read it
  $79      pdl0    paddle 0, read with the Monitor's 11-cycle loop
  $7A/$7B  irqs    the Mockingboard's timer interrupts handled
  $7C      ticks   +1 a pass: the speaker clicks once a pass ($C030), and the first sound chip's
                   register 0 is written once a pass with the pass counter's low byte

The test disk is a 16-sector image the check writes itself: its boot sector asks the Disk II's
boot ROM to load all sixteen sectors of track 0 to $0800-$17FF, each sector a pattern of its own.

Every check has a name. The summary lists the names that failed, and
kit/skills/apple2/tool-apple2ts/workarounds.md says, per name, what to do instead. Run it after
installing, and again after a new Apple2TS release or a change to the server.

A check fails for what the machine does, never for how fast the host runs it: counts are compared
with the test program's own counters, and the host's speed is reported on lines of its own, NOTEs
when it is slow, which fail nothing.
"""
import json, os, random, subprocess, sys, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
from apple2ts import Apple2tsError, connect, DEFAULT_PORT, FRAME_CYCLES   # noqa: E402
from asm6502 import assemble   # noqa: E402
from m6502 import decode   # noqa: E402
import snapshot   # noqa: E402  kit/apple2/snapshot.py, the reader the listing uses
import screen     # noqa: E402  kit/apple2/screen.py, which draws the screenshots

PORT = DEFAULT_PORT        # KIT_APPLE2TS_PORT, which the launcher's --port sets
SNAPDIR = os.path.join(ROOT, "tools", "apple2-home", "snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
RESULT = "apple2.json"     # each platform's check writes its own file here; `status` prints the last
WORKAROUNDS = "kit/skills/apple2/tool-apple2ts/workarounds.md"
SNAPS = ("emutest_p1", "emutest_stopped", "emutest_running", "emutest_c_stopped", "emutest_c_running",
         "emutest_rollback", "emutest_disk")
DISK = os.path.join(SNAPDIR, "emutest_disk.dsk")
SHOT = os.path.join(SNAPDIR, "emutest_screen.png")

BASE = 0x6000
IRQ_PERIOD = 0x4000          # 16,384: a timer 1 interrupt every 16,386 cycles
# (space, address, value): what the program writes where, each in its own bank of memory
MARKERS = [
    ("main", 0x2000, 0x11), ("aux", 0x2000, 0x22),
    ("main", 0x00FF, 0x99), ("aux", 0x00FF, 0xAA),
    ("mainlc1", 0xD000, 0x33), ("mainlc2", 0xD000, 0x44), ("mainlc2", 0xE000, 0x77),
    ("auxlc1", 0xD000, 0x55), ("auxlc2", 0xD000, 0x66), ("auxlc2", 0xE000, 0x88),
]
SRC = r'''
passes = $70
frames = $72
xpos   = $74
key    = $75
akd    = $76
never  = $77
btn0   = $78
pdl0   = $79
irqs   = $7a
ticks  = $7c
start:  sei
        cld
        ldx #$ff
        txs
        sta $c000           ; 80STORE off
        sta $c002           ; RAMRD off: read main
        sta $c004           ; RAMWRT off: write main
        sta $c008           ; ALTZP off: main zero page, stack and language card
        sta $c00c           ; 80COL off
        sta $c006           ; INTCXROM off: the slots' own ROM space, where the Mockingboard (slot 4) answers
        lda $c051           ; TEXT on
        lda $c054           ; PAGE2 off
        lda $c08b           ; language card: read and write RAM bank 1 (two reads)
        lda $c08b
        lda #$33
        sta $d000           ; main LC bank 1
        lda $c083           ; read and write RAM bank 2
        lda $c083
        lda #$44
        sta $d000           ; main LC bank 2
        lda #$77
        sta $e000           ; main LC, $E000-$FFFF (one area for both banks)
        lda #<nmi
        sta $fffa
        lda #>nmi
        sta $fffb
        lda #<start
        sta $fffc
        lda #>start
        sta $fffd
        lda #<irq
        sta $fffe
        lda #>irq
        sta $ffff
        sta $c009           ; ALTZP on: aux zero page, stack and language card
        lda $c08b
        lda $c08b
        lda #$55
        sta $d000           ; aux LC bank 1
        lda $c083
        lda $c083
        lda #$66
        sta $d000           ; aux LC bank 2
        lda #$88
        sta $e000           ; aux LC, $E000-$FFFF
        lda #$aa
        sta $ff             ; aux zero page
        sta $c008           ; ALTZP off
        lda #$99
        sta $ff             ; main zero page
        sta $c005           ; RAMWRT on: writes to $0200-$BFFF go to aux
        lda #$22
        sta $2000           ; aux $2000
        sta $c004           ; RAMWRT off
        lda #$11
        sta $2000           ; main $2000
        lda $c080           ; language card: read RAM bank 2, no writes
        lda #0
        sta passes
        sta passes+1
        sta frames
        sta frames+1
        sta never
        sta irqs
        sta irqs+1
        sta ticks
        lda #$80
        sta xpos
        lda $c010           ; clear any waiting key
        lda #$7f
        sta $c40e           ; Mockingboard 6522 1 (slot 4): no interrupts
        lda #$ff
        sta $c403           ; DDRA: the sound chip's bus, out
        lda #$07
        sta $c402           ; DDRB: its three control lines, out
        lda #$40
        sta $c40b           ; ACR: timer 1 free-running
        lda #<period
        sta $c404           ; T1 low latch
        lda #>period
        sta $c405           ; T1 high: loads the counter, starts it
        lda #$c0
        sta $c40e           ; IER: timer 1 interrupts on
        cli
loop:
w1:     lda $c019           ; wait for the beam to leave the vertical blank (bit 7 set)
        bpl w1
w2:     lda $c019           ; and for the next vertical blank to start (bit 7 clear)
        bmi w2
vbl:    inc frames
        bne top
        inc frames+1
top:    inc passes
        bne kbd
        inc passes+1
kbd:    lda $c000
        sta key
        lda $c010           ; clears the strobe; bit 7: a key is down
        sta akd
        bpl nokey
        dec xpos
nokey:  lda $c061
        sta btn0
        bpl nobtn
        inc xpos
nobtn:  lda $c070           ; paddle 0, as the Monitor's PREAD reads it
        ldy #0
        nop
        nop
pdl:    lda $c064
        bpl pdone
        iny
        bne pdl
        dey
pdone:  sty pdl0
click:  bit $c030           ; one click of the speaker a pass
        inc ticks
ay:     lda #0
        sta $c401           ; the register number, 0
        lda #7
        sta $c400           ; latch it
        lda #4
        sta $c400           ; inactive
        lda passes
        sta $c401           ; the value
        lda #6
        sta $c400           ; write it
        lda #4
        sta $c400           ; inactive
        jmp loop
neverr: inc never
        rts
irq:    pha
        lda $c404           ; reading T1's low counter clears its interrupt flag
        inc irqs
        bne irqd
        inc irqs+1
irqd:   pla
        rti
nmi:    rti
'''.replace("<period", f"<${IRQ_PERIOD:04X}").replace(">period", f">${IRQ_PERIOD:04X}")
CODE, LABELS = assemble(SRC, org=BASE)
START, LOOP, TOP, VBLL, KBD, NOKEY, CLICK, NEVERR, IRQ = (LABELS[k] for k in (
    "start", "loop", "top", "vbl", "kbd", "nokey", "click", "neverr", "irq"))
PASSES, FRAMES, XPOS, KEY, AKD, BTN0, PDL0, IRQS, TICKS = (LABELS[k] for k in (
    "passes", "frames", "xpos", "key", "akd", "btn0", "pdl0", "irqs", "ticks"))

# The test disk: track 0's sixteen sectors in physical order. The boot ROM loads physical sectors
# 0 to [$0800]-1 to $0800 up and jumps to $0801; sector 0 asks for all sixteen.
BOOT = r'''
        .byte 16            ; the sectors the boot ROM is to load
boot:   lda $c088,x         ; X is the slot times 16: the drive's motor off
        lda #$a5
        sta $0300           ; loaded
done:   jmp done
'''
BOOT_CODE, BOOT_LABELS = assemble(BOOT, org=0x0800)
DONE = BOOT_LABELS["done"]
FILE_SECTOR = [0, 7, 14, 6, 13, 5, 12, 4, 11, 3, 10, 2, 9, 1, 8, 15]   # physical sector -> its place in a .dsk


def sector_pattern(p):
    return bytes((p * 37 + i * 11 + (i >> 4)) & 0xFF for i in range(256))


def disk_track0():
    """The 4 KB the boot loads to $0800-$17FF, in physical order."""
    return BOOT_CODE + bytes(256 - len(BOOT_CODE)) + b"".join(sector_pattern(p) for p in range(1, 16))


def write_disk(path):
    image = bytearray(35 * 16 * 256)
    track = disk_track0()
    for p in range(16):
        image[FILE_SECTOR[p] * 256:(FILE_SECTOR[p] + 1) * 256] = track[p * 256:(p + 1) * 256]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(image)


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
    return os.path.join(SNAPDIR, name + ".json")


def clean():
    for path in [snap_path(n) for n in SNAPS] + [DISK, SHOT]:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def tools(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), "--platform", "apple2",
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
    """The machine as the determinism checks compare it: both 64Ks and the language card's banks,
    the registers with the cycle count, and everything `chips` reports but the frame count."""
    r = m.registers()
    c = m.chips()
    c.pop("frames", None)
    mem = {s: m.read(0, 0xC000, space=s) for s in ("main", "aux")}
    mem.update({s: m.read(0xD000, 0x3000, space=s) for s in ("mainlc1", "mainlc2", "auxlc1", "auxlc2")})
    return {"memory": mem, "registers": {k: r[k] for k in ("pc", "a", "x", "y", "s", "p", "cycles")}, "chips": c}


def differ(a, b):
    """What differs between two samples, in a few words."""
    out = []
    for s, x in a["memory"].items():
        y = b["memory"][s]
        if x != y:
            d = [i for i in range(len(x)) if x[i] != y[i]]
            out.append(f"{len(d)} bytes of {s} from +${d[0]:04X}")
    out += [f"{k} {a['registers'][k]} against {b['registers'][k]}" for k in a["registers"]
            if a["registers"][k] != b["registers"][k]]
    out += [k for k in a["chips"] if a["chips"][k] != b["chips"].get(k)]
    return "; ".join(out) or "identical"


def stop_after_passes(m, path, n=100):
    """Load `path`, then run to the nth arrival at the loop's top after it: a stopping checkpoint
    with an ignore count. The first instruction of a run is never stopped on, so a load at the
    top counts from the next arrival, as the machine that saved it would."""
    m.load(path)
    m.delete()
    m.checkpoint(TOP, ignore=n - 1, temporary=True)
    r = m.run()
    if r["reason"] != "checkpoint" or r["pc"] != TOP:
        raise RuntimeError(f"the run to pass {n} ended on {r['reason']} at ${r['pc']:04X}")
    return sample(m)


def setup(m):
    """Powered on with no disk, at BASIC, the test program written and started; returns once it runs."""
    m.delete()
    m.release_keys()
    m.joystick(paddles=[None, None, None, None], buttons=[False, False])
    for d in (1, 2):
        m.disk(drive=d, eject=True)
    m.boot(seconds=1)
    m.reset(hard=False)                            # CONTROL-RESET: to BASIC
    m.run(seconds=0.3)
    m.write(BASE, CODE)
    m.set_registers(pc=START)
    m.frames(5)
    if m.word(PASSES) == 0:
        raise RuntimeError("the test program did not run: the pass counter is still zero")


def fresh(m):
    """Start each phase on a running test program, so that one failure does not fail the next."""
    try:
        m.delete()
        m.release_keys()
        m.joystick(paddles=[None, None, None, None], buttons=[False, False])
        p0 = m.word(PASSES)
        m.frames(3)
        if m.read(BASE, len(CODE), space="main") == CODE and (m.word(PASSES) - p0) & 0xFFFF >= 2:
            return
    except Apple2tsError:
        pass
    print("   (the test program is not running: setting it up again)", flush=True)
    setup(m)


def instruction_starts():
    img = bytearray(0x10000)
    img[BASE:BASE + len(CODE)] = CODE
    out, a = set(), BASE
    while a < BASE + len(CODE):
        out.add(a)
        a += decode(img, a)[2] or 1
    return out


# ---------------------------------------------------------------------------
@phase("start: power on, BASIC, the test program written and started")
def p_start(m):
    h = m.call("hello")
    print(f"   server protocol {h['protocol']}, Apple2TS {h['apple2ts']}, {h['model']}, node {h['node']}")
    m.codemap("stop")
    try:
        m.sound("stop")
    except Apple2tsError:
        pass                                     # none was running
    m.delete()
    m.release_keys()
    m.joystick(paddles=[None, None, None, None], buttons=[False, False])
    for d in (1, 2):
        m.disk(drive=d, eject=True)
    r = m.boot(seconds=1)
    first = (r.get("text") or {}).get("lines", [""])[0]
    check("boots", r["reason"] == "cycles" and "Apple //e" in first, "a power-on shows the enhanced IIe's name",
          first.strip())

    m.reset(hard=False)
    m.run(seconds=0.3)
    t = m.type("PRINT 6*7\n")
    m.run(seconds=0.3)
    lines = m.text()["lines"]
    check("type-text", t["typed"] == t["of"] == 10 and "42" in [ln.strip() for ln in lines],
          "CONTROL-RESET reaches BASIC, and text typed there is read key by key and runs",
          f"{t['typed']} of {t['of']} keys read; the screen ends {' / '.join(ln for ln in lines[-4:] if ln.strip())}")

    m.write(BASE, CODE)
    back = m.read(BASE, len(CODE))
    check("write-read", back == CODE, "memory written reads back identical", f"{len(CODE)} bytes at ${BASE:04X}")
    m.set_registers(pc=START)
    r = m.frames(60)
    passes, frames = m.word(PASSES), m.word(FRAMES)
    check("program-runs", passes >= 55 and abs(passes - frames) <= 1,
          "the test program runs one pass a frame, waiting on the vertical blank ($C019)",
          f"passes {passes}, frames {frames} after 60 frames; stopped at ${r['pc']:04X}")


@phase("phase 1: static inspection")
def p1(m):
    t = time.time()
    img = m.read(0, 0x10000)
    ms = (time.time() - t) * 1000
    io = m.call("read", address=0xC000, length=16)
    check("read-64k", len(img) == 0x10000 and img[BASE:BASE + len(CODE)] == CODE and img[0xD000] == 0x44
          and img[0xE000] == 0x77 and io["io"],
          "all 64 KB as the CPU sees it in one call; $D000 shows language-card bank 2; the I/O page is flagged, "
          "untouched", f"{len(img)} bytes in {ms:.0f} ms; $D000=${img[0xD000]:02X} $E000=${img[0xE000]:02X}")
    before = m.chips()["switches"]
    got, bad = [], []
    for space, addr, val in MARKERS:
        v = m.read(addr, 1, space=space)[0]
        (got if v == val else bad).append(f"{space} ${addr:04X}=${v:02X}" + ("" if v == val else f" (wanted ${val:02X})"))
    rom = m.read(0xFFFC, 2, space="rom")
    after = m.chips()["switches"]
    same = before == after and m.read(0xD000, 1)[0] == 0x44
    check("read-banked", not bad and rom == bytes([0x62, 0xFA]) and same,
          "main, aux, the four language-card banks and the ROM, each read by name, the switches left as they were",
          ("; ".join(bad) if bad else f"{len(got)} markers right") + f"; the ROM's reset vector ${rom[1]:02X}{rom[0]:02X}; "
          f"switches {'unchanged' if same else 'CHANGED'}")
    r = m.registers()
    check("registers", all(k in r for k in ("pc", "a", "x", "y", "s", "p", "flags", "cycles")),
          "the CPU's registers and the cycle count in one call",
          f"PC ${r['pc']:04X} A ${r['a']:02X} X ${r['x']:02X} Y ${r['y']:02X} S ${r['s']:02X} {r['flags']}")
    c1, c2 = m.chips(), m.chips()
    sw = c1["switches"]
    want = {"80store": False, "ramrd": False, "ramwrt": False, "intcxrom": False, "altzp": False, "text": True,
            "page2": False, "lcram": True, "lcwrite": False, "lcbank2": True}
    wrong = {k: sw.get(k) for k in want if sw.get(k) != want[k]}
    via = c1["mockingboard"]["via"][0]
    ok = (not wrong and via["acr"] == 0x40 and via["ier"] & 0x40 and via["t1l"] == IRQ_PERIOD
          and all(k in c1 for k in ("keyboard", "buttons", "paddles", "disk", "vbl")) and c2["switches"] == sw)
    check("chip-state", ok, "the soft switches by name as the program set them, the keyboard, the game port, the drive "
          "and the Mockingboard's 6522; a second read sees the same",
          f"wrong: {wrong}" if wrong else f"6522 ACR ${via['acr']:02X} IER ${via['ier']:02X} T1 latch ${via['t1l']:04X}; "
          f"keyboard {c1['keyboard']}")
    path = snap_path("emutest_p1")
    s = m.save(path)
    sp = snapshot.spaces(path)
    head = snapshot.header(path)
    live = m.read(0, 0xC000, space="main")
    pc = m.registers()["pc"]
    marks = []
    for space, addr, val in MARKERS:
        base = 0 if space in ("main", "aux") else 0xD000
        if sp[space][addr - base] != val:
            marks.append(f"{space} ${addr:04X}")
    image = snapshot.read(path)
    check("snapshot-python", sp["main"] == live and not marks and head["pc"] == pc and image[0xD000] == 0x44,
          "a snapshot read by kit/apple2/snapshot.py matches the live machine, bank by bank",
          f"{s['bytes']} bytes on disk; main RAM {'matches' if sp['main'] == live else 'DIFFERS'}; "
          f"markers {', '.join(marks) or 'all right'}; PC ${head['pc']:04X} in the file, ${pc:04X} live")
    shot = screen.from_snapshot(path, SHOT)
    main_, aux_, swd = screen.snapshot_switches(path)
    drawn = screen.text_lines(main_, aux_, swd)
    served = m.text()["lines"]
    png_ok = open(SHOT, "rb").read(8) == b"\x89PNG\r\n\x1a\n"
    check("screenshot", png_ok and shot["mode"] == "text" and drawn == served,
          "a PNG of the screen drawn by kit/apple2/screen.py, with no display; its text is the server's",
          f"{os.path.getsize(SHOT)} bytes, {shot['mode']}; the text {'agrees' if drawn == served else 'DIFFERS'}")


STOP = {}      # the stopped snapshot and the machine it must give, for the check after a restart


@phase("phase 2: state management")
def p2(m):
    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    stopped = snap_path("emutest_stopped")
    m.save(stopped)
    r0 = m.registers()

    # a save from a second connection while the first runs the machine
    running = snap_path("emutest_running")
    other = connect(port=PORT, timeout=30)
    t, box = background(m, seconds=5)
    got = wait_running(other)
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
              "(both 64Ks, the language card, registers, cycle count, chips)",
              f"first and second {differ(seen[0], seen[1])}; first and third {differ(seen[0], seen[2])}")
        STOP[label] = (path, seen[0])

    pairs = []
    for label in ("stopped", "running"):
        m.load(stopped)
        m.delete()
        if label == "stopped":                      # stopped by a checkpoint, as a script stops it
            m.checkpoint(TOP, temporary=True)
            m.run()
        else:                                       # stopped part way through a pass, as a pause stops it
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
    x = (600 * FRAME_CYCLES / 1020484) / dt if dt else 0.0
    speed["unhooked_x_real_time"] = round(x, 1)
    check("warp", r["reason"] == "frames" and r["frames"] == 600,
          "600 frames in one call, as fast as the host runs them: the server never paces the machine",
          f"10 s of the machine's time in {dt:.2f} s, {x:.1f}x real time")
    if x < 2:
        note(f"the machine ran at {x:.1f}x real time with nothing hooked: a disk that takes a minute "
             "to load on a real Apple II takes about as long here")


def p2_restart(m):
    """The same snapshot after the server has been stopped and started again; returns the new connection."""
    print("\n=== phase 2, after a restart", flush=True)
    if "stopped" not in STOP:
        check("determinism-restart", False, "a restarted server gives the same machine", "phase 2 left no reference")
        return m
    path, ref = STOP["stopped"]
    m.close()
    port = ("--port", str(PORT))
    print("  ", tools("stop", "apple2ts", *port).replace("\n", "\n   "))
    print("  ", tools("apple2ts", *port).replace("\n", "\n   "))
    try:
        m = connect(port=PORT, timeout=60)
        again = stop_after_passes(m, path)
        check("determinism-restart", again == ref,
              "a new server process, the same snapshot and the same 100 passes give the same machine", differ(again, ref))
    except Exception as e:
        check("determinism-restart", False, "a new server process gives the same machine", repr(e))
        m = connect(port=PORT, timeout=60)
    return m


@phase("phase 2, a disk: boots, and a snapshot taken mid-read")
def p_disk(m):
    write_disk(DISK)
    want = disk_track0()
    m.delete()
    m.release_keys()
    m.disk(DISK, drive=1)
    m.disk(drive=2, eject=True)
    ends = []
    for _ in range(2):
        r = m.boot(until=DONE, seconds=20)
        ends.append((r["reason"], r["cycles"]))
    got = m.read(0x0800, 0x1000, space="main")
    loaded = m.read(0x0300, 1, space="main")[0]
    wrong = [p for p in range(16) if got[p * 256:(p + 1) * 256] != want[p * 256:(p + 1) * 256]]
    check("disk-boots", ends[0][0] == "until" and ends[0] == ends[1] and not wrong and loaded == 0xA5,
          "a 16-sector disk boots: the boot ROM loads track 0's sixteen sectors byte for byte, and two power-ons "
          "reach the end at the same cycle",
          f"ended on {ends[0][0]} at cycle {ends[0][1]}, then {ends[1][1]}; "
          f"sectors {'all right' if not wrong else 'WRONG: ' + ', '.join(map(str, wrong))}")

    total = ends[0][1]
    mid = snap_path("emutest_disk")
    m.boot(seconds=0.5 * total / 1020484)              # half way through the boot: the drive is reading
    motor = (m.chips().get("disk") or {}).get("motor")
    m.save(mid)
    a = m.until(DONE, max_cycles=20 * 1020484)
    a_mem = (m.read(0, 0xC000, space="main"), m.registers())
    m.load(mid)
    b = m.until(DONE, max_cycles=20 * 1020484)
    b_mem = (m.read(0, 0xC000, space="main"), m.registers())
    check("disk-in-snapshot", motor and a["reason"] == b["reason"] == "until" and a_mem == b_mem and a["cycles"] == total,
          "a snapshot saved half way through reading a disk loads and reads on to the same memory at the same cycle",
          f"the motor {'on' if motor else 'OFF'} when saved; the saving machine finished at cycle {a['cycles']}, "
          f"the loaded one at {b['cycles']}; memory {'identical' if a_mem[0] == b_mem[0] else 'DIFFERS'}")
    m.disk(drive=1, eject=True)


@phase("phase 3: live measurement")
def p3(m):
    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    top = m.checkpoint(TOP, stop=False)
    never = m.checkpoint(NEVERR, stop=False)
    vbl = m.checkpoint(VBLL, stop=False)
    irq = m.checkpoint(IRQ, stop=False)
    store = m.checkpoint(PASSES, kind="write", stop=False)
    load = m.checkpoint(0xC000, kind="read", stop=False)
    p0, f0, i0, c0 = m.word(PASSES), m.word(FRAMES), m.word(IRQS), m.registers()["cycles"]
    r = m.frames(250)
    dp, df = (m.word(PASSES) - p0) & 0xFFFF, (m.word(FRAMES) - f0) & 0xFFFF
    di, dc = (m.word(IRQS) - i0) & 0xFFFF, m.registers()["cycles"] - c0
    h = {c["checkpoint"]: c["hits"] for c in m.checkpoints()}
    check("counting-checkpoint", dp >= 240 and abs(h[top] - dp) <= 1,
          "a checkpoint that counts without stopping, on the loop's top, against the program's own pass counter",
          f"{h[top]} hits, {dp} passes in 250 frames; the run ended on {r['reason']}")
    check("never-runs", h[never] == 0, "a checkpoint on a routine nothing calls stays at zero", h[never])
    check("vbl-count", abs(h[vbl] - df) <= 1 and abs(df - 250) <= 2,
          "the program sees one vertical blank a frame, and a checkpoint on it counts them",
          f"{h[vbl]} hits, {df} counted by the program in 250 frames")
    expect = dc / (IRQ_PERIOD + 2)
    check("irq-count", abs(h[irq] - di) <= 1 and abs(di - expect) <= 2,
          "the Mockingboard timer's interrupts, counted by a checkpoint on the handler",
          f"{h[irq]} hits, {di} counted by the handler, {expect:.1f} expected from {dc} cycles")
    check("watch-store", abs(h[store] - dp) <= 1, "a write checkpoint counts the stores to the pass counter",
          f"{h[store]} stores, {dp} passes")
    check("watch-load", abs(h[load] - dp) <= 1, "a read checkpoint on the keyboard ($C000) counts the program's reads",
          f"{h[load]} reads, {dp} passes")
    m.delete()
    m.checkpoint(VBLL, temporary=True)
    m.frames(3)
    ca = m.registers()["cycles"]
    m.checkpoint(VBLL, ignore=99, temporary=True)
    m.frames(110)
    cb = m.registers()["cycles"]
    per = (cb - ca) / 100
    check("cycle-counter", abs(per - FRAME_CYCLES) < 0.5,
          "the cycle counter gives 17,030 cycles a frame (65 cycles a line, 262 lines), measured between the "
          "program's sightings of the vertical blank 100 frames apart", f"{per:.2f} a frame")

    m.delete()
    t0 = time.time()
    m.frames(100)
    bare = time.time() - t0
    m.codemap("start")
    m.codemap("zap")
    p0 = m.word(PASSES)
    t0 = time.time()
    m.frames(100)
    rec = time.time() - t0
    dp = (m.word(PASSES) - p0) & 0xFFFF
    ran = {a: (n, c) for a, n, c in m.codemap("stop")["instructions"]}
    img = bytearray(0x10000)
    img[BASE:BASE + len(CODE)] = CODE
    wrong = [f"{n} ${LABELS[n]:04X}" for n in ("loop", "w2", "vbl", "top", "kbd", "nokey", "nobtn", "pdl", "click", "ay", "irq")
             if LABELS[n] not in ran or ran[LABELS[n]][0] != decode(img, LABELS[n])[2]]
    outside = sorted(a for a in ran if not BASE <= a < BASE + len(CODE))
    check("code-map", not wrong and NEVERR not in ran and abs(ran.get(TOP, (0, 0))[1] - dp) <= 1 and not outside,
          "every address an instruction started at, with its length and its count, in one call",
          f"{len(ran)} addresses ran; `never` {'absent' if NEVERR not in ran else 'PRESENT'}; "
          f"{'each of the loop labels there, its length right' if not wrong else 'missing or wrong: ' + ', '.join(wrong)}; "
          f"top {ran.get(TOP, (0, 0))[1]} times in {dp} passes; outside the program: {[hex(a) for a in outside[:4]]}; "
          f"100 frames took {bare:.2f} s, {rec:.2f} s recording")
    speed["code_map_cost"] = round(rec / bare, 2) if bare else None

    m.delete()
    top = m.checkpoint(TOP, stop=False)
    other = connect(port=PORT, timeout=30)
    t, box = background(m, seconds=30)
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
             "slices of 50,000 cycles, and this host runs a slice slowly")

    m.delete()
    t0, p0 = m.read(TICKS, 1)[0], m.word(PASSES)
    m.sound("start")
    m.frames(60)
    cap = m.sound("stop", path=snap_path("emutest_sound"))
    data = json.load(open(snap_path("emutest_sound")))
    os.remove(snap_path("emutest_sound"))
    ticks = (m.read(TICKS, 1)[0] - t0) & 0xFF
    clicks = data["speaker"]
    gaps = [b - a for a, b in zip(clicks, clicks[1:])]
    check("speaker-log", len(clicks) == ticks and gaps and all(abs(g - FRAME_CYCLES) <= 40 for g in gaps),
          "every access to the speaker ($C030) with its cycle: one a pass, a frame apart",
          f"{len(clicks)} clicks, {ticks} passes; gaps {min(gaps) if gaps else '-'} to {max(gaps) if gaps else '-'} cycles")
    writes = [w for w in data["mockingboard"] if w[1] == 0 and w[2] == 0]
    values = [w[3] for w in writes]
    steady = all((b - a) & 0xFF == 1 for a, b in zip(values, values[1:]))
    check("mockingboard-log", len(writes) == ticks and steady and cap["writes"] == len(data["mockingboard"]),
          "every change the program makes to a Mockingboard sound chip's registers, with its cycle",
          f"{len(writes)} writes to chip 0's register 0 in {ticks} passes, the values "
          f"{'counting up by one' if steady else 'NOT counting up'}; {cap['writes']} writes in all")


@phase("phase 4: frame stepping with inputs")
def p4(m):
    m.delete()
    m.release_keys()
    m.checkpoint(TOP, temporary=True)
    r = m.run()
    check("exact-stop", r["reason"] == "checkpoint" and r["pc"] == TOP == m.registers()["pc"],
          "a stopping checkpoint stops on its own instruction, before it runs",
          f"stopped at ${r['pc']:04X} on {r['reason']}, the checkpoint at ${TOP:04X}")

    p0 = m.word(PASSES)
    r1 = m.step()
    r2 = m.step(2)
    check("step-instruction", r1["reason"] == r2["reason"] == "step" and r1["pc"] == TOP + 2
          and r1["next"]["address"] == TOP + 2 and m.word(PASSES) == (p0 + 1) & 0xFFFF,
          "a step returns when it is done, with the new PC and the next instruction",
          f"one step from ${TOP:04X} to ${r1['pc']:04X} ({r1['next']['text']}), two more to ${r2['pc']:04X}")

    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    m.key("A")
    held = m.chips()["keyboard"]
    r = m.until(NOKEY, max_cycles=2 * FRAME_CYCLES)
    key, akd = m.read(KEY, 1)[0], m.read(AKD, 1)[0]
    check("input-lands", r["reason"] == "until" and key == 0xC1 and akd & 0x80,
          "A pressed while stopped is waiting in $C000 and held at the program's next read",
          f"the keyboard {held}; the program read $C000=${key:02X}, $C010=${akd:02X}")

    m.until(CLICK, max_cycles=2 * FRAME_CYCLES)      # part way through a pass, so that no frame starts on the top
    m.frames(1)
    cp = m.checkpoint(TOP, stop=False)
    xs, per = [m.read(XPOS, 1)[0]], []
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
          "ten one-frame advances with A held: the loop's top is reached once a frame, and x moves one step a frame",
          f"hits a frame {','.join(map(str, per))}; x {' '.join(f'{x:02X}' for x in xs)}; {step_ms:.0f} ms a step with its reads")

    m.key("A", down=False)
    m.frames(2)
    xa, ka = m.read(XPOS, 1)[0], m.read(AKD, 1)[0]
    m.frames(5)
    xb = m.read(XPOS, 1)[0]
    held = m.call("keys")["held"]
    check("input-released", xa == xb and not ka & 0x80 and held["key"] is None,
          "released when the script says: the program reads the key as up and x stays where it was",
          f"x ${xa:02X}, then ${xb:02X} five frames on; the program's $C010 ${ka:02X}; held {held}")
    m.delete(cp)

    m.joystick(buttons=[True])
    m.frames(2)
    b0 = m.read(BTN0, 1)[0]
    m.joystick(buttons=[False])
    m.frames(2)
    b1 = m.read(BTN0, 1)[0]
    check("button", b0 & 0x80 and not b1 & 0x80, "button 0 (the Open Apple key) held and let go, read at $C061",
          f"down ${b0:02X}, up ${b1:02X}")
    vals = []
    for v in (20, 100, 200):
        m.joystick(paddles=[v])
        m.frames(2)
        vals.append(m.read(PDL0, 1)[0])
    m.joystick(paddles=[None])
    check("paddle", all(abs(a - b) <= max(3, b // 20) for a, b in zip(vals, (20, 100, 200))),
          "paddle 0 set to 20, 100 and 200 reads back through the program's 11-cycle timing loop", f"read {vals}")

    m.delete()
    cp = m.checkpoint(TOP)
    ok, err = 0, None
    t0 = time.time()
    try:
        for _ in range(100):
            r = m.run(max_cycles=2 * FRAME_CYCLES)
            m.read(PASSES, 2)
            m.registers()
            ok += r["reason"] == "checkpoint" and r["pc"] == TOP
    except Apple2tsError as e:
        err = str(e)
    dt = time.time() - t0
    m.delete(cp)
    check("unpaced-calls", ok == 100 and err is None,
          "a hundred runs back to back, with reads between and no pacing, each stopping on the armed checkpoint",
          f"{ok} of 100 {err or ''}; {300 / dt:.0f} calls a second")

    m.delete()
    starts = instruction_starts()
    other = connect(port=PORT, timeout=30)
    rnd = random.Random(12345)
    held_x = tried = 0
    odd = []
    for i in range(30):
        t, box = background(m)
        wait_running(other)
        time.sleep(rnd.uniform(0.001, 0.03))
        other.call("stop")
        t.join(60)
        tried += 1
        pc = m.registers()["pc"]
        if pc not in starts:
            odd.append(f"${pc:04X}")
        v = (i * 37 + 11) & 0xFF
        m.set_registers(x=v)                       # the program's loop never changes X
        m.frames(1)
        held_x += m.registers()["x"] == v
    other.close()
    check("pause-at-instruction", held_x == 30 and tried == 30 and not odd,
          "thirty stops from a second connection at varied moments each land between two instructions, "
          "and a register set there holds through the next frame",
          f"X held after {held_x} of {tried} stops; stops off an instruction's first byte: {odd[:5] or 'none'}")

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
    if "-h" in sys.argv or "--help" in sys.argv:   # it resets the machine: never on a request for usage
        print(__doc__)
        return
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SNAPDIR, exist_ok=True)
    clean()
    try:
        m = connect(port=PORT, timeout=60)
        h = m.call("hello")
    except Apple2tsError as e:
        sys.exit(f"{e}\nthen run check-emulator again.")
    build = f"Apple2TS {h['apple2ts']} in the kit's server (protocol {h['protocol']}), node {h['node']}, on {sys.platform}"
    print(build)
    started = time.time()
    p_start(m)
    if not any(n == "program-runs" and ok for n, ok in results):
        print("\nthe test program never ran; stopping here")
        sys.exit(1)
    for step in (p1, p3, p4, p2):
        fresh(m)
        step(m)
    p_disk(m)
    m = p2_restart(m)
    try:
        m.delete()
        m.release_keys()
        for d in (1, 2):
            m.disk(drive=d, eject=True)
        m.reset(hard=True)                         # left powered on with no disk, as the server starts
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
