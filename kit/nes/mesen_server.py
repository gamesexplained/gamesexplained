#!/usr/bin/env python3
"""The kit's NES on MesenCE, driven over a local socket in the same protocol as the jsnes server.

    python3 kit/nes/mesen_server.py [--port 6857]

kit/nes/tools.py starts it (`tools.py mesen`); kit/nes/jsnes.py is its client as it is the jsnes
server's, with `connect(port=6857)`. The protocol is kit/nes/jsnes_server.mjs's, one JSON
object a line both ways on 127.0.0.1 only, and the commands are the same
(kit/skills/nes/tool-jsnes, "The commands"); where MesenCE answers differently,
kit/skills/nes/tool-mesen says so.

MesenCE (github.com/nesdev-org/MesenCE, GPL-3.0) is installed under tools/mesen
(`tools.py get-mesen`) and runs as its own process in its headless test runner, with
kit/nes/mesen_bridge.lua inside it doing the machine's half of the work. This server speaks
to clients, keeps what is the server's own (the cartridge, the buttons held, whether a run is
in progress), and sends the bridge one request a line. Mesen's test runner loads one
cartridge when it starts and cannot change it, so `cartridge` starts Mesen again with the new
one; the checkpoints are carried over. A cartridge sent as bytes is written to
tools/mesen-home/carts, under its SHA-1, for Mesen to open.

A run is answered when it ends, as on the jsnes server; meanwhile the bridge looks at its
socket every 2,048 instructions and answers the other calls, so a second connection can read
the machine, save it or stop the run. A command that replaces the machine's state (`load`,
`back`, `reset`, `cartridge`) stops a run first.
"""
import base64, gzip, hashlib, json, os, platform, re, socket, socketserver, subprocess, sys, threading, \
    zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
MESEN_DIR = os.path.join(TOOLS, "mesen")
HOME = os.path.join(TOOLS, "mesen-home")
CARTS = os.path.join(HOME, "carts")
STATES = os.path.join(HOME, "states")
BRIDGE = os.path.join(HERE, "mesen_bridge.lua")
PROTOCOL = 1
CPU_HZ = 1789773
BUTTONS = ("a", "b", "select", "start", "up", "down", "left", "right")


def option(name, fallback):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv[:-1] else fallback


PORT = int(option("--port", os.environ.get("KIT_MESEN_PORT") or 6857))


def executable():
    """Mesen's program inside tools/mesen: the app bundle on macOS, the program itself elsewhere."""
    for p in (os.path.join(MESEN_DIR, "Mesen.app", "Contents", "MacOS", "Mesen"), os.path.join(MESEN_DIR, "Mesen")):
        if os.path.isfile(p):
            return p
    return None


def mesen_version():
    """The release get-mesen installed, which it writes to tools/mesen/VERSION: the macOS bundle's
    own version string reads 1.0 in every release."""
    try:
        with open(os.path.join(MESEN_DIR, "VERSION")) as f:
            return f.read().strip()
    except OSError:
        return "unknown"


# The 256 opcodes as the jsnes server names them, read from that file so that the two servers
# disassemble alike.
with open(os.path.join(HERE, "jsnes_server.mjs"), encoding="utf-8") as _f:
    _js = _f.read()
OPCODES = [o.split(".") for o in re.search(r'const OPCODES = "([^"]+)"', _js).group(1).split(" ")]
MODE_LEN = {"imp": 1, "acc": 1, "imm": 2, "zp": 2, "zpx": 2, "zpy": 2, "rel": 2, "abs": 3, "abx": 3, "aby": 3, "ind": 3,
            "izx": 2, "izy": 2}


class Refused(Exception):
    pass


def address(a, top=0xFFFF):
    if isinstance(a, str):
        s = a.strip()
        for p in ("$", "&", "0x", "0X"):
            if s.startswith(p):
                s = s[len(p):]
        n = int(s, 16)
    else:
        n = a
    if not isinstance(n, int) or n < 0 or n > top:
        raise Refused(f"address {a}: 0 to ${top:04X}")
    return n


def crc32(b):
    return zlib.crc32(b) & 0xFFFFFFFF


def describe(data, name, file):
    """What the jsnes server says about a cartridge, from its iNES header."""
    h = data[:16]
    if h[:4] != b"NES\x1a":
        raise Refused(f'{name}: not an iNES image (it does not start with "NES" and $1A)')
    mapper = (h[6] >> 4) | (h[7] & 0xF0)
    trainer = 512 if h[6] & 4 else 0
    body = data[16 + trainer:16 + trainer + h[4] * 16384 + h[5] * 8192]
    return {"name": name, "path": file, "bytes": len(data), "sha1": hashlib.sha1(data).hexdigest(),
            "crc32_body": f"{crc32(body):08X}", "prg_kb": h[4] * 16, "chr_kb": h[5] * 8, "mapper": mapper,
            "mirroring": "four-screen" if h[6] & 8 else "vertical" if h[6] & 1 else "horizontal",
            "battery": bool(h[6] & 2), "nes2": (h[7] & 0x0C) == 0x08}


def inside_repository(file):
    p = os.path.abspath(file)
    d = os.path.dirname(p)
    while not os.path.exists(d):
        d = os.path.dirname(d)
    real = os.path.join(os.path.realpath(d), os.path.relpath(p, d))
    if not real.startswith(os.path.realpath(ROOT) + os.sep):
        raise Refused(f"{file}: the kit writes only inside this repository (kit/INSTALL.md, the footprint principle)")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def write_atomic(file, data):
    tmp = f"{file}.{os.getpid()}.tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, file)


def mesen_env(port):
    """Mesen's environment: its home directory and the XDG folders inside tools/mesen-home, as
    the jsnes server's are inside tools/nes-home, so that nothing it writes lands outside."""
    env = dict(os.environ)
    env["HOME"] = HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    env["KIT_MESEN_BRIDGE"] = str(port)
    env["KIT_MESEN_LOG"] = os.path.join(TOOLS, "logs", f"mesen-bridge-{PORT}.log")
    env["DOTNET_CLI_TELEMETRY_OPTOUT"] = "1"
    return env


class Bridge:
    """One Mesen process with the bridge script in it, and the socket to the script."""

    def __init__(self, cart):
        exe = executable()
        if not exe:
            raise Refused("no Mesen under tools/mesen: run `python3 kit/scripts/tools.py get-mesen` (kit/nes/INSTALL.md)")
        lsn = socket.socket()
        lsn.bind(("127.0.0.1", 0))
        lsn.listen(1)
        lsn.settimeout(60)
        port = lsn.getsockname()[1]
        os.makedirs(HOME, exist_ok=True)
        self.log = open(os.path.join(TOOLS, "logs", f"mesen-{PORT}.log"), "ab")
        # --timeout is the test runner's limit, in seconds: a server is meant to run for days
        self.proc = subprocess.Popen([exe, "--testRunner", BRIDGE, cart, "--timeout=2000000"], cwd=HOME,
                                     env=mesen_env(port), stdout=self.log, stderr=self.log, stdin=subprocess.DEVNULL)
        try:
            self.sock, _ = lsn.accept()
        except socket.timeout:
            self.proc.kill()
            raise Refused("Mesen started but its script never connected: see tools/logs/mesen-*.log") from None
        finally:
            lsn.close()
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.file = self.sock.makefile("rb")
        self.lock = threading.Lock()
        self.waiting = {}
        self.n = 0
        hello = json.loads(self.file.readline())
        self.registers = hello["registers"]
        self.alive = True
        threading.Thread(target=self.reader, daemon=True).start()

    def reader(self):
        try:
            for line in self.file:
                reply = json.loads(line)
                slot = self.waiting.pop(reply.get("id"), None)
                if slot:
                    slot[1] = reply
                    slot[0].set()
        except (OSError, ValueError):
            pass
        self.alive = False
        for slot in list(self.waiting.values()):
            slot[1] = {"ok": False, "error": "Mesen stopped answering: see tools/logs/mesen-*.log"}
            slot[0].set()

    def call(self, cmd, **args):
        if not self.alive:
            raise Refused("Mesen is not running: put a cartridge in again")
        with self.lock:
            self.n += 1
            n = self.n
            slot = [threading.Event(), None]
            self.waiting[n] = slot
            self.sock.sendall((json.dumps({**{k: v for k, v in args.items() if v is not None}, "id": n, "cmd": cmd})
                               + "\n").encode())
        slot[0].wait()
        reply = slot[1]
        if not reply.pop("ok", False):
            raise Refused(reply.get("error"))
        reply.pop("id", None)
        return reply

    def close(self):
        if self.alive:
            try:
                self.sock.sendall(b'{"id": 0, "cmd": "quit"}\n')
            except OSError:
                pass
        try:
            self.proc.wait(5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait(5)
        try:
            self.sock.close()
        except OSError:
            pass
        self.log.close()


class Server:
    def __init__(self):
        self.bridge = None
        self.cartridge = None
        self.held = {"1": [], "2": []}
        self.running = False
        self.machine = threading.Lock()      # held by a run, and by whatever replaces the machine
        self.idle = threading.Condition()
        self.version = mesen_version()
        self.saves = 0
        # checkpoints set before any cartridge is in, as `checkpoints` lists them: Mesen, which
        # keeps them, runs only once there is one, and they go to it then
        self.early = {"checkpoints": [], "next_id": 1}

    # -- helpers ------------------------------------------------------------------------------
    def need(self):
        if not self.bridge:
            raise Refused("no cartridge: `cartridge` first, with a path to the contributor's .nes image")
        return self.bridge

    def replacing(self, fn):
        """Stop a run in progress, then do fn with the machine to itself."""
        if self.running:
            try:
                self.bridge.call("stop")
            except Refused:
                pass
        with self.machine:
            return fn()

    def disassemble(self, pc):
        b = bytes.fromhex(self.need().call("read", address=pc, length=3, space="cpu")["data"])
        m, mode = OPCODES[b[0]]
        w = b[1] | (b[2] << 8)
        rel = (pc + 2 + ((b[1] ^ 0x80) - 0x80)) & 0xFFFF
        op = {"imp": "", "acc": "A", "imm": f"#${b[1]:02X}", "zp": f"${b[1]:02X}", "zpx": f"${b[1]:02X},X",
              "zpy": f"${b[1]:02X},Y", "izx": f"(${b[1]:02X},X)", "izy": f"(${b[1]:02X}),Y", "abs": f"${w:04X}",
              "abx": f"${w:04X},X", "aby": f"${w:04X},Y", "ind": f"(${w:04X})", "rel": f"${rel:04X}"}[mode]
        return {"address": pc, "text": f"{m.upper()} {op}".strip(), "length": MODE_LEN[mode]}

    def start(self, path, info):
        """Mesen started again with this cartridge, the checkpoints carried over."""
        kept = self.early if not self.bridge else None
        if self.bridge:
            try:
                kept = self.bridge.call("checkpoints")
            except Refused:
                pass
            self.bridge.close()
            self.bridge = None
        self.bridge = Bridge(path)
        self.cartridge = info
        if kept and kept["checkpoints"]:
            self.bridge.call("setcheckpoints", checkpoints=kept["checkpoints"], next_id=kept["next_id"])
        self.bridge.call("input", **self.held)
        return self.bridge.registers

    def cart_file(self, data, info):
        os.makedirs(CARTS, exist_ok=True)
        f = os.path.join(CARTS, info["sha1"] + ".nes")
        if not os.path.exists(f):
            write_atomic(f, data)
        return f

    # -- commands -----------------------------------------------------------------------------
    def hello(self, a):
        return {"server": "kit Mesen server", "protocol": PROTOCOL, "mesen": self.version, "emulator": f"MesenCE {self.version}",
                "model": "NES (NTSC)", "python": platform.python_version(), "root": ROOT, "commands": sorted(COMMANDS)}

    def status(self, a):
        if not self.bridge:
            return {"running": False, "cartridge": None, "pc": None, "cycles": None, "frames": 0, "checkpoints": 0,
                    "codemap": False, "sound": False, "held": None}
        s = self.bridge.call("status")
        s.update(running=self.running, cartridge=self.cartridge, held=self.held)
        return s

    def cart(self, a):
        if a.get("path"):
            file = os.path.abspath(a["path"])
            data = open(file, "rb").read()
            info = describe(data, os.path.basename(file), file)
            run_from = file
        elif a.get("data"):
            data = base64.b64decode(a["data"])
            info = describe(data, a.get("name") or "sent by the client", None)
            run_from = self.cart_file(data, info)
        else:
            raise Refused('give "path" (a .nes image on this computer) or "data" (its bytes, base64)')
        regs = self.replacing(lambda: self.start(run_from, info))
        return {"cartridge": info, "registers": regs}

    def reset(self, a):
        self.need()
        return self.replacing(lambda: self.bridge.call("power" if a.get("hard", True) else "softreset"))

    def button(self, a):
        self.need()
        n = str(a.get("controller", 1))
        if n not in ("1", "2"):
            raise Refused("controller: 1 or 2")
        names = a["button"] if isinstance(a.get("button"), list) else [a.get("button")]
        for name in names:
            b = str(name).lower()
            if b not in BUTTONS:
                raise Refused(f"no button {json.dumps(name)}: {', '.join(BUTTONS)}")
            if a.get("down") is False:
                if b in self.held[n]:
                    self.held[n].remove(b)
            elif b not in self.held[n]:
                self.held[n].append(b)
        for k in self.held:
            self.held[k] = [b for b in BUTTONS if b in self.held[k]]
        self.bridge.call("input", **self.held)
        return {"held": self.held}

    def release(self, a):
        self.need()
        self.held = {"1": [], "2": []}
        self.bridge.call("input", **self.held)
        return {"held": self.held}

    def run_core(self, cmd, args):
        b = self.need()
        if self.running or not self.machine.acquire(blocking=False):
            raise Refused("the machine is already running: `stop` it first")
        self.running = True
        try:
            return b.call(cmd, **args)
        finally:
            self.running = False
            self.machine.release()

    def run(self, a):
        cycles = a.get("cycles")
        if cycles is None and a.get("seconds") is not None:
            cycles = round(a["seconds"] * CPU_HZ)
        until = address(a["until"]) if a.get("until") is not None else None
        return self.run_core("run", {"cycles": cycles, "frames": a.get("frames"), "until": until,
                                     "max_cycles": a.get("max_cycles")})

    def step(self, a):
        r = self.run_core("step", {"count": max(1, a.get("count") or 1), "max_cycles": a.get("max_cycles") or 2000000})
        r["next"] = self.disassemble(r["pc"])
        return r

    def stop(self, a):
        was = self.running
        if was:
            self.need().call("stop")
        return {"was_running": was}

    def read(self, a):
        self.need()
        space = a.get("space", "cpu")
        prg, chr_ = self.cartridge["prg_kb"] * 1024, self.cartridge["chr_kb"] * 1024
        top = {"cpu": 0xFFFF, "ppu": 0x3FFF, "oam": 0xFF, "prg": prg - 1, "chr": chr_ - 1}.get(space)
        if top is None:
            raise Refused(f"space {space}: cpu, ppu, oam, prg or chr")
        if top < 0:
            raise Refused(f"the cartridge has no {space.upper()} ROM")
        start = address(a["address"], top)
        length = a.get("length", 256)
        if space in ("prg", "chr"):
            length = min(length, top + 1 - start)
        elif not (isinstance(length, int) and 0 <= length <= top + 1):
            raise Refused(f"length: 0 to {top + 1}")
        r = self.bridge.call("read", address=start, length=length, space=space)
        return {"address": start, "space": space, "data": base64.b64encode(bytes.fromhex(r["data"])).decode(), "io": r["io"]}

    def write(self, a):
        self.need()
        space = a.get("space", "cpu")
        if space not in ("cpu", "ppu", "oam"):
            raise Refused(f"space {space}: cpu, ppu or oam (the cartridge's own ROM, prg and chr, is read only)")
        data = base64.b64decode(a["data"]) if a.get("data") is not None else bytes(a.get("bytes") or [])
        start = address(a["address"], 0x3FFF if space == "ppu" else 0xFF if space == "oam" else 0xFFFF)
        if space == "cpu":
            for i in range(len(data)):
                x = (start + i) & 0xFFFF
                if 0x2000 <= x < 0x4020 and not a.get("io"):
                    raise Refused(f'${x:04X} is a chip\'s register: pass "io": true to write to it')
                if x >= 0x8000 and not a.get("rom"):
                    raise Refused(f'${x:04X} is ROM: pass "rom": true to change the image in memory (a patch, gone at the '
                                  "next bank switch)")
        return self.bridge.call("write", address=start, data=data.hex(), space=space)

    def set_registers(self, a):
        self.need()
        regs = {k: a[k] for k in ("a", "x", "y", "s", "p") if a.get(k) is not None}
        if a.get("pc") is not None:
            regs["pc"] = address(a["pc"])
        return self.bridge.call("set-registers", **regs)

    def disassemble_cmd(self, a):
        at = address(a["address"]) if a.get("address") is not None else self.need().call("registers")["pc"]
        out = []
        for _ in range(a.get("count") or 1):
            d = self.disassemble(at)
            out.append(d)
            at = (at + d["length"]) & 0xFFFF
        return {"instructions": out}

    def chips(self, a):
        c = self.need().call("chips")
        c["mapper"] = self.cartridge["mapper"]
        c["ppu"]["mirroring"] = self.cartridge["mirroring"]
        return c

    def checkpoint(self, a):
        kind = a.get("kind", "exec")
        if kind not in ("exec", "read", "write"):
            raise Refused(f"kind {kind}: exec, read or write")
        start = address(a["address"])
        end = address(a["end"]) if a.get("end") is not None else start
        if end < start:
            raise Refused("end is before address")
        cp = {"kind": kind, "address": start, "end": end, "stop": a.get("stop", True), "ignore": a.get("ignore", 0),
              "temporary": bool(a.get("temporary")), "fetch": bool(a.get("fetch")), "when": a.get("when")}
        if not self.bridge:
            n = self.early["next_id"]
            self.early["checkpoints"].append({**cp, "checkpoint": n, "hits": 0, "last": None})
            self.early["next_id"] = n + 1
            return {"checkpoint": n}
        return self.bridge.call("checkpoint", **cp)

    def checkpoints(self, a):
        if not self.bridge:
            return {"checkpoints": self.early["checkpoints"]}
        return {"checkpoints": self.bridge.call("checkpoints")["checkpoints"]}

    def delete(self, a):
        if not self.bridge:
            cps = self.early["checkpoints"]
            if not a.get("all"):
                if not any(c["checkpoint"] == a.get("checkpoint") for c in cps):
                    raise Refused(f'no checkpoint {a.get("checkpoint")}: give "checkpoint": n, or "all": true')
                self.early["checkpoints"] = [c for c in cps if c["checkpoint"] != a.get("checkpoint")]
            else:
                self.early["checkpoints"] = []
            return {"left": len(self.early["checkpoints"])}
        return self.bridge.call("delete", checkpoint=a.get("checkpoint"), all=a.get("all"))

    def zero(self, a):
        if not self.bridge:
            return {}
        return self.bridge.call("zero", checkpoint=a.get("checkpoint"))

    def snapshot(self, path):
        """The machine as the kit's NES snapshot (kit/nes/snapshot.py): the parts the readers take,
        and Mesen's own save state for a load."""
        os.makedirs(STATES, exist_ok=True)
        self.saves += 1
        tmp = os.path.join(STATES, f"save-{os.getpid()}-{self.saves}.mss")
        r = self.bridge.call("snapshot", path=tmp)
        with open(tmp, "rb") as f:
            state = f.read()
        os.remove(tmp)
        b64 = lambda h: base64.b64encode(bytes.fromhex(h)).decode()   # noqa: E731
        snap = {"format": "kit-nes-snapshot",
                "kit": {"saved_by": "kit/nes/mesen_server.py", "protocol": PROTOCOL, "emulator": f"MesenCE {self.version}",
                        "cartridge": self.cartridge, "frames": r["frames"], "stopped_before": r["stopped_before"],
                        "held": self.held},
                "machine": {"cpu": b64(r["cpu"]), "ppu": b64(r["ppu"]), "oam": b64(r["oam"]), "registers": r["registers"],
                            "ppu_registers": {k: r["ppu_registers"][k] for k in ("ctrl", "mask", "scrollX", "scrollY")}},
                "mesen_state": base64.b64encode(state).decode()}
        write_atomic(path, gzip.compress(json.dumps(snap).encode()))
        return r

    def save(self, a):
        self.need()
        path = inside_repository(a["path"])
        r = self.snapshot(path)
        return {"path": path, "bytes": os.path.getsize(path), "pc": r["registers"]["pc"], "cycles": r["registers"]["cycles"],
                "frames": r["frames"]}

    def load(self, a):
        file = os.path.abspath(a["path"])
        raw = open(file, "rb").read()
        snap = json.loads(gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw)
        if snap.get("format") != "kit-nes-snapshot":
            raise Refused(f"{os.path.basename(file)}: not a snapshot the kit's NES server saved")
        if "mesen_state" not in snap:
            raise Refused(f"{os.path.basename(file)} was saved by {snap['kit'].get('saved_by')}: Mesen loads only what "
                          "kit/nes/mesen_server.py saved (kit/skills/nes/tool-mesen, \"Snapshots\")")
        want = snap["kit"]["cartridge"]

        def go():
            if not self.cartridge or self.cartridge["sha1"] != want["sha1"]:
                cached = os.path.join(CARTS, want["sha1"] + ".nes")
                src = a.get("cartridge") or want.get("path")
                if not (src and os.path.exists(src)) and os.path.exists(cached):
                    src = cached
                if not src or not os.path.exists(src):
                    raise Refused(f"the snapshot's cartridge, {want['name']}, is not in the machine" +
                                  (f" and not at {want['path']}" if want.get("path") else ", and the snapshot names no file for it")
                                  + ': put it in with `cartridge`, or pass "cartridge": <path>')
                data = open(src, "rb").read()
                info = describe(data, os.path.basename(src), os.path.abspath(src))
                if info["sha1"] != want["sha1"]:
                    raise Refused(f"{src} is not the snapshot's cartridge (its SHA-1 differs)")
                if src == cached:
                    info.update(name=want["name"], path=want.get("path"))
                self.start(src, info)
            os.makedirs(STATES, exist_ok=True)
            self.saves += 1
            tmp = os.path.join(STATES, f"load-{os.getpid()}-{self.saves}.mss")
            write_atomic(tmp, base64.b64decode(snap["mesen_state"]))
            try:
                r = self.bridge.call("load", path=tmp, frames=snap["kit"]["frames"], stopped_before=snap["kit"]["stopped_before"])
            finally:
                os.remove(tmp)
            return {"registers": r["registers"], "frames": r["frames"], "cartridge": self.cartridge["name"], "held": self.held}
        return self.replacing(go)

    def keep(self, a):
        return self.need().call("keep", name=a.get("name") or "default")

    def back(self, a):
        self.need()
        r = self.replacing(lambda: self.bridge.call("back", name=a.get("name") or "default"))
        r["held"] = self.held
        return r

    def screenshot(self, a):
        self.need()
        path = inside_repository(a["path"])
        r = self.bridge.call("screenshot", path=path)
        with open(path, "rb") as f:
            head = f.read(24)
        w, h = int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")
        return {"path": path, "width": w, "height": h, "frames": r["frames"]}

    def sound(self, a):
        self.need()
        if a.get("action") == "start":
            return self.bridge.call("sound", action="start")
        if a.get("action") != "stop":
            raise Refused('action: "start" or "stop"')
        cap = self.bridge.call("sound", action="stop")
        out = {"format": "kit-nes-apu-writes", "clock": CPU_HZ, "start": cap["start"], "end": cap["end"], "writes": cap["writes"]}
        if not a.get("path"):
            return {**out, "count": len(cap["writes"])}
        path = inside_repository(a["path"])
        write_atomic(path, json.dumps(out).encode())
        return {"path": path, "count": len(cap["writes"]), "start": out["start"], "end": out["end"]}

    def quit(self, a):
        threading.Thread(target=shutdown, daemon=True).start()
        return {"bye": True}


SERVER = Server()
COMMANDS = {
    "hello": SERVER.hello, "status": SERVER.status, "cartridge": SERVER.cart, "reset": SERVER.reset,
    "button": SERVER.button, "buttons": lambda a: {"held": SERVER.held}, "release-buttons": SERVER.release,
    "run": SERVER.run, "step": SERVER.step, "stop": SERVER.stop, "read": SERVER.read, "write": SERVER.write,
    "registers": lambda a: SERVER.need().call("registers"), "set-registers": SERVER.set_registers,
    "disassemble": SERVER.disassemble_cmd, "chips": SERVER.chips, "checkpoint": SERVER.checkpoint,
    "checkpoints": SERVER.checkpoints, "delete": SERVER.delete,
    "zero": SERVER.zero, "save": SERVER.save, "load": SERVER.load,
    "keep": SERVER.keep, "back": SERVER.back, "screenshot": SERVER.screenshot, "sound": SERVER.sound,
    "codemap": lambda a: SERVER.need().call("codemap", action=a.get("action", "read")), "quit": SERVER.quit,
}


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        for line in self.rfile:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
            except ValueError:
                self.wfile.write(b'{"ok": false, "error": "not JSON"}\n')
                continue
            rid, cmd = req.pop("id", None), req.pop("cmd", None)
            try:
                fn = COMMANDS.get(cmd)
                if not fn:
                    raise Refused(f"no command {json.dumps(cmd)}; the commands: {', '.join(COMMANDS)}")
                reply = {**fn(req), "id": rid, "ok": True}
            except Refused as e:
                reply = {"id": rid, "ok": False, "error": str(e)}
            except Exception as e:      # a bug here must not end the server
                reply = {"id": rid, "ok": False, "error": f"{type(e).__name__}: {e}"}
            try:
                self.wfile.write((json.dumps(reply) + "\n").encode())
                self.wfile.flush()
            except OSError:
                return


class TCP(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


tcp = None


def shutdown():
    if SERVER.bridge:
        SERVER.bridge.close()
    if tcp:
        tcp.shutdown()


if __name__ == "__main__":
    if not executable():
        sys.exit("no Mesen under tools/mesen: run `python3 kit/scripts/tools.py get-mesen` (kit/nes/INSTALL.md)")
    os.makedirs(os.path.join(TOOLS, "logs"), exist_ok=True)
    import signal

    def on_term(*_):
        # `tools.py stop` ends this process: Mesen goes with it (its script also ends Mesen when
        # the socket closes, should this process die without a word)
        if SERVER.bridge:
            SERVER.bridge.close()
        os._exit(0)
    signal.signal(signal.SIGTERM, on_term)
    tcp = TCP(("127.0.0.1", PORT), Handler)
    print(f"kit Mesen server: MesenCE {mesen_version()}, NES (NTSC), no cartridge, on 127.0.0.1:{PORT}", flush=True)
    try:
        tcp.serve_forever()
    finally:
        if SERVER.bridge:
            SERVER.bridge.close()
