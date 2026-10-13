#!/usr/bin/env python3
"""The BBC Micro launcher: install, start, check and stop jsbeeb, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `jsbeeb` and
`get-jsbeeb` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform bbc` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/bbc/          jsbeeb from npm (`tools.py get-jsbeeb`): tools/bbc/node_modules/jsbeeb,
                      the emulator (github.com/mattgodbolt/jsbeeb, GPL-3.0-or-later) with its
                      ROMs, and the eight packages it lists, most of whose size is the styles
                      of its web page, which the server never loads
  tools/bbc-home/     the server's home directory (HOME and the XDG folders point here), and
                      the snapshots the kit saves, in tools/bbc-home/snapshots
  tools/logs/         the server's log, jsbeeb.log
Deleting the repository removes all of it. See kit/bbc/INSTALL.md, "Uninstall".

The emulator is jsbeeb's machine running inside kit/bbc/jsbeeb_server.mjs, under Node,
which the kit does not install (kit/bbc/INSTALL.md). It opens no window and makes no
sound: the screen is read as a PNG (`screenshot`) and the sound chip as a log of its writes.

The server listens on 127.0.0.1:6845. `--port N` (or KIT_JSBEEB_PORT) puts it on another
port, for a run that needs more than one machine at once; every command takes it, and
passes it on to the scripts it starts. `stop` stops every server this clone started, and
`stop --port N` only that one.

Usage:
  tools.py status [--port N]
  tools.py jsbeeb [--port N] [--model NAME]   start it: the machine boots to BASIC and waits on
                                            127.0.0.1:6845, or N. NAME is a jsbeeb model (B-DFS1.2,
                                            the default; Master)
  tools.py stop [jsbeeb] [--port N]         stop this clone's servers, or the one on N
  tools.py get-jsbeeb                       install jsbeeb 2.4.0 from npm into tools/bbc
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep]          test it against kit/EMULATOR.md (kit/bbc/check_emulator.py)
  tools.py verify-footprint                 prove it writes nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked: it starts the server, has it save a snapshot and a screenshot, reads memory,
stops it, and then lists every file outside the repository that changed meanwhile and
looks like it belongs to jsbeeb, Node or npm. An empty list is the pass.
"""
import json, os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "jsbeeb", "stop", "get-jsbeeb", "snapshots", "check-emulator", "verify-footprint")
TOOL_NAMES = ("jsbeeb",)   # what `stop` takes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
BBC_DIR = os.path.join(TOOLS, "bbc")
JSBEEB_DIR = os.path.join(BBC_DIR, "node_modules", "jsbeeb")
HOME = os.path.join(TOOLS, "bbc-home")
SNAPSHOTS = os.path.join(HOME, "snapshots")
LOGS = os.path.join(TOOLS, "logs")
SERVER = os.path.join(HERE, "jsbeeb_server.mjs")
JSBEEB_VERSION = "2.4.0"   # the release the checks in kit/bbc/INSTALL.md were measured on
PORT = int(os.environ.get("KIT_JSBEEB_PORT") or 6845)   # loopback only; `--port N` in main() sets both

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import up, start, port_owner, foreign_detail, kill_matching, footprint_signatures, \
    written_outside, judge_footprint   # noqa: E402


def node():
    """The Node on the path, or None. The kit does not install one (kit/bbc/INSTALL.md)."""
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
    """Which jsbeeb tools/bbc holds, as a line that can go into game.json."""
    try:
        v = json.load(open(os.path.join(JSBEEB_DIR, "package.json")))["version"]
        return f"jsbeeb {v} (npm)"
    except (OSError, ValueError, KeyError):
        return "MISSING (run: tools.py get-jsbeeb)"


def server_env():
    """The environment that contains the server: its home directory is tools/bbc-home.

    Node and jsbeeb write nothing to a home directory when they run (measured, kit/bbc/INSTALL.md),
    and HOME and the XDG variables are pointed inside anyway, so that a later release that
    starts to cannot write outside. Node's own fetch, which jsbeeb uses to get a disc from an
    archive, ignores a proxy in the environment unless NODE_USE_ENV_PROXY says to use it."""
    env = dict(os.environ)
    env["HOME"] = HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    if any(env.get(v) for v in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy")):
        env["NODE_USE_ENV_PROXY"] = "1"
    env["KIT_JSBEEB_PORT"] = str(PORT)
    return env


def get_jsbeeb():
    """Install jsbeeb into tools/bbc from npm, the project's own registry entry.

    --omit=optional leaves out electron, electron-builder, electron-store and sharp, which
    jsbeeb lists as optional for its desktop build and its screenshot(); the kit needs none of
    them. The download cache is kept inside tools/bbc while npm runs and deleted after."""
    exe = shutil.which("npm")
    if not exe:
        sys.exit("no npm on the path: jsbeeb is installed with npm, which comes with Node "
                 "(kit/bbc/INSTALL.md, 'What you need first')")
    words = ("jsbeeb", "npm")
    before = footprint_signatures(words)
    cache = os.path.join(BBC_DIR, "npm-cache")
    os.makedirs(BBC_DIR, exist_ok=True)
    print(f"installing jsbeeb {JSBEEB_VERSION} from npm (github.com/mattgodbolt/jsbeeb, GPL-3.0-or-later) into tools/bbc")
    env = dict(os.environ, npm_config_update_notifier="false", npm_config_fund="false", npm_config_audit="false")
    subprocess.run([exe, "install", "--prefix", BBC_DIR, "--cache", cache, "--omit=optional", "--omit=dev",
                    "--no-audit", "--no-fund", f"jsbeeb@{JSBEEB_VERSION}"], check=True, env=env)
    shutil.rmtree(cache, ignore_errors=True)
    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(BBC_DIR) for f in fs)
    print(f"{build()} at tools/bbc, {total / 1048576:.0f} MB; tools/ is gitignored")
    outside = [p for p in written_outside(before, words) if os.path.realpath(p) != os.path.realpath(cache)]
    if outside:
        print("written outside the repository by the install (list them under Uninstall in kit/bbc/INSTALL.md):")
        for p in outside:
            print("  ", p)
    else:
        print("nothing written outside the repository by the install")


def jsbeeb(extra=()):
    exe = node()
    if not exe:
        sys.exit("no node on the path: the BBC Micro's emulator runs under Node (kit/bbc/INSTALL.md, 'What you need first')")
    if not os.path.isfile(os.path.join(JSBEEB_DIR, "package.json")):
        sys.exit("no jsbeeb under tools/bbc; run `python3 kit/scripts/tools.py get-jsbeeb` (kit/bbc/INSTALL.md)")
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    os.makedirs(SNAPSHOTS, exist_ok=True)
    cmd = [exe, SERVER, "--port", str(PORT)] + list(extra)
    log = "jsbeeb.log" if PORT == 6845 else f"jsbeeb-{PORT}.log"
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
    import jsbeeb as client_module
    return client_module


def status():
    running = up(PORT)
    nv = node_version()
    print(f"emulator  :{PORT}  {'up' if running else 'down'}   build: {build()} (tools/bbc)   "
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
            print(f"  machine: {h['model']}   jsbeeb {h['jsbeeb']}   {'running' if s['running'] else 'stopped'} "
                  f"at PC &{s['pc']:04X}   snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "bbc.json")     # its own file: each platform's check writes one
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (the server's own folders are all inside tools/bbc-home)."""
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/bbc/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint():
    """Launch, use and stop the server, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    if up(PORT):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("jsbeeb", "beeb", "npm", "node_modules")
    before = footprint_signatures(words)
    jsbeeb()
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.json.gz")
    shot = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.png")
    with client().connect(port=PORT) as m:
        m.frames(25)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("screenshot written to:", os.path.relpath(m.screenshot(shot)["path"], ROOT))
        print("memory read through the server:", m.read(0x8000, 16, bank=15)[9:14])
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
    """Take `--port N` out of the arguments: it becomes PORT here and KIT_JSBEEB_PORT for every
    script started from here. Returns the rest, and N or None."""
    global PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py jsbeeb --port 6846")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    PORT = n
    os.environ["KIT_JSBEEB_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    a, port = take_port(sys.argv[1:])
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "jsbeeb":
        jsbeeb(a[1:])
    elif a[0] == "stop":
        if any(x not in ("jsbeeb", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [jsbeeb] [--port N]")
        stop(port=port)
    elif a[0] == "get-jsbeeb":
        get_jsbeeb()
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
