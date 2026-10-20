#!/usr/bin/env python3
"""Drive the kit's Apple II from a script: memory, registers, frames, checkpoints, keys, snapshots.

The machine is Apple2TS's 128K enhanced Apple IIe running inside `kit/apple2/apple2ts_server.mjs`,
which the launcher builds and starts (`python3 kit/scripts/tools.py apple2ts`). The server speaks
one JSON object a line on 127.0.0.1:6502 (KIT_APPLE2TS_PORT, or the launcher's --port); this
module is its client, for the loops that are too slow as one call each (kit/EMULATOR.md, "the two
transports"). The protocol is the kit's own, the one the BBC server speaks too.

    from apple2ts import connect
    m = connect()
    m.disk("games/apple2/<slug>/work/disk1.woz")
    m.boot(seconds=10)                           # power on with the disk in drive 1
    top = m.checkpoint(0x6000)                   # stops there
    m.run()                                      # until a checkpoint stops it
    m.key("A")                                   # held until released
    print(m.frames(1)["reason"], m.read(0x70, 2))
    m.key("A", down=False)
    m.screenshot("games/apple2/<slug>/work/screen.png")

From the command line, one call per invocation (the agent's transport):

    python3 kit/apple2/apple2ts.py --list
    python3 kit/apple2/apple2ts.py read '{"address": "$2000", "length": 64}'
    python3 kit/apple2/apple2ts.py read '{"address": "$2000", "length": 64, "space": "aux"}'
    python3 kit/apple2/apple2ts.py run '{"frames": 60}'
    python3 kit/apple2/apple2ts.py text
    python3 kit/apple2/apple2ts.py screenshot '{"path": "games/apple2/<slug>/work/screen.png"}'

What the server does and does not do is in kit/skills/apple2/tool-apple2ts/SKILL.md:

  * the machine runs only inside a call (`run`, `step`, `boot`, `type`); between two of its slices
    every other call is answered, and `stop` ends the run there;
  * the first instruction of a run or a step is counted by every checkpoint on it but never
    stopped on, so a machine stopped at a checkpoint goes on past it;
  * memory is read by space: "cpu" (the default) as the CPU would read it now, or main, aux,
    mainlc1, mainlc2, auxlc1, auxlc2 and rom whatever the switches say;
  * the I/O page ($C000-$C0FF) reads as 00: a read through the bus works a soft switch, so
    `chips` has the switches, the keyboard and the cards, read without touching anything.
"""
import base64, json, os, socket, sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("KIT_APPLE2TS_PORT") or 6502)   # the launcher's --port sets it (kit/apple2/tools.py)
FRAME_CYCLES = 17030           # one NTSC frame: 65 cycles a line, 262 lines (kit/skills/apple2/apple2-reference)
CLOCK = 1020484                # cycles a second


class Apple2tsError(Exception):
    pass


def address(a):
    """An address as a number, from a number or "$2000", "0x2000", "2000"."""
    if isinstance(a, int):
        return a
    s = str(a).strip()
    for p in ("$", "&", "0x", "0X"):
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
            raise Apple2tsError(f"nothing answers on {host}:{port} ({e}): start the machine with "
                                "`python3 kit/scripts/tools.py apple2ts`") from None
        self.sock.settimeout(timeout)
        self.file = self.sock.makefile("rwb")
        self.n = 0

    def call(self, cmd, **args):
        """One command and its reply, as a dict; raises Apple2tsError when the server refuses."""
        self.n += 1
        body = {**{k: v for k, v in args.items() if v is not None}, "id": self.n, "cmd": cmd}
        try:
            self.file.write((json.dumps(body) + "\n").encode())
            self.file.flush()
            line = self.file.readline()
        except (OSError, socket.timeout) as e:
            raise Apple2tsError(f"{cmd}: no reply from {self.host}:{self.port} ({e})") from None
        if not line:
            raise Apple2tsError(f"{cmd}: the server closed the connection")
        reply = json.loads(line)
        if not reply.pop("ok", False):
            raise Apple2tsError(f"{cmd}: {reply.get('error')}")
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
    def read(self, addr, length=256, space=None):
        """`length` bytes as the CPU sees them now, or from one space whatever the switches say
        (main, aux, mainlc1, mainlc2, auxlc1, auxlc2, rom); the I/O page reads 00."""
        r = self.call("read", address=address(addr), length=length, space=space)
        return base64.b64decode(r["data"])

    def write(self, addr, data, space=None, io=False):
        """Bytes written where the CPU would write them now, or into one space; io=True lets a
        write reach a soft switch, as the CPU's would."""
        return self.call("write", address=address(addr), data=base64.b64encode(bytes(data)).decode(),
                         space=space, io=io or None)

    def word(self, addr, space=None):
        b = self.read(addr, 2, space)
        return b[0] | (b[1] << 8)

    def registers(self):
        return self.call("registers")

    def set_registers(self, **regs):
        """pc, a, x, y, s, p: those given change, the rest stay."""
        if "pc" in regs:
            regs["pc"] = address(regs["pc"])
        return self.call("set-registers", **regs)

    def chips(self):
        """The soft switches by name, the keyboard, the buttons and paddles, the disk drive and the
        Mockingboard's two 6522s and sound chips."""
        return self.call("chips")

    def text(self):
        """The text screen as lines of text, with the page and the column count."""
        return self.call("text")

    def disassemble(self, addr=None, count=1):
        return self.call("disassemble", address=None if addr is None else address(addr), count=count)["instructions"]

    # -- running ---------------------------------------------------------------------------
    def run(self, cycles=None, frames=None, until=None, seconds=None, max_cycles=None):
        """Run until the limit given, a stopping checkpoint, or `stop`. The reply's "reason" is
        cycles, frames, until, checkpoint, stopped or timeout (a run with no limit stops after a
        minute of the machine's time)."""
        return self.call("run", cycles=cycles, frames=frames, seconds=seconds, max_cycles=max_cycles,
                         until=None if until is None else address(until))

    def frames(self, n=1, max_cycles=None):
        """Advance to the start of the n-th frame from here (frames are counted from power-on)."""
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
    def checkpoint(self, addr, end=None, kind="exec", stop=True, ignore=0, temporary=False, when=None, bank=None):
        """A checkpoint on an address or a range; returns its id. kind: exec, read or write.
        stop=False counts without stopping; ignore lets that many hits pass before a stop;
        when={"a": 16} or {"value": 3} narrows it to an exact register or accessed value;
        bank="main", "aux" or "rom" narrows it to the memory the address reaches at the time."""
        return self.call("checkpoint", address=address(addr), end=None if end is None else address(end), kind=kind,
                         stop=stop, ignore=ignore, temporary=temporary or None, when=when, bank=bank)["checkpoint"]

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
        """Press (or release) a key: a character ("A", "a", " "), an ASCII code, CTRL-X, RETURN,
        ESC, TAB, DELETE, SPACE, LEFT, RIGHT, UP, DOWN, or OPEN-APPLE and SOLID-APPLE (the game
        port's buttons 0 and 1). It stays down until released, through stops and runs."""
        return self.call("key", key=k, down=down)

    def release_keys(self):
        return self.call("release-keys")

    def type(self, text, max_cycles=None):
        """Type text at the machine, running it until the program has read the last key; "\\n" is
        RETURN. Each key waits for the program to read the one before."""
        return self.call("type", text=text, max_cycles=max_cycles)

    def joystick(self, paddles=None, buttons=None):
        """The game port: up to four paddle values from 0 to 255 (None leaves one, 128 is the
        centre) and buttons 0 and 1. Held until changed, and kept in a snapshot."""
        return self.call("joystick", paddles=paddles, buttons=buttons)

    # -- state -----------------------------------------------------------------------------
    def save(self, path):
        return self.call("save", path=os.path.abspath(path))

    def load(self, path):
        return self.call("load", path=os.path.abspath(path))

    def keep(self, name="default"):
        return self.call("keep", name=name)

    def back(self, name="default"):
        return self.call("back", name=name)

    def reset(self, hard=True, model=None):
        """hard=True is a power-on, as `model` ("iie" or "iiplus") when one is given; hard=False is
        CONTROL-RESET."""
        return self.call("reset", hard=hard, model=model)

    def boot(self, seconds=None, frames=None, until=None, model=None):
        """Power on with the disks in, as `model` when one is given, and run: `frames` (300 unless
        something else is given), or `seconds`, or until an address."""
        return self.call("boot", seconds=seconds, frames=frames, until=None if until is None else address(until),
                         model=model)

    def disk(self, path=None, drive=1, eject=False):
        """Put a disk image in drive 1 or 2 (a .woz, or a 16-sector .dsk, .do or .po), or take
        it out."""
        return self.call("disk", path=os.path.abspath(path) if path else None, drive=drive, eject=eject or None)

    # -- outputs ---------------------------------------------------------------------------
    def screenshot(self, path, mode=None):
        """The screen as a PNG, drawn by kit/apple2/screen.py from video memory and the switches
        as they stand: the server draws nothing."""
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import screen
        return screen.screenshot(self, path, mode=mode)

    def sound(self, action, path=None):
        """start, then stop (with a path to write the capture): the speaker's clicks and the
        Mockingboard's register writes, each with its cycle."""
        return self.call("sound", action=action, path=os.path.abspath(path) if path else None)

    def codemap(self, action="read"):
        return self.call("codemap", action=action)


def connect(host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=120.0):
    return Machine(host, port, timeout)


def hexdump(start, data):
    lines = []
    for i in range(0, len(data), 16):
        row = data[i:i + 16]
        text = "".join(chr(b & 0x7F) if 0x20 <= (b & 0x7F) < 0x7F else "." for b in row)
        lines.append(f"{(start + i) & 0xFFFF:04X}  {row.hex(' '):<47}  {text}")
    return "\n".join(lines)


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "--list"):
        print(__doc__)
        if argv and argv[0] == "--list":
            with connect(timeout=10) as m:
                print("commands:", m.call("hello").get("commands") or "see kit/skills/apple2/tool-apple2ts/SKILL.md")
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
            if cmd == "screenshot":
                out = m.screenshot(args["path"], mode=args.get("mode"))
            else:
                out = m.call(cmd, **args)
        except Apple2tsError as e:
            raise SystemExit(str(e))
    if cmd == "read" and "data" in out:
        print(hexdump(out["address"], base64.b64decode(out["data"])))
        if out.get("io"):
            print("(the I/O page reads as 00: `chips` has the switches)")
        return 0
    if cmd == "text" and "lines" in out:
        print("\n".join(out["lines"]))
        return 0
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
