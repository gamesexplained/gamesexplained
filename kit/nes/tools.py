#!/usr/bin/env python3
"""The NES launcher: install, start, check and stop jsnes and MesenCE, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `jsnes`,
`get-jsnes`, `mesen` and `get-mesen` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform nes` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/nes/          jsnes from npm (`tools.py get-jsnes`): tools/nes/node_modules/jsnes, the
                      emulator (github.com/bfirsh/jsnes, Apache-2.0), which has no dependencies
                      and ships no game
  tools/nes-home/     the server's home directory (HOME and the XDG folders point here), and
                      the snapshots the kit saves, in tools/nes-home/snapshots
  tools/mesen/        MesenCE (`tools.py get-mesen`), the second emulator (github.com/nesdev-org/
                      MesenCE, GPL-3.0), its official release for this computer, with its
                      settings beside the program (Mesen's portable mode)
  tools/mesen-home/   the Mesen server's home directory, the cartridges sent to it as bytes, and
                      its snapshots, in tools/mesen-home/snapshots
  tools/logs/         the servers' logs, jsnes.log and mesen.log
Deleting the repository removes all of it. See kit/nes/INSTALL.md, "Uninstall".

The emulator is jsnes's machine running inside kit/nes/jsnes_server.mjs, under Node, which
the kit does not install (kit/nes/INSTALL.md). It opens no window and makes no sound: the
screen is read as a PNG (`screenshot`) and the APU as a log of its writes. It starts with no
cartridge; `cartridge` puts the contributor's image in.

MesenCE is the second emulator: kit/nes/mesen_server.py speaks the same protocol on
127.0.0.1:6857 and runs Mesen headless with kit/nes/mesen_bridge.lua inside it
(kit/skills/nes/tool-mesen). A command that names an emulator takes `--emulator mesen`;
without it, it means jsnes.

The jsnes server listens on 127.0.0.1:6855. `--port N` (or KIT_JSNES_PORT) puts it on another
port, for a run that needs more than one machine at once; every command takes it, and
passes it on to the scripts it starts. `stop` stops every server this clone started, and
`stop --port N` only that one.

Usage:
  tools.py status [--port N]
  tools.py jsnes [--port N]                 start it, with no cartridge, waiting on 127.0.0.1:6855, or N
  tools.py stop [jsnes] [--port N]          stop this clone's servers, or the one on N
  tools.py get-jsnes                        install jsnes 2.1.0 from npm into tools/nes
  tools.py mesen [--port N]                 start the MesenCE server, on 127.0.0.1:6857, or N
  tools.py stop mesen [--port N]            stop this clone's MesenCE servers
  tools.py get-mesen                        install MesenCE 2.2.1, its release for this computer, into tools/mesen
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep] [--emulator mesen]   test it against kit/EMULATOR.md (kit/nes/check_emulator.py)
  tools.py verify-footprint [--emulator mesen]          prove it writes nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked: it starts the server, puts in the check's own test cartridge, has it save a snapshot
and a screenshot, reads memory, stops it, and then lists every file outside the repository
that changed meanwhile and looks like it belongs to jsnes, Node or npm. An empty list is the
pass.
"""
import json, os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "jsnes", "stop", "get-jsnes", "mesen", "get-mesen", "snapshots", "check-emulator",
            "verify-footprint")
TOOL_NAMES = ("jsnes", "mesen")   # what `stop` takes

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
MESEN_DIR = os.path.join(TOOLS, "mesen")
MESEN_HOME = os.path.join(TOOLS, "mesen-home")
MESEN_SNAPSHOTS = os.path.join(MESEN_HOME, "snapshots")
MESEN_SERVER = os.path.join(HERE, "mesen_server.py")
MESEN_PORT = int(os.environ.get("KIT_MESEN_PORT") or 6857)
MESEN_VERSION = "2.2.1"   # the release the checks in kit/nes/INSTALL.md were measured on
# Each release file, its size and SHA-256 as GitHub published them for MesenCE 2.2.1
# (github.com/nesdev-org/MesenCE/releases/tag/2.2.1, read on 26 October 2026).
MESEN_RELEASES = {
    ("darwin", "arm64"): ("Mesen_2.2.1_macOS_ARM64_AppleSilicon.zip", 76586217,
                          "9c230cc25ad0bae79fed810c9eeb21c1c507b96b1ce795bbd22ca4331ffb6e48"),
    ("darwin", "x86_64"): ("Mesen_2.2.1_macOS_x64_Intel.zip", 79751571,
                           "804cca46e70b9015898973b5a0a86e679d13f93a89e10813f74e3b7364c9c2d7"),
    ("linux", "x86_64"): ("Mesen_2.2.1_Linux_x64.zip", 39623318,
                          "c88ff4d251b407515c43d3332d641927655cd69fb538996b6a21da4509dbb58f"),
    ("linux", "aarch64"): ("Mesen_2.2.1_Linux_ARM64.zip", 37903116,
                           "5030702ba13d043bf926ee3cc6c6a5d3567e08345e9c50b2df4d4d08b90ead30"),
    ("win32", "amd64"): ("Mesen_2.2.1_Windows.zip", 34259023,
                         "c19e10b3b3865eb0e86e4d01bf09a5027a4452081c04b5bd5b6cbbf76e346fd6"),
}
# Mesen's settings, beside its program so that it runs in its portable mode and keeps every file
# inside tools/mesen. The bridge needs its Lua to open files and a socket, and a callback that
# holds a stopped machine longer than Mesen's one-second limit for a script (ScriptTimeout, in
# seconds; Mesen multiplies it by 1,000 in 32 bits, so it stays below 4,294,967). Both
# controllers are plugged in, and the region is NTSC rather than read from the cartridge.
MESEN_SETTINGS = {
    "Debug": {"ScriptWindow": {"AllowIoOsAccess": True, "AllowNetworkAccess": True, "ScriptTimeout": 4000000}},
    "Nes": {"Region": "Ntsc", "Port1": {"Type": "NesController"}, "Port2": {"Type": "NesController"}},
}

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


# ---- MesenCE ----------------------------------------------------------------------------------

def mesen_executable():
    for p in (os.path.join(MESEN_DIR, "Mesen.app", "Contents", "MacOS", "Mesen"), os.path.join(MESEN_DIR, "Mesen"),
              os.path.join(MESEN_DIR, "Mesen.exe")):
        if os.path.isfile(p):
            return p
    return None


def mesen_build():
    try:
        return f"MesenCE {open(os.path.join(MESEN_DIR, 'VERSION')).read().strip()} (GitHub release)"
    except OSError:
        return "MISSING (run: tools.py get-mesen)"


def get_mesen():
    """Install MesenCE's release for this computer into tools/mesen, from the project's GitHub
    releases, checked against the SHA-256 GitHub published for it.

    Mesen's settings go beside the program (MESEN_SETTINGS), which puts it in its portable mode:
    its settings, saves and the core library it unpacks on start stay in tools/mesen. The
    debugging symbols in the macOS bundle (Mesen.dsym, 290 MB) are deleted: they serve only to
    read a crash report, and Mesen runs the same without them."""
    import hashlib, platform, urllib.request, zipfile
    key = (sys.platform, platform.machine().lower())
    if key not in MESEN_RELEASES:
        sys.exit(f"no MesenCE {MESEN_VERSION} release is listed for {key[0]} on {key[1]} (kit/nes/tools.py, MESEN_RELEASES)")
    name, size, sha = MESEN_RELEASES[key]
    url = f"https://github.com/nesdev-org/MesenCE/releases/download/{MESEN_VERSION}/{name}"
    dl = os.path.join(MESEN_DIR, "download")
    shutil.rmtree(dl, ignore_errors=True)
    os.makedirs(dl)
    zpath = os.path.join(dl, name)
    print(f"downloading MesenCE {MESEN_VERSION} (github.com/nesdev-org/MesenCE, GPL-3.0), {size / 1048576:.0f} MB:\n  {url}")
    with urllib.request.urlopen(url, timeout=60) as r, open(zpath, "wb") as f:
        shutil.copyfileobj(r, f, 1 << 20)
    got = hashlib.sha256(open(zpath, "rb").read()).hexdigest()
    if got != sha:
        shutil.rmtree(dl, ignore_errors=True)
        sys.exit(f"{name}: SHA-256 {got}, where GitHub published {sha}; nothing was installed")
    print(f"SHA-256 matches what GitHub published for it: {sha}")
    for old in ("Mesen.app", "Mesen", "Mesen.exe"):
        p = os.path.join(MESEN_DIR, old)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.exists(p):
            os.remove(p)
    with zipfile.ZipFile(zpath) as z:
        z.extractall(dl)
    inner = os.path.join(dl, "Mesen.app.zip")
    if os.path.exists(inner):
        # the macOS release is a zip holding the app as a zip of its own; ditto keeps the bundle whole
        subprocess.run(["ditto", "-x", "-k", inner, MESEN_DIR], check=True)
        shutil.rmtree(os.path.join(MESEN_DIR, "Mesen.app", "Contents", "MacOS", "Mesen.dsym"), ignore_errors=True)
    else:
        for f in os.listdir(dl):
            if f != name:
                shutil.move(os.path.join(dl, f), os.path.join(MESEN_DIR, f))
    shutil.rmtree(dl, ignore_errors=True)
    exe = mesen_executable()
    if not exe:
        sys.exit(f"the release unpacked into tools/mesen, but no Mesen program is where kit/nes/tools.py looks: {os.listdir(MESEN_DIR)}")
    os.chmod(exe, 0o755)
    with open(os.path.join(os.path.dirname(exe), "settings.json"), "w") as f:
        json.dump(MESEN_SETTINGS, f, indent=1)
    with open(os.path.join(MESEN_DIR, "VERSION"), "w") as f:
        f.write(MESEN_VERSION + "\n")
    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(MESEN_DIR) for f in fs)
    print(f"{mesen_build()} at {os.path.relpath(exe, ROOT)}, {total / 1048576:.0f} MB; tools/ is gitignored")
    if sys.platform != "win32":
        print("Mesen needs SDL2 on macOS and Linux, from outside the kit (kit/nes/INSTALL.md, \"MesenCE\")")


def mesen(extra=()):
    if not mesen_executable():
        sys.exit("no MesenCE under tools/mesen; run `python3 kit/scripts/tools.py get-mesen` (kit/nes/INSTALL.md)")
    detail = foreign_detail(MESEN_PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{MESEN_PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    os.makedirs(MESEN_SNAPSHOTS, exist_ok=True)
    cmd = [sys.executable, MESEN_SERVER, "--port", str(MESEN_PORT)] + list(extra)
    log = "mesen.log" if MESEN_PORT == 6857 else f"mesen-{MESEN_PORT}.log"
    env = dict(os.environ, KIT_MESEN_PORT=str(MESEN_PORT))
    start(cmd, os.path.join(LOGS, log), env=env, cwd=ROOT, port=MESEN_PORT, name="emulator")


# only this clone's servers: the pattern is this clone's own server script, by absolute path
STOP_PATTERN = re.escape(SERVER)
# Mesen runs as a process of its own under the Mesen server, with this clone's bridge script on
# its command line; it is stopped with the server, and on its own if the server died first
MESEN_PATTERNS = (re.escape(MESEN_SERVER), re.escape(os.path.join(HERE, "mesen_bridge.lua")))


def ours(server=SERVER):
    """The ports this clone's running servers listen on, from their command lines."""
    r = subprocess.run(["ps", "-axo", "command="], capture_output=True, text=True)
    found = set()
    for line in r.stdout.splitlines():
        m = re.search(r"--port (\d+)", line)
        if m and server in line and not line.lstrip().startswith(("script", "/usr/bin/script")):
            found.add(int(m.group(1)))
    return sorted(found)


def stop(quiet=False, port=None, which=("jsnes", "mesen")):
    """Stop this clone's servers, or only the one listening on `port`."""
    if "jsnes" in which:
        kill_matching(STOP_PATTERN + (f".*--port {port}( |$)" if port else ""))
    if "mesen" in which:
        kill_matching(MESEN_PATTERNS[0] + (f".*--port {port}( |$)" if port else ""))
        if not port:
            kill_matching(MESEN_PATTERNS[1])
    time.sleep(0.5)
    ports = set()
    if "jsnes" in which:
        ports |= {PORT, *ours()}
    if "mesen" in which:
        ports |= {MESEN_PORT, *ours(MESEN_SERVER)}
    for p in [port] if port else sorted(ports):
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
    last_check(result)
    m_running = up(MESEN_PORT)
    print(f"emulator  :{MESEN_PORT}  {'up' if m_running else 'down'}   build: {mesen_build()} (tools/mesen)")
    if m_running:
        try:
            with client().connect(port=MESEN_PORT, timeout=5) as m:
                s = m.call("status")
            cart = s.get("cartridge") or {}
            print(f"  machine: NES   MesenCE   {'running' if s['running'] else 'stopped'} "
                  f"{'at PC $%04X' % s['pc'] if s['pc'] is not None else 'with no cartridge'}   cartridge: {cart.get('name') or 'none'}   "
                  f"snapshots: {os.path.relpath(MESEN_SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    last_check(os.path.join(LOGS, "check-emulator", "nes-mesen.json"))


def last_check(result):
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (each server's own folders are all inside tools/)."""
    for d in (SNAPSHOTS, MESEN_SNAPSHOTS):
        print(os.path.relpath(d, ROOT))
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            print("  ", f, os.path.getsize(os.path.join(d, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/nes/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint(emulator="jsnes"):
    """Launch, use and stop the server, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    port = MESEN_PORT if emulator == "mesen" else PORT
    if up(port):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("mesen", "dotnet", ".net", "avalonia", "sdl") if emulator == "mesen" else ("jsnes", "npm", "node_modules")
    before = footprint_signatures(words)
    snapdir = MESEN_SNAPSHOTS if emulator == "mesen" else SNAPSHOTS
    if emulator == "mesen":
        mesen()
    else:
        jsnes()
    snap = os.path.join(snapdir, f"footprint_check_{int(t0)}.json.gz")
    shot = os.path.join(snapdir, f"footprint_check_{int(t0)}.png")
    sys.path.insert(0, HERE)
    import check_emulator
    with client().connect(port=port) as m:
        m.cartridge(data=check_emulator.test_cartridge(), name="kit test cartridge")
        m.frames(25)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("screenshot written to:", os.path.relpath(m.screenshot(shot)["path"], ROOT))
        print("memory read through the server:", m.read(0xFFFA, 6).hex())
        m.load(snap)
    stop(quiet=True, port=port, which=(emulator,))   # the server it started, and no other this clone has running
    hits = written_outside(before, words)
    for f in (shot, snap):
        try:
            os.remove(f)
        except OSError:
            pass
    judge_footprint(hits, KNOWN_RESIDUE, snap)


def take_emulator(a):
    """Take `--emulator mesen` (or jsnes) out of the arguments."""
    if "--emulator" not in a:
        return a, "jsnes"
    i = a.index("--emulator")
    e = a[i + 1] if i + 1 < len(a) else ""
    if e not in ("jsnes", "mesen"):
        sys.exit("--emulator takes jsnes or mesen")
    return a[:i] + a[i + 2:], e


def take_port(a, emulator="jsnes"):
    """Take `--port N` out of the arguments: it becomes PORT (MESEN_PORT for Mesen) here and
    KIT_JSNES_PORT (KIT_MESEN_PORT) for every script started from here. Returns the rest, and
    N or None."""
    global PORT, MESEN_PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py jsnes --port 6856")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    if emulator == "mesen":
        MESEN_PORT = n
        os.environ["KIT_MESEN_PORT"] = str(n)
    else:
        PORT = n
        os.environ["KIT_JSNES_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    args = sys.argv[1:]
    a, emulator = take_emulator(args)
    if a and (a[0] == "mesen" or (a[0] == "stop" and "mesen" in a[1:] and "jsnes" not in a[1:])):
        emulator = "mesen"
    a, port = take_port(a, emulator)
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "jsnes":
        jsnes(a[1:])
    elif a[0] == "mesen":
        mesen(a[1:])
    elif a[0] == "stop":
        if any(x not in ("jsnes", "mesen", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [jsnes|mesen] [--port N]")
        named = tuple(x for x in a[1:] if x in ("jsnes", "mesen"))
        stop(port=port, which=named or ("jsnes", "mesen"))
    elif a[0] == "get-jsnes":
        get_jsnes()
    elif a[0] == "get-mesen":
        get_mesen()
    elif a[0] == "snapshots":
        snapshots()
    elif a[0] == "check-emulator":
        extra = ["--emulator", "mesen"] if emulator == "mesen" else []
        sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "check_emulator.py"), *a[1:], *extra]).returncode)
    elif a[0] == "verify-footprint":
        verify_footprint(emulator)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
