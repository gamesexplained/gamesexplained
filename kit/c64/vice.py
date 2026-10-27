#!/usr/bin/env python3
"""VICE MCP client, the emulator counterpart of r2000.py.

Most live verification is a loop: halt the machine, poke a variable, run a
fixed number of passes, read something back. Doing that through one-off tool
calls is slow; doing it in a script is not. Import this and write the test.

Usage:
  vice.py --list                       list the emulator's tools
  vice.py <tool> '<json arguments>'    call one tool

  from vice import connect, call, read_mem, halt_at, release, poke, joy, step_pass, frames, pause, LEFT
  rpc = connect()
  cp = halt_at(rpc, "$E12C")           # stop at the top of the game loop
  poke(rpc, 0x0010, [0x00, 0x00])
  joy(rpc, 1, LEFT)                    # hold the stick on the port the game reads
  step_pass(rpc)                       # run to the next hit of cp: one pass
  frames(rpc, 3)                       # or run exactly three frames
  release(rpc, cp)

  pause(rpc)                           # stop wherever it is, between two instructions,
                                       # never vice_execution_pause alone (pause-at-instruction)
  stick_arm(rpc); stick(rpc, LEFT)     # joystick input on a build that fails joy-port-1
  with paddle(rpc, x=100) as pad:      # the paddles, which the server has no tool for: every
      pad.frames(50)                   # read of $D419 (x) and $D41A (y) answered, at about 8 a second

Which of these to use depends on `tools.py --platform c64 check-emulator`: step_pass needs
stop-exact and step-pass, frames and pause need the frame-advance- checks,
paddle needs stop-exact and the frame-advance- checks, joy needs the joy- checks. Where a check fails, kit/skills/c64/tool-vice-mcp/workarounds.md
says what to use instead (halt_at and release for stops, stick_arm for port 1).

These absorb the server's quirks, on any build; the plain tool calls do not:

  read_mem(rpc, 0, 0x10000)            any size, in reads the server takes; stops a running
                                       machine for the read if the server will not answer it
  reset(rpc); autostart(rpc, "work/game.d64", 2)    the second file as the directory lists it;
                                       both resume a paused machine, which otherwise stays paused
  warp(rpc, False)                     where the typed MCP tool will not take the argument
  with key(rpc, "u"): ...              any case; released however the block ends
  release_all(rpc)                     after a script that died holding keys or the stick
  arm(rpc, "$E12C", ignore=99)         a stopping checkpoint with an ignore count or condition,
                                       set on a stopped machine so it cannot fire in between;
                                       a condition on A, X, Y or SP, which crashes the emulator,
                                       is refused
  snapshot_load(rpc, "games/c64/<slug>/work/play.vsf")    a path or a name
  tape(rpc, "work/side2.tap", offset=441050)    change the tape at a prompt, set its position
                                       (in decimal) and press PLAY; the server has no tape tool
  ask(rpc, tool, args)                 the reply as a dict; a refusal raises ViceError

A refused or closed connection raises EmulatorDown, whose one line says to run tools.py status.
check-emulator reports which of these quirks the build has, after its checks.
"""
import contextlib, http.client, json, os, re, shutil, sys, time, urllib.error, urllib.request

from ports import resolve_ports


def _port():
    return resolve_ports()["vice"]


URL = f"http://127.0.0.1:{_port()}/mcp"

_SNAPSHOTS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                          "tools", "vice-home", "config", "vice", "mcp_snapshots")


class ViceError(RuntimeError):
    """The server refused a call, or answered without what the call is for. code is its error code."""

    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


class EmulatorDown(ConnectionError):
    """Nothing answers on the emulator's port (6510 unless KIT_VICE_PORT), or the server closed the connection: it is not running, or it crashed."""


def connect(url=URL):
    session = [None]
    _id = [0]

    def rpc(method, params=None, notif=False):
        body = {"jsonrpc": "2.0", "method": method}
        if not notif:
            _id[0] += 1
            body["id"] = _id[0]
        if params is not None:
            body["params"] = params
        headers = {"Content-Type": "application/json",
                   "Accept": "application/json, text/event-stream"}
        if session[0]:
            headers["Mcp-Session-Id"] = session[0]
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
        what = (params or {}).get("name", method)
        try:
            r = urllib.request.urlopen(req, timeout=120)
            if not session[0]:
                session[0] = dict(r.getheaders()).get("mcp-session-id")
            txt = r.read().decode()
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, OSError, http.client.HTTPException) as e:
            cause = getattr(e, "reason", e)
            if isinstance(e, urllib.error.URLError) and not isinstance(cause, OSError):
                raise
            raise EmulatorDown(_down(url, what, cause)) from None
        if notif:
            return None
        lines = [l[len("data:"):].strip() for l in txt.splitlines()
                 if l.startswith("data:") and len(l.strip()) > 5]
        if lines:                       # server-sent events
            return json.loads(lines[-1])
        txt = txt.strip()               # or a plain JSON body
        return json.loads(txt) if txt else None

    rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                       "clientInfo": {"name": "kit", "version": "0"}})
    rpc("notifications/initialized", notif=True)
    return rpc


def _down(url, what, cause):
    """One line for a connection that failed: what happened, and what to run."""
    status = "python3 kit/scripts/tools.py status"
    if isinstance(cause, ConnectionRefusedError):
        return f"nothing answers at {url} ({what}): the emulator is not running. Check with {status}"
    if isinstance(cause, TimeoutError) or "timed out" in str(cause):
        return f"the emulator did not answer {what} at {url} within 120 s. Check with {status}"
    return (f"the emulator closed the connection during {what} ({type(cause).__name__}): it may have "
            f"crashed. Check with {status}")


def call(rpc, name, arguments=None):
    res = rpc("tools/call", {"name": name, "arguments": arguments or {}})
    try:
        return res["result"]["content"][0]["text"]
    except Exception:
        return json.dumps(res, indent=2)


def ask(rpc, name, arguments=None):
    """Call a tool and return its reply as a dict. A refusal raises ViceError with the server's words.

    call() hands a refusal back as text, which a script that does not read it takes for success:
    "Unknown key name" for a key the game never got, for one."""
    res = rpc("tools/call", {"name": name, "arguments": arguments or {}})
    try:
        return json.loads(res["result"]["content"][0]["text"])
    except Exception:
        err = res.get("error") if isinstance(res, dict) else None
        err = err if isinstance(err, dict) else {"message": json.dumps(res)[:300]}
        raise ViceError(f"{name} {json.dumps(arguments or {})}: {err.get('message')}", err.get("code")) from None


def addr(a):
    return a if isinstance(a, str) else f"${a:04X}"


READ_MAX = 0x8000         # vice_memory_read takes at most 65,535 bytes a call


def _number(a):
    if isinstance(a, int):
        return a
    t = a.strip().lower()
    if t.startswith("$") or t.startswith("0x"):
        return int(t.lstrip("$"), 16)
    raise ValueError(f"read_mem: {a!r} is a name; give a number for a read of more than {READ_MAX} bytes")


def read_mem(rpc, a, size, bank=None):
    """size bytes from address a (a number, "$C000", or a name the server knows), wrapping at $FFFF.

    Any size: more than READ_MAX bytes is read in pieces. A read the server will not answer on a
    running machine (the v3.13.1 release on macOS returned no data, 28 September 2026) is retried
    with the machine stopped for it, and the machine is set running again."""
    if size <= READ_MAX:
        return _read(rpc, a, size, bank)
    start, out = _number(a), b""
    while len(out) < size:
        out += _read(rpc, (start + len(out)) & 0xFFFF, min(READ_MAX, size - len(out)), bank)
    return out


def _read(rpc, a, size, bank):
    args = {"address": addr(a), "size": size, "encoding": "hex"}
    if bank:
        args["bank"] = bank
    try:
        return bytes.fromhex(ask(rpc, "vice_memory_read", args)["data_hex"])
    except (ViceError, KeyError) as e:
        first = e
    if getattr(first, "code", None) == -32602 or paused(rpc):      # a bad argument, or already stopped
        raise first
    call(rpc, "vice_execution_pause", {})
    try:
        t0 = time.time()
        while not paused(rpc):
            if time.time() - t0 > 5:
                raise ViceError(f"vice_memory_read at {addr(a)} failed on a running machine ({first}), "
                                "and the machine did not stop for a second try")
            time.sleep(0.01)
        return bytes.fromhex(ask(rpc, "vice_memory_read", args)["data_hex"])
    finally:
        call(rpc, "vice_execution_run", {})


def poke(rpc, a, data):
    return call(rpc, "vice_memory_write", {"address": addr(a), "data": list(data)})


def halt_at(rpc, a, settle=0.5):
    """Stop the CPU at an address and return the checkpoint number."""
    n = json.loads(call(rpc, "vice_checkpoint_add",
                        {"start": addr(a), "exec": True, "stop": True}))["checkpoint_num"]
    call(rpc, "vice_execution_run", {})
    time.sleep(settle)
    return n


def release(rpc, n, run=True):
    call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})
    if run:
        call(rpc, "vice_execution_run", {})


def paused(rpc):
    return json.loads(call(rpc, "vice_ping"))["execution"] == "paused"


def pause(rpc, timeout=5.0):
    """Stop a running machine between two instructions: the stop to save a snapshot from.

    vice_execution_pause alone can leave the emulator in VICE's own pause loop at the
    vertical sync, part way through an instruction (the pause-at-instruction check). There
    the registers read stale, a register set is lost at the next instruction, and a snapshot
    loaded keeps the old registers. A snapshot saved there holds the stale registers and the
    video chip between two frames: loaded later, it runs the last line twice, and from then on
    the emulator's pictures sit a line low and each frame ends on line 311 instead of 0, in
    every snapshot saved after it, until a reset (frame.py measures it as picture_lines_low).
    The tell is the raster line, which reads the frame's last. The v3.13.2 releases passed
    the check on 2 October 2026. A one-frame vice_frame_advance from there finishes the
    instruction and stops; from a proper stop it runs one frame. Either way the machine ends
    on the first instruction after a vertical sync. A stopped machine is left where it is.
    Returns False if it did not stop within timeout seconds.
    """
    if paused(rpc):
        return True
    call(rpc, "vice_execution_pause", {})
    t0 = time.time()
    while not paused(rpc):
        if time.time() - t0 > timeout:
            return False
        time.sleep(0.01)
    call(rpc, "vice_frame_advance", {"frames": 1})
    return True


def step_pass(rpc, timeout=5.0):
    """Resume a machine stopped at a checkpoint and wait for the next stop.

    With a stopping checkpoint on the top of the game loop this is one pass
    per call, exactly, on a build that passes step-pass. Returns the seconds
    it took, or None.
    """
    call(rpc, "vice_execution_run", {})
    t0 = time.time()
    while time.time() - t0 < timeout:
        if paused(rpc):
            return time.time() - t0
        time.sleep(0.005)
    return None


FRAME_ADVANCE_MAX = 1000       # the most frames vice_frame_advance takes in one request


def frames(rpc, n=1):
    """Run exactly n frames from a stopped machine and stop again (needs the frame-advance- checks).
    A count above FRAME_ADVANCE_MAX goes as several requests; the last one's result is returned,
    with "frames" the whole count."""
    left, result = n, None
    while left > 0 or result is None:
        step = min(left, FRAME_ADVANCE_MAX) if left > 0 else n
        result = ask(rpc, "vice_frame_advance", {"frames": step})
        if not isinstance(result, dict) or result.get("status") != "ok" or result.get("frames") != step:
            raise ViceError(f"frame advance did not complete {n} frames: {result}")
        left -= step
    return dict(result, frames=n)


def arm(rpc, a, end=None, ignore=0, condition=None, stop=True, exec=None, load=False, store=False):
    """Add a checkpoint on a or a..end and return its number; exec unless load or store is asked for.

    With an ignore count or a condition, which the server sets in a second call, a running machine
    is stopped with pause() for the two calls and set running again: in between, on a running
    machine, the checkpoint can fire with neither in place, and on a slow host it usually does.
    It costs the one frame pause() runs. The ignore count is used up before hit_count counts, so
    a checkpoint with ignore=99 stops with hit_count 1, on its hundredth hit.

    condition is "PC == $xxxx". The server also takes A, X, Y and SP, and the v3.13.2 release then
    crashes at the checkpoint's first hit: parse_simple_condition stores the register without its
    memory space, and VICE's evaluator calls through a CPU interface that is not there (read in
    the source, and measured on Linux, 3 October 2026). So those are refused here."""
    if condition is not None and not re.match(r"\s*PC\b", condition, re.I):
        raise ViceError(f"arm: condition {condition!r}: only PC conditions are safe; an A, X, Y or SP "
                        "condition crashes the emulator at the first hit (see arm's comment)")
    args = {"start": addr(a), "stop": stop, "exec": not (load or store) if exec is None else exec,
            "load": load, "store": store}
    if end is not None:
        args["end"] = addr(end)
    if not ignore and condition is None:
        return ask(rpc, "vice_checkpoint_add", args)["checkpoint_num"]
    was_running = not paused(rpc)
    if was_running and not pause(rpc):
        raise ViceError("arm: the machine did not stop, so the checkpoint was not added")
    try:
        n = ask(rpc, "vice_checkpoint_add", args)["checkpoint_num"]
        try:
            if ignore:
                ask(rpc, "vice_checkpoint_set_ignore_count", {"checkpoint_num": n, "count": ignore})
            if condition is not None:
                ask(rpc, "vice_checkpoint_set_condition", {"checkpoint_num": n, "condition": condition})
        except Exception:
            call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})
            raise
        return n
    finally:
        if was_running:
            call(rpc, "vice_execution_run", {})


UP, DOWN, LEFT, RIGHT, FIRE = 1, 2, 4, 8, 16
_DIRS = {UP: "up", DOWN: "down", LEFT: "left", RIGHT: "right"}


def joy(rpc, port=1, bits=0):
    """Hold a joystick state on control port 1 or 2 through vice_joystick_set; 0 releases.

    On a build that passes the joy- checks the port number is the hardware
    port and the value is seen by the next instruction. On one that fails
    them, see workarounds.md: stick_arm/stick for control port 1.
    """
    return call(rpc, "vice_joystick_set", {"port": port, "direction": [d for b, d in _DIRS.items() if bits & b],
                                           "fire": bool(bits & FIRE)})


def stick_arm(rpc, ddr=0x1F):
    """Make CIA1 port B drive the control-port-1 lines, so stick() works.

    For a build that fails joy-port-1, where vice_joystick_set is off by one:
    port 1 reaches CIA1 port A ($DC00, control port 2) and port 2 reaches
    nothing (barryw/vice-mcp#6 fixes it; use joy() on a build that passes).
    Most C64 games read control port 2, so asking for
    port 1 usually works by accident. A game that reads control port 1 at
    $DC01, as the early Commodore titles do, cannot be driven that way:
    port B is an input and nothing the emulator offers pulls its lines low. Setting DDRB ($DC03) makes those bits
    outputs, and then a plain write to $DC01 is what the game reads. Bits left
    as inputs still read the keyboard columns, so a mask of $1F keeps the three
    top columns (which carry keys some games poll in the same read) working.
    """
    poke(rpc, 0xDC03, [ddr])
    poke(rpc, 0xDC01, [0xFF])


def stick(rpc, bits=0):
    """Hold a joystick state set from UP/DOWN/LEFT/RIGHT/FIRE; 0 releases."""
    poke(rpc, 0xDC01, [0xFF & ~bits])


def stick_release(rpc):
    """Give CIA1 port B back to the keyboard."""
    poke(rpc, 0xDC01, [0xFF])
    poke(rpc, 0xDC03, [0x00])


POTX, POTY = 0xD419, 0xD41A
_POTS = {POTX: "x", POTY: "y"}
_MODES = ("abs", "abs,x", "abs,y", "(zp,x)", "(zp),y")
_READS = {}                    # opcode -> (mnemonic, mode): the reads of $D419 and $D41A paddle() answers
for _m, _ops in (("lda", (0xAD, 0xBD, 0xB9, 0xA1, 0xB1)), ("cmp", (0xCD, 0xDD, 0xD9, 0xC1, 0xD1)),
                 ("adc", (0x6D, 0x7D, 0x79, 0x61, 0x71)), ("sbc", (0xED, 0xFD, 0xF9, 0xE1, 0xF1)),
                 ("and", (0x2D, 0x3D, 0x39, 0x21, 0x31)), ("ora", (0x0D, 0x1D, 0x19, 0x01, 0x11)),
                 ("eor", (0x4D, 0x5D, 0x59, 0x41, 0x51))):
    _READS.update({o: (_m, mode) for o, mode in zip(_ops, _MODES)})
_READS.update({0xAE: ("ldx", "abs"), 0xBE: ("ldx", "abs,y"), 0xAC: ("ldy", "abs"), 0xBC: ("ldy", "abs,x"),
               0xEC: ("cpx", "abs"), 0xCC: ("cpy", "abs"), 0x2C: ("bit", "abs"),
               0xAF: ("lax", "abs"), 0xBF: ("lax", "abs,y"), 0xB3: ("lax", "(zp),y")})
_COMPUTES = ("adc", "sbc", "and", "ora", "eor")     # these use the value: answered from a stop before them
_FLAG_BITS = {"N": 0x80, "V": 0x40, "Z": 0x02, "C": 0x01}


def _effect(m, v, r):
    """The registers and flags instruction m sets when it reads v, from the registers r it starts with."""
    def nz(x):
        return {"N": x >> 7, "Z": int(x == 0)}
    if m in ("lda", "ldx", "ldy"):
        return {m[2].upper(): v, **nz(v)}
    if m == "lax":
        return {"A": v, "X": v, **nz(v)}
    if m in ("cmp", "cpx", "cpy"):
        reg = r["A" if m == "cmp" else m[2].upper()]
        return {"C": int(reg >= v), **nz((reg - v) & 0xFF)}
    if m == "bit":
        return {"N": v >> 7, "V": (v >> 6) & 1, "Z": int((r["A"] & v) == 0)}
    a = r["A"]
    if m in ("adc", "sbc"):
        if r["D"]:
            raise ViceError(f"paddle: {m.upper()} of a paddle in decimal mode is not covered")
        w = v ^ 0xFF if m == "sbc" else v              # SBC adds the complement
        s = a + w + int(r["C"])
        res = s & 0xFF
        return {"A": res, "C": s >> 8, "V": int(((a ^ res) & (w ^ res) & 0x80) != 0), **nz(res)}
    res = {"and": a & v, "ora": a | v, "eor": a ^ v}[m]
    return {"A": res, **nz(res)}


class Paddles:
    """A control port's two paddles, as paddle() hands them over.

    x and y are what $D419 (POTX) and $D41A (POTY) read: a number from 0 to 255, or a function
    of the read (the dict below, without its value) that returns one, or None to leave that
    register to the SID. They can be changed between runs. frames(n) and reads(n) run the machine
    and answer every read; each returns the reads, oldest first, as dicts:

      pot     "x" or "y"                 address  $D419 or $D41A     value  what the game got
      pc      the reading instruction    op       its mnemonic       n      reads before this one
      frame   frames run before it       stop     "after", "interrupt" or "before": how it was answered
      answered  False for a read the helper could not answer (paddle() says which), value None

    A run that another stopping checkpoint ends returns early, with stopped_at its address."""

    def __init__(self, rpc, x=None, y=None):
        self.rpc, self.x, self.y = rpc, x, y
        self.frame = self.n = 0
        self.stopped_at = None
        self.sites = {}                 # instruction address -> its checkpoint, stopped before
        self._watch = None              # (checkpoint, first, last) on the registers watched
        self._hits = 0                  # the watch's hit count, as far as counted

    def frames(self, n=1):
        """Run n frames from a stopped machine, answering every read, and stop at the frame boundary."""
        return self._run(n, None)

    def reads(self, n=1, limit=FRAME_ADVANCE_MAX):
        """Run until at least n reads have been made, and stop just after the last; or give up after
        limit frames. The next frames(1) runs to the end of the frame the last read was in."""
        return self._run(limit, n)

    def site(self, a):
        """Stop before the instruction at a and answer its read there, from its first read on."""
        if a not in self.sites:
            self.sites[a] = arm(self.rpc, a)

    def release(self):
        """Delete the helper's checkpoints."""
        numbers = list(self.sites.values()) + ([self._watch[0]] if self._watch else [])
        for n in numbers:
            call(self.rpc, "vice_checkpoint_delete", {"checkpoint_num": n})
        self._watch, self.sites = None, {}

    def _steered(self, pot):
        return (self.x if pot == "x" else self.y) is not None

    def _arm(self):
        """One load checkpoint over the registers that have a value, on a stopped machine."""
        want = [a for a, v in ((POTX, self.x), (POTY, self.y)) if v is not None]
        span = (want[0], want[-1]) if want else None
        if (self._watch[1:] if self._watch else None) == span:
            return
        if self._watch:
            call(self.rpc, "vice_checkpoint_delete", {"checkpoint_num": self._watch[0]})
        self._watch, self._hits = None, 0
        if span:
            self._watch = (arm(self.rpc, span[0], span[1], load=True), *span)

    def _run(self, frames, reads):
        self._arm()
        self.stopped_at, got = None, []
        if self.sites:                  # stopped on a site already: a run would carry it out unanswered
            regs = ask(self.rpc, "vice_registers_get")
            if regs["PC"] in self.sites:
                got += [h for h in [self._before(regs["PC"], read_mem(self.rpc, regs["PC"], 3), regs)] if h]
        left = frames
        while left > 0 and (reads is None or len(got) < reads):
            step = min(left, FRAME_ADVANCE_MAX)
            r = ask(self.rpc, "vice_frame_advance", {"frames": step})
            if not isinstance(r, dict) or r.get("status") != "ok":
                raise ViceError(f"paddle: frame advance failed: {r}")
            left -= r.get("frames", 0)
            self.frame += r.get("frames", 0)
            if not r.get("stopped_early"):
                if r.get("frames") != step:
                    raise ViceError(f"paddle: frame advance did not complete {step} frames: {r}")
                continue
            hits = self._stop(r["PC"])
            if hits is None:
                self.stopped_at = r["PC"]
                break
            got += hits
        return got

    def _stop(self, pc):
        """Answer the read that stopped the machine at pc. None when the stop was not the helper's."""
        regs = ask(self.rpc, "vice_registers_get")
        mem = read_mem(self.rpc, (pc - 3) & 0xFFFF, 6)          # the three bytes before pc, and its own
        read, stack, how = self._behind(mem[:3], pc, regs), None, "after"
        if read and pc in self.sites:
            read = read if self._fired() else None             # a site a read happens to precede
        elif read:
            self._hits += 1
        elif pc not in self.sites:
            read, stack = self._interrupted(pc, regs)
            how = "interrupt"
            if read:
                self._hits += 1
            elif self._fired():
                raise ViceError(f"paddle: a read of $D419 or $D41A ended at ${pc:04X} by an instruction the "
                                f"helper does not cover (the bytes before it: {mem[:3].hex(' ')}); it is "
                                "stopped there, the read unanswered")
            else:
                return None
        hits = self._after(read, regs, how, stack) if read else []
        if pc in self.sites:
            hits += [h for h in [self._before(pc, mem[3:], regs)] if h]
        return hits

    def _fired(self):
        """Whether the load checkpoint has stopped the machine since the count was last taken."""
        if not self._watch:
            return False
        for c in ask(self.rpc, "vice_checkpoint_list")["checkpoints"]:
            if c["checkpoint_num"] == self._watch[0]:
                fired, self._hits = c["hit_count"] > self._hits, c["hit_count"]
                return fired
        return False

    def _ea(self, mode, operand, regs):
        if mode.startswith("abs"):
            return (operand + {"abs": 0, "abs,x": regs["X"], "abs,y": regs["Y"]}[mode]) & 0xFFFF
        zp = read_mem(self.rpc, 0, 256)
        z = (operand + regs["X"]) & 0xFF if mode == "(zp,x)" else operand
        base = zp[z] | zp[(z + 1) & 0xFF] << 8
        return base if mode == "(zp,x)" else (base + regs["Y"]) & 0xFFFF

    def _behind(self, b, end, regs):
        """The read of $D419 or $D41A by the instruction that ends at end, b being its three bytes before.
        No instruction it covers changes the index register it used, so the registers after it serve."""
        for at, op, operand in ((end - 3, b[0], b[1] | b[2] << 8), (end - 2, b[1], b[2])):
            m = _READS.get(op)
            if m and (m[1].startswith("abs") == (at == end - 3)):
                ea = self._ea(m[1], operand, regs)
                if ea in _POTS:
                    return {"m": m[0], "pc": at & 0xFFFF, "ea": ea}
        return None

    def _interrupted(self, pc, regs):
        """An interrupt taken as the read ended: the stop is on the handler's first instruction, with
        the flags and the return address on the stack. Returns the read and where the flags are."""
        v = read_mem(self.rpc, 0xFFFA, 6)
        if pc not in (v[0] | v[1] << 8, v[4] | v[5] << 8):
            return None, None
        st, sp = read_mem(self.rpc, 0x0100, 256), regs["SP"]
        ret = st[(sp + 2) & 0xFF] | st[(sp + 3) & 0xFF] << 8
        read = self._behind(read_mem(self.rpc, (ret - 3) & 0xFFFF, 3), ret, regs)
        return (read, (0x0100 + ((sp + 1) & 0xFF), st[(sp + 1) & 0xFF])) if read else (None, None)

    def _hit(self, read, how):
        hit = {"pot": _POTS[read["ea"]], "address": read["ea"], "pc": read["pc"], "op": read["m"],
               "n": self.n, "frame": self.frame, "stop": how, "answered": True}
        self.n += 1
        return hit

    def _value(self, hit):
        v = self.x if hit["pot"] == "x" else self.y
        v = v(dict(hit)) if callable(v) else v
        if not isinstance(v, int) or not 0 <= v <= 255:
            raise ValueError(f"paddle: {hit['pot']} gave {v!r} for the read at ${hit['pc']:04X}; it takes 0 to 255")
        return v

    def _set(self, regs, k, val):
        if int(regs[k]) != val:
            ask(self.rpc, "vice_registers_set", {"register": k, "value": val})

    def _after(self, read, regs, how, stack):
        """Put right what the instruction did with the SID's value; it has run."""
        if not self._steered(_POTS[read["ea"]]):
            return []
        hit = self._hit(read, how)
        if read["m"] in _COMPUTES:      # it has computed with the SID's value: answer it before, from now on
            self.site(read["pc"])
            return [dict(hit, value=None, answered=False)]
        v = self._value(hit)
        ch = _effect(read["m"], v, regs)
        flags = {k: ch.pop(k) for k in "NVZC" if k in ch}
        for k, val in ch.items():
            self._set(regs, k, val)
        if stack:                       # the flags the handler's RTI will restore
            where, p = stack
            q = p
            for k, val in flags.items():
                q = q & ~_FLAG_BITS[k] | (_FLAG_BITS[k] if val else 0)
            if q != p:
                poke(self.rpc, where, [q])
        else:
            for k, val in flags.items():
                self._set(regs, k, val)
        return [dict(hit, value=v)]

    def _before(self, pc, b, regs):
        """Do the instruction at pc with the value given, and move on past it; it has not run."""
        m = _READS.get(b[0])
        if not m:
            return None
        indirect = m[1].startswith("(")
        ea = self._ea(m[1], b[1] if indirect else b[1] | b[2] << 8, regs)
        if ea not in _POTS or not self._steered(_POTS[ea]):
            return None                 # it runs as it is
        hit = self._hit({"m": m[0], "pc": pc, "ea": ea}, "before")
        v = self._value(hit)
        for k, val in _effect(m[0], v, regs).items():
            self._set(regs, k, val)
        ask(self.rpc, "vice_registers_set", {"register": "PC", "value": (pc + (2 if indirect else 3)) & 0xFFFF})
        return dict(hit, value=v)


@contextlib.contextmanager
def paddle(rpc, x=None, y=None, at=()):
    """Turn the paddles: answer the game's reads of $D419 (x) and $D41A (y) for the body of a with block.

        with paddle(rpc, x=100) as pad:
            pad.frames(50)                      # 50 frames, every read of $D419 answered 100
            pad.x = lambda hit: aim(rpc)        # or a function of the read, asked at each one
            pad.reads(1)                        # run to just after the next read

    vice-mcp has no paddle input (v3.13.2), and with nothing in the control ports both registers
    read $FF. So the helper stops the machine at each read and puts the result right: a stopping
    load checkpoint on the registers that have a value, and frame advances that it ends. A tool
    was asked for upstream as barryw/vice-mcp#34 (17 October 2026); once a build has it, this
    helper can call it behind the same interface and the checkpoints below can go.
    Measured on the v3.13.2 release on Linux x86_64, 16 October 2026: a load checkpoint stops after
    the reading instruction has run, with the PC on the next one and the register loaded with $FF,
    N and Z set from it. So for LDA, LDX, LDY and LAX the helper sets the register that was loaded,
    and N and Z; for CMP, CPX, CPY and BIT, the flags. When an interrupt is due as the read ends,
    the stop comes on the handler's first instruction, with the return address and the flags on
    the stack; the helper finds the read from the return address and corrects the stacked flags.

    ADC, SBC, AND, ORA and EOR compute with the value, which by that stop has already happened.
    The first read by one of them is left as the SID gave it, returned with answered False, and
    the helper then stops before that instruction (an exec checkpoint) and does its work itself,
    setting the PC past it; the machine skips the instruction's four to six cycles. Name such
    instructions with at=, as addresses, to have their first read answered too. Decimal-mode ADC
    and SBC raise ViceError.

    Covered: those twelve, and LAX, in the forms that can name $D419 or $D41A: absolute, absolute
    indexed, (zp,X) and (zp),Y (the forms each has; LAX not as (zp,X)). A read by anything else
    (INC $D419, another undocumented opcode) raises ViceError with the machine stopped after it.
    Only $D419 and $D41A themselves are watched. The helper answers whichever port's paddles the
    game reads; it does not model which one CIA 1 has selected.

    A read costs a frame advance to its stop (51 ms there) and three to six other calls (17 ms
    each, on a stopped machine): about 8 reads a second for LDA $D419 and for SBC $D419,Y alike,
    in a four-core container, with warp mode on or off. A game that reads its paddle once a frame
    runs at about a sixth of its speed. A machine that was running is stopped with pause() first
    and set running again at the end; the checkpoints are deleted however the block ends."""
    was_running = not paused(rpc)
    if was_running and not pause(rpc):
        raise ViceError("paddle: the machine did not stop, so no checkpoint was added")
    pad = Paddles(rpc, x, y)
    try:
        for a in at:
            pad.site(a)
        pad._arm()
        yield pad
    finally:
        pad.release()
        if was_running:
            call(rpc, "vice_execution_run", {})


def _key_args(k):
    """A key by matrix name ("SPACE", "u", "F1") or as (row, col); names go up in capitals,
    the only case the matrix tool knows."""
    if isinstance(k, str):
        return {"key": k.upper()}
    row, col = k
    return {"row": row, "col": col}


def key_down(rpc, k):
    """Press a key through vice_keyboard_matrix and leave it down; raises on a name it does not know."""
    return ask(rpc, "vice_keyboard_matrix", {**_key_args(k), "pressed": True})


def key_up(rpc, k):
    return ask(rpc, "vice_keyboard_matrix", {**_key_args(k), "pressed": False})


@contextlib.contextmanager
def key(rpc, *keys):
    """Hold keys for the body of a with block and release them however it ends.

    A key pressed through the matrix stays down until it is released, and a snapshot saved
    meanwhile keeps it: every load of that snapshot puts it down again. Either way it hides the
    keys pressed after it."""
    held = []
    try:
        for k in keys:
            key_down(rpc, k)
            held.append(k)
        yield
    finally:
        for k in reversed(held):
            key_up(rpc, k)


def release_all(rpc):
    """Release every key of the matrix and centre both joysticks: the clean-up after a script
    that stopped part way, or after loading a snapshot saved with a key down. The tell that one is
    needed: the KERNAL's current key at $C5 sits on one code with nothing pressed ($40 means none)."""
    for row in range(8):
        for col in range(8):
            key_up(rpc, (row, col))
    for port in (1, 2):
        joy(rpc, port, 0)


def _resume_if(rpc, was_paused):
    if was_paused:
        call(rpc, "vice_execution_run", {})


def reset(rpc, mode="soft"):
    """Reset the machine ("soft", or "hard" for a power cycle) and leave it running.

    vice_machine_reset's run_after does not end a pause: a machine that was stopped stays
    stopped and never reaches READY. The reset is asked for first and the machine resumed
    after, so that a stopping checkpoint cannot stop it again in between."""
    was_paused = paused(rpc)
    r = ask(rpc, "vice_machine_reset", {"mode": mode, "run_after": True})
    _resume_if(rpc, was_paused)
    return r


def autostart(rpc, path, file=None, run=True):
    """Autostart a disk image, tape image or program file, and leave the machine running.

    file is the program's name as the directory shows it ("SENTINEL+", typed as given), or its
    position in the directory counting from 1, as the listing reads: 2 is the second file.
    vice_autostart's schema says index counts from 0, but VICE counts from 1 and reads 0 as
    "the first file", so 0 and 1 both load the first (image_contents_filename_by_number in the
    v3.13.2 source, read 3 October 2026). On a stopped machine the call attaches the image and
    nothing loads while it stays stopped; VICE's autostart counts the machine's cycles, not
    seconds (reboot_for_autostart, same source), so a stopped machine is resumed after the call,
    as reset() does; on Linux, 3 October 2026, the file then loaded. Autostart turns warp mode on
    for the load, and VICE turned it off again when the load ended. path is made absolute, so it
    means the same to the emulator as to the script."""
    args = {"path": os.path.abspath(path), "run": run}
    if isinstance(file, str):
        args["program"] = file
    elif file is not None:
        if file < 1:
            raise ValueError(f"autostart: file {file}: positions count from 1, as the directory lists them")
        args["index"] = file
    was_paused = paused(rpc)
    r = ask(rpc, "vice_autostart", args)
    _resume_if(rpc, was_paused)
    return r


def tape(rpc, path=None, offset=None, play=True):
    """Change the tape, set its position and press PLAY, for a game on several cassette sides.

    The MCP server has no tape tool, so this types VICE's own monitor commands through
    codemap.monitor(): attach "<path>" 1, tapeoffs <offset> and tapectrl 1. The monitor reads a
    bare number as hexadecimal (tapeoffs 441050 set 4,460,624 on a run, #447), so offset, an int,
    is sent as +<decimal>, which the v3.13.2 monitor reads as decimal (27 October 2026). Like
    monitor(), nothing is sent while a stopping checkpoint is set. path is made absolute, as in
    autostart(); a file the emulator cannot attach raises ViceError. Returns the tape's position
    as the monitor reports it afterwards."""
    from codemap import monitor   # codemap imports this module
    if path is not None:
        r = monitor(f'attach "{os.path.abspath(path)}" 1', rpc)
        if "Failed" in r:
            raise ViceError(f'tape: the emulator could not attach {path} (its monitor answered "Failed.")')
    if offset is not None:
        if not isinstance(offset, int) or offset < 0:
            raise ValueError(f"tape: offset {offset!r}: a position counted from 0, as tapeoffs shows it")
        monitor(f"tapeoffs +{offset}", rpc)
    if play:
        monitor("tapectrl 1", rpc)
    m = re.search(r"Current tape offset is: (\d+)", monitor("tapeoffs", rpc))
    return int(m.group(1)) if m else None


def warp(rpc, on):
    """Warp mode on or off. The generic call works where the typed vice_machine_config_set
    wrapper of an MCP client refuses the resources argument."""
    return ask(rpc, "vice_machine_config_set", {"resources": {"WarpMode": 1 if on else 0}})


def snapshot_load(rpc, snap):
    """Load a snapshot by name, or by the path of a .vsf file anywhere.

    vice_snapshot_load takes only a name (letters, digits, - and _), and finds it in the
    emulator's snapshot folder, tools/vice-home/config/vice/mcp_snapshots/. A file elsewhere,
    such as a game's work/ folder, is copied in under its own name first; a different file
    already there under that name is an error, not overwritten."""
    is_path = snap.lower().endswith(".vsf") or "/" in snap or os.sep in snap
    name = os.path.basename(snap)
    name = name[:-4] if name.lower().endswith(".vsf") else name
    if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
        raise ViceError(f"snapshot_load: {name!r}: a snapshot's name takes only letters, digits, - and _")
    if is_path:
        if not os.path.isfile(snap):
            raise ViceError(f"snapshot_load: no such file: {snap}")
        dest = os.path.join(_SNAPSHOTS, name + ".vsf")
        if not os.path.exists(dest):
            os.makedirs(_SNAPSHOTS, exist_ok=True)
            shutil.copyfile(snap, dest)
        elif not os.path.samefile(snap, dest) and open(snap, "rb").read() != open(dest, "rb").read():
            raise ViceError(f"snapshot_load: {dest} is a different snapshot with the name {name!r}; "
                            "rename one of them")
    return ask(rpc, "vice_snapshot_load", {"name": name})


def clear_checkpoints(rpc):
    for c in json.loads(call(rpc, "vice_checkpoint_list", {}))["checkpoints"]:
        call(rpc, "vice_checkpoint_delete", {"checkpoint_num": c["checkpoint_num"]})


def hit_counts(rpc):
    return {c["start"]: c["hit_count"]
            for c in json.loads(call(rpc, "vice_checkpoint_list", {}))["checkpoints"]}


def main():
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return
    try:
        rpc = connect()
        if argv[0] == "--list":
            for t in rpc("tools/list", {})["result"]["tools"]:
                print(f"{t['name']}: {t.get('description','')[:100]}")
            return
        print(call(rpc, argv[0], json.loads(argv[1]) if len(argv) > 1 else {}))
    except EmulatorDown as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
