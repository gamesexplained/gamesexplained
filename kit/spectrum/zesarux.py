#!/usr/bin/env python3
"""Speak ZRCP to ZEsarUX from a script: memory, registers, stepping, frames, checkpoints, input, snapshots.

ZRCP is ZEsarUX's remote command protocol: a line-based TCP conversation on
127.0.0.1, one thread per client, with a prompt (`command> `, or
`command@cpu-step> ` while stepping) ending every reply. Start the emulator
with `python3 kit/scripts/tools.py --platform spectrum zesarux`; this module
is the scripting client for the loops that are too slow as one call each
(`kit/EMULATOR.md`, "the two transports").

    from zesarux import connect
    rpc = connect()
    rpc.enter_step()                      # stop on an instruction boundary
    rpc.write_memory(0x8000, program)
    rpc.set_register("PC", 0x8000)
    rpc.bp_set(1, "PC=8004H")             # slot 1: stop there
    rpc.run(); print(rpc.registers()["PC"])
    print(rpc.frames(1))                  # one 48K frame: 69888 T-states

From the command line, one call per invocation (the agent's transport):

    python3 kit/spectrum/zesarux.py --list
    python3 kit/spectrum/zesarux.py read-memory '{"addr":"8000H","len":16}'
    python3 kit/spectrum/zesarux.py set-input '{"matrix":"ffffffffffffffff00"}'

The traps, each measured on ZEsarUX 13.0 and written up in
`kit/skills/spectrum/tool-zesarux/workarounds.md`:

  * `run` is driven by the connection that sent it and dies with it, so a
    dropped socket means the run loop is gone; every call here raises rather
    than hanging (an unanswered `run` is a timeout, not a stopped machine).
  * `run` also returns for reasons of its own ("data sent", a menu opening),
    so a reply without `Breakpoint fired` is not a checkpoint hit.
  * `snapshot-load` enters cpu-step before loading only if it was already in
    it, and **exits cpu-step after** otherwise: it resumes the machine unless
    you `enter_step()` first. It also used to switch the whole breakpoint table
    off; the launcher's `--snap-no-change-machine` stops that, and
    `snapshot_load` re-arms anyway unless `rearm=False`.
  * `set-breakpoint` is refused ("You must enable breakpoints first") unless
    breakpoints are enabled; `bp_set` enables them first.
  * `set-ui-io-ports` takes nine concatenated hex bytes: eight keyboard rows
    then the joystick. Keyboard bits are 0=pressed, the joystick byte's bits
    are 1=pressed.
  * Writes made while the machine is running do not take effect: enter
    cpu-step (or stop at a checkpoint) before writing memory.
  * A breakpoint's pass count is how many matches to skip before it fires
    once, not a hit counter. Leave a huge limit on a checkpoint and read
    `get-breakpointspasscount` for the count: that is the non-stopping
    measurement. Setting an action as well (`let var0=var0+1`) gives a
    second, independent counter the run can act on.
"""
import json, os, re, socket, sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 10000
FRAME_TSTATES = 69888          # one 48K ZX Spectrum frame (kit/skills/spectrum/zx-spectrum-reference)
FRAME_SLOT = 100              # the breakpoint slot `frames` uses; slots are 1..100
PROMPT = re.compile(r"^[^\n]*> $")


class ZesaruxError(Exception):
    pass


def _read_reply(sock, buf, command=""):
    """The reply text up to (not including) the ZRCP prompt line.

    A reply ends with a line ending in `> `, whether that is `command> ` or
    `command@cpu-step> `. Returns (text, leftover); the leftover is empty in
    practice because nothing follows the prompt.
    """
    while True:
        text = buf.decode("latin-1")
        lines = text.split("\n")
        if lines and PROMPT.match(lines[-1]):
            return "\n".join(lines[:-1]), b""
        try:
            if hasattr(socket, "TCP_QUICKACK"):
                # Linux clears QUICKACK after use, so it is re-armed before every read (see connect())
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_QUICKACK, 1)
            chunk = sock.recv(65536)
        except socket.timeout:
            raise ZesaruxError(f"no reply to {command or 'the command'} within the socket timeout"
                               + (f"; the emulator is running cmd {command!r}" if command else ""))
        except OSError as e:
            raise ZesaruxError(f"connection lost while waiting for {command or 'a reply'}: {e}")
        if not chunk:
            raise ZesaruxError(f"connection closed while waiting for the reply to {command or 'a command'}")
        buf += chunk


class Rpc:
    """One ZRCP connection. Not shared between threads: open one per driver."""

    def __init__(self, sock, host=DEFAULT_HOST, port=DEFAULT_PORT, banner=""):
        self.sock = sock
        self.host, self.port, self.banner = host, port, banner
        self.buf = b""

    # -- the wire -----------------------------------------------------------
    def cmd(self, command, *args, timeout=None):
        """One ZRCP command; returns the reply text without the prompt.

        Raises ZesaruxError on an unknown command, a closed socket or a
        timeout. Other `Error.` replies are returned as text: ZEsarUX uses
        them for refusals the caller may know how to live with (`Error.
        Already enabled`), and the typed helpers below check where it matters.
        """
        line = " ".join((command,) + tuple(str(a) for a in args))
        old = self.sock.gettimeout()
        if timeout is not None:
            self.sock.settimeout(timeout)
        try:
            self.sock.sendall((line + "\n").encode("latin-1"))
        except OSError as e:
            raise ZesaruxError(f"cannot send {line!r}: {e}")
        try:
            reply, self.buf = _read_reply(self.sock, self.buf, line)
        finally:
            self.sock.settimeout(old)
        if "Unknown command" in reply or "No help for that command" in reply:
            raise ZesaruxError(f"{line}: {reply.strip()}")
        return reply

    def strict(self, command, *args, timeout=None):
        """A command whose refusal is a real failure (a write, a register set)."""
        reply = self.cmd(command, *args, timeout=timeout)
        if reply.strip().startswith("Error"):
            raise ZesaruxError(f"{command}: {reply.strip()}")
        return reply

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass

    # -- phase 1: static inspection -----------------------------------------
    def read_memory(self, addr, length):
        """`length` bytes from `addr`, in one call. Any size; the reply is a hex string."""
        reply = self.cmd("read-memory", f"{addr:X}H", length).strip()
        try:
            data = bytes.fromhex(reply)
        except ValueError:
            raise ZesaruxError(f"read-memory {addr:X}H {length} answered {reply[:80]!r}")
        if len(data) != length:
            raise ZesaruxError(f"read-memory {addr:X}H {length} answered {len(data)} bytes")
        return data

    def write_memory(self, addr, data, chunk=256):
        """Write bytes to the mapped memory of the current memory zone."""
        data = bytes(data)
        for start in range(0, len(data), chunk):
            part = data[start:start + chunk]
            self.strict("write-memory", f"{addr + start:X}H", *part)
        back = self.read_memory(addr, len(data)) if data else b""
        if back != data:
            raise ZesaruxError(f"write-memory {addr:X}H did not take (read back {back[:16].hex()})")

    def registers(self):
        """The CPU registers as {name: int}. Flag strings and mode words are skipped."""
        out = {}
        for token in self.cmd("get-registers").split():
            if "=" not in token:
                continue
            name, _, value = token.partition("=")
            try:
                out[name] = int(value, 16)
            except ValueError:
                continue
        return out

    def set_register(self, name, value):
        self.strict("set-register", f"{name}={value & 0xFFFF:04X}H")

    def tstates(self):
        """Monotonic T-state counter (`get-tstates-partial`), for deltas."""
        return int(self.cmd("get-tstates-partial").strip())

    def tstates_in_frame(self):
        """T-states since the start of the current frame (`get-tstates`), 0..69887."""
        return int(self.cmd("get-tstates").strip())

    def reset_tstates(self):
        self.cmd("reset-tstates-partial")

    # -- phase 2: state management ------------------------------------------
    def enter_step(self):
        self.cmd("enter-cpu-step")

    def exit_step(self):
        self.cmd("exit-cpu-step")

    def step(self, over=False):
        """One instruction (or one call, with over=True). Returns the registers after it."""
        reply = self.cmd("cpu-step-over" if over else "cpu-step")
        first = reply.split("\n")[0]
        out = {}
        for token in first.split():
            if "=" not in token:
                continue
            name, _, value = token.partition("=")
            try:
                out[name] = int(value, 16)
            except ValueError:
                continue
        lines = [ln for ln in reply.split("\n")[1:] if ln.strip()]
        if lines:
            out["disasm"] = lines[0].strip()
        return out

    def snapshot_save(self, path):
        self.strict("snapshot-save", os.path.abspath(path))
        if not os.path.exists(path):
            raise ZesaruxError(f"snapshot-save {path} wrote nothing")
        return path

    def snapshot_load(self, path, rearm=True):
        """Load a snapshot. Stops at the loaded state only if already in cpu-step.

        ZEsarUX enters cpu-step, loads, and exits it again when it was not
        already in it, so the machine runs on unless the caller stopped it
        first. The launcher's `--snap-no-change-machine` keeps the breakpoint
        table armed across the load; `rearm` is belt-and-braces for a build or
        a launch without that flag, and is idempotent.
        """
        self.strict("snapshot-load", os.path.abspath(path))
        if rearm:
            self.bp_enable_all()
        return path

    def save_screen(self, path):
        self.strict("save-screen", os.path.abspath(path))
        return path

    # -- phase 3: live measurement ------------------------------------------
    def run(self, limit=0, timeout=60.0, stop_on_data=False):
        """Run the CPU; returns the reply when it stops.

        Only meaningful in cpu-step mode. It returns when a breakpoint fires,
        after `limit` opcodes when one is given, or for ZEsarUX's own reasons
        ("data sent"). Raises ZesaruxError on timeout or a lost socket
        (`kit/EMULATOR.md`: an unanswered call is not a stopped machine).
        """
        args = []
        if not stop_on_data:
            args.append("no-stop-on-data")
        if limit:
            args.append(limit)
        return self.cmd("run", *args, timeout=timeout)

    def frames(self, n, timeout=60.0, tries=20):
        """Run until n * 69888 T-states have gone by, and stop there.

        A checkpoint on `TSTATESP>` fires at the frame boundary, so this is
        one round trip per frame, not a spin: each try arms the slot, runs,
        and checks the T-state counters; `tries` bounds it and then it raises
        rather than looping forever (`kit/EMULATOR.md` phase 4, "advance N
        frames ... one call").
        """
        target = n * FRAME_TSTATES
        condition = f"TSTATESP>{target}"
        try:
            for _ in range(tries):
                self.reset_tstates()
                self.bp_set(FRAME_SLOT, condition)
                reply = self.run(timeout=timeout)
                got = self.tstates()
                if "Breakpoint fired" in reply and condition not in reply:
                    # `run` stops on any checkpoint, so a caller's own stop ends it first:
                    # say which one, instead of retrying twenty times and blaming the frame.
                    stopped = [ln for ln in reply.split("\n") if ln.startswith("Breakpoint fired")]
                    raise ZesaruxError(f"the run stopped at another checkpoint ({stopped[0]}); "
                                       "disable it before advancing frames")
                if got >= target:
                    return got
        finally:
            self.bp_disable(FRAME_SLOT)
        raise ZesaruxError(f"frame advance did not reach {target} T-states in {tries} tries")

    # -- checkpoints --------------------------------------------------------
    def bp_set(self, index, condition):
        """Arm slot `index` (1..100) with a condition; stops there when it matches."""
        self.bp_enable_all()
        self.strict("set-breakpoint", index, condition)
        self.strict("set-breakpointpasscount", index, 0)
        return index

    def bp_passcount(self, index, n):
        """Fire on the n-th match instead of the first; 0 fires on every match."""
        self.strict("set-breakpointpasscount", index, n)

    def bp_counts(self):
        """[(matches, limit)] for slots 1..100.

        The first number is how many times the condition has matched since
        the counter was reset, and it grows while the machine runs: with a
        large limit and no action this is a hit count that never stops the
        machine.
        """
        out = []
        for line in self.cmd("get-breakpointspasscount").split("\n"):
            m = re.match(r"\s*(\d+):\s+(\d+)\s+(\d+)\s*$", line)
            if m:
                out.append((int(m.group(2)), int(m.group(3))))
        return out

    def bp_count(self, index):
        """(matches, limit) for one slot."""
        counts = self.bp_counts()
        return counts[index - 1] if 0 < index <= len(counts) else (0, 0)

    def bp_conditions(self):
        """Slot number -> condition text, for the enabled checkpoints."""
        out = {}
        for line in self.cmd("get-breakpoints").split("\n"):
            m = re.match(r"\s*Enabled\s+(\d+):\s+(.+?)\s*$", line)
            if m:
                out[int(m.group(1))] = m.group(2)
        return out

    def bp_action(self, index, action):
        """What a slot does when it fires; without one it breaks (stops the machine)."""
        self.strict("set-breakpointaction", index, action)

    def bp_disable(self, index):
        self.cmd("disable-breakpoint", index)

    def bp_enable_all(self):
        self.cmd("enable-breakpoints")           # "Error. Already enabled" is not a failure

    def bp_clear(self):
        self.cmd("disable-breakpoints")

    # -- input --------------------------------------------------------------
    def set_input(self, matrix_hex9):
        """Nine concatenated hex bytes: 8 keyboard rows (0=pressed) then the joystick (1=pressed)."""
        h = str(matrix_hex9).strip().lower()
        if not re.fullmatch(r"[0-9a-f]{18}", h):
            raise ValueError("set_input wants 9 concatenated hex bytes, e.g. 'ffffffffffffffff00'")
        self.strict("set-ui-io-ports", h)

    def get_input(self):
        return self.cmd("get-ui-io-ports").strip()

    def release_input(self):
        """No key and no direction held."""
        self.set_input("ff" * 8 + "00")

    def key_event(self, key, press):
        """A host key by ZEsarUX's own key number (see tool-zesarux/SKILL.md)."""
        self.strict("send-keys-event", key, 1 if press else 0)

    def type_ascii(self, text, ms=100):
        self.strict("send-keys-ascii", ms, *list(text))

    def evaluate(self, expression):
        """ZEsarUX's expression parser: `evaluate 'IN(65278)&0x0F'` and friends."""
        reply = self.cmd("evaluate", expression).strip()
        if reply.startswith("Error") or reply == "":
            raise ZesaruxError(f"evaluate {expression}: {reply or 'no answer'}")
        return reply

    # -- misc ---------------------------------------------------------------
    def machine(self):
        return self.cmd("get-current-machine").strip()

    def version(self):
        return self.cmd("get-version").strip()

    def screen_bytes(self, path):
        """The screen as .scr (6912 bytes) plus its attributes -- ZX order, no header."""
        self.save_screen(path)
        return open(path, "rb").read()


def connect(host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=30.0):
    """Open a ZRCP connection, read the banner, and return the Rpc."""
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
    except OSError as e:
        raise ZesaruxError(f"nothing answering on {host}:{port} ({e}). "
                           "Start it: python3 kit/scripts/tools.py --platform spectrum zesarux")
    if hasattr(socket, "TCP_QUICKACK"):
        # Linux only. Each ZRCP reply arrives in two pieces (the text, then the
        # prompt), the server's Nagle holds the second until the client ACKs, and
        # Linux delays that ACK about 40 ms: 23 calls a second instead of 5000+.
        # QUICKACK stops the delay; the server still gets its ACK. Linux drops
        # out of quickack mode after use, so _read_reply sets it again before
        # every read; set once here, it lasted a single reply (23 calls a second).
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_QUICKACK, 1)
    sock.settimeout(timeout)
    banner, buf = _read_reply(sock, b"", "the connect banner")
    rpc = Rpc(sock, host, port, banner)
    rpc.buf = buf
    return rpc


# ---------------------------------------------------------------------------
# the command line, one call per invocation
COMMANDS = {
    "read-memory":   ("addr, len", "bytes, hex, one call of any size"),
    "write-memory":  ("addr, data (hex string or list of bytes)", "writes and reads back"),
    "registers":     ("-", "the CPU registers"),
    "set-register":  ("name, value", "one register"),
    "tstates":       ("-", "the T-state counter"),
    "frame-tstates": ("-", "T-states into the current frame"),
    "enter-step":    ("-", "stop the machine on an instruction boundary"),
    "exit-step":     ("-", "let it run again"),
    "step":          ("over (optional)", "one instruction; returns the registers"),
    "run":           ("limit (optional), timeout (optional)", "run until a checkpoint fires"),
    "frames":        ("n", "advance n frames and stop at the boundary"),
    "bp-set":        ("index, condition", "arm a stopping checkpoint"),
    "bp-passcount":  ("index, n", "fire on the n-th match"),
    "bp-counts":     ("-", "matches and limits for every slot"),
    "bp-disable":    ("index", "disarm one slot"),
    "bp-enable-all": ("-", "enable every checkpoint (a load switches them off)"),
    "set-input":     ("matrix (9 hex bytes)", "keyboard rows and joystick"),
    "key-event":     ("key, press", "a host key by number"),
    "type-ascii":    ("text, ms (optional)", "type a string as keystrokes"),
    "snapshot-save": ("path", "save a snapshot"),
    "snapshot-load": ("path, rearm (optional)", "load one"),
    "save-screen":   ("path (.scr/.bmp/.pbm)", "save the screen"),
    "machine":       ("-", "the emulated machine"),
    "version":       ("-", "the emulator version"),
}


def _num(v):
    """A number from JSON: decimal, 0x/0o/0b, or the assembler forms ZEsarUX's own help uses (4000H, $4000)."""
    if not isinstance(v, str):
        return int(v)
    v = v.strip()
    if v[:1] in "$#":
        return int(v[1:], 16)
    if v[-1:] in "Hh" and v[:-1].lower() != "":
        return int(v[:-1], 16)
    if v[-1:] in "Bb" and v[:-1].isdigit():
        return int(v[:-1], 2)
    return int(v, 0)


def call(rpc, name, args):
    if name == "read-memory":
        return rpc.read_memory(_num(args["addr"]), int(args["len"])).hex()
    if name == "write-memory":
        data = args["data"]
        data = bytes.fromhex(data) if isinstance(data, str) else bytes(data)
        rpc.write_memory(_num(args["addr"]), data)
        return f"wrote {len(data)} bytes at {_num(args['addr']):04X}H"
    if name == "registers":
        return rpc.registers()
    if name == "set-register":
        rpc.set_register(args["name"], _num(args["value"]))
        return rpc.registers()
    if name == "tstates":
        return rpc.tstates()
    if name == "frame-tstates":
        return rpc.tstates_in_frame()
    if name == "enter-step":
        rpc.enter_step(); return "stopped"
    if name == "exit-step":
        rpc.exit_step(); return "running"
    if name == "step":
        return rpc.step(over=bool(args.get("over")))
    if name == "run":
        return rpc.run(limit=int(args.get("limit", 0)), timeout=float(args.get("timeout", 60.0)))
    if name == "frames":
        return rpc.frames(int(args["n"]), timeout=float(args.get("timeout", 60.0)))
    if name == "bp-set":
        rpc.bp_set(int(args["index"]), args["condition"]); return "armed"
    if name == "bp-passcount":
        rpc.bp_passcount(int(args["index"]), int(args["n"])); return "set"
    if name == "bp-counts":
        return rpc.bp_counts()
    if name == "bp-disable":
        rpc.bp_disable(int(args["index"])); return "disabled"
    if name == "bp-enable-all":
        rpc.bp_enable_all(); return "enabled"
    if name == "set-input":
        rpc.set_input(args["matrix"]); return rpc.get_input()
    if name == "key-event":
        rpc.key_event(_num(args["key"]), bool(args["press"])); return "sent"
    if name == "type-ascii":
        rpc.type_ascii(args["text"], int(args.get("ms", 100))); return "sent"
    if name == "snapshot-save":
        return rpc.snapshot_save(os.path.expanduser(args["path"]))
    if name == "snapshot-load":
        return rpc.snapshot_load(os.path.expanduser(args["path"]), rearm=args.get("rearm", True))
    if name == "save-screen":
        return rpc.save_screen(os.path.expanduser(args["path"]))
    if name == "machine":
        return rpc.machine()
    if name == "version":
        return rpc.version()
    raise SystemExit(f"no such command: {name}\n{__doc__}")


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "--list"):
        print(__doc__)
        print("Commands:")
        for name in sorted(COMMANDS):
            print(f"  {name:14} {COMMANDS[name][0]:28} {COMMANDS[name][1]}")
        return 0
    name = argv[0]
    if name not in COMMANDS:
        raise SystemExit(f"no such command: {name} (try --list)")
    args = json.loads(argv[1]) if len(argv) > 1 else {}
    port = int(os.environ.get("KIT_ZESARUX_PORT", DEFAULT_PORT))
    rpc = connect(port=port)
    try:
        out = call(rpc, name, args)
    finally:
        rpc.close()
    print(json.dumps(out, indent=2) if isinstance(out, (dict, list)) else out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
