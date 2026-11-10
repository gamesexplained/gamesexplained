#!/usr/bin/env python3
"""The client of the kit's Game & Watch server (kit/gnw/gnw_server.mjs): one JSON object a line
on 127.0.0.1, as the other platforms' servers speak.

    from gnw import connect
    m = connect()                       # port 6858, or KIT_GNW_PORT, or connect(port=N)
    m.rom("work/game.zip")              # the chip's ROM, or MAME's ROM set holding it
    m.wiring({"game_a": "R4.K3", "left": "beta", "right": "alpha"})
    m.press("game_a"); m.run(seconds=0.1); m.press("game_a", down=False)
    m.read("data", 0, 0x80)             # the data memory, one byte a cell
    m.checkpoint(0x3C0, stop=False)     # count every pass through physical pc $3C0
    m.save("title"); m.load("title")    # tools/gnw-home/snapshots/title.gnw.json.gz

Every method is a command of kit/skills/gnw/tool-gnw-server, with its arguments as keywords, and
returns the reply; a reply with "ok": false raises GnwError with the server's words. Run it to
print the machine's state:

    python3 kit/gnw/gnw.py [--port N] status|registers|screen
"""
import json, os, socket, sys


class GnwError(RuntimeError):
    pass


class Gnw:
    def __init__(self, port=None, timeout=600):
        self.port = int(port or os.environ.get("KIT_GNW_PORT") or 6858)
        self.sock = socket.create_connection(("127.0.0.1", self.port), timeout=timeout)
        self.file = self.sock.makefile("rwb")
        self.n = 0

    def call(self, cmd, **args):
        self.n += 1
        args = {k: v for k, v in args.items() if v is not None}
        self.file.write((json.dumps(dict(args, id=self.n, cmd=cmd)) + "\n").encode())
        self.file.flush()
        while True:
            line = self.file.readline()
            if not line:
                raise GnwError("the server closed the connection")
            r = json.loads(line)
            if r.get("id") == self.n:
                break
        if not r.get("ok"):
            raise GnwError(r.get("error"))
        return r

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass

    # the commands, as methods
    def hello(self): return self.call("hello")
    def rom(self, path): return self.call("rom", path=os.path.abspath(path))
    def wiring(self, buttons, low=None): return self.call("wiring", buttons=buttons, low=low or [])
    def power(self): return self.call("power")
    def reset(self): return self.call("reset")
    def status(self): return self.call("status")
    def registers(self): return self.call("registers")
    def read(self, space="data", start=0, length=1):
        return bytes.fromhex(self.call("read", space=space, start=start, length=length)["bytes"])
    def write(self, start, data): return self.call("write", space="data", start=start, bytes=bytes(data).hex())
    def press(self, button, down=True): return self.call("press", button=button, down=down)
    def release(self): return self.call("release")
    def run(self, cycles=None, seconds=None): return self.call("run", cycles=cycles, seconds=seconds)
    def step(self, count=1): return self.call("step", count=count)
    def stop(self): return self.call("stop")
    def checkpoint(self, pc, stop=True, ignore=0): return self.call("checkpoint", pc=pc, stop=stop, ignore=ignore)
    def delete(self, checkpoint): return self.call("delete", checkpoint=checkpoint)
    def checkpoints(self): return self.call("checkpoints")["checkpoints"]
    def save(self, name): return self.call("save", name=name)
    def load(self, name): return self.call("load", name=name)
    def screen(self): return self.call("screen")


def connect(port=None, timeout=600):
    return Gnw(port, timeout)


if __name__ == "__main__":
    a = sys.argv[1:]
    port = None
    if "--port" in a:
        i = a.index("--port"); port = a[i + 1]; del a[i:i + 2]
    if not a or a[0] in ("-h", "--help") or a[0] not in ("status", "registers", "screen", "hello"):
        print(__doc__)
        sys.exit(0 if a and a[0] in ("-h", "--help") else 2)
    print(json.dumps(getattr(connect(port), a[0])(), indent=1))
