#!/usr/bin/env python3
"""Test the emulator against kit/EMULATOR.md, with a test program of its own.

    python3 kit/scripts/tools.py check-emulator      (the usual way in)
    python3 kit/c64/check_emulator.py [--keep]

Needs the emulator up (`tools.py vice`) and nothing else: no game, no disk
image. It hard-resets the machine, writes a small test program to $C000,
starts it with SYS 49152, and measures the four phases on it. Anything the
emulator was doing is lost. It restarts the emulator once (phase 2, "after
a restart") and leaves it running. Under a minute on a working build.

Every check has a name. The summary lists the names that failed, and
kit/skills/c64/tool-vice-mcp/workarounds.md says, per name, what to do
instead. Run it before the first game on a machine, and again after any
new emulator build or release.

The test program runs one pass per frame, synchronised on raster line $F8:

  $C100/1  passes    counts up once per pass
  $C102/3  x         x += vx every pass; x's high byte goes to $D000 and $0400
  $C104/5  vx        +6 every pass while control port 1 is held left
  $C106    side      1 while port 1 is left, else 0 (stored every pass)
  $C107    fire      1 while port 1 fire is held
  $C108    key       1 while F1 is held (keyboard row 0, column 4)
  $C109    j1        $DC01 as read with no keyboard row selected
  $C10A    j2        $DC00 as read
  $C10B    timer     CIA 1 timer A low byte, read at the same point every pass
                     (so determinism is tested to the cycle); also to $0401

--keep leaves the test's snapshots in the emulator's snapshot folder.
"""
import json, os, subprocess, sys, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from vice import connect, call, read_mem, poke, addr, clear_checkpoints  # noqa: E402

SNAPDIR = os.path.join(ROOT, "tools", "vice-home", "config", "vice", "mcp_snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
SNAPS = ("emutest_base", "emutest_run", "emutest_nocp", "emutest_p1")
WORKAROUNDS = "kit/skills/c64/tool-vice-mcp/workarounds.md"

BASE = 0xC000
PASSES, X, VX, SIDE, FIRE, KEY, J1, J2, TIMER = 0xC100, 0xC102, 0xC104, 0xC106, 0xC107, 0xC108, 0xC109, 0xC10A, 0xC10B


def program():
    """The test program, assembled here so that it is source, not a binary."""
    code, labels, fix = bytearray(), {}, []

    def op(*b): code.extend(b)
    def w(a): return (a & 0xFF, a >> 8)
    def lab(n): labels[n] = BASE + len(code)
    def br(opcode, n): code.extend((opcode, 0)); fix.append((len(code) - 1, n))

    op(0x78)                                        # sei
    op(0xA9, 0x7F); op(0x8D, *w(0xDC0D))            # lda #$7f; sta $dc0d   CIA 1 interrupts off
    op(0x8D, *w(0xDD0D)); op(0xAD, *w(0xDC0D))      # sta $dd0d; lda $dc0d  CIA 2 too; acknowledge
    op(0xA9, 0xFF); op(0x8D, *w(0xDC02))            # lda #$ff; sta $dc02   port A all outputs
    op(0xA9, 0x00); op(0x8D, *w(0xDC03))            # lda #$00; sta $dc03   port B all inputs
    op(0xA9, 0x01); op(0x8D, *w(0xD015))            # lda #$01; sta $d015   sprite 0 on
    lab("loop")
    op(0xEE, *w(PASSES)); br(0xD0, "p"); op(0xEE, *w(PASSES + 1)); lab("p")
    op(0xA9, 0xFF); op(0x8D, *w(0xDC00))            # no keyboard row selected
    op(0xAD, *w(0xDC01)); op(0x8D, *w(J1))          # control port 1
    op(0xAD, *w(0xDC00)); op(0x8D, *w(J2))          # control port 2
    op(0xA9, 0xFE); op(0x8D, *w(0xDC00))            # select row 0
    op(0xAD, *w(0xDC01))                            # lda $dc01
    op(0xA2, 0xFF); op(0x8E, *w(0xDC00))            # ldx #$ff; stx $dc00  deselect
    op(0xA2, 0x00); op(0x29, 0x10); br(0xD0, "k"); op(0xE8); lab("k"); op(0x8E, *w(KEY))
    op(0xA2, 0x00); op(0xAD, *w(J1)); op(0x29, 0x10); br(0xD0, "f"); op(0xE8); lab("f"); op(0x8E, *w(FIRE))
    op(0xA2, 0x00); op(0xAD, *w(J1)); op(0x29, 0x04); br(0xD0, "s")
    op(0xE8, 0x18); op(0xAD, *w(VX)); op(0x69, 0x06); op(0x8D, *w(VX))
    br(0x90, "s"); op(0xEE, *w(VX + 1))
    lab("s"); lab("store_side"); op(0x8E, *w(SIDE))
    op(0x18); op(0xAD, *w(X)); op(0x6D, *w(VX)); op(0x8D, *w(X))
    op(0xAD, *w(X + 1)); op(0x6D, *w(VX + 1)); op(0x8D, *w(X + 1))
    op(0x8D, *w(0xD000)); op(0x8D, *w(0x0400))      # x high byte: sprite 0 x, and the screen
    op(0xAD, *w(0xDC04)); op(0x8D, *w(TIMER)); op(0x8D, *w(0x0401))
    lab("wait0"); op(0xAD, *w(0xD012)); op(0xC9, 0xF8); br(0xF0, "wait0")
    lab("wait1"); op(0xAD, *w(0xD012)); op(0xC9, 0xF8); br(0xD0, "wait1")
    lab("end_body"); op(0x4C, *w(labels["loop"]))
    for i, n in fix:
        d = labels[n] - (BASE + i + 1)
        assert -128 <= d <= 127, n
        code[i] = d & 0xFF
    return bytes(code), labels


CODE, LABELS = program()
LOOP, STORE_SIDE, WAIT1, END_BODY = LABELS["loop"], LABELS["store_side"], LABELS["wait1"], LABELS["end_body"]

results = []
has = set()            # tool names the server lists


def check(name, ok, what, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name:28} {what}" + (f"  [{detail}]" if detail else ""), flush=True)
    results.append((name, bool(ok)))


def j(x):
    try:
        return json.loads(x)
    except Exception:
        return {"raw": x}


def pc(rpc): return j(call(rpc, "vice_registers_get")).get("PC", -1)
def ping(rpc): return j(call(rpc, "vice_ping")).get("execution")
def run(rpc): return call(rpc, "vice_execution_run", {})
def word(rpc, a): b = read_mem(rpc, a, 2); return b[0] + 256 * b[1]
def byte(rpc, a): return read_mem(rpc, a, 1)[0]


def hits(rpc):
    return {c["start"]: c["hit_count"] for c in j(call(rpc, "vice_checkpoint_list")).get("checkpoints", [])}


def cp_add(rpc, a, stop=False):
    return j(call(rpc, "vice_checkpoint_add", {"start": addr(a), "exec": True, "stop": stop}))["checkpoint_num"]


def cp_del(rpc, n):
    call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})


def passes(rpc, secs):
    """Loop passes over secs, counted by a temporary non-stopping checkpoint."""
    n = cp_add(rpc, LOOP); time.sleep(secs); h = hits(rpc).get(LOOP, 0); cp_del(rpc, n)
    return h


def advancing(rpc):
    return passes(rpc, 0.3) > 0


def wait_paused(rpc, timeout=5.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if ping(rpc) == "paused":
            return time.time() - t0
        time.sleep(0.01)
    return None


def stop_at(rpc, a):
    n = cp_add(rpc, a, True)
    run(rpc)
    return n, wait_paused(rpc)


def stop_after_passes(rpc, n_passes):
    """A stopping checkpoint on the loop that fires on pass n_passes + 1.

    Armed on a stopped machine: on a running one the checkpoint can fire in the gap between
    adding it and setting its ignore count, and it does whenever a call takes longer than a
    pass is from its end (a host where calls take 16 ms loses that race four times in five)."""
    if ping(rpc) != "paused":
        call(rpc, "vice_execution_pause", {}); wait_paused(rpc)
    n = cp_add(rpc, LOOP, True)
    call(rpc, "vice_checkpoint_set_ignore_count", {"checkpoint_num": n, "count": n_passes})
    return n


def snap_save(rpc, name):
    return j(call(rpc, "vice_snapshot_save", {"name": name, "description": "check_emulator", "include_roms": False}))


def snap_load(rpc, name):
    return j(call(rpc, "vice_snapshot_load", {"name": name}))


def shot(rpc, name):
    p = os.path.join(OUT, name + ".png")
    call(rpc, "vice_display_screenshot", {"path": p, "format": "PNG"})
    return p


def sample(rpc):
    """Zero page, screen, the test program's variables and the VIC-II registers."""
    return read_mem(rpc, 0x0002, 0xFE) + read_mem(rpc, 0x0400, 0x400) + read_mem(rpc, 0xC100, 0x10) \
        + read_mem(rpc, 0xD000, 0x30, bank="io")


def diff(a, b):
    n = sum(1 for x, y in zip(a, b) if x != y)
    return f"{n} bytes differ" if n else "identical"


def tools(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), *args],
                          capture_output=True, text=True).stdout.strip()


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


# ---------------------------------------------------------------------------
def setup(rpc):
    """Hard reset, write the test program, SYS 49152. Returns loop passes in one second."""
    clear_checkpoints(rpc)
    call(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 0}})
    call(rpc, "vice_machine_reset", {"mode": "hard", "run_after": True})
    for _ in range(100):                 # "READY." in screen codes
        if bytes((0x12, 0x05, 0x01, 0x04, 0x19, 0x2E)) in read_mem(rpc, 0x0400, 1000):
            break
        time.sleep(0.1)
    else:
        raise RuntimeError("no READY. prompt within 10 s of a hard reset; is the machine running?")
    poke(rpc, BASE, CODE)
    poke(rpc, 0xC100, [0] * 16)
    call(rpc, "vice_keyboard_type", {"text": "SYS49152\n"})
    time.sleep(1.0)
    return passes(rpc, 1.0)


def fresh(rpc):
    """Start each phase on a running test program, so one failure does not fail the phases after it."""
    try:
        clear_checkpoints(rpc); run(rpc)
        if advancing(rpc):
            return rpc
    except Exception:
        pass
    print("   (the machine is not running: restarting the emulator so that this phase starts clean)", flush=True)
    tools("stop", "vice"); tools("vice")
    rpc = connect()
    setup(rpc)
    return rpc


@phase("start: reset, write the test program, SYS 49152")
def p_start(rpc):
    st = ping(rpc)
    check("ping-running", st == "running", "a fresh machine reports running", st)
    names = [t["name"] for t in rpc("tools/list", {})["result"]["tools"]]
    has.update(names)
    check("frame-advance-exists", "vice_frame_advance" in names, "the server has vice_frame_advance", f"{len(names)} tools")
    p = setup(rpc)
    check("write-read", read_mem(rpc, BASE, len(CODE)) == CODE, "memory written reads back the same")
    check("program-running", 40 <= p <= 65, "the test program runs one pass per frame", f"{p} passes in 1 s")


@phase("phase 1: static inspection")
def p1(rpc):
    for tool in ("vice_registers_get", "vice_vicii_get_state", "vice_sid_get_state", "vice_cia_get_state"):
        r = j(call(rpc, tool))
        check("chip-state", isinstance(r, dict) and "raw" not in r and "error" not in r, f"{tool} answers", ",".join(list(r)[:4]))
    big = read_mem(rpc, 0x2000, 0x2000)
    check("read-large", len(big) == 0x2000, "8 KB read in one call", len(big))
    rom, ram = read_mem(rpc, 0xA000, 16, bank="rom"), read_mem(rpc, 0xA000, 16, bank="ram")
    check("read-bank", rom != ram, "bank argument: BASIC ROM and the RAM under it differ at $A000", f"rom {rom[:4].hex()} ram {ram[:4].hex()}")
    n, _ = stop_at(rpc, LOOP)
    r = snap_save(rpc, "emutest_p1")
    path = os.path.join(SNAPDIR, "emutest_p1.vsf")
    check("snapshot-save", r.get("status") == "ok" and os.path.exists(path), "a snapshot lands in tools/vice-home", json.dumps(r)[:80])
    data = open(path, "rb").read() if os.path.exists(path) else b""
    check("snapshot-ram-offset", data[209 + BASE: 209 + BASE + len(CODE)] == CODE,
          "RAM is at offset 209 + address in the file", f"found at {data.find(CODE) - BASE}")
    cp_del(rpc, n); run(rpc)


@phase("phase 3: live measurement")
def p3(rpc):
    clear_checkpoints(rpc)
    a, b = cp_add(rpc, LOOP), cp_add(rpc, WAIT1)
    p0 = word(rpc, PASSES); st0 = ping(rpc); time.sleep(1.0); h = hits(rpc); p1_ = word(rpc, PASSES); st1 = ping(rpc)
    check("count-no-stop", st0 == st1 == "running", "non-stopping checkpoints leave it running", f"{st0},{st1}")
    own = (p1_ - p0) & 0xFFFF
    check("count-matches", abs(h.get(LOOP, 0) - own) <= 2, "the loop's hit count matches the program's own counter", f"hits {h.get(LOOP)} counter {own}")
    check("count-busy-loop", h.get(WAIT1, 0) > 20 * h.get(LOOP, 1), "a busy-wait checkpoint counts every time round", f"{h.get(WAIT1)}")
    cp_del(rpc, a); cp_del(rpc, b)
    # Against emulated time, not the wall clock: the loop runs one pass a frame, and the pass
    # counter and the stopwatch are both read on a stopped machine. A wall-clock window is
    # skewed whenever the host is slow, and right after the busy checkpoint above VICE runs
    # faster than real time to catch up (0.5 s read 700k cycles on a 4-core Linux container).
    std = str(j(call(rpc, "vice_machine_config_get", {})).get("video_standard", "PAL")).upper()
    frame = {"PAL": 63 * 312, "NTSC": 65 * 263, "NTSC-OLD": 64 * 262, "PAL-N": 65 * 312}.get(std, 63 * 312)
    call(rpc, "vice_execution_pause", {}); wait_paused(rpc)
    p0 = word(rpc, PASSES); call(rpc, "vice_cycles_stopwatch", {"action": "reset"})
    run(rpc); time.sleep(1.0); call(rpc, "vice_execution_pause", {}); wait_paused(rpc)
    r = j(call(rpc, "vice_cycles_stopwatch", {"action": "read"})); np_ = (word(rpc, PASSES) - p0) & 0xFFFF
    cyc = r.get("elapsed_cycles", r.get("cycles"))
    check("stopwatch", isinstance(cyc, (int, float)) and np_ > 0 and abs(cyc - np_ * frame) < frame,
          f"the cycle stopwatch agrees with the frame count ({std}: {frame} cycles a pass), to within a frame",
          f"{cyc} cycles, {np_} passes = {np_ * frame}")
    run(rpc)
    ws = j(call(rpc, "vice_watch_add", {"address": addr(SIDE), "store": True, "stop": False}))
    wl = j(call(rpc, "vice_watch_add", {"address": addr(VX), "load": True, "stop": False}))
    check("watch-args", ws.get("stop") is False and wl.get("stop") is False, "vice_watch_add takes load, store, stop", f"{json.dumps(ws)[:60]}")
    time.sleep(1.0)
    h = hits(rpc); st = ping(rpc)
    check("watch-store", 40 <= h.get(SIDE, 0) <= 130 and st == "running", "a store watchpoint counts once a pass and does not stop", f"{h.get(SIDE)} {st}")
    check("watch-load", h.get(VX, 0) >= 40, "a load watchpoint counts (load is honoured)", h.get(VX))
    clear_checkpoints(rpc)


@phase("phase 4: frame stepping with inputs")
def p4(rpc):
    clear_checkpoints(rpc)
    n, t = stop_at(rpc, LOOP)
    p = pc(rpc)
    check("stop-exact", p == LOOP, "a stopping checkpoint stops on its instruction", f"PC=${p:04X} after {t and round(t * 1000)} ms")
    s1 = sample(rpc); time.sleep(0.3); s2 = sample(rpc)
    check("stopped-stays-stopped", s1 == s2 and ping(rpc) == "paused", "memory does not change while stopped, reads included", diff(s1, s2))
    h0 = hits(rpc).get(LOOP, 0); t0 = time.time()
    for i in range(10):
        run(rpc); wait_paused(rpc)
    dt = (time.time() - t0) / 10
    h1 = hits(rpc).get(LOOP, 0)
    check("step-pass", h1 - h0 == 10 and pc(rpc) == LOOP, "run, wait for the stop: exactly one pass each time", f"{h1 - h0} passes in 10, {dt * 1000:.0f} ms each")

    before = byte(rpc, 0xDC01)
    call(rpc, "vice_joystick_set", {"port": 1, "direction": "left"})
    now = byte(rpc, 0xDC01)
    check("joy-immediate", (now & 0x04) == 0 and (before & 0x04), "port 1 left is in $DC01 before the call returns", f"${before:02X} -> ${now:02X}")
    vx0 = word(rpc, VX)
    for _ in range(5):
        run(rpc); wait_paused(rpc)
    side, vx1 = byte(rpc, SIDE), word(rpc, VX)
    check("joy-port-1", side == 1 and (vx1 - vx0) & 0xFFFF == 30, "port 1 held left is seen on each of 5 passes", f"side={side} vx +{(vx1 - vx0) & 0xFFFF}")
    call(rpc, "vice_joystick_set", {"port": 1, "direction": "center", "fire": False})
    run(rpc); wait_paused(rpc)
    check("joy-release", byte(rpc, 0xDC01) == 0xFF and byte(rpc, SIDE) == 0, "releasing it is seen on the next pass", f"$DC01=${byte(rpc, 0xDC01):02X}")
    call(rpc, "vice_joystick_set", {"port": 2, "direction": "left"})
    dc00, dc01 = byte(rpc, 0xDC00), byte(rpc, 0xDC01)
    check("joy-port-2", (dc00 & 0x04) == 0 and dc01 == 0xFF, "port 2 reaches $DC00, not $DC01", f"$DC00=${dc00:02X} $DC01=${dc01:02X}")
    call(rpc, "vice_joystick_set", {"port": 2, "direction": "center", "fire": False})
    call(rpc, "vice_joystick_set", {"port": 1, "fire": True})
    run(rpc); wait_paused(rpc)
    f = byte(rpc, FIRE)
    call(rpc, "vice_joystick_set", {"port": 1, "direction": "center", "fire": False})
    check("joy-fire", f == 1, "fire set while stopped is seen on the next pass", f)
    poke(rpc, VX, [6, 0])

    cp_del(rpc, n)
    check("stopped-without-checkpoint", ping(rpc) == "paused", "deleting the checkpoint leaves it stopped")
    r = j(call(rpc, "vice_frame_advance", {"frames": 1}))
    check("frame-advance-one", r.get("frames") == 1 and ping(rpc) == "paused", "vice_frame_advance runs one frame and stops", json.dumps(r)[:80])
    m = cp_add(rpc, LOOP)
    h0 = hits(rpc).get(LOOP, 0); rasters = []; t0 = time.time()
    for _ in range(10):
        call(rpc, "vice_frame_advance", {"frames": 1})
        rasters.append(j(call(rpc, "vice_vicii_get_state")).get("raster_line"))
    dt = (time.time() - t0) / 10
    h1 = hits(rpc).get(LOOP, 0)
    check("frame-advance-pass", h1 - h0 == 10 and ping(rpc) == "paused", "ten single frames are ten passes", f"{h1 - h0} passes, {dt * 1000:.0f} ms a call")
    check("frame-advance-boundary", "vice_frame_advance" in has and all(x in (0, 311, 262) for x in rasters), "each frame stops at the frame boundary", rasters)
    r = j(call(rpc, "vice_frame_advance", {"frames": 50}))
    h2 = hits(rpc).get(LOOP, 0)
    check("frame-advance-many", r.get("frames") == 50 and h2 - h1 == 50, "one call for 50 frames is 50 passes", f"{h2 - h1}")
    call(rpc, "vice_run_until", {"address": addr(STORE_SIDE)})
    wait_paused(rpc)
    check("run-until-resumes", pc(rpc) == STORE_SIDE, "vice_run_until resumes a stopped machine and stops there", f"PC=${pc(rpc):04X}")
    cp_del(rpc, m)

    run(rpc); time.sleep(0.2)
    check("run-after-stop", advancing(rpc), "vice_execution_run resumes after a stop")
    r = j(call(rpc, "vice_frame_advance", {"frames": 1}))
    check("frame-advance-refuses-running", "vice_frame_advance" in has and "error" in json.dumps(r).lower(), "vice_frame_advance on a running machine is refused", json.dumps(r)[:60])
    call(rpc, "vice_execution_pause", {})
    w = wait_paused(rpc); s1 = sample(rpc); time.sleep(0.3); s2 = sample(rpc)
    check("pause-exact", w is not None and s1 == s2, "vice_execution_pause stops the CPU", f"{w and round(w * 1000)} ms, {diff(s1, s2)}")
    p0 = pc(rpc)
    dis = j(call(rpc, "vice_disassemble", {"address": addr(p0), "count": 1}))["lines"][0]
    mnem = [t for t in dis["instruction"].upper().split() if len(t) == 3 and t.isalpha()][0]
    jumps = mnem[0] == "B" or mnem in ("JMP", "JSR", "RTS", "RTI")
    r = j(call(rpc, "vice_execution_step", {"count": 1})); p1_ = pc(rpc)
    check("step-instruction", r.get("PC") == p1_ and ping(rpc) == "paused" and (jumps or p1_ == p0 + dis["size"]),
          "vice_execution_step runs one instruction and replies with the PC", f"${p0:04X} -> ${p1_:04X} {dis['instruction']}")
    run(rpc); time.sleep(0.1)
    call(rpc, "vice_watch_add", {"address": addr(SIDE), "store": True, "stop": True})
    w = wait_paused(rpc); p = pc(rpc)
    check("watch-stop", w is not None and LOOP <= p <= END_BODY, "a stopping watchpoint stops the machine, in the loop", f"PC=${p:04X}")
    clear_checkpoints(rpc); run(rpc); time.sleep(0.2)
    check("run-after-watch-stop", advancing(rpc), "vice_execution_run resumes after it (no monitor window holding it)")


@phase("phase 2: state management")
def p2(rpc):
    clear_checkpoints(rpc)
    n, _ = stop_at(rpc, LOOP)
    poke(rpc, X, [0x00, 0x50]); poke(rpc, VX, [6, 0])
    r = snap_save(rpc, "emutest_base")
    check("snapshot-save-stopped", r.get("status") == "ok", "save from a stopped machine", json.dumps(r)[:60])
    cp_del(rpc, n); run(rpc); time.sleep(0.3)

    n = cp_add(rpc, LOOP, True)
    snap_load(rpc, "emutest_base"); w = wait_paused(rpc)
    check("load-stop-checkpoint", w is not None and pc(rpc) == LOOP, "a load with a stopping checkpoint armed stops at once", f"PC=${pc(rpc):04X}")
    check("load-state", word(rpc, X) == 0x5000, "the state loaded is the state saved", f"x=${word(rpc, X):04X}")
    cp_del(rpc, n)
    snap_load(rpc, "emutest_base"); time.sleep(0.3)
    check("load-held", ping(rpc) == "paused" and pc(rpc) == LOOP and not advancing(rpc),
          "a load on a stopped machine stays stopped at the loaded PC", f"{ping(rpc)} PC=${pc(rpc):04X}")
    got = {}
    for tag in "ab":
        n = stop_after_passes(rpc, 100)
        snap_load(rpc, "emutest_base"); run(rpc); wait_paused(rpc)
        got[tag] = (sample(rpc), shot(rpc, "determinism-" + tag), hits(rpc).get(LOOP, 0))
        cp_del(rpc, n)
    (sa, pa, ha), (sb, pb, hb) = got["a"], got["b"]
    check("ignore-count", ha == hb == 1 and pc(rpc) == LOOP, "a checkpoint with an ignore count of 100 stops on pass 101", f"hits {ha},{hb}")
    check("determinism", sa == sb and word(rpc, X) > 0x5000, "same snapshot + 100 passes: same memory and VIC registers", diff(sa, sb))
    check("determinism-screenshot", open(pa, "rb").read() == open(pb, "rb").read(), "and the same screenshot")

    run(rpc); time.sleep(0.5)
    check("snapshot-save-running", snap_save(rpc, "emutest_run").get("status") == "ok", "save from a running machine")
    out = []
    for _ in range(2):
        n = stop_after_passes(rpc, 100); snap_load(rpc, "emutest_run"); run(rpc); wait_paused(rpc)
        out.append((sample(rpc), hits(rpc).get(LOOP, 0))); cp_del(rpc, n)
    check("determinism-running-save", out[0] == out[1] and out[0][1] == 1, "the same, from a snapshot saved while running", diff(out[0][0], out[1][0]))
    run(rpc); time.sleep(0.2)
    check("load-runs", advancing(rpc), "a loaded snapshot runs when told to")

    clear_checkpoints(rpc); time.sleep(0.2)
    snap_save(rpc, "emutest_nocp")               # saved with no checkpoints at all
    m = cp_add(rpc, LOOP)
    snap_load(rpc, "emutest_nocp"); run(rpc); time.sleep(0.5)
    h = hits(rpc).get(LOOP, 0)
    check("checkpoints-survive-load", h >= 15, "a checkpoint keeps counting after loading a snapshot saved without any", f"{h} hits in 0.5 s")
    cp_del(rpc, m)

    call(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 1}})
    on = j(call(rpc, "vice_machine_config_get", {})).get("resources", {}).get("WarpMode")
    pw = passes(rpc, 1.0)
    call(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 0}})
    off = j(call(rpc, "vice_machine_config_get", {})).get("resources", {}).get("WarpMode")
    time.sleep(0.3); pn = passes(rpc, 1.0)
    check("warp", on == 1 and off == 0 and pw > 100 and 40 <= pn <= 65, "warp on and off through vice_machine_config_set", f"{pw}/s warp, {pn}/s normal")
    return out[0][0]


@phase("phase 2: after a restart of the emulator")
def p2_restart(ref):
    print("  ", tools("stop", "vice"))
    print("  ", tools("vice"))
    rpc = connect()
    n = stop_after_passes(rpc, 100); r = snap_load(rpc, "emutest_run"); run(rpc); w = wait_paused(rpc)
    s = sample(rpc)
    check("determinism-restart", r.get("status") == "ok" and w is not None and s == ref,
          "a new process gives the same 100 passes", diff(ref, s))
    cp_del(rpc, n); run(rpc)
    return rpc


@phase("keys")
def p_keys(rpc):
    clear_checkpoints(rpc)
    n, _ = stop_at(rpc, LOOP)
    call(rpc, "vice_keyboard_matrix", {"row": 0, "col": 4, "pressed": True})
    run(rpc); wait_paused(rpc); k1 = byte(rpc, KEY)
    call(rpc, "vice_keyboard_matrix", {"row": 0, "col": 4, "pressed": False})
    run(rpc); wait_paused(rpc); k2 = byte(rpc, KEY)
    check("keys-matrix", k1 == 1 and k2 == 0, "F1 by row and column while stopped is seen on the next pass, and released", f"{k1},{k2}")
    call(rpc, "vice_keyboard_key_press", {"key": "F1"})
    seen = []
    for _ in range(3):
        run(rpc); wait_paused(rpc); seen.append(byte(rpc, KEY))
    call(rpc, "vice_keyboard_key_release", {"key": "F1"})
    for _ in range(3):
        run(rpc); wait_paused(rpc)
    check("keys-host", 1 in seen, "F1 by host key name arrives within three passes", seen)
    cp_del(rpc, n); run(rpc)


@phase("transport")
def p_transport(rpc):
    clear_checkpoints(rpc)
    slow, errs = [], 0
    for _ in range(20):
        run(rpc); time.sleep(0.05)
        n = cp_add(rpc, LOOP, True)
        t0 = time.time(); r = j(call(rpc, "vice_ping")); dt = time.time() - t0
        if "error" in json.dumps(r).lower(): errs += 1
        if dt > 1.0: slow.append(round(dt, 2))
        wait_paused(rpc); cp_del(rpc, n)
    check("call-during-stop", errs == 0 and not slow, "a call made as a checkpoint stops the machine answers", f"errors={errs} slow={slow}")
    run(rpc)
    t0 = time.time(); calls = 0; err = None
    try:
        for i in range(400):
            call(rpc, "vice_sprite_get", {"sprite": i % 8}); read_mem(rpc, 0, 256)
            call(rpc, "vice_registers_get"); call(rpc, "vice_vicii_get_state"); calls += 4
    except Exception as e:
        err = repr(e)
    dt = time.time() - t0
    check("unpaced-calls", err is None and "up" in tools("status").splitlines()[0] and advancing(rpc),
          "1600 calls with no pacing leave the server up and the machine running", f"{calls / dt:.0f} a second {err or ''}")


def main():
    os.makedirs(OUT, exist_ok=True)
    build = tools("status").splitlines()[0]
    print(build)
    for name in SNAPS:                               # a snapshot name cannot be reused
        for ext in (".vsf", ".json"):
            try: os.remove(os.path.join(SNAPDIR, name + ext))
            except FileNotFoundError: pass
    rpc = connect()
    started = time.time()
    p_start(rpc)
    if not any(n == "program-running" and ok for n, ok in results):
        print("\nthe test program never ran; stopping here"); sys.exit(1)
    for step in (p1, p3, p4):
        rpc = fresh(rpc)
        step(rpc)
    rpc = fresh(rpc)
    ref = p2(rpc)
    rpc = p2_restart(ref) if ref else rpc
    for step in (p_keys, p_transport):
        rpc = fresh(rpc)
        step(rpc)
    if "--keep" not in sys.argv:
        for name in SNAPS:
            for ext in (".vsf", ".json"):
                try: os.remove(os.path.join(SNAPDIR, name + ext))
                except FileNotFoundError: pass
    try:                                             # leave it running: an autostart into a paused
        run(fresh(rpc))                              # machine loads and then waits for a run
    except Exception:
        pass
    failed = sorted({n for n, ok in results if not ok})
    passed = sorted({n for n, ok in results if ok} - set(failed))
    summary = {"build": build, "when": time.strftime("%Y-%m-%d %H:%M"), "seconds": round(time.time() - started),
               "passed": passed, "failed": failed}
    with open(os.path.join(OUT, "result.json"), "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n=== {len(results) - sum(1 for _, ok in results if not ok)} passed, "
          f"{sum(1 for _, ok in results if not ok)} failed, {summary['seconds']} s")
    if failed:
        print("failed: " + " ".join(failed))
        print(f"read {WORKAROUNDS} for each of these, and only these")
    else:
        print(f"nothing failed; {WORKAROUNDS} does not apply to this build")
    print(f"written to {os.path.relpath(os.path.join(OUT, 'result.json'), ROOT)}")


if __name__ == "__main__":
    main()
