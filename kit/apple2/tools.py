#!/usr/bin/env python3
"""The Apple II launcher: install, build, start, check and stop the kit's Apple2TS server, all
inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `apple2ts` and
`get-apple2ts` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform apple2` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/apple2/apple2ts/       the source of Apple2TS 3.7.0 (github.com/ct6502/apple2ts, MIT), the
                               release's src/ folder only, cloned with git: the emulator, with
                               the Apple IIe's ROMs, which Apple2TS keeps in its source
  tools/apple2/esbuild/        esbuild 0.25.12 from npm (MIT), which bundles the server
  tools/apple2/apple2ts-server.cjs  the server: kit/apple2/apple2ts_server.mjs and Apple2TS's
                               machine in one script. It holds the ROMs, so it is never committed
  tools/apple2-home/           the server's home directory (HOME and the XDG folders point here),
                               and the snapshots the kit saves, in tools/apple2-home/snapshots
  tools/logs/                  the server's log, apple2ts.log
Deleting the repository removes all of it. See kit/apple2/INSTALL.md, "Uninstall".

The server runs under Node, which the kit does not install (kit/apple2/INSTALL.md). It opens no
window and makes no sound: the screen is drawn from video memory (`screenshot`, by
kit/apple2/screen.py) and the sound is a log of the speaker's clicks and the Mockingboard's
writes. The launcher builds the server again by itself when the kit's server files change.

The server listens on 127.0.0.1:6502. `--port N` (or KIT_APPLE2TS_PORT) puts it on another port,
for a run that needs more than one machine at once; every command takes it, and passes it on to
the scripts it starts. `stop` stops every server this clone started, and `stop --port N` only
that one.

Usage:
  tools.py status [--port N]
  tools.py apple2ts [--port N]              start it: a 128K enhanced Apple IIe, powered on with no
                                            disk, waiting on 127.0.0.1:6502, or N
  tools.py stop [apple2ts] [--port N]       stop this clone's servers, or the one on N
  tools.py get-apple2ts                     clone Apple2TS 3.7.0's source and install esbuild into
                                            tools/apple2, then build the server
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep]          test it against kit/EMULATOR.md (kit/apple2/check_emulator.py)
  tools.py verify-footprint                 prove it writes nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is checked: it
starts the server, has it save a snapshot, draws a screenshot, reads memory, stops it, and then
lists every file outside the repository that changed meanwhile and looks like it belongs to
Apple2TS, Node or npm. An empty list is the pass.
"""
import hashlib, json, os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "apple2ts", "stop", "get-apple2ts", "snapshots", "check-emulator", "verify-footprint")
TOOL_NAMES = ("apple2ts",)   # what `stop` takes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
APPLE2_DIR = os.path.join(TOOLS, "apple2")
CHECKOUT = os.path.join(APPLE2_DIR, "apple2ts")
ESBUILD_DIR = os.path.join(APPLE2_DIR, "esbuild")
BUNDLE = os.path.join(APPLE2_DIR, "apple2ts-server.cjs")
HOME = os.path.join(TOOLS, "apple2-home")
SNAPSHOTS = os.path.join(HOME, "snapshots")
LOGS = os.path.join(TOOLS, "logs")
BUILDER = os.path.join(HERE, "apple2ts_build.mjs")
KIT_SOURCES = ("apple2ts_build.mjs", "apple2ts_clock.mjs", "apple2ts_server.mjs")   # what the bundle is built from
APPLE2TS_REPO = "https://github.com/ct6502/apple2ts.git"
APPLE2TS_VERSION = "3.7.0"     # the release the checks in kit/apple2/INSTALL.md were measured on
APPLE2TS_COMMIT = "c900979bb7cfdcbec193b2ae21760d8da9cda548"   # its tag, v3.7.0
ESBUILD_VERSION = "0.25.12"
PORT = int(os.environ.get("KIT_APPLE2TS_PORT") or 6502)   # loopback only; `--port N` in main() sets both

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import up, start, port_owner, foreign_detail, kill_matching, footprint_signatures, \
    written_outside, judge_footprint   # noqa: E402


def node():
    """The Node on the path, or None. The kit does not install one (kit/apple2/INSTALL.md)."""
    return shutil.which("node")


def node_version():
    exe = node()
    if not exe:
        return None
    try:
        return subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def stamp():
    """What the bundle is built from: the Apple2TS release, and a digest of the kit's server files."""
    h = hashlib.sha256()
    for name in KIT_SOURCES:
        h.update(name.encode() + b"\0" + open(os.path.join(HERE, name), "rb").read() + b"\0")
    return f"apple2ts-{APPLE2TS_VERSION} {APPLE2TS_COMMIT[:7]} kit-{h.hexdigest()[:16]}"


def bundle_stamp():
    """The stamp on the bundle's first line, or None when there is no bundle."""
    try:
        with open(BUNDLE, encoding="utf-8") as f:
            first = f.readline()
    except OSError:
        return None
    m = re.match(r"// kit Apple2TS server (.*)$", first.rstrip("\n"))
    return m.group(1) if m else ""


def checkout_commit():
    try:
        return subprocess.run(["git", "-C", CHECKOUT, "rev-parse", "HEAD"], capture_output=True, text=True,
                              timeout=20).stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def build():
    """Which Apple2TS the server holds, as a line that can go into game.json."""
    if not os.path.isfile(BUNDLE):
        return "MISSING (run: tools.py get-apple2ts)"
    s = bundle_stamp()
    if s != stamp():
        return f"Apple2TS {APPLE2TS_VERSION} (git {APPLE2TS_COMMIT[:7]}), the kit's server: OUT OF DATE (rebuilt on the next start)"
    return f"Apple2TS {APPLE2TS_VERSION} (git {APPLE2TS_COMMIT[:7]}), in the kit's server"


def environment(home=HOME):
    """The environment that contains the server: its home directory is tools/apple2-home.

    Node and Apple2TS's machine write nothing to a home directory (measured, kit/apple2/INSTALL.md);
    HOME and the XDG variables point inside anyway, so that a later release that starts to cannot
    write outside."""
    env = dict(os.environ)
    env["HOME"] = home
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(home, sub)
        os.makedirs(env[var], exist_ok=True)
    env["KIT_APPLE2TS_PORT"] = str(PORT)
    return env


def build_server():
    """Bundle the kit's server files with Apple2TS's source (kit/apple2/apple2ts_build.mjs)."""
    exe = node()
    if not exe:
        sys.exit("no node on the path: the Apple II's emulator runs under Node (kit/apple2/INSTALL.md, 'What you need first')")
    if not os.path.isdir(os.path.join(CHECKOUT, "src")) or not os.path.isdir(os.path.join(ESBUILD_DIR, "node_modules", "esbuild")):
        sys.exit("no Apple2TS source or esbuild under tools/apple2; run `python3 kit/scripts/tools.py get-apple2ts` "
                 "(kit/apple2/INSTALL.md)")
    s = stamp()
    r = subprocess.run([exe, BUILDER, "--apple2ts", CHECKOUT, "--esbuild", ESBUILD_DIR, "--out", BUNDLE, "--stamp", s],
                       cwd=ROOT, env=environment(), capture_output=True, text=True)
    if r.returncode or bundle_stamp() != s:
        sys.exit(f"the server did not build:\n{r.stdout}{r.stderr}")
    print(f"built tools/apple2/apple2ts-server.cjs ({os.path.getsize(BUNDLE) // 1024} KB) from Apple2TS "
          f"{APPLE2TS_VERSION} and kit/apple2/{', '.join(KIT_SOURCES)}")


def get_apple2ts():
    """Clone Apple2TS's source at its release tag and install esbuild, both into tools/apple2, then
    build the server.

    The clone is shallow and sparse: one commit, and only the files of src/ (some 9 MB with git's
    own), so that none of the web page's disks and pictures is downloaded. esbuild comes from npm,
    the project's own registry entry, with npm's cache kept inside tools/apple2 while npm runs and
    deleted after."""
    git, npm = shutil.which("git"), shutil.which("npm")
    if not git:
        sys.exit("no git on the path: Apple2TS's source is cloned with git (kit/apple2/INSTALL.md, 'What you need first')")
    if not npm:
        sys.exit("no npm on the path: esbuild is installed with npm, which comes with Node "
                 "(kit/apple2/INSTALL.md, 'What you need first')")
    words = ("apple2ts", "esbuild", "npm")
    before = footprint_signatures(words)
    os.makedirs(APPLE2_DIR, exist_ok=True)
    if checkout_commit() != APPLE2TS_COMMIT:
        shutil.rmtree(CHECKOUT, ignore_errors=True)
        print(f"cloning Apple2TS {APPLE2TS_VERSION} (github.com/ct6502/apple2ts, MIT), its src/ only, into tools/apple2/apple2ts")
        env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
        subprocess.run([git, "-c", "advice.detachedHead=false", "clone", "--quiet", "--depth", "1", "--branch", f"v{APPLE2TS_VERSION}", "--filter=blob:none",
                        "--sparse", APPLE2TS_REPO, CHECKOUT], check=True, env=env)
        subprocess.run([git, "-C", CHECKOUT, "sparse-checkout", "set", "src"], check=True, env=env)
        got = checkout_commit()
        if got != APPLE2TS_COMMIT:
            shutil.rmtree(CHECKOUT, ignore_errors=True)
            sys.exit(f"the tag v{APPLE2TS_VERSION} is commit {got}, not {APPLE2TS_COMMIT}: the release has moved, so "
                     "the kit's checks do not cover it. Say so in kit-feedback.md.")
    cache = os.path.join(APPLE2_DIR, "npm-cache")
    print(f"installing esbuild {ESBUILD_VERSION} from npm (github.com/evanw/esbuild, MIT) into tools/apple2/esbuild")
    env = dict(os.environ, npm_config_update_notifier="false", npm_config_fund="false", npm_config_audit="false")
    subprocess.run([npm, "install", "--prefix", ESBUILD_DIR, "--cache", cache, "--omit=dev", "--no-audit",
                    "--no-fund", "--no-save", f"esbuild@{ESBUILD_VERSION}"], check=True, env=env)
    shutil.rmtree(cache, ignore_errors=True)
    build_server()
    seen = {}
    for d, _, fs in os.walk(APPLE2_DIR):
        for f in fs:
            st = os.lstat(os.path.join(d, f))
            seen[(st.st_dev, st.st_ino)] = st.st_size     # npm links esbuild's binary in twice
    total = sum(seen.values())
    print(f"{build()} at tools/apple2, {total / 1048576:.0f} MB; tools/ is gitignored")
    outside = [p for p in written_outside(before, words) if os.path.realpath(p) != os.path.realpath(cache)]
    if outside:
        print("written outside the repository by the install (list them under Uninstall in kit/apple2/INSTALL.md):")
        for p in outside:
            print("  ", p)
    else:
        print("nothing written outside the repository by the install")


def apple2ts(extra=()):
    exe = node()
    if not exe:
        sys.exit("no node on the path: the Apple II's emulator runs under Node (kit/apple2/INSTALL.md, 'What you need first')")
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    if up(PORT):
        print(f"emulator already answering on :{PORT}")
        return
    if bundle_stamp() != stamp():
        build_server()
    os.makedirs(SNAPSHOTS, exist_ok=True)
    cmd = [exe, BUNDLE, "--port", str(PORT), "--root", ROOT] + list(extra)
    log = "apple2ts.log" if PORT == 6502 else f"apple2ts-{PORT}.log"
    start(cmd, os.path.join(LOGS, log), env=environment(), cwd=ROOT, port=PORT, name="emulator")


# only this clone's servers: the pattern is this clone's own bundle, by absolute path
STOP_PATTERN = re.escape(BUNDLE)


def ours():
    """The ports this clone's running servers listen on, from their command lines."""
    r = subprocess.run(["ps", "-axo", "command="], capture_output=True, text=True)
    found = set()
    for line in r.stdout.splitlines():
        m = re.search(r"--port (\d+)", line)
        if m and BUNDLE in line and not line.lstrip().startswith(("script", "/usr/bin/script")):
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
    import apple2ts as client_module
    return client_module


def status():
    running = up(PORT)
    nv = node_version()
    print(f"emulator  :{PORT}  {'up' if running else 'down'}   build: {build()} (tools/apple2)   "
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
            print(f"  machine: {h['model']}   Apple2TS {h['apple2ts']}   {'running' if s['running'] else 'stopped'} "
                  f"at PC ${s['pc']:04X}   snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "apple2.json")     # its own file: each platform's check writes one
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (the server's own folders are all inside tools/apple2-home)."""
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/apple2/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint():
    """Launch, use and stop the server, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    if up(PORT):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("apple2", "esbuild", "npm", "node_modules")
    before = footprint_signatures(words)
    apple2ts()
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.json")
    shot = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.png")
    with client().connect(port=PORT) as m:
        m.frames(60)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("screenshot written to:", os.path.relpath(m.screenshot(shot)["path"], ROOT))
        print("memory read through the server:", m.read(0xFBB3, 1, space="rom").hex())
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
    """Take `--port N` out of the arguments: it becomes PORT here and KIT_APPLE2TS_PORT for every
    script started from here. Returns the rest, and N or None."""
    global PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py apple2ts --port 6503")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    PORT = n
    os.environ["KIT_APPLE2TS_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    a, port = take_port(sys.argv[1:])
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "apple2ts":
        apple2ts(a[1:])
    elif a[0] == "stop":
        if any(x not in ("apple2ts", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [apple2ts] [--port N]")
        stop(port=port)
    elif a[0] == "get-apple2ts":
        get_apple2ts()
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
