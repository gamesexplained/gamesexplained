#!/usr/bin/env python3
"""Drive the kit's BBC Micro from a script: memory, registers, frames, checkpoints, keys, snapshots.

The machine is jsbeeb running inside `kit/bbc/jsbeeb_server.mjs`, which the launcher starts
(`python3 kit/scripts/tools.py jsbeeb`). The server speaks one JSON object a line on
127.0.0.1:6845 (KIT_JSBEEB_PORT, or the launcher's --port); this module is its client, for
the loops that are too slow as one call each (kit/EMULATOR.md, "the two transports"). The
protocol is the kit's own, not jsbeeb's, so a second emulator can serve it unchanged.

    from jsbeeb import connect
    m = connect()
    m.write(0x2000, program)
    m.set_registers(pc=0x2000)
    top = m.checkpoint(0x2010)                   # stops there
    m.run()                                      # until a checkpoint stops it
    m.key("Z")                                   # held until released
    print(m.frames(1)["reason"], m.read(0x70, 2))
    m.key("Z", down=False)

From the command line, one call per invocation (the agent's transport):

    python3 kit/bbc/jsbeeb.py --list
    python3 kit/bbc/jsbeeb.py read '{"address": "&2000", "length": 64}'
    python3 kit/bbc/jsbeeb.py run '{"frames": 50}'

What the server does and does not do is in kit/skills/bbc/tool-jsbeeb/SKILL.md:

  * the machine runs only inside a call (`run`, `step`, `boot`, `autoboot`, `type`); between
    two of its slices every other call is answered, and `stop` ends the run there;
  * the first instruction of a run or a step is counted by every checkpoint on it but never
    stopped on, so a machine stopped at a checkpoint goes on past it;
  * a read of the I/O pages (&FC00-&FEFF) gives &FF: the chips' registers are `chips`, read
    without touching the bus, since a read through it clears a VIA's interrupt flags.
"""
import base64, json, os, socket, sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("KIT_JSBEEB_PORT") or 6845)   # the launcher's --port sets it (kit/bbc/tools.py)
FRAME_CYCLES = 40000           # one PAL frame of the 2 MHz CPU (kit/skills/bbc/bbc-reference)


class JsbeebError(Exception):
    pass


def address(a):
    """An address as a number, from a number or "&2000", "$2000", "0x2000", "2000"."""
    if isinstance(a, int):
        return a
    s = str(a).strip()
    for p in ("&", "$", "0x", "0X"):
        if s.startswith(p):
            return int(s[len(p):], 16)
    return int(s, 16)


class Machine:
    """One connection to the server. Calls are made one at a time; `stop()` opens a second."""

    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=120.0):
        self.host, self.port, self.timeout = host, port, timeout
        try:
            self.sock = socket.create_connection((host, port), timeout=10)
        except OSError as e:
            raise JsbeebError(f"nothing answers on {host}:{port} ({e}): start the machine with "
                              "`python3 kit/scripts/tools.py jsbeeb`") from None
        self.sock.settimeout(timeout)
        self.file = self.sock.makefile("rwb")
        self.n = 0

    def call(self, cmd, **args):
        """One command and its reply, as a dict; raises JsbeebError when the server refuses."""
        self.n += 1
        body = {**{k: v for k, v in args.items() if v is not None}, "id": self.n, "cmd": cmd}
        try:
            self.file.write((json.dumps(body) + "\n").encode())
            self.file.flush()
            line = self.file.readline()
        except (OSError, socket.timeout) as e:
            raise JsbeebError(f"{cmd}: no reply from {self.host}:{self.port} ({e})") from None
        if not line:
            raise JsbeebError(f"{cmd}: the server closed the connection")
        reply = json.loads(line)
        if not reply.pop("ok", False):
            raise JsbeebError(f"{cmd}: {reply.get('error')}")
        reply.pop("id", None)
        return reply

    def close(self):
        try:
            self.file.close()
            self.sock.close()
        except OSError:
            pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    # -- memory and registers --------------------------------------------------------------
    def read(self, addr, length=256, bank=None, shadow=None):
        """`length` bytes as the CPU sees them, or a sideways bank's at &8000-&BFFF; I/O reads &FF."""
        r = self.call("read", address=address(addr), length=length, bank=bank, shadow=shadow)
        return base64.b64decode(r["data"])

    def write(self, addr, data, bank=None, shadow=None, io=False):
        return self.call("write", address=address(addr), data=base64.b64encode(bytes(data)).decode(),
                         bank=bank, shadow=shadow, io=io or None)

    def word(self, addr):
        b = self.read(addr, 2)
        return b[0] | (b[1] << 8)

    def registers(self):
        return self.call("registers")

    def set_registers(self, **regs):
        """pc, a, x, y, s, p: those given change, the rest stay."""
        if "pc" in regs:
            regs["pc"] = address(regs["pc"])
        return self.call("set-registers", **regs)

    def chips(self):
        return self.call("chips")

    def disassemble(self, addr=None, count=1):
        return self.call("disassemble", address=None if addr is None else address(addr), count=count)["instructions"]

    # -- running ---------------------------------------------------------------------------
    def run(self, cycles=None, frames=None, until=None, seconds=None, max_cycles=None):
        """Run until the limit given, a stopping checkpoint, or `stop`. The reply's "reason" is
        cycles, frames, until, checkpoint, step, stopped or timeout (the backstop ran out)."""
        return self.call("run", cycles=cycles, frames=frames, seconds=seconds, max_cycles=max_cycles,
                         until=None if until is None else address(until))

    def frames(self, n=1, max_cycles=None):
        """Advance n frames, stopping on the paint that ends the last."""
        return self.run(frames=n, max_cycles=max_cycles)

    def until(self, addr, max_cycles=None):
        return self.run(until=addr, max_cycles=max_cycles)

    def step(self, count=1):
        """Carry out `count` instructions; the reply has the new PC and the next instruction."""
        return self.call("step", count=count)

    def stop(self):
        """Stop a run in progress, from a second connection (the first is waiting on the run)."""
        with Machine(self.host, self.port, timeout=10) as other:
            return other.call("stop")

    def status(self):
        return self.call("status")

    # -- checkpoints -----------------------------------------------------------------------
    def checkpoint(self, addr, end=None, kind="exec", stop=True, ignore=0, temporary=False, when=None, fetch=False):
        """A checkpoint on an address or a range; returns its id. kind: exec, read or write.
        stop=False counts without stopping; ignore lets that many hits pass before a stop;
        when={"a": 16} or {"value": 3} narrows it to an exact register or accessed value;
        fetch=True lets a read checkpoint count the CPU fetching its own instruction bytes."""
        return self.call("checkpoint", address=address(addr), end=None if end is None else address(end), kind=kind,
                         stop=stop, ignore=ignore, temporary=temporary or None, when=when, fetch=fetch or None)["checkpoint"]

    def checkpoints(self):
        return self.call("checkpoints")["checkpoints"]

    def hits(self, cp_id):
        return next(c["hits"] for c in self.checkpoints() if c["checkpoint"] == cp_id)

    def delete(self, cp_id=None):
        """Delete one checkpoint, or all of them."""
        return self.call("delete", checkpoint=cp_id, all=True if cp_id is None else None)

    def zero(self, cp_id=None):
        return self.call("zero", checkpoint=cp_id)

    # -- input -----------------------------------------------------------------------------
    def key(self, k, down=True):
        """Press (or release) a key: jsbeeb's name (Z, SHIFT, RETURN, K1, F0), [column, row] in
        the keyboard matrix, or the MOS's internal key number (&61 is Z). It stays down until
        released, through stops and runs."""
        return self.call("key", key=k, down=down)

    def release_keys(self):
        return self.call("release-keys")

    def type(self, text):
        """Type text at the machine, running it until the last key is up; "\\n" is RETURN
        ("\\r" is not a key, and is left out)."""
        return self.call("type", text=text)

    def joystick(self, channels=None, fire1=None, fire2=None):
        """What the ADC's channels convert to, a list of up to four values from 0 to 65535 (None
        for the centre), and the fire buttons. Held until changed; a snapshot does not hold them."""
        return self.call("joystick", channels=channels, fire1=fire1, fire2=fire2)

    # -- state -----------------------------------------------------------------------------
    def save(self, path):
        return self.call("save", path=os.path.abspath(path))

    def load(self, path):
        return self.call("load", path=os.path.abspath(path))

    def keep(self, name="default"):
        return self.call("keep", name=name)

    def back(self, name="default"):
        return self.call("back", name=name)

    def reset(self, hard=True):
        return self.call("reset", hard=hard)

    def boot(self, seconds=30):
        return self.call("boot", seconds=seconds)

    def autoboot(self, frames=100):
        """SHIFT held through a power-on reset: the disc in drive 0 boots, as SHIFT-BREAK does."""
        return self.call("autoboot", frames=frames)

    def disc(self, path=None, ref=None, drive=0):
        return self.call("disc", path=os.path.abspath(path) if path else None, ref=ref, drive=drive)

    def tape(self, path):
        return self.call("tape", path=os.path.abspath(path))

    # -- outputs ---------------------------------------------------------------------------
    def screenshot(self, path, full=False):
        return self.call("screenshot", path=os.path.abspath(path), full=full or None)

    def output(self):
        return self.call("output")

    def sound(self, action, path=None):
        return self.call("sound", action=action, path=os.path.abspath(path) if path else None)

    def codemap(self, action="read"):
        return self.call("codemap", action=action)


def connect(host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=120.0):
    return Machine(host, port, timeout)


def hexdump(start, data):
    lines = []
    for i in range(0, len(data), 16):
        row = data[i:i + 16]
        text = "".join(chr(b) if 0x20 <= b < 0x7F else "." for b in row)
        lines.append(f"{(start + i) & 0xFFFF:04X}  {row.hex(' '):<47}  {text}")
    return "\n".join(lines)


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "--list"):
        print(__doc__)
        if argv and argv[0] == "--list":
            with connect(timeout=10) as m:
                print("commands:", m.call("hello").get("commands") or "see kit/skills/bbc/tool-jsbeeb/SKILL.md")
        return 0
    cmd = argv[0]
    args = json.loads(argv[1]) if len(argv) > 1 else {}
    for k in ("address", "end", "until", "pc"):
        if k in args:
            args[k] = address(args[k])
    for k in ("path",):
        if args.get(k):
            args[k] = os.path.abspath(args[k])
    with connect() as m:
        try:
            out = m.call(cmd, **args)
        except JsbeebError as e:
            raise SystemExit(str(e))
    if cmd == "read" and "data" in out:
        print(hexdump(out["address"], base64.b64decode(out["data"])))
        if out.get("io"):
            print("(the I/O pages read as FF: `chips` has the registers)")
        return 0
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
