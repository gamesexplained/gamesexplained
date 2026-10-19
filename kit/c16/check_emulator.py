#!/usr/bin/env python3
"""Test the kit's Commodore 16 (or Plus/4) against kit/EMULATOR.md, with a test program, a test tape
and a test disk of its own.

    python3 kit/scripts/tools.py --platform c16 check-emulator     (the usual way in)
    python3 kit/c16/check_emulator.py [--keep]

The machine is plus4emu's, inside the kit's server (kit/c16/p4emu_server.py), and every check goes
through kit/c16/plus4emu.py, the client a script uses, so what passes here is what a script gets.
Needs the server up (`tools.py plus4emu`) and nothing else: no game, no tape, no disk. It powers the
machine on, writes a test program of about two hundred bytes to $2000, points PC at it, and
measures the four phases on that; then it writes a test tape and a test disk of its own and loads
each with the KERNAL. Anything the machine was doing is lost. It restarts the server once (phase 2,
"after a restart") and leaves it running, powered on with no tape or disk. `--keep` leaves this
run's snapshots, tape and disk in tools/c16-home/snapshots.

The test program (assembled below, so it is source and not a binary) runs under the KERNAL with
interrupts on, one pass a frame. Its own handler on the KERNAL's IRQ vector ($0314) takes TED's
raster interrupt, set for line $CC, and counts it. Everything lives in $2000-$21FF, inside a 16 KB
C16's RAM:

  $2100/1  passes  +1 a pass
  $2102/3  frames  +1 a raster interrupt (once a frame), counted by the handler
  $2104    xpos    -1 a pass while Z is held: each pass reads the keyboard matrix itself (row 1
                   written to the latch at $FD30, then $FF08 written and read: Z is column 4,
                   low when down)
  $2105    key     1 while Z is down, as this pass read it
  $2106    timer   TED's timer 1, low byte ($FF00), read at the same point every pass
  $2107    never   counts calls of `neverr`, which nothing calls
  $2108    joy1    $FF08 as read with joystick 1 selected (bit 2 of the value written low)
  $2109    joy2    the same for joystick 2 (bit 1 low)
  $210A/B  irqs    every interrupt the handler saw
  $210C/D  jx      +1 a pass while joystick 1 is held left (bit 2 of joy1 low)

The pass also writes the pass counter's low byte to $FF0E (voice 1's frequency, low byte), so a
log of TED's sound registers has one write a pass, a frame apart, and xpos and the timer to the
first two characters of the screen ($0C00), so a screenshot changes with them. The handler
leaves by the KERNAL's own exit at $FCBE, which restores the ROM bank from $FB, then Y, X and A,
and returns (the KERNAL's source, interrupt.src: the 318004-05 KERNAL of the PAL machines).

The test tape is a C16 TAP of version 1, the version the C16's tapes are kept in, which the check
writes itself in the format the KERNAL's own SAVE writes (tapwrt.src): a header block naming one program file, then the program, each block twice. The test
disk is a 1541 image of one program file. Both programs load at $3000, a pattern of their own:
2,000 bytes on the disk, 600 on the tape.

Every check has a name. The summary lists the names that failed, and
kit/skills/c16/tool-plus4emu/workarounds.md says, per name, what to do instead. Run it after
installing, and again after a change to plus4emu or the server.

A check fails for what the machine does, never for how fast the host runs it: counts are compared
with the test program's own counters, and the host's speed is reported on lines of its own, NOTEs
when it is slow, which fail nothing.
"""
import json, os, random, struct, subprocess, sys, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
from plus4emu import Plus4emuError, connect, DEFAULT_PORT, FRAME_CYCLES, CLOCK   # noqa: E402
from asm6502 import assemble   # noqa: E402
from m6502 import decode   # noqa: E402
import snapshot   # noqa: E402  kit/c16/snapshot.py, the reader the listing uses

PORT = DEFAULT_PORT        # KIT_PLUS4EMU_PORT, which the launcher's --port sets
SNAPDIR = os.path.join(ROOT, "tools", "c16-home", "snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
RESULT = "c16.json"        # each platform's check writes its own file here; `status` prints the last
WORKAROUNDS = "kit/skills/c16/tool-plus4emu/workarounds.md"
SNAPS = ("emutest_p1", "emutest_running", "emutest_stopped", "emutest_writes", "emutest_cont_stopped",
         "emutest_cont_running", "emutest_rollback", "emutest_tape", "emutest_disk") + tuple(f"emutest_anywhere{i}" for i in range(12))
TAPE = os.path.join(SNAPDIR, f"emutest-{PORT}.tap")    # each file named for the port, so a check of each
DISK = os.path.join(SNAPDIR, f"emutest-{PORT}.d64")    # model can run at once, on servers of their own
SHOT = os.path.join(SNAPDIR, f"emutest_screen-{PORT}.png")
FRAME = FRAME_CYCLES

ORG = 0x2000
SRC = r'''
passes = $2100
frames = $2102
xpos   = $2104
key    = $2105
timer  = $2106
never  = $2107
joy1   = $2108
joy2   = $2109
irqs   = $210a
jx     = $210c
start:  sei
        lda #<irq
        sta $0314           ; the KERNAL's IRQ vector
        lda #>irq
        sta $0315
        lda #0
        sta passes
        sta passes+1
        sta frames
        sta frames+1
        sta never
        sta key
        sta irqs
        sta irqs+1
        sta jx
        sta jx+1
        lda #$80
        sta xpos
        lda #$cc            ; raster compare: line $CC
        sta $ff0b
        lda #$02            ; the raster interrupt only; compare bit 8 clear
        sta $ff0a
        lda #$ff
        sta $ff09           ; acknowledge anything pending
        cli
loop:   lda frames
wait:   cmp frames          ; one pass a frame
        beq wait
top:    inc passes
        bne kscan
        inc passes+1
kscan:  lda #$fd            ; keyboard row 1, Z's
        sta $fd30
        lda #$ff            ; joysticks not selected
        sta $ff08           ; TED latches the keyboard
        lda $ff08
got:    ldx #0
        and #$10            ; column 4: Z, low when down
        bne nokey
        inx
        dec xpos
nokey:  stx key
        lda #$ff
        sta $fd30           ; no row
        lda #$fb            ; bit 2 low: joystick 1
        sta $ff08
        lda $ff08
        sta joy1
        and #$04            ; joystick 1 left
        bne nojx
        inc jx
        bne nojx
        inc jx+1
nojx:   lda #$fd            ; bit 1 low: joystick 2
        sta $ff08
        lda $ff08
        sta joy2
        lda $ff00           ; TED timer 1, low byte
        sta timer
        lda passes
click:  sta $ff0e           ; voice 1 frequency, low byte: one sound write a pass
        lda xpos
        sta $0c00
        lda timer
        sta $0c01
        jmp loop
neverr: inc never
        rts
irq:    inc irqs
        bne irq1
        inc irqs+1
irq1:   lda $ff09
        sta $ff09           ; acknowledge what was set
        and #$02
        beq irqout
vsync:  inc frames
        bne irqout
        inc frames+1
irqout: jmp $fcbe           ; the KERNAL's exit: ROM bank, Y, X, A, RTI
'''
CODE, L = assemble(SRC, org=ORG)
PASSES, FRAMES, XPOS, KEY, TIMER, NEVER, JOY1, JOY2, IRQS, JX = (L[k] for k in (
    "passes", "frames", "xpos", "key", "timer", "never", "joy1", "joy2", "irqs", "jx"))
Z_KEY = (1, 4)          # Z: $FD30 bit 1 low selects its row, it pulls $FF08 bit 4 low

# The test tape's and disk's program, for $3000, inside a C16's 16 KB: 2,000 bytes on the disk,
# the first 600 of them on the tape, which reads about 70 bytes a second and every block twice
MEDIA_AT = 0x3000
MEDIA = bytes((i * 13 + 5 + (i >> 8)) & 0xFF for i in range(2000))
TAPE_BYTES = 600

# The C16's tape, as the KERNAL writes it (tapwrt.src): every dipole a low half-wave then a high
# one of the same length; a short is 212 of TED's timer ticks a half, a long 424 and a word marker
# 850. A byte is a word marker (word, long), eight bits from bit 0 (0: short, long; 1: long,
# short) and a parity bit; a block is a leader of shorts, a countdown 9 to 1 (bit 7 set on the
# first of its two copies), the block's type, its bytes, their checksum, one long and 194 shorts.
# The file is a C16 TAP of version 1, as the C16's tapes are kept: one byte a whole wave (the
# dipole), in units of 8 ticks (kit/skills/c16/c16-reference, "Tapes").
T_SHORT, T_LONG, T_WORD = 54, 106, 212


def tape_block(out, data, kind, first, leader):
    def dip(n):
        out.append(n)

    def byte(v):
        dip(T_WORD)
        dip(T_LONG)
        parity = 1
        for i in range(8):
            if v >> i & 1:
                dip(T_LONG)
                dip(T_SHORT)
            else:
                parity += 1
                dip(T_SHORT)
                dip(T_LONG)
        if parity & 1:
            dip(T_LONG)
            dip(T_SHORT)
        else:
            dip(T_SHORT)
            dip(T_LONG)
    for _ in range(leader):
        dip(T_SHORT)
    for cd in range(9, 0, -1):
        byte(cd | (0x80 if first else 0))
    chk = kind
    if kind:
        byte(kind)
    for b in data:
        byte(b)
        chk ^= b
    byte(chk)
    dip(T_LONG)
    for _ in range(194):
        dip(T_SHORT)


def write_tape(path, name="TEST"):
    """A tape of one program file (type 3: it loads where its header says) for MEDIA_AT."""
    end = MEDIA_AT + TAPE_BYTES
    head = bytes([MEDIA_AT & 255, MEDIA_AT >> 8, end & 255, end >> 8]) + name.encode()
    head += b" " * (191 - len(head))
    waves = bytearray()
    for data, kind in ((head, 3), (MEDIA[:TAPE_BYTES], 0)):
        for first, leader in ((True, 3000), (False, 250)):
            tape_block(waves, data, kind, first, leader)
    with open(path, "wb") as f:
        f.write(b"C16-TAPE-RAW" + bytes([1, 2, 0, 0]) + struct.pack("<I", len(waves)) + bytes(waves))


SECTORS = [21] * 17 + [19] * 7 + [18] * 6 + [17] * 5     # a 1541's sectors on tracks 1-35


def write_disk(path, name="TEST"):
    """A 1541 disk of one program file for MEDIA_AT, laid out on track 17 every tenth sector."""
    offs, o = [], 0
    for n in SECTORS:
        offs.append(o)
        o += n * 256
    img = bytearray(o)

    def at(t, s):
        return offs[t - 1] + s * 256
    body = bytes([MEDIA_AT & 255, MEDIA_AT >> 8]) + MEDIA
    parts = [body[i:i + 254] for i in range(0, len(body), 254)]
    used, s, chain = set(), 0, []
    for _ in parts:
        while (17, s) in used:
            s = (s + 1) % SECTORS[16]
        chain.append((17, s))
        used.add((17, s))
        s = (s + 10) % SECTORS[16]
    for i, (t, s) in enumerate(chain):
        p = at(t, s)
        img[p:p + 2] = bytes(chain[i + 1]) if i + 1 < len(chain) else bytes([0, len(parts[i]) + 1])
        img[p + 2:p + 2 + len(parts[i])] = parts[i]
    used |= {(18, 0), (18, 1)}
    bam = at(18, 0)
    img[bam:bam + 4] = bytes([18, 1, 0x41, 0])
    for t in range(1, 36):
        free = [s for s in range(SECTORS[t - 1]) if (t, s) not in used]
        bits = sum(1 << s for s in free)
        img[bam + 4 * t:bam + 4 * t + 4] = bytes([len(free), bits & 255, bits >> 8 & 255, bits >> 16 & 255])

    def pad(text, n):
        return text.encode()[:n] + b"\xa0" * (n - len(text.encode()[:n]))
    img[bam + 0x90:bam + 0xAB] = pad("KIT TEST", 16) + b"\xa0\xa0KT\xa02A\xa0\xa0\xa0\xa0"
    d = at(18, 1)
    img[d:d + 5] = bytes([0, 255, 0x82]) + bytes(chain[0])          # the end of the directory; a closed PRG
    img[d + 5:d + 21] = pad(name, 16)
    img[d + 30:d + 32] = bytes([len(chain), 0])
    with open(path, "wb") as f:
        f.write(img)


results = []
speed = {}     # the host: how fast the machine runs here. Never a check
notes = []     # what was said about the host; repeated in the summary
STOP = {}      # the stopped snapshot and the machine it must give, for the check after a restart


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
    return os.path.join(SNAPDIR, f"{name}-{PORT}.p4emu")


def clean():
    for path in [snap_path(n) for n in SNAPS] + [TAPE, DISK, SHOT]:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def tools(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), "--platform", "c16",
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


def screen_text(m):
    return " | ".join(line.strip() for line in m.text()["lines"] if line.strip())


def sample(m):
    """The machine as the determinism checks compare it: the RAM, the registers with the cycle
    count, and TED's registers."""
    r = m.registers()
    c = m.chips()
    return {"ram": m.read(0, 0x4000, space="ram"), "registers": {k: r[k] for k in ("pc", "a", "x", "y", "s", "p", "cycles")},
            "ted": c["ted_bytes"]}


def differ(a, b):
    """What differs between two samples, in a few words."""
    out = []
    x, y = a["ram"], b["ram"]
    if x != y:
        d = [i for i in range(len(x)) if x[i] != y[i]]
        out.append(f"{len(d)} bytes of RAM from ${d[0]:04X}")
    out += [f"{k} {a['registers'][k]} against {b['registers'][k]}" for k in a["registers"]
            if a["registers"][k] != b["registers"][k]]
    if a["ted"] != b["ted"]:
        out.append("TED's registers")
    return "; ".join(out) or "identical"


def stop_at_top(m, ignore=0):
    """Run to the loop's top (the `ignore`+1-th arrival), and stop there."""
    cp = m.checkpoint(L["top"], ignore=ignore, temporary=True)
    r = m.run(frames=ignore + 20)
    if r["reason"] != "checkpoint":
        m.delete(cp)
    return r


def stop_after_passes(m, path, n=100):
    """Load `path`, then run to the nth arrival at the loop's top after it."""
    m.load(path)
    m.delete()
    r = stop_at_top(m, ignore=n - 1)
    if r["reason"] != "checkpoint" or r["pc"] != L["top"]:
        raise RuntimeError(f"the run to pass {n} ended on {r['reason']} at ${r['pc']:04X}")
    return sample(m)


def setup(m):
    """Powered on with no tape or disk, at BASIC, the test program written and started."""
    m.delete()
    m.release_keys()
    m.tape(eject=True)
    m.disk(eject=True)
    m.reset(hard=True)
    m.frames(150)                                  # the reset and BASIC's banner take about 2.5 seconds
    m.write(ORG, CODE)
    m.set_registers(pc=L["start"])
    m.frames(5)
    if m.word(PASSES) == 0:
        raise RuntimeError("the test program did not run: the pass counter is still zero")


def fresh(m):
    """Start each phase on a running test program, so that one failure does not fail the next."""
    try:
        m.delete()
        m.release_keys()
        p0 = m.word(PASSES)
        m.frames(3)
        if m.read(ORG, len(CODE), space="ram") == CODE and (m.word(PASSES) - p0) & 0xFFFF >= 2:
            return
    except Plus4emuError:
        pass
    print("   (the test program is not running: setting it up again)", flush=True)
    setup(m)


def instruction_starts():
    img = bytearray(0x10000)
    img[ORG:ORG + len(CODE)] = CODE
    out, a = set(), ORG
    while a < ORG + len(CODE):
        out.add(a)
        d = decode(img, a)
        a += d[2] if d else 1
    return out


# ---------------------------------------------------------------------------
@phase("start: power on, BASIC, the test program written and started")
def p_start(m):
    m.delete()
    m.release_keys()
    m.tape(eject=True)
    m.disk(eject=True)
    m.reset(hard=True)
    m.frames(150)
    text = screen_text(m)
    check("boots", "COMMODORE BASIC V3.5" in text, "a power-on shows BASIC 3.5's banner", text[:120])
    m.write(ORG, CODE)
    back = m.read(ORG, len(CODE))
    check("write-read", back == CODE, "memory written reads back identical", f"{len(CODE)} bytes at ${ORG:04X}")
    m.set_registers(pc=L["start"])
    r = m.frames(60)
    passes, frames = m.word(PASSES), m.word(FRAMES)
    check("program-runs", 55 <= passes <= 62 and abs(passes - frames) <= 1,
          "the test program runs one pass a frame, synchronised on TED's raster interrupt",
          f"{passes} passes, {frames} frames in 60 frames; stopped at ${r['pc']:04X}")


@phase("phase 1: static inspection")
def p1(m):
    t0 = time.time()
    img = m.read(0, 0x10000)
    dt = time.time() - t0
    kvec = m.read(0xFFFC, 4, space="kernal")
    check("read-64k", len(img) == 0x10000 and img[ORG:ORG + len(CODE)] == CODE and img[0xFFFC:0xFFFE] == kvec[:2],
          "all 64 KB as the CPU sees it in one call, the KERNAL's vectors at the top",
          f"{len(img)} bytes, {dt * 1000:.1f} ms; RESET vector ${img[0xFFFD]:02X}{img[0xFFFC]:02X}")
    rom_before = m.chips()["rom"]
    m.write(0xB800, b"\x44", space="ram")
    m.write(0xFC00, b"\x77", space="ram")
    got = {}
    for name, space, addr in (("ram $B800", "ram", 0xB800), ("ram $FC00", "ram", 0xFC00), ("cpu $B800", "cpu", 0xB800),
                              ("basic $B800", "basic", 0xB800), ("kernal $FC00", "kernal", 0xFC00),
                              ("cpu $FC00", "cpu", 0xFC00)):
        got[name] = m.read(addr, 1, space=space)[0]
    rom_after = m.chips()["rom"]
    ok = (got["ram $B800"] == 0x44 and got["ram $FC00"] == 0x77 and got["cpu $B800"] == got["basic $B800"] != 0x44
          and got["cpu $FC00"] == got["kernal $FC00"] != 0x77 and rom_before == rom_after)
    check("read-banked", ok, "the RAM under the ROMs, and BASIC and the KERNAL by name, without paging them in",
          "; ".join(f"{k}={v:02X}" for k, v in got.items()) + f"; ROM paged in {rom_before} -> {rom_after}")
    rg = m.registers()
    check("registers", all(k in rg for k in ("pc", "a", "x", "y", "s", "p", "cycles")), "PC, A, X, Y, S, P and the cycle count",
          {k: rg.get(k) for k in ("pc", "a", "x", "y", "s", "p", "cycles")})
    c = m.chips()
    regs = bytes.fromhex(c["ted_bytes"])
    okt = len(regs) == 32 and regs[0x0A] & 0x02 and regs[0x0B] == 0xCC and c["rom"] is True and isinstance(c["raster"], int)
    check("chip-state", okt, "TED's registers, its raster line and the ROM paging, read without side effects",
          f"$FF0A=${regs[0x0A]:02X} $FF0B=${regs[0x0B]:02X} raster {c['raster']} ROM paged in {c['rom']}")
    stop_at_top(m)
    path = snap_path("emutest_p1")
    m.save(path)
    live = m.read(ORG, 0x100, space="ram")
    pc = m.registers()["pc"]
    try:
        image = snapshot.read(path)
        h = snapshot.header(path)
        okprog = image[ORG:ORG + 0x100] == live
        okted = h["ted"][0x0A] & 0x5F == regs[0x0A] & 0x5F and h["ted"][0x0B] == regs[0x0B]
        check("snapshot-python", okprog and h["pc"] == pc and okted,
              "256 bytes of RAM, the PC and TED's interrupt registers, read from the snapshot file by kit/c16/snapshot.py, "
              "match the live machine",
              f"{os.path.getsize(path)} bytes; program {'matches' if okprog else 'DIFFERS'}; pc ${h['pc']:04X} against ${pc:04X}; "
              f"TED {'matches' if okted else 'DIFFERS'}")
    except SystemExit as e:
        check("snapshot-python", False, "the snapshot read by kit/c16/snapshot.py matches the live machine", str(e))
    r = m.screenshot(SHOT)
    okp = os.path.exists(SHOT) and open(SHOT, "rb").read(4) == b"\x89PNG"
    check("screenshot", okp, "a PNG of the screen, with no display", f"{r.get('width')} x {r.get('height')}")


@phase("phase 2: state management")
def p2(m):
    other = connect(port=PORT, timeout=60)
    t, box = background(m, frames=600)
    got = wait_running(other)
    p_before = other.word(PASSES)
    path_run = snap_path("emutest_running")
    err = None
    try:
        other.save(path_run)
    except Plus4emuError as e:
        err = str(e)
    time.sleep(0.05)
    still = other.status()["running"]
    other.stop()
    t.join(120)
    p_after = m.word(PASSES)
    check("save-running", got and err is None and os.path.exists(path_run) and still and p_after > p_before,
          "a snapshot saved from a second connection while the machine runs, and the run goes on",
          f"running seen {got}; save {err or 'ok'}; still running {still}; passes {p_before} -> {p_after}")
    stop_at_top(m)
    path_stop = snap_path("emutest_stopped")
    m.save(path_stop)
    r0 = m.registers()
    m.frames(30)
    m.load(path_stop)
    st = m.status()
    r1 = m.registers()
    time.sleep(0.3)
    r2 = m.registers()
    check("load-paused", r1["pc"] == r0["pc"] == L["top"] and r1["cycles"] == r0["cycles"] and r2 == r1 and not st["running"],
          "a load leaves the machine stopped at the saved state",
          f"pc ${r1['pc']:04X}, cycles {r0['cycles']} -> {r1['cycles']}, stays {r2 == r1}, running {st['running']}")
    stops, bad = [], []
    for i in range(12):
        how = {"frames": 1 + i % 3} if i % 2 == 0 else {"cycles": 1234 + 3571 * i}
        m.run(**how)
        ra = m.registers()
        p = snap_path(f"emutest_anywhere{i}")
        sv = m.save(p)
        stops.append((p, ra, m.registers(), how))
        if sv.get("drift"):
            bad.append(f"save {i} ({how}): {sv['drift']}")
    for p, ra, rb, how in stops:
        m.load(p)
        rc = m.registers()
        if not ra == rb == rc:
            bad.append(f"{how}: stop pc ${ra['pc']:04X} cycle {ra['cycles']}, after the save ${rb['pc']:04X} "
                       f"{rb['cycles']}, loaded ${rc['pc']:04X} {rc['cycles']}")
    check("save-anywhere", not bad, "twelve saves at stops one to three frames or a few thousand cycles apart: "
          "each leaves the machine at its stop, and each loads back to it", "; ".join(bad[:3]) or "all twelve")
    # A script makes several changes at one stop. A save runs the machine back from the last
    # clean snapshot, making each change again where it was made, and must make all of them.
    stop_at_top(m)
    marks = {0x3E00 + i: (0x5A + 17 * i) & 0xFF for i in range(5)}
    for a in list(marks)[:3]:
        m.write(a, bytes([marks[a]]))
    m.write(0xFF19, bytes([0x26]))
    stop_at_top(m)
    for a in list(marks)[3:]:
        m.write(a, bytes([marks[a]]))
    m.frames(1)
    path = snap_path("emutest_writes")
    m.save(path)
    kept = {a: m.read(a, 1)[0] for a in marks}
    border = m.chips()["ted"]["ted_border"] & 0x7F
    m.write(0x3E00, bytes(5))
    m.load(path)
    loaded = {a: m.read(a, 1)[0] for a in marks}
    check("writes-replayed", kept == marks == loaded and border == 0x26,
          "six writes at two stops, four at the first and one of them to TED, are all made again by the replay a save "
          "runs, and load back", f"after the save {' '.join(f'{v:02X}' for v in kept.values())}, TED's border "
          f"{border:02X}; loaded {' '.join(f'{v:02X}' for v in loaded.values())}; written "
          f"{' '.join(f'{v:02X}' for v in marks.values())}, border 26")
    cp = m.checkpoint(L["top"], stop=False)
    m.frames(10)
    before = m.hits(cp)
    m.load(path_stop)
    listed = any(c["checkpoint"] == cp for c in m.checkpoints())
    m.frames(10)
    after = m.hits(cp)
    m.delete(cp)
    check("checkpoints-survive-load", listed and after - before >= 9,
          "a counting checkpoint set before a load goes on counting after it", f"{before} -> {after}, listed {listed}")
    for label, path in (("stopped", path_stop), ("running", path_run)):
        samples = [stop_after_passes(m, path, 101) for _ in range(3)]
        same = samples[0] == samples[1] == samples[2]
        if label == "stopped":
            STOP["stopped"] = (path, samples[0])
        check(f"determinism-{label}", same,
              f"three loads of a snapshot saved while {label} reach the same machine at the 101st pass",
              "identical" if same else differ(samples[0], samples[1]) + "; " + differ(samples[0], samples[2]))
    pairs = []
    for label in ("stopped", "running"):
        setup(m)
        stop_at_top(m)
        if label == "stopped":
            path = snap_path("emutest_cont_stopped")
            m.save(path)
            stop_at_top(m, ignore=99)
        else:
            path = snap_path("emutest_cont_running")
            cp = m.checkpoint(L["top"], ignore=1500, temporary=True)
            other2 = connect(port=PORT, timeout=60)
            t, box = background(m, frames=10 ** 6)
            wait_running(other2)
            time.sleep(0.05)
            other2.save(path)
            t.join(900)
            other2.close()
        orig = sample(m)
        v = m.word(PASSES)
        m.load(path)
        m.delete()
        # stopped: the 100th arrival at the top after the one saved at. Running: the arrival at
        # which the pass counter is where it was when the original stopped (each pass counts at
        # the top, so the counter at an arrival is the last pass's)
        stop_at_top(m, ignore=99 if label == "stopped" else (v - m.word(PASSES)) & 0xFFFF)
        loaded = sample(m)
        pairs.append((label, orig == loaded, differ(orig, loaded)))
    check("load-continues-exactly", all(ok for _, ok, _ in pairs),
          "a loaded snapshot runs on exactly as the machine that saved it, to the same pass",
          "; ".join(f"{lb}: {'same' if ok else d}" for lb, ok, d in pairs))
    p0 = m.word(PASSES)
    t0 = time.time()
    r = m.frames(1500)
    dt = time.time() - t0
    p1_ = m.word(PASSES)
    rate = (1500 * FRAME / CLOCK) / dt if dt else 0
    speed["warp"] = round(rate, 1)
    check("warp", r["reason"] == "frames" and abs(((p1_ - p0) & 0xFFFF) - 1500) <= 2,
          "1,500 frames, thirty seconds of the machine's time, as fast as the host allows",
          f"{dt:.2f} s, {rate:.1f} times real time")
    if rate < 2:
        note(f"warp: {rate:.1f} times real time, so a minute of play takes {60 / rate:.0f} s here")
    other.close()


def p2_restart(m):
    """The same snapshot after the server has been stopped and started again; returns the new connection."""
    print("\n=== phase 2, after a restart", flush=True)
    if "stopped" not in STOP:
        check("determinism-restart", False, "a restarted server gives the same machine", "phase 2 left no reference")
        return m
    path, ref = STOP["stopped"]
    h = m.call("hello")
    pid = h.get("pid")
    m.close()
    port = ("--port", str(PORT))
    print("  ", tools("stop", "plus4emu", *port).replace("\n", "\n   "))
    print("  ", tools("plus4emu", *port, "--model", h["model_id"]).replace("\n", "\n   "))
    try:
        m = connect(port=PORT, timeout=120)
        new = m.call("hello").get("pid")
        again = stop_after_passes(m, path, 101)
        check("determinism-restart", again == ref and new != pid,
              "a new server process, the same snapshot and the same 101 passes give the same machine",
              differ(again, ref) + ("" if new != pid else f"; the server was NOT restarted (process {pid} still answers)"))
    except Exception as e:
        check("determinism-restart", False, "a new server process gives the same machine", repr(e))
        m = connect(port=PORT, timeout=120)
    return m


@phase("phase 2, a tape and a disk: each loads, and a snapshot taken mid-load loads on")
def p_media(m):
    write_tape(TAPE)
    write_disk(DISK)
    for kind, image, typed, settle, size in (("tape", TAPE, "LOAD\n", 0, TAPE_BYTES),
                                             ("disk", DISK, 'LOAD"*",8,1\n', 100, len(MEDIA))):
        m.delete()
        m.release_keys()
        m.tape(eject=True)
        m.disk(eject=True)
        m.reset(hard=True)
        m.frames(150)
        getattr(m, kind)(image)
        if settle:
            m.frames(settle)                       # a drive switched on with the disk runs its self-test first
        m.type(typed)
        first = m.checkpoint(MEDIA_AT, kind="write", temporary=True)
        r = m.run(seconds=60)
        started = r["reason"] == "checkpoint"
        m.delete()
        m.frames(25)                               # half a second into the program's bytes
        path = snap_path(f"emutest_{kind}")
        here = (m.read(0, 0x4000, space="ram"), m.registers())
        m.save(path)
        kept = (m.read(0, 0x4000, space="ram"), m.registers()) == here
        m.run(seconds=40)
        a = (m.read(0, 0x4000, space="ram"), m.registers(), screen_text(m))
        m.load(path)
        back = (m.read(0, 0x4000, space="ram"), m.registers()) == here
        m.run(seconds=40)
        b = (m.read(0, 0x4000, space="ram"), m.registers(), screen_text(m))
        loaded = a[0][MEDIA_AT:MEDIA_AT + size] == MEDIA[:size] and a[2].endswith("READY.")
        # A save that moved the machine would make both runs after it go wrong the same way, so
        # the save must leave the machine where it was, and the load come back to it.
        check(f"{kind}-in-snapshot", started and loaded and a == b and kept and back,
              f"the KERNAL loads the check's own {kind}; a snapshot saved part way through the program's bytes leaves "
              "the machine where it was, loads back to it, and goes on to the same machine 40 seconds later",
              f"{'loading began' if started else 'loading NEVER began'}; the program "
              f"{'loaded, and BASIC is READY' if loaded else 'NOT loaded, or BASIC not READY'}; "
              + ("the same machine after" if a == b else "after: " + ("memory differs" if a[0] != b[0] else "registers differ"))
              + ("" if kept else "; the save moved the machine") + ("" if back else "; the load did not come back to the stop")
              + f"; screen: {a[2][-80:]}")
        getattr(m, kind)(eject=True)


@phase("phase 3: live measurement")
def p3(m):
    stop_at_top(m)
    cps = {k: m.checkpoint(**v) for k, v in {
        "top": dict(addr=L["top"], stop=False),
        "never": dict(addr=L["neverr"], stop=False),
        "vsync": dict(addr=L["vsync"], stop=False),
        "irq": dict(addr=L["irq"], stop=False),
        "store": dict(addr=PASSES, kind="write", stop=False),
        "load": dict(addr=0xFF00, kind="read", stop=False),
    }.items()}
    p0, f0, i0 = m.word(PASSES), m.word(FRAMES), m.word(IRQS)
    m.frames(250)
    p1_, f1, i1 = m.word(PASSES), m.word(FRAMES), m.word(IRQS)
    h = {k: m.hits(v) for k, v in cps.items()}
    dp, df, di = (p1_ - p0) & 0xFFFF, (f1 - f0) & 0xFFFF, (i1 - i0) & 0xFFFF
    check("counting-checkpoint", dp >= 240 and abs(h["top"] - dp) <= 1,
          "a counting checkpoint agrees with the program's own pass counter", f"{h['top']} hits, {dp} passes")
    check("never-runs", h["never"] == 0, "a checkpoint on a routine nothing calls stays at zero", h["never"])
    check("frame-count", abs(h["vsync"] - df) <= 1 and abs(df - 250) <= 2,
          "one raster interrupt a frame, counted by the program and by a checkpoint", f"{h['vsync']} hits, {df} counted, 250 run")
    check("irq-count", abs(h["irq"] - di) <= 1 and abs(di - df) <= 1,
          "a checkpoint on the interrupt handler counts every interrupt (here only the raster's)",
          f"{h['irq']} hits, {di} counted, {df} frames")
    check("watch-store", abs(h["store"] - dp) <= 1, "a write checkpoint counts the stores to the pass counter",
          f"{h['store']} hits, {dp} passes")
    check("watch-load", abs(h["load"] - dp) <= 1, "a read checkpoint on TED's timer ($FF00) counts the program's reads",
          f"{h['load']} hits, {dp} passes")
    m.delete()
    cp = m.checkpoint(L["vsync"])
    ra = m.frames(3)
    ca = m.registers()["cycles"]
    m.delete(cp)
    cp = m.checkpoint(L["vsync"], ignore=99)
    rb = m.frames(110)
    cb = m.registers()["cycles"]
    m.delete(cp)
    per = (cb - ca) / 100
    at_cp = ra["reason"] == "checkpoint" and rb["reason"] == "checkpoint"
    detail = f"{per:.2f} a frame" if at_cp else \
        f"the runs ended by {ra['reason']} and {rb['reason']}, not both at the handler ({per:.2f} a frame, not a period)"
    check("cycle-counter", at_cp and abs(per - FRAME) < 0.5, f"the cycle counter gives {FRAME:,} a frame, "
          "measured between the program's sightings of the raster interrupt 100 frames apart", detail)
    m.codemap("start")
    p0 = m.word(PASSES)
    t0 = time.time()
    m.frames(300)
    dt = time.time() - t0
    cm = {a: n for a, _, n in m.codemap("stop")["instructions"]}
    dp = (m.word(PASSES) - p0) & 0xFFFF
    outside = sorted(a for a in cm if not (ORG <= a < ORG + len(CODE)) and a < 0x8000)
    starts = instruction_starts()
    ran = sorted(a for a in cm if ORG <= a < ORG + len(CODE))
    odd = [a for a in ran if a not in starts]
    check("code-map", L["neverr"] not in cm and L["top"] in cm and not outside and not odd and L["start"] not in cm,
          "every RAM address an instruction started at, in one call; nothing that did not run",
          f"{len(cm)} addresses ({len(ran)} in the program) in {dt:.2f} s; elsewhere in RAM: "
          f"{['$%04X' % a for a in outside[:5]] or 'none'}; off an instruction's first byte: {['$%04X' % a for a in odd[:5]] or 'none'}")
    check("code-map-counts", abs(cm.get(L["top"], 0) - dp) <= 1, "how often each instruction ran",
          f"top {cm.get(L['top'])} against {dp} passes")
    other = connect(port=PORT, timeout=60)
    cp = m.checkpoint(L["top"], stop=False)
    t, box = background(m, frames=100000)
    got = wait_running(other)
    counts, states = [], []
    for _ in range(5):
        time.sleep(0.2)
        counts.append(other.hits(cp))
        states.append(other.status()["running"])
    check("count-while-running", got and all(states) and all(b > a for a, b in zip(counts, counts[1:])),
          "a second connection reads a growing count while the machine runs", f"{counts}, running {states}")
    st = other.stop()
    t.join(60)
    rr = box.get("r", {})
    after = other.status()
    check("stop-while-running", rr.get("reason") == "stopped" and not after["running"] and st.get("was_running"),
          "stop from a second connection ends the run", f"run returned {rr.get('reason') or box.get('e')}; running {after['running']}")
    m.delete(cp)
    other.close()
    m.sound("start")
    p0 = m.word(PASSES)
    t0 = time.time()
    m.frames(60)
    dt = time.time() - t0
    w = m.sound("stop")["writes"]
    dp = (m.word(PASSES) - p0) & 0xFFFF
    mine = [x for x in w if x[1] == 0xFF0E]
    gaps = [b[0] - a[0] for a, b in zip(mine, mine[1:])]
    good = bool(gaps) and all(abs(g - FRAME) <= 40 for g in gaps)
    vals_ok = all(((x[2] - mine[0][2]) & 0xFF) == i for i, x in enumerate(mine)) if mine else False
    check("sound-log", len(mine) == dp and good and vals_ok,
          "every write to $FF0E with its cycle and value, one a pass, a frame apart",
          f"{len(mine)} writes ({len(w)} to $FF0E-$FF12), {dp} passes; gaps {min(gaps) if gaps else '-'}-"
          f"{max(gaps) if gaps else '-'}; values {'count up' if vals_ok else [x[2] for x in mine[:6]]}; {dt:.2f} s for 60 frames")


@phase("phase 4: frame stepping with inputs")
def p4(m):
    r = stop_at_top(m)
    pc = m.registers()["pc"]
    p0 = m.word(PASSES)
    check("exact-stop", r["reason"] == "checkpoint" and r["pc"] == L["top"] == pc,
          "a stopping checkpoint stops before its instruction runs", f"reason {r['reason']}, pc ${pc:04X}, top ${L['top']:04X}")
    r1 = m.step(1)
    p1_ = m.word(PASSES)
    check("step-instruction", r1["pc"] == L["top"] + 3 and p1_ == (p0 + 1) & 0xFFFF,
          "one instruction stepped, and the reply carries the new PC", f"pc ${r1['pc']:04X}; passes {p0} -> {p1_}")
    stop_at_top(m)
    m.key(None, row=Z_KEY[0], column=Z_KEY[1], down=True)
    m.until(L["nokey"], max_cycles=FRAME * 2)
    m.step(1)                            # stx key: the pass stores what its scan read
    key = m.read(KEY, 1)[0]
    m.until(L["nokey"], max_cycles=FRAME * 2)
    m.step(1)
    key2 = m.read(KEY, 1)[0]
    check("input-lands", key == 1, "Z pressed while stopped is in the matrix at the program's next scan, a few cycles later",
          f"the program read key={key}, and {key2} a pass later")
    check("input-next-pass", key2 == 1, "Z pressed while stopped is seen by the next pass's scan, a frame later",
          f"key={key2}")
    m.until(L["click"], max_cycles=FRAME * 2)
    m.frames(1)
    cp = m.checkpoint(L["top"], stop=False)
    per, moved, times = [], [], []
    for _ in range(10):
        x0, h0 = m.read(XPOS, 1)[0], m.hits(cp)
        t0 = time.time()
        m.frames(1)
        times.append(time.time() - t0)
        per.append(m.hits(cp) - h0)
        moved.append((x0 - m.read(XPOS, 1)[0]) & 0xFF)
    step_ms = sum(times) / len(times) * 1000
    speed["frame_step_ms"] = round(step_ms, 1)
    check("frame-step", all(n == 1 for n in per) and all(d == 1 for d in moved),
          "ten one-frame advances with a key held: one pass and one step left a frame",
          f"passes {per}, moved {moved}; {step_ms:.1f} ms a step")
    m.key(None, row=Z_KEY[0], column=Z_KEY[1], down=False)
    m.frames(1)
    xa = m.read(XPOS, 1)[0]
    m.frames(3)
    xb, ka = m.read(XPOS, 1)[0], m.read(KEY, 1)[0]
    check("input-released", xa == xb and ka == 0, "the key released when the script says, and the program sees it up",
          f"x {xa} -> {xb}, key {ka}")
    m.delete(cp)
    for port, addr, want in ((1, JOY1, 0xBB), (2, JOY2, 0x7B)):
        j0 = m.word(JX)
        m.joystick(port=port, left=True, fire=True)
        m.frames(2)
        v, j1 = m.read(addr, 1)[0], m.word(JX)
        m.joystick(port=port)
        m.frames(2)
        up = m.read(addr, 1)[0]
        check(f"joy-port-{port}", v == want and up == 0xFF and (port == 2 or (j1 - j0) & 0xFFFF == 2),
              f"joystick {port} held left with fire reads ${want:02X} at $FF08 with its select line low, $FF when released",
              f"held ${v:02X}, released ${up:02X}, left seen {(j1 - j0) & 0xFFFF} passes")
    stop_at_top(m)
    m.joystick(port=1, left=True)
    m.until(L["nojx"], max_cycles=FRAME * 2)
    j = m.read(JOY1, 1)[0]
    m.joystick(port=1)
    m.until(L["nojx"], max_cycles=FRAME * 2)
    j2 = m.read(JOY1, 1)[0]
    check("joy-immediate", j == 0xFB and j2 == 0xFF,
          "joystick 1 pushed left while stopped is seen by the read a few cycles later, and its release by the next pass",
          f"held ${j:02X}, released ${j2:02X}")
    cp = m.checkpoint(L["top"])
    stop_at_top(m)
    p0 = m.word(PASSES)
    ok, err = 0, None
    t0 = time.time()
    try:
        for _ in range(100):
            r = m.frames(5)
            ok += r["reason"] == "checkpoint" and r["pc"] == L["top"]
    except Plus4emuError as e:
        err = str(e)
    dt = time.time() - t0
    p1_ = m.word(PASSES)
    check("unpaced-calls", ok == 100 and err is None and (p1_ - p0) & 0xFFFF == 100,
          "a hundred runs back to back against a stopping checkpoint: each stops there, one pass each",
          f"{ok} of 100, passes +{(p1_ - p0) & 0xFFFF}, {100 / dt:.0f} runs a second" + (f"; {err}" if err else ""))
    m.delete(cp)
    other = connect(port=PORT, timeout=60)
    starts = instruction_starts()
    rnd = random.Random(12345)
    held, tried, odd = 0, 0, []
    for i in range(30):
        t, box = background(m, frames=100000)
        wait_running(other)
        time.sleep(rnd.uniform(0.001, 0.03))
        other.stop()
        t.join(60)
        tried += 1
        pc = m.registers()["pc"]
        if ORG <= pc < ORG + len(CODE) and pc not in starts:
            odd.append(f"${pc:04X}")
        m.set_registers(x=0x5A)
        d = decode(m.read(pc, 3) + bytes(8), 0)
        writes_x = d is not None and d[0] in ("ldx", "inx", "dex", "tax", "tsx", "plx", "lax")
        m.step(1)
        if writes_x or m.registers()["x"] == 0x5A:      # the set must survive the next instruction
            held += 1
    other.close()
    check("pause-at-instruction", held == 30 and tried == 30 and not odd,
          "thirty stops from a second connection, each between two instructions, and a register set after each holds",
          f"{held} of {tried} held; stops off an instruction's first byte: {odd[:5] or 'none'}")
    stop_at_top(m)
    m.keep("emutest")
    s0 = sample(m)
    m.frames(50)
    m.back("emutest")
    s1 = sample(m)
    t0 = time.time()
    for _ in range(10):
        m.keep("emutest")
        m.back("emutest")
    pair = (time.time() - t0) / 10 * 1000
    path = snap_path("emutest_rollback")
    t0 = time.time()
    for _ in range(5):
        m.save(path)
        m.load(path)
    filepair = (time.time() - t0) / 5 * 1000
    check("rollback", s0 == s1, "keep the machine, run on, go back: the machine is the one kept",
          f"{differ(s0, s1)}; keep and back {pair:.1f} ms a pair, save and load through a file {filepair:.0f} ms a pair")
    m.delete()
    m.reset(hard=True)
    m.frames(150)
    m.type("PRINT 6*7\n")
    m.frames(100)
    text = screen_text(m)
    check("type-text", " 42" in text, "PRINT 6*7 typed through the keyboard buffer, and BASIC answers 42", text[:160])


def main():
    if "-h" in sys.argv or "--help" in sys.argv:   # it resets the machine: never on a request for usage
        print(__doc__)
        return
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SNAPDIR, exist_ok=True)
    clean()
    try:
        m = connect(port=PORT, timeout=120)
        h = m.call("hello")
    except Plus4emuError as e:
        sys.exit(f"{e}\nthen run check-emulator again.")
    build = (f"plus4emu {h['plus4emu']} in the kit's server (protocol {h['protocol']}), {h['model']}, "
             f"code map by {h['codemap']}, Python {h['python']}, on {sys.platform}")
    print(build)
    started = time.time()
    p_start(m)
    if not any(n == "program-runs" and ok for n, ok in results):
        print("\nthe test program never ran; stopping here")
        sys.exit(1)
    for step in (p1, p3, p4, p2):
        fresh(m)
        step(m)
    p_media(m)
    m = p2_restart(m)
    try:
        m.delete()
        m.release_keys()
        m.tape(eject=True)
        m.disk(eject=True)
        m.reset(hard=True)                         # left powered on with no tape or disk, as the server starts
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
