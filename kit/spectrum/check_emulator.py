#!/usr/bin/env python3
"""Test ZEsarUX against kit/EMULATOR.md, with a Z80 test program of its own.

    python3 kit/scripts/tools.py --platform spectrum check-emulator     (the usual way in)
    python3 kit/spectrum/check_emulator.py [--keep]

Needs the emulator up (`tools.py --platform spectrum zesarux`) and nothing else: no
game, no tape. It hard-resets the machine, writes ~60 bytes of Z80 to $8000, points
PC at them, and measures the four phases on that. Anything the emulator was doing is
lost. About twenty seconds on a working build (21 s measured on 13.0). `--keep` leaves
this run's snapshots in tools/zesarux-home/snapshots.

The test program (assembled below, so it is source and not a binary):

  $8000  di ; nop ; nop (or im 1 ; ei) ; clear $9000-$9005 ; ld sp,$A000
  $8011  loop: passes += 1        (a 16-bit counter at $9000)
  $8019         keys = ~(port $FEFE) & $18   (row 0: bit 4 = V, bit 3 = C)
  $8023         out ($FE),0       (border black; an OUT, and a write to port $FE)
  $8027         ld ($9010),hl ; ld hl,($9010)   (the 16-bit pair the watchpoint checks count)
  $8030         jp loop
  $8033  dead:  dead_count += 1 ; ret        (never reached: nothing jumps here)

  $9000 passes (2)   $9002 keys   $9004 dead_count (always 0)   $9010 watch (2)

Interrupts are off in the default program, so the ROM never runs and every value is
known in advance: the counter is the measurement, $9002 is what the machine saw of
the input, and $9004 is a checkpoint that must stay at zero. One phase swaps it for a
variant that runs in IM 1 with interrupts on, so the ROM's interrupt can be counted
and the machine has a clock the host cannot move; the two variants lay out identically.

Every check has a name. The summary lists the names that failed, and
kit/skills/spectrum/tool-zesarux/workarounds.md says, per name, what to do instead.
Run it after installing, and again after any new release or build.
"""
import json, os, re, sys, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from zesarux import ZesaruxError, connect, FRAME_TSTATES   # noqa: E402

SNAPDIR = os.path.join(ROOT, "tools", "zesarux-home", "snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
RESULT = "spectrum.json"     # the C64's check writes result.json in the same folder, and `status` prints the last one
WORKAROUNDS = "kit/skills/spectrum/tool-zesarux/workarounds.md"

BASE = 0x8000
PASSES, KEYS, DEADCOUNT = 0x9000, 0x9002, 0x9004
WATCH_LO = 0x9010        # a 16-bit variable the loop stores to and loads from, for the watchpoint checks
FRAMES = 0x5C78          # the ROM's 3-byte frame counter: the ROM's ISR increments it once per interrupt
STACK = 0xA000
ROW0 = 0xFEFE            # port $FEFE: V C X Z CapsShift, with A = $FE in `in a,($fe)`
SNAPS = ("zemutest_base", "zemutest_run", "zemutest_nocp", "zemutest_int")

try:                     # the lead's snapshot reader, when it is there
    from snapshot import read as snapshot_read, header as snapshot_header, SNA_48K_SIZE
except ImportError:      # else the 27-byte header, parsed here
    SNA_48K_SIZE = 49179
    SNA_HEADER_FIELDS = [("I", 0, 1), ("HL'", 1, 2), ("DE'", 3, 2), ("BC'", 5, 2), ("AF'", 7, 2),
                         ("HL", 9, 2), ("DE", 11, 2), ("BC", 13, 2), ("IY", 15, 2), ("IX", 17, 2),
                         ("IFF2", 19, 1), ("R", 20, 1), ("AF", 21, 2), ("SP", 23, 2),
                         ("IM", 25, 1), ("border", 26, 1)]

    def snapshot_header(blob):
        import struct
        out = {}
        for name, off, width in SNA_HEADER_FIELDS:
            out[name] = blob[off] if width == 1 else struct.unpack_from("<H", blob, off)[0]
        return out

    def snapshot_read(path):
        blob = open(path, "rb").read()
        if len(blob) != SNA_48K_SIZE:
            raise SystemExit(f"{path}: {len(blob)} bytes, not a 48K .sna")
        return b"\0" * 0x4000 + blob[27:]


def program(interrupts=False):
    """The test program, assembled here so that it is source, not a binary.

    `interrupts` swaps the leading `di` for `im 1` / `ei`, padded to the same
    three bytes so every label and variable address is the same in both
    variants. The interrupt variant lets the ROM's own ISR run, which
    increments its 3-byte frame counter at `$5C78` once a frame: that is the
    interrupt reference the `interrupt-rate` and `stopwatch` checks use.
    """
    code, labels, fix = bytearray(), {}, []

    def op(*b):
        code.extend(b)

    def lab(n):
        labels[n] = BASE + len(code)

    def br(opcode, n):
        code.extend((opcode, 0)); fix.append((len(code) - 1, n, "rel"))

    def jp(n):
        code.extend((0xC3, 0, 0)); fix.append((len(code) - 2, n, "abs"))

    if interrupts:
        op(0xED, 0x56, 0xFB)                  # im 1 ; ei
    else:
        op(0xF3, 0x00, 0x00)                  # di ; nop ; nop
    op(0x3E, 0x00)                            # ld a,0
    op(0x21, PASSES & 0xFF, PASSES >> 8)      # ld hl,$9000
    op(0x06, 0x06)                            # ld b,6
    lab("clr"); op(0x77)                      #   ld (hl),a
    op(0x23, 0x10, 0xFC)                      #   inc hl ; djnz clr
    op(0x31, STACK & 0xFF, STACK >> 8)        # ld sp,$A000
    lab("loop")
    op(0x21, PASSES & 0xFF, PASSES >> 8)      # ld hl,$9000
    op(0x34)                                  # inc (hl)
    br(0x20, "nohi"); op(0x23, 0x34)          # jr nz,nohi ; inc hl ; inc (hl)
    lab("nohi"); op(0x3E, 0xFE)               # ld a,$FE
    op(0xDB, 0xFE)                            # in a,($FE)      row 0 of the keyboard
    op(0x2F, 0xE6, 0x18)                      # cpl ; and $18
    op(0x32, KEYS & 0xFF, KEYS >> 8)          # ld ($9002),a    what the machine saw of the keys
    op(0x3E, 0x00, 0xD3, 0xFE)                # ld a,0 ; out ($FE),a    border black
    op(0x21, 0x34, 0x12)                      # ld hl,$1234
    op(0x22, WATCH_LO & 0xFF, WATCH_LO >> 8)  # ld ($9010),hl    a 16-bit store the watchpoint checks count
    op(0x2A, WATCH_LO & 0xFF, WATCH_LO >> 8)  # ld hl,($9010)    and a 16-bit load
    jp("loop")                                # jp loop
    lab("dead"); op(0x21, DEADCOUNT & 0xFF, DEADCOUNT >> 8)   # ld hl,$9004
    op(0x34, 0xC9)                            # inc (hl) ; ret     -- never reached
    for i, n, kind in fix:
        a = labels[n]
        if kind == "rel":
            d = a - (BASE + i + 1)
            assert -128 <= d <= 127, n
            code[i] = d & 0xFF
        else:
            code[i], code[i + 1] = a & 0xFF, a >> 8
    return bytes(code), labels


CODE, LABELS = program()
ICODE, ILABELS = program(interrupts=True)
assert LABELS == ILABELS, "the interrupt variant must lay out identically to the plain one"
LOOP, DEAD = LABELS["loop"], LABELS["dead"]

results = []


def check(name, ok, what, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name:26} {what}" + (f"  [{detail}]" if detail else ""), flush=True)
    results.append((name, bool(ok)))


def word(rpc, a):
    return int.from_bytes(rpc.read_memory(a, 2), "little")


def stop_after_passes(rpc, snap, n):
    """Load `snap`, arm a stopping checkpoint on the loop that fires on pass n, and run to it.
    A checkpoint cannot be armed before the load: the load switches them all off."""
    rpc.enter_step()
    rpc.snapshot_load(snap)
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, n)
    rpc.run(timeout=30)
    return sample(rpc)


STOP = {}      # the snapshot and the state it must reproduce, for the check after a restart


def safe(f, default=None):
    """f(), or the exception's text: a check must report a failure, not die in a thread."""
    try:
        return f()
    except Exception as e:
        return default if default is not None else repr(e)


def rows(rpc):
    """The eight keyboard rows as read from the ULA port $FE, bit 4 first."""
    out = {}
    for high in (0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0xBF, 0x7F):
        port = (high << 8) | 0xFE
        out[f"{high:02X}FE"] = int(rpc.evaluate(f"IN({port})"))
    return out


def setup(rpc, code=None):
    """Hard reset, write the test program, start it. Returns after one pass has gone.

    `code` picks the variant: `CODE` (interrupts off) by default, `ICODE` for the
    interrupt checks. Both lay out identically, so `LOOP` is the same address.
    """
    code = CODE if code is None else code
    rpc.bp_clear()
    rpc.exit_step()
    rpc.cmd("hard-reset-cpu")
    rpc.enter_step()
    rpc.write_memory(BASE, code)
    rpc.write_memory(PASSES, bytes(6))
    rpc.set_register("PC", BASE)
    rpc.step()                                   # the program's first instruction
    rpc.run(limit=1000, timeout=10)
    if word(rpc, PASSES) == 0:
        raise RuntimeError("the test program did not run: the pass counter is still zero")


def fresh(rpc):
    """Start each phase on a running test program, so one failure does not fail the next."""
    try:
        rpc.run(limit=1000, timeout=10)
        if word(rpc, PASSES) > 0:
            return rpc
    except Exception:
        pass
    print("   (the test program is not running: setting it up again)", flush=True)
    setup(rpc)
    return rpc


def tools(*args):
    import subprocess
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"),
                           "--platform", "spectrum", *args], capture_output=True, text=True).stdout.strip()


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


def diff(a, b):
    n = sum(1 for x, y in zip(a, b) if x != y)
    return f"{n} bytes differ" if n else "identical"


def sample(rpc):
    """The test program's variables, everything below $4000 that the machine owns, and the screen."""
    return (rpc.read_memory(0x0000, 0x4000) + rpc.read_memory(0x4000, 0x1B00)
            + rpc.read_memory(PASSES, 0x10) + rpc.read_memory(BASE, len(CODE)))


# ---------------------------------------------------------------------------
@phase("start: reset, write the test program, run it")
def p_start(rpc):
    check("machine-48k", rpc.machine() == "ZX Spectrum 48k", "a 48K machine answers ZRCP", rpc.machine())
    print(f"   emulator ZEsarUX {rpc.version()}, frame = {FRAME_TSTATES} T-states")
    setup(rpc)
    back = rpc.read_memory(BASE, len(CODE))
    check("write-read", back == CODE, "memory written reads back identical", f"{len(CODE)} bytes")
    t0 = time.time()
    rpc.run(limit=40000, timeout=20)
    dt = time.time() - t0
    passes = word(rpc, PASSES)
    check("program-runs", passes > 0, "the test program runs one pass per loop",
          f"{passes} passes, {passes / dt:.0f} a second")
    check("dead-zero", word(rpc, DEADCOUNT) == 0, "the routine that is never called has not run")


@phase("phase 1: static inspection")
def p1(rpc):
    big = rpc.read_memory(0x8000, 0x4000)
    check("read-any-size", len(big) == 0x4000, "16 KB in one call", len(big))
    pattern = bytes(range(256))
    rpc.enter_step()
    rpc.write_memory(0xC000, pattern)
    check("read-pattern", rpc.read_memory(0xC000, 256) == pattern, "256 bytes read back byte for byte")
    rom = rpc.read_memory(0x0000, 4)
    check("read-rom", rom == b"\xf3\xaf\x11\xff", "the ROM is reachable at $0000, not RAM",
          f"{rom.hex()}")
    pages = rpc.cmd("get-memory-pages")
    check("read-banks", "ROM" in pages and "RAM" in pages, "the machine names its memory pages", pages.strip())
    regs = rpc.registers()
    check("registers", all(k in regs for k in ("PC", "SP", "AF", "BC", "DE", "HL", "IX", "IY", "AF'", "I", "R")),
          "the CPU registers, by name", ",".join(sorted(regs))[:70])
    rpc.set_register("IY", 0x1234)
    check("set-register", rpc.registers()["IY"] == 0x1234, "a register written reads back")
    rpc.set_register("IY", 0x5C3A)

    path = os.path.join(SNAPDIR, "zemutest_p1.sna")
    rpc.snapshot_save(path)
    size = os.path.getsize(path)
    blob = open(path, "rb").read()
    head = snapshot_header(blob)
    check("snapshot-save", size == SNA_48K_SIZE, "a 48K .sna lands where the kit asked", f"{size} bytes")
    ram = snapshot_read(path)
    live = rpc.read_memory(BASE, 256)
    check("snapshot-ram-matches", ram[BASE:BASE + 256] == live,
          "the same 256 bytes through the tool and out of the file", diff(ram[BASE:BASE + 256], live))
    pc = int.from_bytes(ram[head["SP"]:head["SP"] + 2], "little") if 0x4000 <= head["SP"] < 0xFFFE else -1
    im = int(re.search(r"\bIM(\d)", rpc.cmd("get-registers")).group(1))
    check("snapshot-header", pc == regs["PC"] and head["SP"] == (regs["SP"] - 2) & 0xFFFF and head["IM"] == im,
          "the header's SP and the PC pushed at it are the machine's, and the interrupt mode is the machine's",
          f"SP={head['SP']:04X} (live {regs['SP']:04X} minus the pushed PC) PC={pc:04X} (live {regs['PC']:04X}) "
          f"IM={head['IM']} (the machine says IM{im})")
    os.remove(path)
    rpc.run(limit=1000, timeout=10)


@phase("phase 2: state management")
def p2(rpc):
    # EMULATOR.md phase 2 wants warp, and a way to turn it off that works. ZEsarUX's
    # warp is `--emulatorspeed`, a launch option; ZRCP exposes get-cpu-turbo-speed and
    # no setter, so a running emulator cannot be warped. Probe for a setter so a build
    # that adds one passes here; until then the workaround is a restart with the flag.
    try:
        rpc.cmd("set-cpu-turbo-speed", 50)
        warp = True
    except ZesaruxError:
        warp = False
    check("warp", warp,
          "warp can be turned on and off through ZRCP (if not, restart the launcher with --emulatorspeed N)",
          f"ZRCP reports get-cpu-turbo-speed {safe(lambda: rpc.cmd('get-cpu-turbo-speed').strip())} and has no setter")
    rpc.bp_clear()
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.run(timeout=10)
    rpc.write_memory(PASSES, bytes([0x00, 0x50, 0x00, 0x00]))
    base = os.path.join(SNAPDIR, "zemutest_base.sna")
    rpc.snapshot_save(base)
    check("save-stopped", os.path.getsize(base) == SNA_48K_SIZE, "a snapshot saved from a stopped machine")
    rpc.bp_disable(1)
    rpc.run(limit=20000, timeout=10)

    # load with a stopping checkpoint armed, first with the machine in cpu-step mode
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.enter_step()
    rpc.snapshot_load(base)
    pc = rpc.registers()["PC"]
    p0 = rpc.tstates()
    time.sleep(0.5)
    p1 = rpc.tstates()
    check("load-stopped", pc == LOOP and p1 == p0 and word(rpc, PASSES) == 0x5000,
          "a load with the machine already stopped stays stopped at the loaded PC",
          f"PC={pc:04X} T-states moved {p1 - p0}")
    check("load-state", word(rpc, PASSES) == 0x5000 and rpc.read_memory(PASSES, 4) == b"\x00\x50\x00\x00",
          "the state loaded is the state saved")

    # load with the machine running: ZEsarUX enters cpu-step, loads, then exits it again
    rpc.exit_step()
    time.sleep(0.2)
    rpc.snapshot_load(base, rearm=False)
    p0 = rpc.tstates()
    time.sleep(0.5)
    running = rpc.tstates() > p0
    mode = "running" if running else "stopped"
    check("load-continues", running, "a load with the machine running resumes it (documented behaviour)", mode)

    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, 10 ** 9)
    rpc.enter_step()
    rpc.snapshot_load(base, rearm=False)      # the emulator's raw behaviour, with no help from the client
    armed = rpc.bp_conditions()
    rpc.run(limit=5000, timeout=10)
    counted_raw = rpc.bp_count(1)[0]
    check("checkpoints-survive-load", 1 in armed and counted_raw > 0,
          "a checkpoint stays armed and keeps counting across a load",
          f"enabled slots after the load: {sorted(armed) or 'none'}, {counted_raw} matches after 5000 opcodes")
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, 10 ** 9)
    rpc.enter_step()
    rpc.snapshot_load(base)                   # the client re-arms whatever a load switched off
    rpc.run(limit=5000, timeout=10)
    check("checkpoints-rearmed", rpc.bp_count(1)[0] > 0,
          "with the client's re-arm, a load and a run count again", rpc.bp_count(1)[0])

    # determinism at a stop: the same snapshot, three times, byte for byte
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, 1000)
    seen = []
    for _ in range(3):
        rpc.enter_step()
        rpc.snapshot_load(base)
        rpc.bp_set(1, f"PC={LOOP:04X}H")
        rpc.bp_passcount(1, 1000)
        rpc.run(timeout=10)
        seen.append((sample(rpc), rpc.registers()["PC"], rpc.tstates()))
    check("determinism-at-stop", seen[0][0] == seen[1][0] == seen[2][0] and len({s[1] for s in seen}) == 1,
          "stopping three times from the same snapshot gives the same RAM, screen and PC",
          f"{diff(seen[0][0], seen[1][0])} then {diff(seen[1][0], seen[2][0])}; PC {seen[0][1]:04X}")

    run_snap = os.path.join(SNAPDIR, "zemutest_run.sna")
    rpc.exit_step()
    time.sleep(0.3)
    rpc.snapshot_save(run_snap)
    rpc.enter_step()
    check("save-running", os.path.getsize(run_snap) == SNA_48K_SIZE, "a snapshot saved from a running machine")
    rpc.bp_clear()

    # the same stop again from a freshly started emulator: the state the file holds is the whole state
    STOP["base"], STOP["ref"] = base, stop_after_passes(rpc, base, 1000)


@phase("phase 2: after a restart of the emulator")
def p2_restart(rpc):
    print("  ", tools("stop"))
    print("  ", tools("zesarux"))
    rpc = connect(timeout=30)
    again = stop_after_passes(rpc, STOP["base"], 1000)
    check("determinism-restart", again == STOP["ref"],
          "a new process, the same snapshot and the same 1000 passes give the same RAM and screen",
          diff(again, STOP["ref"]))
    return rpc


@phase("phase 3: live measurement")
def p3(rpc):
    rpc.bp_clear()
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, 10 ** 9)          # a limit high enough that it never fires: this counts, it does not stop
    rpc.bp_set(2, f"PC={DEAD:04X}H")
    rpc.bp_passcount(2, 10 ** 9)
    rpc.enter_step()
    t0 = time.time()
    rpc.run(limit=100000, timeout=20)
    dt = time.time() - t0
    own0, c0 = word(rpc, PASSES), rpc.bp_count(1)[0]
    rpc.run(limit=100000, timeout=20)
    own1, c1 = word(rpc, PASSES), rpc.bp_count(1)[0]
    # The run limit can fall inside a pass at either end of the window, so the
    # two counters may each be a pass out either side of the other. What matters
    # is that the machine ran and that the checkpoint counted with it, not that
    # the two agree to the opcode.
    check("counting-checkpoint", c1 > c0 and own1 > own0
          and abs((c1 - c0) - (own1 - own0)) <= 4,
          "a non-stopping checkpoint counts while the machine keeps running",
          f"count {c0}->{c1}, the program's own counter {own0}->{own1}")
    check("dead-checkpoint-zero", rpc.bp_count(2)[0] == 0,
          "a checkpoint on the routine that never runs stays at zero", rpc.bp_count(2)[0])

    # can a second connection read the count while the first one's run loop is going?
    other = connect(timeout=30)
    box, seen, waited = {}, [], []
    driver = threading.Thread(target=lambda: box.update(
        reply=safe(lambda: rpc.cmd("run", 400000, "no-stop-on-data", timeout=60))))
    t_launch = time.time()
    driver.start()
    try:
        for _ in range(3):
            t = time.time()
            seen.append(safe(lambda: other.bp_count(1)[0], default=-1))
            waited.append(round(time.time() - t, 3))
            time.sleep(0.05)
    finally:
        driver.join(timeout=60)
        other.close()
    run_time = time.time() - t_launch
    check("count-while-running", min(seen) >= 0 and max(waited) < 0.2,
          "a second connection reads the count without waiting for the run to end",
          f"reads {seen}, waited {waited}s against the run's {run_time:.2f}s")
    rpc.bp_clear()


@phase("watchpoints: a store and a load")
def p_watch(rpc):
    """The instrument-is-not-dead tests for memory watchpoints, and how they count.

    The loop stores a 16-bit value to $9010 and loads it back. ZEsarUX fires a memory
    watchpoint on the address line at the end of the instruction, which for a 2-byte
    access is the last byte touched: $9011. Watching $9010 counts nothing, and a script
    that picks the first byte concludes the instrument is dead.
    """
    def watch(cond, opcodes=20000):
        rpc.bp_clear()
        rpc.bp_set(1, cond)
        rpc.bp_passcount(1, 10 ** 9)          # a limit nothing reaches: this counts, it does not stop
        rpc.enter_step()
        rpc.run(limit=opcodes, timeout=20)
        return rpc.bp_count(1)[0]

    hi_w, lo_w = watch(f"MWA={WATCH_LO + 1:04X}H"), watch(f"MWA={WATCH_LO:04X}H")
    check("watch-store", hi_w > 0 and lo_w == 0,
          "a store watchpoint counts the last byte a 16-bit store touches, and the first byte counts nothing",
          f"MWA={WATCH_LO + 1:04X}H counted {hi_w}, MWA={WATCH_LO:04X}H counted {lo_w}")
    hi_r, lo_r = watch(f"MRA={WATCH_LO + 1:04X}H"), watch(f"MRA={WATCH_LO:04X}H")
    check("watch-load", hi_r > 0 and lo_r == 0,
          "a load watchpoint counts the last byte a 16-bit load touches, and the first byte counts nothing",
          f"MRA={WATCH_LO + 1:04X}H counted {hi_r}, MRA={WATCH_LO:04X}H counted {lo_r}")
    rpc.bp_clear()


@phase("interrupts: the rate, and the phase a load loses")
def p_interrupts(rpc):
    """The ROM's interrupt, running: the tests that need a clock the host cannot move.

    `ICODE` enables interrupts and runs in IM 1, so the ROM's ISR runs once a frame
    and increments its own 3-byte counter at `$5C78`. That counter is the reference:
    no wall-clock timing, so the answers are the same on a loaded machine.
    """
    rpc.bp_clear()
    rpc.exit_step()
    setup(rpc, ICODE)
    f0 = int.from_bytes(rpc.read_memory(FRAMES, 3), "little")
    rpc.frames(100, timeout=60)
    f1 = int.from_bytes(rpc.read_memory(FRAMES, 3), "little")
    check("interrupt-rate", 95 <= f1 - f0 <= 105,
          "the ROM's interrupt runs once a frame, and the machine can be counted",
          f"{f1 - f0} interrupts in 100 frames, {f1 - f0} a second")

    # the T-state counter, against the interrupts, not against the host's clock (#131).
    # Not through `frames()`: that resets the counter it measures with. The frame
    # position at each end is subtracted, since the run starts and ends between two
    # interrupts, not on one.
    rpc.reset_tstates()
    phase0 = rpc.tstates_in_frame()
    f0 = int.from_bytes(rpc.read_memory(FRAMES, 3), "little")
    for _ in range(10):
        rpc.run(limit=200000, timeout=20)
    d = rpc.tstates() + phase0 - rpc.tstates_in_frame()
    n = (int.from_bytes(rpc.read_memory(FRAMES, 3), "little") - f0) & 0xFFFFFF
    per = d / n if n else 0
    check("stopwatch", n > 0 and abs(per - FRAME_TSTATES) < 100,
          "the T-state counter and the interrupts agree: one interrupt is one frame of 69888 T-states",
          f"{d} T-states over {n} interrupts = {per:.0f} T-states an interrupt (a frame is {FRAME_TSTATES})")

    # stop mid-frame, save, load, and see whether the machine came back where it was
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.bp_passcount(1, 2000)
    rpc.run(timeout=30)
    phase = rpc.tstates_in_frame()
    snap = os.path.join(SNAPDIR, "zemutest_int.sna")
    rpc.snapshot_save(snap)
    rpc.enter_step()
    rpc.snapshot_load(snap)
    after = rpc.tstates_in_frame()
    check("load-keeps-frame-phase", after == phase,
          "a load restores the machine's position within the frame",
          f"saved {phase} T-states into the frame, loaded at {after}")
    rpc.bp_clear()
    setup(rpc)                     # the phases after this one expect interrupts off again


@phase("phase 4: frame stepping with inputs")
def p4(rpc):
    rpc.bp_clear()
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.run(timeout=10)
    pc = rpc.registers()["PC"]
    check("stop-exact", pc == LOOP, "a stopping checkpoint stops on its own instruction", f"PC={pc:04X}")
    a = sample(rpc)
    time.sleep(0.3)
    check("stopped-stays-stopped", sample(rpc) == a, "nothing moves while stopped, reads included")

    # input: set it while stopped, and it is in the port register before the next instruction
    rpc.release_input()
    rpc.bp_disable(1)
    rpc.set_input("ef" + "ff" * 7 + "00")          # row 0 bit 4 = V
    before = int(rpc.evaluate(f"IN({ROW0})"))
    rpc.step()
    after = int(rpc.evaluate(f"IN({ROW0})"))
    check("input-lands", (after & 0x10) == 0,
          "a key set while stopped is in the ULA port before the next instruction",
          f"port ${ROW0:04X}: {before:#04x} -> {after:#04x}, RCP echoes {rpc.get_input()}")
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.run(timeout=10)
    seen = rpc.read_memory(KEYS, 1)[0]
    check("input-seen", seen & 0x10, "the program's own variable shows it on the next pass", f"keys={seen:#04x}")
    rpc.release_input()
    rpc.bp_set(1, f"PC={LOOP:04X}H")
    rpc.run(timeout=10)
    seen2 = rpc.read_memory(KEYS, 1)[0]
    check("input-released", seen2 == 0, "releasing it is seen on the next pass", f"keys={seen2:#04x}")

    # the joystick byte: what a 48K machine does with it
    idle = rows(rpc)
    rpc.set_input("ff" * 8 + "01")                 # the 9th byte: right
    rpc.step()
    low = {k: f"{v:02x}" for k, v in rows(rpc).items() if v != idle[k]}
    rpc.release_input()
    rpc.step()
    check("input-joystick", bool(low),
          "the joystick byte reaches the machine: it presses the keys of the emulated joystick",
          f"rows that changed: {low or 'none'}")

    # one call for N frames, exactly on the boundary
    rpc.bp_disable(1)                             # an armed stopping checkpoint would end the run early
    rpc.enter_step()
    rpc.reset_tstates()
    own0 = word(rpc, PASSES)
    got = rpc.frames(1, timeout=20)
    one = (word(rpc, PASSES) - own0) & 0xFFFF
    check("frame-advance", FRAME_TSTATES <= got < FRAME_TSTATES + 100,
          "one frame in one call: the T-state counter moves one frame and no more",
          f"{got} T-states, {got - FRAME_TSTATES} past the boundary, {one} loop passes")
    own0 = word(rpc, PASSES)
    rpc.frames(10, timeout=60)
    own = (word(rpc, PASSES) - own0) & 0xFFFF
    check("frames-ten", 8 * one <= own <= 12 * one,
          "ten frames in one call is ten frames, on the program's own pace",
          f"{own} passes against {one} for one frame")

    rpc.bp_disable(1)
    # typing a string, which the kit's client offers next to the port matrix
    rpc.exit_step()                      # key events are pumped by the running machine, not by a stopped one
    rpc.type_ascii("v", 150)             # V: row 0, bit 4, the key the test program watches
    typed = False
    for _ in range(40):                  # the key is held 150 ms; watch the program for two seconds
        if rpc.read_memory(KEYS, 1)[0] & 0x10:
            typed = True
            break
        time.sleep(0.05)
    check("input-type-ascii", typed, "send-keys-ascii presses the key of the character it is given",
          "seen by the program" if typed else "not seen in 2 s")
    rpc.enter_step()
    # a step that returns when it is done
    st = rpc.step()
    check("step-returns", "PC" in st and "disasm" in st and rpc.tstates_in_frame() >= 0,
          "a step replies with the PC it stopped at", f"PC={st.get('PC', -1):04X} {st.get('disasm', '')}")

    # thirty stops at varied moments: what the script set while stopped is still there a frame later
    lost = 0
    tries = 30
    for i in range(tries):
        rpc.enter_step()
        rpc.bp_set(1, f"PC={LOOP:04X}H")
        rpc.run(limit=200 + 37 * (i % 7), timeout=20)
        rpc.bp_disable(1)                    # or the frame advance would stop at the loop checkpoint
        rpc.set_register("IY", 0x4000 + i)
        rpc.frames(1, timeout=20)
        if rpc.registers()["IY"] != 0x4000 + i:
            lost += 1
    check("stop-at-instruction", lost == 0,
          "thirty stops at varied moments: a register set after each survives a frame",
          f"lost after {lost} of {tries}")

    # the cost of the loop EMULATOR.md says has to run at tens of steps a second
    rpc.enter_step()
    t0 = time.time()
    for _ in range(20):
        rpc.frames(1, timeout=20)
    per = (time.time() - t0) / 20
    check("cheap-loop", per < 0.5, "a frame step with its round trip costs well under a second",
          f"{per * 1000:.0f} ms a step, {1 / per:.0f} a second")


@phase("transport")
def p_transport(rpc):
    rpc.bp_clear()
    errs, slow = 0, []
    for _ in range(20):
        rpc.enter_step()
        rpc.bp_set(1, f"PC={LOOP:04X}H")
        rpc.run(timeout=10)
        t0 = time.time()
        try:
            rpc.registers()
            rpc.read_memory(0x4000, 256)
        except ZesaruxError as e:
            errs += 1
        dt = time.time() - t0
        if dt > 1.0:
            slow.append(round(dt, 2))
    check("call-during-stop", errs == 0 and not slow,
          "a call made right after a checkpoint stops the machine answers", f"errors={errs} slow={slow}")
    if word(rpc, PASSES) == 0:
        setup(rpc)
    t0 = time.time()
    calls, err = 0, None
    try:
        for i in range(400):
            rpc.read_memory(0x4000 + (i % 16), 256)
            rpc.registers()
            calls += 2
    except Exception as e:
        err = repr(e)
    dt = time.time() - t0
    calls_ok = "up" in subprocess_status()
    check("many-unpaced-calls", err is None and calls_ok and word(rpc, PASSES) > 0,
          "800 unpaced calls leave ZRCP up and the machine running",
          f"{calls / dt:.0f} calls a second {err or ''}")
    rpc.bp_clear()


def subprocess_status():
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"),
                        "--platform", "spectrum", "status"], capture_output=True, text=True)
    return r.stdout


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SNAPDIR, exist_ok=True)
    for name in SNAPS + ("zemutest_p1",):
        try:
            os.remove(os.path.join(SNAPDIR, name + ".sna"))
        except FileNotFoundError:
            pass
    try:
        rpc = connect(timeout=30)
    except ZesaruxError as e:
        sys.exit(f"{e}")
    build = f"ZEsarUX {rpc.version()} on {sys.platform}"
    print(build)
    started = time.time()
    p_start(rpc)
    if not any(n == "program-runs" and ok for n, ok in results):
        print("\nthe test program never ran; stopping here")
        sys.exit(1)
    for step in (p1, p3, p_watch, p_interrupts, p4, p2):
        fresh(rpc)
        step(rpc)
    rpc = p2_restart(rpc)
    p_transport(rpc)
    try:
        rpc.exit_step()
    except Exception:
        pass
    if "--keep" not in sys.argv:
        for name in SNAPS + ("zemutest_p1",):
            try:
                os.remove(os.path.join(SNAPDIR, name + ".sna"))
            except FileNotFoundError:
                pass
    rpc.close()
    failed = sorted({n for n, ok in results if not ok})
    passed = sorted({n for n, ok in results if ok} - set(failed))
    summary = {"build": build, "when": time.strftime("%Y-%m-%d %H:%M"), "seconds": round(time.time() - started),
               "passed": passed, "failed": failed}
    with open(os.path.join(OUT, RESULT), "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n=== {len(results) - sum(1 for _, ok in results if not ok)} passed, "
          f"{sum(1 for _, ok in results if not ok)} failed, {summary['seconds']} s")
    if failed:
        print("failed: " + " ".join(failed))
        print(f"read {WORKAROUNDS} for each of these, and only these")
    else:
        print(f"nothing failed; {WORKAROUNDS} does not apply to this build")
    print(f"written to {os.path.relpath(os.path.join(OUT, RESULT), ROOT)}")


if __name__ == "__main__":
    main()
