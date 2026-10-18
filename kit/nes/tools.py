#!/usr/bin/env python3
"""The NES launcher: install, start, check and stop jsnes, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `jsnes` and
`get-jsnes` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform nes` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/nes/          jsnes from npm (`tools.py get-jsnes`): tools/nes/node_modules/jsnes, the
                      emulator (github.com/bfirsh/jsnes, Apache-2.0), which has no dependencies
                      and ships no game
  tools/nes-home/     the server's home directory (HOME and the XDG folders point here), and
                      the snapshots the kit saves, in tools/nes-home/snapshots
  tools/logs/         the server's log, jsnes.log
Deleting the repository removes all of it. See kit/nes/INSTALL.md, "Uninstall".

The emulator is jsnes's machine running inside kit/nes/jsnes_server.mjs, under Node, which
the kit does not install (kit/nes/INSTALL.md). It opens no window and makes no sound: the
screen is read as a PNG (`screenshot`) and the APU as a log of its writes. It starts with no
cartridge; `cartridge` puts the contributor's image in.

The server listens on 127.0.0.1:6855. `--port N` (or KIT_JSNES_PORT) puts it on another
port, for a run that needs more than one machine at once; every command takes it, and
passes it on to the scripts it starts. `stop` stops every server this clone started, and
`stop --port N` only that one.

Usage:
  tools.py status [--port N]
  tools.py jsnes [--port N]                 start it, with no cartridge, waiting on 127.0.0.1:6855, or N
  tools.py stop [jsnes] [--port N]          stop this clone's servers, or the one on N
  tools.py get-jsnes                        install jsnes 2.1.0 from npm into tools/nes
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep]          test it against kit/EMULATOR.md (kit/nes/check_emulator.py)
  tools.py verify-footprint                 prove it writes nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked: it starts the server, puts in the check's own test cartridge, has it save a snapshot
and a screenshot, reads memory, stops it, and then lists every file outside the repository
that changed meanwhile and looks like it belongs to jsnes, Node or npm. An empty list is the
pass.
"""
import json, os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "jsnes", "stop", "get-jsnes", "snapshots", "check-emulator", "verify-footprint")
TOOL_NAMES = ("jsnes",)   # what `stop` takes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
NES_DIR = os.path.join(TOOLS, "nes")
JSNES_DIR = os.path.join(NES_DIR, "node_modules", "jsnes")
HOME = os.path.join(TOOLS, "nes-home")
SNAPSHOTS = os.path.join(HOME, "snapshots")
LOGS = os.path.join(TOOLS, "logs")
SERVER = os.path.join(HERE, "jsnes_server.mjs")
JSNES_VERSION = "2.1.0"   # the release the checks in kit/nes/INSTALL.md were measured on
PORT = int(os.environ.get("KIT_JSNES_PORT") or 6855)   # loopback only; `--port N` in main() sets both

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import up, start, port_owner, foreign_detail, kill_matching, footprint_signatures, \
    written_outside, judge_footprint   # noqa: E402


def node():
    """The Node on the path, or None. The kit does not install one (kit/nes/INSTALL.md)."""
    return shutil.which("node")


def node_version():
    exe = node()
    if not exe:
        return None
    try:
        return subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def build():
    """Which jsnes tools/nes holds, as a line that can go into game.json."""
    try:
        v = json.load(open(os.path.join(JSNES_DIR, "package.json")))["version"]
        return f"jsnes {v} (npm)"
    except (OSError, ValueError, KeyError):
        return "MISSING (run: tools.py get-jsnes)"


def server_env():
    """The environment that contains the server: its home directory is tools/nes-home.

    Node and jsnes write nothing to a home directory when they run (measured, kit/nes/INSTALL.md),
    and HOME and the XDG variables are pointed inside anyway, so that a later release that
    starts to cannot write outside."""
    env = dict(os.environ)
    env["HOME"] = HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    env["KIT_JSNES_PORT"] = str(PORT)
    return env


def get_jsnes():
    """Install jsnes into tools/nes from npm, the project's own registry entry.

    jsnes lists no dependencies, so this is one package. The download cache is kept inside
    tools/nes while npm runs and deleted after."""
    exe = shutil.which("npm")
    if not exe:
        sys.exit("no npm on the path: jsnes is installed with npm, which comes with Node "
                 "(kit/nes/INSTALL.md, 'What you need first')")
    words = ("jsnes", "npm")
    before = footprint_signatures(words)
    cache = os.path.join(NES_DIR, "npm-cache")
    os.makedirs(NES_DIR, exist_ok=True)
    print(f"installing jsnes {JSNES_VERSION} from npm (github.com/bfirsh/jsnes, Apache-2.0) into tools/nes")
    env = dict(os.environ, npm_config_update_notifier="false", npm_config_fund="false", npm_config_audit="false")
    subprocess.run([exe, "install", "--prefix", NES_DIR, "--cache", cache, "--omit=optional", "--omit=dev",
                    "--no-audit", "--no-fund", f"jsnes@{JSNES_VERSION}"], check=True, env=env)
    shutil.rmtree(cache, ignore_errors=True)
    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(NES_DIR) for f in fs)
    print(f"{build()} at tools/nes, {total / 1048576:.1f} MB; tools/ is gitignored")
    outside = [p for p in written_outside(before, words) if os.path.realpath(p) != os.path.realpath(cache)]
    if outside:
        print("written outside the repository by the install (list them under Uninstall in kit/nes/INSTALL.md):")
        for p in outside:
            print("  ", p)
    else:
        print("nothing written outside the repository by the install")


def jsnes(extra=()):
    exe = node()
    if not exe:
        sys.exit("no node on the path: the NES's emulator runs under Node (kit/nes/INSTALL.md, 'What you need first')")
    if not os.path.isfile(os.path.join(JSNES_DIR, "package.json")):
        sys.exit("no jsnes under tools/nes; run `python3 kit/scripts/tools.py get-jsnes` (kit/nes/INSTALL.md)")
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    os.makedirs(SNAPSHOTS, exist_ok=True)
    cmd = [exe, SERVER, "--port", str(PORT)] + list(extra)
    log = "jsnes.log" if PORT == 6855 else f"jsnes-{PORT}.log"
    start(cmd, os.path.join(LOGS, log), env=server_env(), cwd=ROOT, port=PORT, name="emulator")


# only this clone's servers: the pattern is this clone's own server script, by absolute path
STOP_PATTERN = re.escape(SERVER)


def ours():
    """The ports this clone's running servers listen on, from their command lines."""
    r = subprocess.run(["ps", "-axo", "command="], capture_output=True, text=True)
    found = set()
    for line in r.stdout.splitlines():
        m = re.search(r"--port (\d+)", line)
        if m and SERVER in line and not line.lstrip().startswith(("script", "/usr/bin/script")):
            found.add(int(m.group(1)))
    return sorted(found)


def stop(quiet=False, port=None):
    """Stop this clone's servers, or only the one listening on `port`."""
    kill_matching(STOP_PATTERN + (f".*--port {port}( |$)" if port else ""))
    time.sleep(0.5)
    for p in [port] if port else sorted({PORT, *ours()}):
        left = port_owner(p) if up(p) else None
        if left:
            print(f"something still answers on :{p} and it is not this clone's server, so it was left alone:\n  {left}")
    if not quiet:
        status()


def client():
    sys.path.insert(0, HERE)
    import jsnes as client_module
    return client_module


def status():
    running = up(PORT)
    nv = node_version()
    print(f"emulator  :{PORT}  {'up' if running else 'down'}   build: {build()} (tools/nes)   "
          f"node: {nv or 'MISSING'}")
    others = [p for p in ours() if p != PORT]
    if others:
        print(f"  this clone's servers also answer on: {', '.join(f':{p}' for p in others)} "
              "(`status --port N` for one of them)")
    detail = foreign_detail(PORT)
    if detail:
        print(f"  WARNING: :{PORT} is answered by a server from another folder:\n{detail}")
    if running:
        try:
            with client().connect(port=PORT, timeout=5) as m:
                h = m.call("hello")
                s = m.call("status")
            cart = s.get("cartridge") or {}
            print(f"  machine: NES   jsnes {h['jsnes']}   {'running' if s['running'] else 'stopped'} "
                  f"{'at PC $%04X' % s['pc'] if s['pc'] is not None else 'with no cartridge'}   cartridge: {cart.get('name') or 'none'}   "
                  f"snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "nes.json")     # its own file: each platform's check writes one
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (the server's own folders are all inside tools/nes-home)."""
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/nes/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint():
    """Launch, use and stop the server, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    if up(PORT):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("jsnes", "npm", "node_modules")
    before = footprint_signatures(words)
    jsnes()
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.json.gz")
    shot = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.png")
    sys.path.insert(0, HERE)
    import check_emulator
    with client().connect(port=PORT) as m:
        m.cartridge(data=check_emulator.test_cartridge(), name="kit test cartridge")
        m.frames(25)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("screenshot written to:", os.path.relpath(m.screenshot(shot)["path"], ROOT))
        print("memory read through the server:", m.read(0xFFFA, 6).hex())
        m.load(snap)
    stop(quiet=True, port=PORT)   # the server it started, and no other this clone has running
    hits = written_outside(before, words)
    for f in (shot, snap):
        try:
            os.remove(f)
        except OSError:
            pass
    judge_footprint(hits, KNOWN_RESIDUE, snap)


def take_port(a):
    """Take `--port N` out of the arguments: it becomes PORT here and KIT_JSNES_PORT for every
    script started from here. Returns the rest, and N or None."""
    global PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py jsnes --port 6856")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    PORT = n
    os.environ["KIT_JSNES_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    a, port = take_port(sys.argv[1:])
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "jsnes":
        jsnes(a[1:])
    elif a[0] == "stop":
        if any(x not in ("jsnes", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [jsnes] [--port N]")
        stop(port=port)
    elif a[0] == "get-jsnes":
        get_jsnes()
    elif a[0] == "snapshots":
        snapshots()
    elif a[0] == "check-emulator":
        sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "check_emulator.py"), *a[1:]]).returncode)
    elif a[0] == "verify-footprint":
        verify_footprint()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
