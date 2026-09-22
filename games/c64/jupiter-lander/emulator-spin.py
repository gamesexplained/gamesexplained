#!/usr/bin/env python3
"""The emulator's four-phase test (kit/EMULATOR.md), run on Jupiter Lander.

    python3 games/c64/jupiter-lander/emulator-spin.py

Needs the emulator up (kit/scripts/tools.py vice) and work/play-inflight.vsf.
Every check prints PASS or FAIL; the summary counts them. It also exercises
what the fixed vice-mcp build changed (kit/c64/INSTALL.md, "A build from
source"): exact stops, frame advance, port numbering, immediate input, the
step tool, checkpoints surviving a snapshot load, and a transport race. On
the v3.11.0 release most of phase 4 fails; that is the measurement.

Addresses are from symbols.json and facts.md. The game is put into a hover
(gravity 0, slow drift right) so main_loop runs indefinitely at ~29 passes/s.
Screenshots and other output land in the game's work/ folder. The script
restarts the emulator once (phase 2b).
"""
import json, os, subprocess, sys, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(ROOT, "kit", "c64"))
from vice import connect, call, read_mem, poke, addr, clear_checkpoints  # noqa: E402

SNAPDIR = os.path.join(ROOT, "tools", "vice-home", "config", "vice", "mcp_snapshots")
WORK = os.path.join(HERE, "work")
OUT = WORK

MAIN_LOOP, DELAY, IRQ, MOVE_SHIP, READ_CONTROLS = 0xE12C, 0xEE45, 0xEB39, 0xE2CB, 0xEB6F
SHIP_X, SHIP_VX, SHIP_Y, SHIP_VY, FUEL, GRAV = 0x08, 0x0B, 0x0D, 0x10, 0x12, 0x14
THRUST_UP, THRUST_SIDE, ON_PAD = 0x16, 0x17, 0x1E

results = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail else ""), flush=True)
    results.append((name, bool(ok)))


def j(x):
    try:
        return json.loads(x)
    except Exception:
        return {"raw": x}


def pc(rpc):
    return j(call(rpc, "vice_registers_get"))["PC"]


def ping(rpc):
    return j(call(rpc, "vice_ping")).get("execution")


def hits(rpc):
    return {c["start"]: c["hit_count"] for c in j(call(rpc, "vice_checkpoint_list"))["checkpoints"]}


def cp_add(rpc, a, stop=False):
    return j(call(rpc, "vice_checkpoint_add", {"start": addr(a), "exec": True, "stop": stop}))["checkpoint_num"]


def cp_del(rpc, n):
    call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})


def passes(rpc, secs):
    """main_loop passes over secs, through a temporary non-stopping checkpoint."""
    n = cp_add(rpc, MAIN_LOOP); time.sleep(secs); h = hits(rpc)[MAIN_LOOP]; cp_del(rpc, n)
    return h


def advancing(rpc):
    return passes(rpc, 0.3) > 0


def run(rpc):
    return call(rpc, "vice_execution_run", {})


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


def snap_save(rpc, name):
    return j(call(rpc, "vice_snapshot_save", {"name": name, "description": "spin", "include_roms": False}))


def snap_load(rpc, name):
    return j(call(rpc, "vice_snapshot_load", {"name": name}))


def shot(rpc, name):
    p = os.path.join(OUT, name + ".png")
    r = j(call(rpc, "vice_display_screenshot", {"path": p, "format": "PNG"}))
    return p, r


def state_sample(rpc):
    return read_mem(rpc, 0x0002, 0xFE) + read_mem(rpc, 0x0400, 0x400) + read_mem(rpc, 0xD000, 0x30, bank="io")


def diff_desc(a, b):
    """Which sampled bytes differ, as addresses."""
    out = []
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            a_ = i + 2 if i < 0xFE else (0x400 + i - 0xFE if i < 0xFE + 0x400 else 0xD000 + i - 0xFE - 0x400)
            out.append(f"${a_:04X}:{x:02X}/{y:02X}")
    return f"{len(out)} bytes differ " + " ".join(out[:12])


def ship_x(rpc):
    b = read_mem(rpc, SHIP_X, 3)
    return b[2] * 65536 + b[1] * 256 + b[0]


def tools(*args):
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), *args],
                          capture_output=True, text=True).stdout.strip()


def stop_after_passes(rpc, n_passes):
    """Arm a stopping checkpoint on main_loop that fires on pass n_passes+1. Returns its number."""
    n = cp_add(rpc, MAIN_LOOP, True)
    r = j(call(rpc, "vice_checkpoint_set_ignore_count", {"checkpoint_num": n, "count": n_passes}))
    if "error" in json.dumps(r).lower():
        print("   set_ignore_count:", json.dumps(r)[:120])
    return n


def phase(name):
    def deco(f):
        def wrapped(*a, **k):
            print(f"\n=== {name}", flush=True)
            try:
                return f(*a, **k)
            except Exception as e:
                check(f"{name}: no exception", False, f"{e!r}")
                traceback.print_exc()
        return wrapped
    return deco


# ---------------------------------------------------------------------------
@phase("boot: ping and tool list (PR #18)")
def p_boot(rpc):
    st = ping(rpc)
    check("ping right after boot says running", st == "running", st)
    names = [t["name"] for t in rpc("tools/list", {})["result"]["tools"]]
    check("vice_frame_advance is in the tool list (PR #20)", "vice_frame_advance" in names, f"{len(names)} tools")


@phase("into flight: load the game's play-inflight snapshot, make a hover state")
def p_hover(rpc):
    src = os.path.join(WORK, "play-inflight.vsf")
    dst = os.path.join(SNAPDIR, "jl_inflight.vsf")
    if not os.path.exists(dst):
        import shutil; shutil.copy(src, dst)
    clear_checkpoints(rpc)
    r = snap_load(rpc, "jl_inflight")
    check("snapshot load reports ok", r.get("status") == "ok", json.dumps(r)[:120])
    n, t = stop_at(rpc, MAIN_LOOP)
    check("stopped at main_loop after the load", t is not None and pc(rpc) == MAIN_LOOP, f"{t and round(t*1000)} ms PC={pc(rpc):04X}")
    poke(rpc, SHIP_X, [0x00, 0x50, 0x00]); poke(rpc, SHIP_VX, [0x06, 0x00])
    poke(rpc, SHIP_Y, [0x00, 0x6A, 0x00]); poke(rpc, SHIP_VY, [0x00, 0x00])
    poke(rpc, FUEL, [0xFF, 0x1F]); poke(rpc, GRAV, [0x00]); poke(rpc, ON_PAD, [0x00])
    poke(rpc, THRUST_UP, [0x00]); poke(rpc, THRUST_SIDE, [0x00])
    r = snap_save(rpc, "jl_hover")
    check("hover snapshot saved (paused, at main_loop)", r.get("status") == "ok" or "already exists" in json.dumps(r), json.dumps(r)[:80])
    cp_del(rpc, n); run(rpc)
    p = passes(rpc, 1.0)
    check("main_loop passes in 1 s is 20..40 (facts.md: 29/s)", 20 <= p <= 40, p)
    check("ping says running", ping(rpc) == "running")


@phase("phase 1: static inspection")
def p1(rpc):
    for tool in ("vice_registers_get", "vice_vicii_get_state", "vice_sid_get_state", "vice_cia_get_state"):
        r = j(call(rpc, tool))
        check(f"{tool} answers", isinstance(r, dict) and "raw" not in r and "error" not in r, list(r)[:5])
    big = read_mem(rpc, 0xE000, 0x2000)
    check("8 KB read in one call", len(big) == 0x2000, len(big))
    rom = read_mem(rpc, 0xE000, 16, bank="rom"); ram = read_mem(rpc, 0xE000, 16, bank="ram")
    check("bank argument: rom and ram differ at $E000 (game lives under the KERNAL)", rom != ram, f"rom={rom.hex()} ram={ram.hex()}")
    n, _ = stop_at(rpc, MAIN_LOOP)
    r = snap_save(rpc, "spin_p1")
    check("snapshot save ok", r.get("status") == "ok", json.dumps(r)[:100])
    path = os.path.join(SNAPDIR, "spin_p1.vsf")
    check("snapshot file is where the kit expects", os.path.exists(path), path)
    live = read_mem(rpc, 0xE12C, 256)
    data = open(path, "rb").read()
    at209 = data[209 + 0xE12C: 209 + 0xE12C + 256]
    where = data.find(live)
    check("256 bytes at $E12C match the file at offset 209+addr", at209 == live, f"pattern found at file offset {where} (expected {209 + 0xE12C})")
    zp = read_mem(rpc, 0x0002, 64)
    check("zero page in the file matches too", data[209 + 2: 209 + 66] == zp)
    cp_del(rpc, n); run(rpc)


@phase("phase 3: live measurement")
def p3(rpc):
    clear_checkpoints(rpc)
    a = cp_add(rpc, MAIN_LOOP); b = cp_add(rpc, DELAY); c = cp_add(rpc, IRQ)
    st0 = ping(rpc); time.sleep(1.0); h = hits(rpc); st1 = ping(rpc)
    hm, hd, hi = h[MAIN_LOOP], h[DELAY], h[IRQ]
    check("non-stopping checkpoints did not stop the machine", st0 == "running" and st1 == "running", f"{st0},{st1}")
    check("main_loop ~29/s, delay ~3x that, irq_tick 0", 20 <= hm <= 40 and 2.5 * hm <= hd <= 3.5 * hm and hi == 0, f"main={hm} delay={hd} irq={hi}")
    for n in (a, b, c): cp_del(rpc, n)
    ws = j(call(rpc, "vice_watch_add", {"address": addr(THRUST_SIDE), "store": True, "stop": False}))
    wl = j(call(rpc, "vice_watch_add", {"address": addr(GRAV), "load": True, "stop": False}))
    check("watch_add accepts load/store/stop and echoes stop=false (PR #19)", ws.get("stop") is False and wl.get("stop") is False, f"{json.dumps(ws)[:90]} {json.dumps(wl)[:90]}")
    time.sleep(1.0)
    h = hits(rpc); st = ping(rpc)
    check("store watch on thrust_side counts ~1 per pass without stopping", 20 <= h.get(THRUST_SIDE, 0) <= 80 and st == "running", f"{h} {st}")
    check("load watch on grav counts (load flag honoured)", h.get(GRAV, 0) >= 20, h.get(GRAV))
    clear_checkpoints(rpc)
    sw = j(call(rpc, "vice_cycles_stopwatch", {"action": "reset"})); time.sleep(0.5)
    sw2 = j(call(rpc, "vice_cycles_stopwatch", {"action": "read"}))
    cyc = sw2.get("elapsed_cycles", sw2.get("cycles"))
    check("cycle stopwatch: 0.5 s is ~493k PAL cycles (0.4M..0.6M)", isinstance(cyc, (int, float)) and 400_000 <= cyc <= 600_000, f"{json.dumps(sw)[:80]} -> {json.dumps(sw2)[:120]}")


@phase("phase 4: frame stepping with inputs")
def p4(rpc):
    clear_checkpoints(rpc)
    # (a) exact stop, PR #15
    n, t = stop_at(rpc, MAIN_LOOP)
    p = pc(rpc)
    check("stop lands on the checkpoint address exactly", p == MAIN_LOOP, f"PC={p:04X} after {t and round(t*1000)} ms")
    s1 = state_sample(rpc); time.sleep(0.2); s2 = state_sample(rpc)
    check("memory stable while stopped", s1 == s2)
    hits0 = hits(rpc)[MAIN_LOOP]
    times = []
    for i in range(10):
        t0 = time.time(); run(rpc); w = wait_paused(rpc); times.append(time.time() - t0)
        if pc(rpc) != MAIN_LOOP:
            check("each run stops at main_loop", False, f"iteration {i}: PC={pc(rpc):04X}"); break
    hits1 = hits(rpc)[MAIN_LOOP]
    check("10 run/stop steps = exactly 10 passes (no double pass)", hits1 - hits0 == 10, f"{hits1 - hits0} passes, {sum(times)/len(times)*1000:.0f} ms per step")
    # (b) input on the port the game reads, PR #6
    dc01_before = read_mem(rpc, 0xDC01, 1)[0]
    r = j(call(rpc, "vice_joystick_set", {"port": 1, "direction": "left"}))
    dc01 = read_mem(rpc, 0xDC01, 1)[0]
    check("joystick port 1 left pulls $DC01 bit 2 low", (dc01 & 0x04) == 0 and (dc01_before & 0x04), f"$DC01 {dc01_before:02X} -> {dc01:02X}; reply {json.dumps(r)[:80]}")
    vx0 = read_mem(rpc, SHIP_VX, 2)
    for _ in range(5): run(rpc); wait_paused(rpc)
    ts = read_mem(rpc, THRUST_SIDE, 1)[0]; vx1 = read_mem(rpc, SHIP_VX, 2)
    dv = (vx1[0] + 256 * vx1[1]) - (vx0[0] + 256 * vx0[1])
    check("game saw it: thrust_side=1 and X velocity +6 per pass over 5 passes", ts == 1 and dv == 30, f"thrust_side={ts} vx {vx0.hex()}->{vx1.hex()} (+{dv})")
    call(rpc, "vice_joystick_set", {"port": 1, "direction": [], "fire": False})
    dc01 = read_mem(rpc, 0xDC01, 1)[0]
    run(rpc); wait_paused(rpc)
    ts = read_mem(rpc, THRUST_SIDE, 1)[0]
    check("release: $DC01 back to $FF and thrust_side 0 next pass", dc01 == 0xFF and ts == 0, f"$DC01={dc01:02X} thrust_side={ts}")
    call(rpc, "vice_joystick_set", {"port": 2, "direction": "left"})
    dc00 = read_mem(rpc, 0xDC00, 1)[0]; dc01 = read_mem(rpc, 0xDC01, 1)[0]
    check("port 2 reaches $DC00, not $DC01", (dc00 & 0x04) == 0 and dc01 == 0xFF, f"$DC00={dc00:02X} $DC01={dc01:02X}")
    call(rpc, "vice_joystick_set", {"port": 2, "direction": [], "fire": False})
    call(rpc, "vice_joystick_set", {"port": 1, "fire": True})
    run(rpc); wait_paused(rpc)
    tu = read_mem(rpc, THRUST_UP, 1)[0]
    call(rpc, "vice_joystick_set", {"port": 1, "fire": False})
    check("fire set while stopped is seen on the next pass (thrust_up=1)", tu == 1, tu)
    poke(rpc, SHIP_VX, [0x06, 0x00]); poke(rpc, SHIP_VY, [0x00, 0x00])
    # (c) frame advance, PR #20
    cp_del(rpc, n)
    check("still paused after deleting the checkpoint", ping(rpc) == "paused")
    r = j(call(rpc, "vice_frame_advance", {"frames": 1}))
    print("   frame_advance(1):", json.dumps(r)[:160])
    check("frame_advance returns frames=1 and leaves the machine paused", r.get("frames") == 1 and ping(rpc) == "paused", r)
    m = cp_add(rpc, MAIN_LOOP)
    h0 = hits(rpc)[MAIN_LOOP]
    t0 = time.time()
    rasters = []
    for _ in range(10):
        call(rpc, "vice_frame_advance", {"frames": 1})
        rasters.append(j(call(rpc, "vice_vicii_get_state")).get("raster_line"))
    dt = (time.time() - t0) / 10
    h1 = hits(rpc)[MAIN_LOOP]
    check("10 x frame_advance(1): 4..9 passes (200 ms at 29/s), machine paused", 4 <= h1 - h0 <= 9 and ping(rpc) == "paused", f"{h1 - h0} passes, {dt*1000:.0f} ms per call")
    check("every stop is at a frame boundary (raster 0 or 311)", all(x in (0, 311) for x in rasters), rasters)
    t0 = time.time(); r = j(call(rpc, "vice_frame_advance", {"frames": 50})); wall = time.time() - t0
    h2 = hits(rpc)[MAIN_LOOP]
    check("frame_advance(50): one call, 1 s of machine time = 24..36 passes", r.get("frames") == 50 and 24 <= h2 - h1 <= 36, f"{h2 - h1} passes, {wall*1000:.0f} ms wall")
    # (d) run_until from UI pause, PR #17
    r = j(call(rpc, "vice_run_until", {"address": addr(MOVE_SHIP)}))
    w = wait_paused(rpc); p = pc(rpc)
    check("run_until resumes a paused machine and stops exactly there", p == MOVE_SHIP, f"PC={p:04X} reply={json.dumps(r)[:80]}")
    cp_del(rpc, m)
    # (e) pause is exact, PR #15
    run(rpc); time.sleep(0.2)
    check("execution_run resumes", advancing(rpc))
    r = j(call(rpc, "vice_frame_advance", {"frames": 1}))
    check("frame_advance on a running machine is refused", "error" in json.dumps(r).lower(), json.dumps(r)[:100])
    call(rpc, "vice_execution_pause", {})
    w = wait_paused(rpc); s1 = state_sample(rpc); time.sleep(0.3); s2 = state_sample(rpc)
    check("execution_pause stops the CPU and memory stops changing", w is not None and s1 == s2, f"paused after {w and round(w*1000)} ms")
    # (f) step
    p0 = pc(rpc); dis = j(call(rpc, "vice_disassemble", {"address": addr(p0), "count": 1}))
    size = dis["lines"][0]["size"]; text = dis["lines"][0]["instruction"]
    r = j(call(rpc, "vice_execution_step", {"count": 1})); p1 = pc(rpc)
    mnem = [t for t in text.split() if len(t) == 3 and t.isalpha()][0]
    branch = mnem[0] == "B" or mnem in ("JMP", "JSR", "RTS", "RTI")
    check("execution_step 1 runs one instruction, reply carries PC, machine stays stopped", r.get("completed") is True and r.get("PC") == p1 and ping(rpc) == "paused" and (branch or p1 == p0 + size), f"{p0:04X}->{p1:04X} '{text}' {json.dumps(r)[:80]}")
    p0 = pc(rpc); r = j(call(rpc, "vice_execution_step", {"count": 3})); p1 = pc(rpc)
    check("execution_step 3 moves on and stays stopped", p1 != p0 and ping(rpc) == "paused", f"{p0:04X}->{p1:04X}")
    # (g) stopping watchpoint pauses instead of opening the monitor, PR #16
    run(rpc); time.sleep(0.1)
    r = j(call(rpc, "vice_watch_add", {"address": addr(THRUST_SIDE), "type": "write", "stop": True}))
    w = wait_paused(rpc)
    check("stopping store watchpoint halts the machine (ping paused)", w is not None, f"{w and round(w*1000)} ms, {json.dumps(r)[:80]}")
    p = pc(rpc)
    check("PC is inside read_controls after the store watch hit", READ_CONTROLS <= p < READ_CONTROLS + 0x80, f"PC={p:04X}")
    clear_checkpoints(rpc); run(rpc); time.sleep(0.2)
    check("execution_run brings it back (no monitor window holding it)", advancing(rpc))


@phase("phase 2: state management")
def p2(rpc):
    clear_checkpoints(rpc)
    # load paused: a stop checkpoint armed before the load
    n = cp_add(rpc, MAIN_LOOP, True)
    snap_load(rpc, "jl_hover"); w = wait_paused(rpc)
    check("load with a stop checkpoint armed: held at main_loop at once", w is not None and pc(rpc) == MAIN_LOOP, f"{w and round(w*1000)} ms PC={pc(rpc):04X}")
    x0 = ship_x(rpc)
    check("state after load is the state saved (ship x = $005000)", x0 == 0x005000, f"{x0:06X}")
    cp_del(rpc, n)
    # exact determinism: stop on pass 101 after the load, twice, and compare
    # load while held: the machine stays held, at the loaded state's PC
    snap_load(rpc, "jl_hover"); time.sleep(0.2)
    check("load while held: machine stays held (ping paused, PC = saved PC)", ping(rpc) == "paused" and pc(rpc) == MAIN_LOOP and not advancing(rpc), f"{ping(rpc)} PC={pc(rpc):04X}")
    samples = {}
    for tag in ("a", "b"):
        n = stop_after_passes(rpc, 100)
        snap_load(rpc, "jl_hover"); run(rpc); w = wait_paused(rpc)
        h = hits(rpc)[MAIN_LOOP]
        samples[tag] = (state_sample(rpc), shot(rpc, f"p2_hover_{tag}")[0], h, w)
        cp_del(rpc, n)
    (sa, pa, ha, wa), (sb, pb, hb, wb) = samples["a"], samples["b"]
    check("stop on pass 101 after each load (100 ignored, then 1 counted hit)", ha == 1 and hb == 1 and pc(rpc) == MAIN_LOOP, f"hits {ha},{hb}; {wa and round(wa*1000)} ms, {wb and round(wb*1000)} ms")
    check("same snapshot + 100 passes = same zero page, screen RAM and VIC registers", sa == sb, diff_desc(sa, sb))
    check("screenshots identical too", open(pa, "rb").read() == open(pb, "rb").read())
    check("the ship moved (x grew) in those 100 passes", ship_x(rpc) > 0x005000, f"x={ship_x(rpc):06X}")
    # save from a running machine, load, same test
    run(rpc); time.sleep(0.5)
    r = snap_save(rpc, "jl_hover_run")
    check("save from a running machine", r.get("status") == "ok")
    n = stop_after_passes(rpc, 100); snap_load(rpc, "jl_hover_run"); wait_paused(rpc)
    sc = state_sample(rpc); hc = hits(rpc)[MAIN_LOOP]; cp_del(rpc, n)
    n = stop_after_passes(rpc, 100); snap_load(rpc, "jl_hover_run"); run(rpc); wait_paused(rpc)
    sd = state_sample(rpc); hd = hits(rpc)[MAIN_LOOP]; cp_del(rpc, n)
    check("snapshot saved while running: two loads + 100 passes agree", sc == sd and hc == 1 and hd == 1, diff_desc(sc, sd) + f", hits {hc},{hd}")
    run(rpc); time.sleep(0.2)
    check("loaded snapshot runs at once (a loaded machine is a running machine)", advancing(rpc))
    # warp
    r = j(call(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 1}}))
    on = j(call(rpc, "vice_machine_config_get", {})).get("resources", {}).get("WarpMode")
    pw = passes(rpc, 1.0)
    call(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 0}})
    off = j(call(rpc, "vice_machine_config_get", {})).get("resources", {}).get("WarpMode")
    time.sleep(0.3); pn = passes(rpc, 1.0)
    check("warp on: config shows it and the game runs faster; warp off restores ~29/s", on == 1 and off == 0 and pw > 60 and 20 <= pn <= 40, f"warp passes/s={pw}, normal={pn}, WarpMode {on}->{off}")
    return sc


@phase("phase 2b: restart the emulator and load again")
def p2b(sc):
    print("  ", tools("stop", "vice"))
    print("  ", tools("vice"))
    rpc = connect()
    check("ping after restart says running", ping(rpc) == "running")
    n = stop_after_passes(rpc, 100); r = snap_load(rpc, "jl_hover_run"); w = wait_paused(rpc)
    check("snapshot loads in a fresh process and stops on pass 101", r.get("status") == "ok" and w is not None and hits(rpc)[MAIN_LOOP] == 1, f"{json.dumps(r)[:60]} {w and round(w*1000)} ms hits={hits(rpc)[MAIN_LOOP]}")
    s = state_sample(rpc)
    check("100 passes in the new process == 100 passes in the old one", sc == s, diff_desc(sc, s))
    cp_del(rpc, n); run(rpc)
    return rpc


@phase("keys: F1 by host key name and by matrix (thrust_up)")
def p_keys(rpc):
    clear_checkpoints(rpc)
    n, _ = stop_at(rpc, MAIN_LOOP)
    r = j(call(rpc, "vice_keyboard_matrix", {"row": 0, "col": 4, "pressed": True}))
    run(rpc); wait_paused(rpc); tu1 = read_mem(rpc, THRUST_UP, 1)[0]
    call(rpc, "vice_keyboard_matrix", {"row": 0, "col": 4, "pressed": False})
    run(rpc); wait_paused(rpc); tu2 = read_mem(rpc, THRUST_UP, 1)[0]
    check("F1 by matrix row/col while stopped is seen next pass, gone after release", tu1 == 1 and tu2 == 0, f"{tu1},{tu2} {json.dumps(r)[:80]}")
    r = j(call(rpc, "vice_keyboard_key_press", {"key": "F1"}))
    seen = []
    for _ in range(3):
        run(rpc); wait_paused(rpc); seen.append(read_mem(rpc, THRUST_UP, 1)[0])
    call(rpc, "vice_keyboard_key_release", {"key": "F1"})
    for _ in range(3): run(rpc); wait_paused(rpc)
    print(f"   (host-key F1 lands within VICE's keyboard alarm delay: thrust_up over 3 passes = {seen})")
    cp_del(rpc, n); run(rpc)


@phase("transport: a request queued just before a stop must not time out")
def p_trap_race(rpc):
    clear_checkpoints(rpc)
    slow, errs = [], 0
    for i in range(20):
        run(rpc); time.sleep(0.05)
        n = cp_add(rpc, MAIN_LOOP, True)            # via trap; the machine stops within ~35 ms
        t0 = time.time(); r = j(call(rpc, "vice_ping")); dt = time.time() - t0
        if "error" in json.dumps(r).lower(): errs += 1
        if dt > 1.0: slow.append(round(dt, 2))
        wait_paused(rpc); cp_del(rpc, n)
    check("20 x (stop checkpoint, then ping): no timeouts, none over 1 s", errs == 0 and not slow, f"errors={errs} slow={slow}")
    run(rpc)


@phase("stress: unpaced calls from the HTTP thread (PR #11)")
def p_stress(rpc):
    t0 = time.time(); n = 0; err = None
    try:
        for i in range(400):
            call(rpc, "vice_sprite_get", {"sprite": i % 8}); n += 1
            read_mem(rpc, 0x0000, 256); n += 1
            call(rpc, "vice_registers_get"); n += 1
            call(rpc, "vice_vicii_get_state"); n += 1
            if i % 40 == 0:
                call(rpc, "vice_display_screenshot", {"path": os.path.join(OUT, "stress.png"), "format": "PNG"}); n += 1
    except Exception as e:
        err = repr(e)
    dt = time.time() - t0
    alive = tools("status").splitlines()[0].find("up") >= 0
    check("1600+ unpaced calls, server still up", err is None and alive, f"{n} calls in {dt:.1f} s = {n/dt:.0f}/s; {err or ''}")
    check("machine still running afterwards", ping(rpc) == "running" and advancing(rpc))


def main():
    print("emulator:", tools("status"))
    for name in ("jl_hover", "jl_hover_run", "spin_p1"):       # fresh names each run: a name cannot be reused
        for ext in (".vsf", ".json"):
            try: os.remove(os.path.join(SNAPDIR, name + ext))
            except FileNotFoundError: pass
    rpc = connect()
    p_boot(rpc)
    p_hover(rpc)
    p1(rpc)
    p3(rpc)
    p4(rpc)
    sc = p2(rpc)
    rpc = p2b(sc)
    p_keys(rpc)
    p_trap_race(rpc)
    p_stress(rpc)
    print("\n=== summary")
    bad = [n for n, ok in results if not ok]
    print(f"{len(results) - len(bad)} passed, {len(bad)} failed")
    for n in bad:
        print("  FAIL", n)


if __name__ == "__main__":
    main()
