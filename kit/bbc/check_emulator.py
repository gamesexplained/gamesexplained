#!/usr/bin/env python3
"""Test the kit's BBC Micro against kit/EMULATOR.md, with a test program of its own.

    python3 kit/scripts/tools.py --platform bbc check-emulator     (the usual way in)
    python3 kit/bbc/check_emulator.py [--keep]

The machine is jsbeeb inside the kit's server (kit/bbc/jsbeeb_server.mjs), and every check
goes through kit/bbc/jsbeeb.py, the client a script uses, so what passes here is what a
script gets. Needs the server up (`tools.py jsbeeb`) and nothing else: no game, no disc. It
resets the machine to the BASIC prompt, writes a test program of about a hundred bytes to
&2000, points PC at it, and measures the four phases on that. Anything the machine was doing
is lost. It restarts the server once (phase 2, "after a restart") and leaves it running, at
the BASIC prompt. `--keep` leaves this run's snapshots in tools/bbc-home/snapshots.

The test program (assembled below, so it is source and not a binary) runs under the MOS
with interrupts on, one pass a vertical sync:

  &70/&71  passes   +1 a pass
  &72/&73  frames   +1 a vertical sync, counted by the program's handler of the MOS's vertical
                    sync event (event 4, through EVNTV)
  &74      x        -1 a pass while Z is held: each pass reads the keyboard matrix itself
  &75      key      bit 7 is Z, as this pass read it from System VIA port A
  &76      timer    the System VIA's T1 counter, low byte, read at the same point every pass
  &77      never    counts calls of `never`, which nothing calls

The frames are counted through the MOS's event rather than by a handler on IRQ1V reading the
System VIA's flags itself: such a handler misses a vertical sync whenever it arrives while the
handler is passing another interrupt on to the MOS, which then deals with both (one in a
hundred, measured on jsbeeb 2.4.0), and a check would blame the emulator for the program.

Every check has a name. The summary lists the names that failed, and
kit/skills/bbc/tool-jsbeeb/workarounds.md says, per name, what to do instead. Run it after
installing, and again after a new jsbeeb release or a change to the server.

A check fails for what the machine does, never for how fast the host runs it: counts are
compared with the test program's own counters, and the host's speed is reported on lines of
its own, NOTEs when it is slow, which fail nothing.
"""
import json, os, random, subprocess, sys, threading, time, traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
from jsbeeb import JsbeebError, connect, DEFAULT_PORT, FRAME_CYCLES   # noqa: E402
from asm6502 import assemble   # noqa: E402
from m6502 import decode   # noqa: E402
import snapshot   # noqa: E402  kit/bbc/snapshot.py, the reader the listing uses

PORT = DEFAULT_PORT        # KIT_JSBEEB_PORT, which the launcher's --port sets
SNAPDIR = os.path.join(ROOT, "tools", "bbc-home", "snapshots")
OUT = os.path.join(ROOT, "tools", "logs", "check-emulator")
RESULT = "bbc.json"        # each platform's check writes its own file here; `status` prints the last
WORKAROUNDS = "kit/skills/bbc/tool-jsbeeb/workarounds.md"
SNAPS = ("emutest_p1", "emutest_stopped", "emutest_running", "emutest_c_stopped", "emutest_c_running",
         "emutest_rollback")

BASE = 0x2000
SRC = r'''
passes = $70
frames = $72
xpos   = $74
key    = $75
timer  = $76
never  = $77
start:  sei
        lda #<event
        sta $0220           ; EVNTV, the MOS's event vector
        lda #>event
        sta $0221
        lda #0
        sta passes
        sta passes+1
        sta frames
        sta frames+1
        sta never
        lda #$80
        sta xpos
        cli
        lda #14             ; OSBYTE 14: enable event 4, the vertical sync
        ldx #4
        jsr $fff4
loop:   lda frames
wait:   cmp frames          ; one pass a vertical sync
        beq wait
top:    inc passes
        bne kscan
        inc passes+1
kscan:  sei                 ; read Z from the keyboard matrix, as a game does
        lda #$03
        sta $fe40           ; addressable latch bit 3 low: the keyboard's own scan off
        lda #$7f
        sta $fe43           ; port A: bit 7 in, the rest out
        lda #$61
        sta $fe4f           ; the key's number, Z
        lda $fe4f           ; bit 7 set: it is down
got:    ldx #$0b
        stx $fe40           ; the scan back on
        cli
        and #$80
        sta key
        beq nokey
        dec xpos
nokey:  lda $fe44           ; T1's counter, low byte
        sta timer
        jmp loop
neverr: inc never
        rts
event:  php                 ; the MOS calls this with the event's number in A
        cmp #4
        bne evdone
vsync:  inc frames
        bne evdone
        inc frames+1
evdone: plp
        rts
'''
CODE, LABELS = assemble(SRC, org=BASE)
START, LOOP, TOP, GOT, NEVERR = (LABELS[k] for k in ("start", "loop", "top", "got", "neverr"))
EVENT, VSYNC = LABELS["event"], LABELS["vsync"]
PASSES, FRAMES, XPOS, KEY = (LABELS[k] for k in ("passes", "frames", "xpos", "key"))

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
    return subprocess.run([sys.executable, os.path.join(ROOT, "kit", "scripts", "tools.py"), "--platform", "bbc",
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
    """The machine as the determinism checks compare it: the 32 KB of RAM, the registers with the
    cycle count, and every chip the server reports (all but its frame count, which is the server's)."""
    r = m.registers()
    c = m.chips()
    c.pop("frames", None)
    return {"ram": m.read(0, 0x8000), "registers": {k: r[k] for k in ("pc", "a", "x", "y", "s", "p", "cycles")},
            "chips": c}


def differ(a, b):
    """What differs between two samples, in a few words."""
    out = []
    if a["ram"] != b["ram"]:
        d = [i for i in range(len(a["ram"])) if a["ram"][i] != b["ram"][i]]
        out.append(f"{len(d)} bytes of RAM from &{d[0]:04X}")
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
        raise RuntimeError(f"the run to pass {n} ended on {r['reason']} at &{r['pc']:04X}")
    return sample(m)


def setup(m):
    """Back to the BASIC prompt, the test program written and started; returns once it runs."""
    m.delete()
    m.release_keys()
    m.boot()
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
        p0 = m.word(PASSES)
        m.frames(3)
        if m.read(BASE, len(CODE)) == CODE and (m.word(PASSES) - p0) & 0xFFFF >= 2:
            return
    except JsbeebError:
        pass
    print("   (the test program is not running: setting it up again)", flush=True)
    setup(m)


# ---------------------------------------------------------------------------
@phase("start: the BASIC prompt, the test program written and started")
def p_start(m):
    h = m.call("hello")
    print(f"   server protocol {h['protocol']}, jsbeeb {h['jsbeeb']}, {h['model']}, node {h['node']}")
    m.codemap("stop")
    try:
        m.sound("stop")
    except JsbeebError:
        pass                                     # none was running
    m.delete()
    m.release_keys()
    r = m.boot()
    text = (r.get("output") or {}).get("text", "")
    check("boots", r["reason"] == "until" and "BASIC" in text, "a reset reaches the BASIC prompt",
          " / ".join(t for t in text.split("\n") if t.strip()))
    m.write(BASE, CODE)
    back = m.read(BASE, len(CODE))
    check("write-read", back == CODE, "memory written reads back identical", f"{len(CODE)} bytes at &{BASE:04X}")
    m.set_registers(pc=START)
    m.frames(50)
    passes, frames = m.word(PASSES), m.word(FRAMES)
    check("program-runs", passes >= 45 and abs(passes - frames) <= 1,
          "the test program runs one pass a vertical sync", f"passes {passes}, frames {frames} after 50 frames")


@phase("phase 1: static inspection")
def p1(m):
    t = time.time()
    img = m.read(0, 0x10000)
    ms = (time.time() - t) * 1000
    io = m.call("read", address=0xFE40, length=16)
    check("read-64k", len(img) == 0x10000 and img[BASE:BASE + len(CODE)] == CODE and io["io"],
          "all 64 KB in one call; the I/O pages read as &FF and are flagged, without touching the chips",
          f"{len(img)} bytes in {ms:.0f} ms")
    before = m.chips()["romsel"]
    seen = m.read(0x8000, 0x40)
    names = []
    for bank in range(16):
        h = m.read(0x8000, 0x40, bank=bank)
        title = bytes(h[9:0x40]).split(b"\0")[0]
        if title and h[6] not in (0x00, 0xFF) and all(0x20 <= c < 0x7F for c in title):
            names.append(f"{bank} {title.decode()}")
    after = m.chips()["romsel"]
    same = m.read(0x8000, 0x40, bank=before & 15) == seen
    check("read-banked", len(names) >= 2 and after == before and same,
          "each sideways bank read by its number, the paging left as the program had it",
          f"{', '.join(names)}; ROMSEL &{before:02X} before, &{after:02X} after")
    r = m.registers()
    check("registers", all(k in r for k in ("pc", "a", "x", "y", "s", "p", "flags", "cycles")),
          "the CPU's registers and the cycle count in one call",
          f"PC &{r['pc']:04X} A &{r['a']:02X} X &{r['x']:02X} Y &{r['y']:02X} S &{r['s']:02X} {r['flags']}")
    c1, c2 = m.chips(), m.chips()
    sv = c1["system_via"]
    ok = (len(c1["crtc"]) == 18 and len(c1["ula"]["palette"]) == 16 and "user_via" in c1 and "sound" in c1
          and all(k in sv for k in ("ifr", "ier", "t1c", "t1l", "ora", "orb", "ddra", "ddrb", "latch"))
          and c2["system_via"]["ifr"] == sv["ifr"])
    check("chip-state", ok, "both VIAs, the CRTC, the video ULA and the sound chip by name; a second read sees the same",
          f"System VIA IFR &{sv['ifr']:02X} IER &{sv['ier']:02X} T1 {sv['t1c']}; CRTC R0-R9 "
          f"{' '.join(f'{v:02X}' for v in c1['crtc'][:10])}; ULA &{c1['ula']['control']:02X}")
    path = snap_path("emutest_p1")
    s = m.save(path)
    ram = snapshot.read(path)
    head = snapshot.header(path)
    live = m.read(0, 0x8000)
    pc = m.registers()["pc"]
    check("snapshot-python", ram[:0x8000] == live and head["pc"] == pc,
          "a snapshot read by kit/bbc/snapshot.py matches the live machine",
          f"{s['bytes']} bytes on disk; the 32 KB of RAM {'match' if ram[:0x8000] == live else 'DIFFER'}; "
          f"PC &{head['pc']:04X} in the file, &{pc:04X} live")


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
          f"PC &{r1['pc']:04X} (saved &{r0['pc']:04X}), cycles {r1['cycles']} (saved {r0['cycles']}); "
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
              "(RAM, registers, cycle count, chips)",
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
    r = m.run(frames=500)
    dt = time.time() - t0
    x = 10.0 / dt if dt else 0.0
    speed["unhooked_x_real_time"] = round(x, 1)
    check("warp", r["reason"] == "frames" and r["frames"] == 500,
          "500 frames in one call, as fast as the host runs them: the server never paces the machine",
          f"10 s of the machine's time in {dt:.2f} s, {x:.1f}x real time")
    if x < 2:
        note(f"the machine ran at {x:.1f}x real time with nothing hooked: a loader that takes a minute "
             "on a real BBC takes about as long here")


def p2_restart(m):
    """The same snapshot after the server has been stopped and started again; returns the new connection."""
    print("\n=== phase 2, after a restart", flush=True)
    if "stopped" not in STOP:
        check("determinism-restart", False, "a restarted server gives the same machine", "phase 2 left no reference")
        return m
    path, ref = STOP["stopped"]
    model = m.call("hello")["model"]
    m.close()
    port = ("--port", str(PORT))
    print("  ", tools("stop", "jsbeeb", *port).replace("\n", "\n   "))
    print("  ", tools("jsbeeb", *port, "--model", model).replace("\n", "\n   "))
    try:
        m = connect(port=PORT, timeout=60)
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
    event = m.checkpoint(EVENT, stop=False)
    vsync = m.checkpoint(VSYNC, stop=False)        # `inc frames`: only for event 4, the vertical sync
    store = m.checkpoint(PASSES, kind="write", stop=False)
    load = m.checkpoint(0xFE44, kind="read", stop=False)
    p0, f0, c0 = m.word(PASSES), m.word(FRAMES), m.registers()["cycles"]
    r = m.run(frames=250)
    dp, df = (m.word(PASSES) - p0) & 0xFFFF, (m.word(FRAMES) - f0) & 0xFFFF
    dc = m.registers()["cycles"] - c0
    h = {c["checkpoint"]: c["hits"] for c in m.checkpoints()}
    check("counting-checkpoint", dp >= 240 and abs(h[top] - dp) <= 1,
          "a checkpoint that counts without stopping, on the loop's top, against the program's own pass counter",
          f"{h[top]} hits, {dp} passes in 250 frames; the run ended on {r['reason']}")
    check("never-runs", h[never] == 0, "a checkpoint on a routine nothing calls stays at zero", h[never])
    check("irq-count", h[vsync] == df and abs(df - r["frames"]) <= 1,
          "a checkpoint on the handler the vertical sync's interrupt calls counts once a frame",
          f"{h[vsync]} hits in {r['frames']} frames; the program counted {df}; the MOS called the event handler "
          f"{h[event]} times")
    check("watch-store", abs(h[store] - dp) <= 1, "a write checkpoint counts the stores to the pass counter",
          f"{h[store]} stores, {dp} passes")
    check("watch-load", abs(h[load] - dp) <= 1,
          "a read checkpoint counts the program's reads of &FE44, the System VIA's T1 counter", f"{h[load]} reads, {dp} passes")
    per = dc / df if df else 0.0
    check("cycle-counter", abs(per - FRAME_CYCLES) < 80 or abs(per - 39936) < 80,
          "the cycle counter against the program's frame counter: a PAL frame is 40,000 cycles of the 2 MHz CPU, "
          "39,936 not interlaced", f"{dc} cycles over {df} frames, {per:.1f} a frame")

    m.delete()
    t0 = time.time()
    m.run(frames=100)
    bare = time.time() - t0
    m.codemap("start")
    m.codemap("zap")
    t0 = time.time()
    m.run(frames=100)
    rec = time.time() - t0
    ran = {a: (n, c) for a, n, c in m.codemap("stop")["instructions"]}
    img = bytearray(0x10000)
    img[BASE:BASE + len(CODE)] = CODE
    wrong = [f"{n} &{LABELS[n]:04X}" for n in ("loop", "wait", "top", "kscan", "got", "nokey", "event", "vsync", "evdone")
             if LABELS[n] not in ran or ran[LABELS[n]][0] != decode(img, LABELS[n])[2]]
    check("code-map", not wrong and NEVERR not in ran and ran.get(TOP, (0, 0))[1] >= 95,
          "every address an instruction started at, with its length and its count, in one call",
          f"{len(ran)} addresses ran, {sum(1 for a in ran if a < 0x8000)} in RAM; `never` "
          f"{'absent' if NEVERR not in ran else 'PRESENT'}; "
          f"{'each of the loop labels there, its length right' if not wrong else 'missing or wrong: ' + ', '.join(wrong)}; "
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
             "slices of 100,000 cycles, and this host runs a slice slowly")


@phase("phase 4: frame stepping with inputs")
def p4(m):
    m.delete()
    m.release_keys()
    m.checkpoint(TOP, temporary=True)
    r = m.run()
    check("exact-stop", r["reason"] == "checkpoint" and r["pc"] == TOP == m.registers()["pc"],
          "a stopping checkpoint stops on its own instruction, before it runs",
          f"stopped at &{r['pc']:04X} on {r['reason']}, the checkpoint at &{TOP:04X}")

    m.key("Z")
    r = m.until(GOT)
    a = m.registers()["a"]
    check("input-lands", r["reason"] == "until" and a & 0x80,
          "Z pressed while stopped is down when the program next reads the keyboard through System VIA port A",
          f"the program's read gave &{a:02X} (bit 7 set: down)")

    r1 = m.step()
    r2 = m.step(2)
    check("step-instruction", r1["reason"] == r2["reason"] == "step" and r1["pc"] == GOT + 2
          and r1["next"]["address"] == GOT + 2 and r2["pc"] == GOT + 6,
          "a step returns when it is done, with the new PC and the next instruction",
          f"one step from &{GOT:04X} to &{r1['pc']:04X} ({r1['next']['text']}), two more to &{r2['pc']:04X}")

    m.delete()
    m.checkpoint(TOP, temporary=True)
    m.run()
    cp = m.checkpoint(TOP, stop=False)
    m.frames(1)                                    # a pass starts at the vertical sync, a frame ends at the paint
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
          "ten one-frame advances with Z held: the loop's top is reached once a frame, and x moves one step a frame",
          f"hits a frame {','.join(map(str, per))}; x {' '.join(f'{x:02X}' for x in xs)}; {step_ms:.0f} ms a step with its reads")

    m.key("Z", down=False)
    m.frames(2)
    xa, ka = m.read(XPOS, 1)[0], m.read(KEY, 1)[0]
    m.frames(5)
    xb = m.read(XPOS, 1)[0]
    held = m.call("keys")["held"]
    check("input-released", xa == xb and ka == 0 and not held,
          "released when the script says: the program reads Z as up and x stays where it was",
          f"x &{xa:02X}, then &{xb:02X} five frames on; the program's key byte &{ka:02X}; keys held {held}")

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
    except JsbeebError as e:
        err = str(e)
    dt = time.time() - t0
    m.delete(cp)
    check("unpaced-calls", ok == 100 and err is None,
          "a hundred runs back to back, with reads between and no pacing, each stopping on the armed checkpoint",
          f"{ok} of 100 {err or ''}; {300 / dt:.0f} calls a second")

    m.delete()
    other = connect(port=PORT, timeout=30)
    rnd = random.Random(12345)
    held_y = tried = tries = 0
    elsewhere = []
    while tried < 30 and tries < 300:
        tries += 1
        t, box = background(m)
        wait_running(other)
        time.sleep(rnd.uniform(0.001, 0.03))
        other.call("stop")
        t.join(60)
        pc = m.registers()["pc"]
        if not LOOP <= pc < NEVERR:               # in the MOS: its interrupt handler keeps and restores Y
            elsewhere.append(pc)
            continue
        tried += 1
        v = (tried * 37 + 11) & 0xFF
        m.set_registers(y=v)
        m.frames(1)
        held_y += m.registers()["y"] == v
    other.close()
    check("pause-at-instruction", held_y == 30 and tried == 30,
          "thirty stops from a second connection at varied moments each land between two instructions, "
          "and a register set there holds through the next frame",
          f"Y held after {held_y} of {tried} stops in the program's loop; {len(elsewhere)} more stopped in the MOS "
          "and were not counted")

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
    except JsbeebError as e:
        sys.exit(f"{e}\nthen run check-emulator again.")
    build = f"jsbeeb {h['jsbeeb']} in the kit's server (protocol {h['protocol']}), node {h['node']}, on {sys.platform}"
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
        m.release_keys()
        m.boot()                                   # left at the BASIC prompt, as the server starts
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
