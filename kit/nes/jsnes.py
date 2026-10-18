#!/usr/bin/env python3
"""Drive the kit's NES from a script: the cartridge, memory, registers, frames, checkpoints,
the controllers, snapshots.

The machine is jsnes running inside `kit/nes/jsnes_server.mjs`, which the launcher starts
(`python3 kit/scripts/tools.py jsnes`). The server speaks one JSON object a line on
127.0.0.1:6855 (KIT_JSNES_PORT, or the launcher's --port); this module is its client, for
the loops that are too slow as one call each (kit/EMULATOR.md, "the two transports"). The
protocol is the BBC Micro's server's (kit/bbc/jsbeeb.py), with the NES's own commands for the
cartridge and the controllers.

    from jsnes import connect
    m = connect()
    m.cartridge("games/nes/<slug>/work/game.nes")
    top = m.checkpoint(0xC0F0)                    # stops there
    m.run()                                       # until a checkpoint stops it
    m.button("left")                              # held until released
    print(m.frames(1)["reason"], m.read(0x0091, 1))
    m.button("left", down=False)

From the command line, one call per invocation (the agent's transport):

    python3 kit/nes/jsnes.py --list
    python3 kit/nes/jsnes.py read '{"address": "$0300", "length": 64}'
    python3 kit/nes/jsnes.py read '{"address": "$3F00", "length": 32, "space": "ppu"}'
    python3 kit/nes/jsnes.py run '{"frames": 60}'

What the server does and does not do is in kit/skills/nes/tool-jsnes/SKILL.md:

  * the machine runs only inside a call (`run`, `step`); between two of its slices every other
    call is answered, and `stop` ends the run there, between two instructions;
  * the first instruction of a run or a step is counted by every checkpoint on it but never
    stopped on, so a machine stopped at a checkpoint goes on past it;
  * a read of $2000-$401F gives 0 and is flagged: a read through the bus would clear the PPU's
    vertical blank flag or move a controller on, so the chips' state is `chips`.
"""
import base64, json, os, socket, sys

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = int(os.environ.get("KIT_JSNES_PORT") or 6855)   # the launcher's --port sets it (kit/nes/tools.py)
FRAME_CYCLES = 29780.5         # one NTSC frame of the 1.79 MHz CPU (kit/skills/nes/nes-reference, "Timing")


class JsnesError(Exception):
    pass


def address(a):
    """An address as a number, from a number or "$2000", "&2000", "0x2000", "2000"."""
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
            raise JsnesError(f"nothing answers on {host}:{port} ({e}): start the machine with "
                              "`python3 kit/scripts/tools.py jsnes`") from None
        self.sock.settimeout(timeout)
        self.file = self.sock.makefile("rwb")
        self.n = 0

    def call(self, cmd, **args):
        """One command and its reply, as a dict; raises JsnesError when the server refuses."""
        self.n += 1
        body = {**{k: v for k, v in args.items() if v is not None}, "id": self.n, "cmd": cmd}
        try:
            self.file.write((json.dumps(body) + "\n").encode())
            self.file.flush()
            line = self.file.readline()
        except (OSError, socket.timeout) as e:
            raise JsnesError(f"{cmd}: no reply from {self.host}:{self.port} ({e})") from None
        if not line:
            raise JsnesError(f"{cmd}: the server closed the connection")
        reply = json.loads(line)
        if not reply.pop("ok", False):
            raise JsnesError(f"{cmd}: {reply.get('error')}")
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
    def read(self, addr, length=256, space="cpu"):
        """`length` bytes as the CPU sees them (space "cpu"), the PPU's memory ("ppu",
        $0000-$3FFF), its sprite table ("oam", 256 bytes), or the cartridge's own ROM by its
        offset after the header ("prg", "chr"), every bank whichever is selected. In the CPU's
        space $2000-$401F read as 0: `chips` has the registers."""
        r = self.call("read", address=address(addr), length=length, space=space)
        return base64.b64decode(r["data"])

    def write(self, addr, data, space="cpu", io=False, rom=False):
        """Write bytes. In the CPU's space, io=True sends a write to a chip's register and
        rom=True changes the ROM image in memory, a patch that a bank switch undoes."""
        return self.call("write", address=address(addr), data=base64.b64encode(bytes(data)).decode(),
                         space=space, io=io or None, rom=rom or None)

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
        """The PPU (its control, mask and status registers, the scanline and dot, the palette),
        the controllers' buttons, the mapper, and the frame count."""
        return self.call("chips")

    def disassemble(self, addr=None, count=1):
        return self.call("disassemble", address=None if addr is None else address(addr), count=count)["instructions"]

    # -- the cartridge -----------------------------------------------------------------------
    def cartridge(self, path=None, data=None, name=None):
        """Put in a cartridge, from an iNES file (path) or its bytes (data), and power on. The
        reply describes it: mapper, PRG and CHR sizes, mirroring, SHA-1, and the CRC32 of the
        ROM without its header, the figure NesCartDB lists (kit/skills/nes/nes-reference)."""
        return self.call("cartridge", path=os.path.abspath(path) if path else None,
                         data=base64.b64encode(bytes(data)).decode() if data is not None else None, name=name)

    def reset(self, hard=True):
        """hard: power off and on, RAM cleared as jsnes clears it; soft: the reset button."""
        return self.call("reset", hard=hard)

    # -- running ---------------------------------------------------------------------------
    def run(self, cycles=None, frames=None, until=None, seconds=None, max_cycles=None):
        """Run until the limit given, a stopping checkpoint, or `stop`. The reply's "reason" is
        cycles, frames, until, checkpoint, step, stopped or timeout (the backstop ran out)."""
        return self.call("run", cycles=cycles, frames=frames, seconds=seconds, max_cycles=max_cycles,
                         until=None if until is None else address(until))

    def frames(self, n=1, max_cycles=None):
        """Advance n frames, stopping after the instruction in which the last one's vertical
        blank began (kit/skills/nes/tool-jsnes, "Frames")."""
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
    def button(self, name, down=True, controller=1):
        """Press (or release) a button, or a list of them: a, b, select, start, up, down, left,
        right. It stays down until released, through stops and runs."""
        return self.call("button", button=name, down=down, controller=controller)

    def release_buttons(self):
        return self.call("release-buttons")

    # -- state -----------------------------------------------------------------------------
    def save(self, path):
        return self.call("save", path=os.path.abspath(path))

    def load(self, path, cartridge=None):
        """Load a snapshot. The cartridge it names is put in first if another is in the machine;
        `cartridge` says where the image is when it has moved."""
        return self.call("load", path=os.path.abspath(path),
                         cartridge=os.path.abspath(cartridge) if cartridge else None)

    def keep(self, name="default"):
        return self.call("keep", name=name)

    def back(self, name="default"):
        return self.call("back", name=name)

    # -- outputs ---------------------------------------------------------------------------
    def screenshot(self, path):
        return self.call("screenshot", path=os.path.abspath(path))

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
                print("commands:", m.call("hello").get("commands") or "see kit/skills/nes/tool-jsnes/SKILL.md")
        return 0
    cmd = argv[0]
    args = json.loads(argv[1]) if len(argv) > 1 else {}
    for k in ("address", "end", "until", "pc"):
        if k in args:
            args[k] = address(args[k])
    for k in ("path", "cartridge"):
        if args.get(k):
            args[k] = os.path.abspath(args[k])
    with connect() as m:
        try:
            out = m.call(cmd, **args)
        except JsnesError as e:
            raise SystemExit(str(e))
    if cmd == "read" and "data" in out:
        print(hexdump(out["address"], base64.b64decode(out["data"])))
        if out.get("io"):
            print("($2000-$401F read as 00: `chips` has the registers)")
        return 0
    print(json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
