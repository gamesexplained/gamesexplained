#!/usr/bin/env python3
"""Drive the kit's Commodore 16 or Plus/4 from a script: memory, registers, frames, checkpoints,
keys, tapes, disks, snapshots.

The machine is plus4emu's, run through its own library inside `kit/c16/p4emu_server.py`, which
the launcher builds and starts (`python3 kit/scripts/tools.py plus4emu`). The server speaks one
JSON object a line on 127.0.0.1:7501 (KIT_PLUS4EMU_PORT, or the launcher's --port); this module
is its client, for the loops that are too slow as one call each (kit/EMULATOR.md, "the two
transports"). The protocol is the kit's own, the one the BBC Micro and Apple II servers speak.

    from plus4emu import connect
    m = connect()
    m.frames(150)                                # the C16 has finished its reset
    m.tape("games/c16/<slug>/work/game.tap")     # PLAY pressed
    m.type('LOAD\\n')
    m.run(seconds=120)                           # until the loader is done, or a checkpoint
    top = m.checkpoint(0x1000)                   # stops there
    m.run()
    m.key("SPACE")                               # held until released
    m.joystick(port=1, fire=True)
    print(m.frames(1)["reason"], m.read(0xD0, 2))
    m.screenshot("games/c16/<slug>/work/screen.png")
    m.save("games/c16/<slug>/work/play.p4emu")

From the command line, one call per invocation (the agent's transport):

    python3 kit/c16/plus4emu.py --list
    python3 kit/c16/plus4emu.py read '{"address": "$1000", "length": 64}'
    python3 kit/c16/plus4emu.py read '{"address": "$C000", "length": 64, "space": "kernal"}'
    python3 kit/c16/plus4emu.py run '{"frames": 50}'
    python3 kit/c16/plus4emu.py text
    python3 kit/c16/plus4emu.py screenshot '{"path": "games/c16/<slug>/work/screen.png"}'

What the server does and does not do is in kit/skills/c16/tool-plus4emu/SKILL.md:

  * the machine runs only inside a call (`run`, `step`); between two of its slices every other
    call is answered, and `stop` ends the run there;
  * the first instruction of a run or a step is counted by every checkpoint on it but never
    stopped on, so a machine stopped at a checkpoint goes on past it;
  * memory is read by space: "cpu" (the default) as the CPU would read it now, "ram" whatever
    is paged in, and "basic", "kernal" (and on a Plus/4 "funclo", "funchi") for the ROMs;
  * the cycle count is in TED's double-clock cycles, 1,773,447 a second and 35,568 a frame.
"""
import base64, json, os, socket, sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("KIT_PLUS4EMU_PORT") or 7501)   # the launcher's --port sets it (kit/c16/tools.py)
FRAME_CYCLES = 35568           # one PAL frame: 312 lines of 114 double-clock cycles (kit/skills/c16/c16-reference)
CLOCK = 1773447                # double-clock cycles a second


class Plus4emuError(Exception):
    pass


def address(a):
    """An address as a number, from a number or "$2000", "0x2000", "2000"."""
    if isinstance(a, int):
        return a
    s = str(a).strip()
    for p in ("$", "0x", "0X"):
        if s.startswith(p):
            return int(s[len(p):], 16)
    return int(s, 16)


class Machine:
    """One connection to the server. Calls are made one at a time; `stop()` opens a second."""

    def __init__(self, host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=300.0):
        self.host, self.port, self.timeout = host, port, timeout
        try:
            self.sock = socket.create_connection((host, port), timeout=10)
        except OSError as e:
            start = "python3 kit/scripts/tools.py plus4emu" + ("" if port == 7501 else f" --port {port}")
            raise Plus4emuError(f"nothing answers on {host}:{port} ({e}): start the machine with `{start}`") from None
        self.sock.settimeout(timeout)
        self.file = self.sock.makefile("rwb")
        self.n = 0

    def call(self, cmd, **args):
        """One command and its reply, as a dict; raises Plus4emuError when the server refuses."""
        self.n += 1
        body = {**{k: v for k, v in args.items() if v is not None}, "id": self.n, "cmd": cmd}
        try:
            self.file.write((json.dumps(body) + "\n").encode())
            self.file.flush()
            line = self.file.readline()
        except (OSError, socket.timeout) as e:
            raise Plus4emuError(f"{cmd}: no reply from {self.host}:{self.port} ({e})") from None
        if not line:
            raise Plus4emuError(f"{cmd}: the server closed the connection")
        reply = json.loads(line)
        if not reply.pop("ok", False):
            raise Plus4emuError(f"{cmd}: {reply.get('error')}")
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
        """`length` bytes as the CPU sees them now, or from one space whatever is paged in
        (ram; basic and kernal; funclo and funchi on a Plus/4)."""
        r = self.call("read", address=address(addr), length=length, space=space)
        return base64.b64decode(r["data"])

    def write(self, addr, data, space=None):
        """Bytes written where the CPU would write them now (a write to $FD00-$FF3F reaches the
        chips), or into the RAM whatever is paged in (space="ram")."""
        return self.call("write", address=address(addr), data=base64.b64encode(bytes(data)).decode(), space=space)

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
        """TED's registers by name and decoded (the video mode, where the screen and the
        characters are, the colours, the sound, the timers, the raster), the keyboard latch, the
        ROM bank and the CPU's port."""
        return self.call("chips")

    def text(self):
        """The text screen as lines of text, read where TED's registers put it."""
        return self.call("text")

    def disassemble(self, addr=None, count=1):
        return self.call("disassemble", address=None if addr is None else address(addr), count=count)["instructions"]

    # -- running ---------------------------------------------------------------------------
    def run(self, cycles=None, frames=None, until=None, seconds=None, max_cycles=None):
        """Run until the limit given, a stopping checkpoint, or `stop`. The reply's "reason" is
        cycles, frames, seconds, until, checkpoint, stopped, jam or timeout (a run with no limit
        stops after a minute of the machine's time)."""
        return self.call("run", cycles=cycles, frames=frames, seconds=seconds, max_cycles=max_cycles,
                         until=None if until is None else address(until))

    def frames(self, n=1, max_cycles=None):
        """Advance to the start of the n-th frame from here (frames are counted from the server's start)."""
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
    def checkpoint(self, addr, end=None, kind="exec", stop=True, ignore=0, temporary=False, when=None):
        """A checkpoint on an address or a range; returns its id. kind: exec, read or write.
        stop=False counts without stopping; ignore lets that many hits pass before a stop;
        when={"a": 16} or {"value": 3} narrows it to an exact register or accessed value."""
        return self.call("checkpoint", address=address(addr), end=None if end is None else address(end), kind=kind,
                         stop=stop, ignore=ignore, temporary=temporary or None, when=when)["checkpoint"]

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
    def key(self, k, down=True, row=None, column=None):
        """Press (or release) a key by its name on the keyboard ("A", "1", "RETURN", "SPACE",
        "SHIFT", "C=", "CTRL", "RUN/STOP", "HELP", "F1", "UP", ...), or by its place in the
        matrix (row and column, 0-7). It stays down until released, through stops and runs."""
        return self.call("key", key=k, down=down, row=row, column=column)

    def release_keys(self):
        """Let go of every key and both joysticks."""
        return self.call("release-keys")

    def type(self, text):
        """Type text: the server puts it into the KERNAL's keyboard buffer as the program empties
        it, ten characters at a time, while the machine runs; "\\n" is RETURN."""
        return self.call("type", text=text)

    def joystick(self, port=1, bits=None, up=False, down=False, left=False, right=False, fire=False):
        """A joystick in port 1 or 2: the directions and fire held (or bits: 1 up, 2 down, 4 left,
        8 right, 16 fire). Held until changed, and kept in a snapshot."""
        return self.call("joystick", port=port, bits=bits, up=up or None, down=down or None, left=left or None,
                         right=right or None, fire=fire or None)

    # -- media -----------------------------------------------------------------------------
    def tape(self, path=None, eject=False):
        """A tape (.tap) in the cassette player with PLAY held down, or taken out."""
        return self.call("tape", path=os.path.abspath(path) if path else None, eject=eject or None)

    def disk(self, path=None, eject=False):
        """A disk (.d64) in drive 8, a 1541, or taken out (which switches the drive off)."""
        return self.call("disk", path=os.path.abspath(path) if path else None, eject=eject or None)

    def program(self, path):
        """A program file (.prg) put straight into memory at its load address, as LOAD would."""
        return self.call("program", path=os.path.abspath(path))

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
        """hard=True is a power-on; hard=False is the reset button."""
        return self.call("reset", hard=hard)

    # -- outputs ---------------------------------------------------------------------------
    def screenshot(self, path):
        """The screen as a PNG, as TED drew it: the border included, one pixel to a dot."""
        return self.call("screenshot", path=os.path.abspath(path))

    def sound(self, action, path=None):
        """start, then stop (with a path to write the capture): TED's sound register writes,
        each with its cycle."""
        return self.call("sound", action=action, path=os.path.abspath(path) if path else None)

    def codemap(self, action="read"):
        return self.call("codemap", action=action)


def connect(host=DEFAULT_HOST, port=DEFAULT_PORT, timeout=300.0):
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
                print("commands:", m.call("hello").get("commands") or "see kit/skills/c16/tool-plus4emu/SKILL.md")
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
        except Plus4emuError as e:
            raise SystemExit(str(e))
    if cmd == "read" and "data" in out:
        print(hexdump(out["address"], base64.b64decode(out["data"])))
        return 0
    if cmd == "text" and "lines" in out:
        print("\n".join(out["lines"]))
        return 0
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
