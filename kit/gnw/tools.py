#!/usr/bin/env python3
"""The Game & Watch launcher: the kit's machine server and MAME, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `gnw`, `mame` and
`get-mame` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform gnw` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/gnw/mame-src/    MAME's source at the tagged release (github.com/mamedev/mame,
                         GPL-2.0-or-later), built with only the Game & Watch driver: the program
                         is tools/gnw/mame-src/gnw, about 73 MB; the build's objects stay there
  tools/gnw/Frameworks/  SDL3's macOS framework (github.com/libsdl-org/SDL, zlib licence),
                         from the project's own release disk image, which MAME links against
  tools/gnw/home/        MAME's working folder: its cfg/, nvram/ and snap/ land here
  tools/gnw-home/        the kit's server's snapshots, tools/gnw-home/snapshots
  tools/downloads/       the two downloads, kept so that a rebuild needs no network
  tools/logs/            the server's log, gnw.log
Deleting the repository removes all of it. See kit/gnw/INSTALL.md, "Uninstall".

The machine the kit drives is its own SM5A (kit/gnw/sm5a.js) inside kit/gnw/gnw_server.mjs,
under Node, which the kit does not install (kit/gnw/INSTALL.md). It opens no window and makes
no sound. MAME is the second machine: kit/gnw/check_machine.js holds the kit's to it, and
`tools.py mame` shows a ROM set in a window, with sound, for a person to play.

The server listens on 127.0.0.1:6858. `--port N` (or KIT_GNW_PORT) puts it on another port.

Usage:
  tools.py status [--port N]
  tools.py gnw [--port N]                start the server; it waits for a ROM (`rom` in tool-gnw-server)
  tools.py stop [gnw] [--port N]         stop this clone's servers, or the one on N
  tools.py get-mame                      download MAME's source and SDL3, and build MAME's Game & Watch driver
  tools.py mame <set.zip> [mame options] run a ROM set in MAME, in a window
  tools.py snapshots                     where snapshots land, and what is there
  tools.py check-emulator [--keep]       test the server against kit/EMULATOR.md (kit/gnw/check_emulator.py)
  tools.py verify-footprint              prove the server and MAME write nothing outside this repository
"""
import hashlib, json, os, platform, re, shutil, subprocess, sys, time, urllib.request

COMMANDS = ("status", "gnw", "stop", "get-mame", "mame", "snapshots", "check-emulator", "verify-footprint")
TOOL_NAMES = ("gnw",)   # what `stop` takes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
GNW_DIR = os.path.join(TOOLS, "gnw")
MAME_SRC = os.path.join(GNW_DIR, "mame-src")
MAME_EXE = os.path.join(MAME_SRC, "gnw")
FRAMEWORKS = os.path.join(GNW_DIR, "Frameworks")
MAME_HOME = os.path.join(GNW_DIR, "home")
HOME = os.path.join(TOOLS, "gnw-home")
SNAPSHOTS = os.path.join(HOME, "snapshots")
DOWNLOADS = os.path.join(TOOLS, "downloads")
LOGS = os.path.join(TOOLS, "logs")
SERVER = os.path.join(HERE, "gnw_server.mjs")
PORT = int(os.environ.get("KIT_GNW_PORT") or 6858)

# the releases the checks in kit/gnw/INSTALL.md were measured on, with their SHA-256
MAME_TAG = "mame0289"
MAME_URL = f"https://codeload.github.com/mamedev/mame/tar.gz/refs/tags/{MAME_TAG}"
MAME_SHA256 = "0929cc749afabcef892900e10dd90bd8b05f94a7dde8f367ac6a5d2082589f84"
SDL_VERSION = "3.4.18"
SDL_URL = f"https://github.com/libsdl-org/SDL/releases/download/release-{SDL_VERSION}/SDL3-{SDL_VERSION}.dmg"
SDL_SHA256 = "c1adf3da91108dbc3e4205da5dacebc203085d283fa89e86eb2c889abd03a853"
DRIVER = "src/mame/handheld/hh_sm510.cpp"

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import up, start, port_owner, foreign_detail, kill_matching, footprint_signatures, \
    written_outside, judge_footprint   # noqa: E402


def node():
    return shutil.which("node")


def build():
    """Which MAME tools/gnw holds, as a line that can go into game.json."""
    if os.path.exists(MAME_EXE):
        return f"MAME 0.{MAME_TAG[4:]}, built from source with only {DRIVER} (tools/gnw)"
    return "MISSING (run: tools.py get-mame)"


def fetch(url, dest, sha256):
    """Download url to dest, unless dest is already there with the right SHA-256."""
    if os.path.exists(dest) and hashlib.sha256(open(dest, "rb").read()).hexdigest() == sha256:
        print(f"have {os.path.relpath(dest, ROOT)}")
        return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"downloading {url}")
    tmp = dest + ".part"
    with urllib.request.urlopen(url) as r, open(tmp, "wb") as f:
        shutil.copyfileobj(r, f)
    got = hashlib.sha256(open(tmp, "rb").read()).hexdigest()
    if got != sha256:
        os.remove(tmp)
        sys.exit(f"{url}: SHA-256 {got}, want {sha256}; nothing was installed")
    os.replace(tmp, dest)


def get_mame():
    """Download MAME's source and (on macOS) SDL3, and build MAME with the Game & Watch driver alone.

    A whole MAME takes an hour and 10 GB to build; one driver takes about ten minutes. The build
    needs a C++ compiler (Xcode's command line tools on macOS) and Python 3, and on Linux SDL3's
    development package, which is outside this repository: the install notes say which."""
    words = ("mame", "sdl")
    before = footprint_signatures(words)
    tarball = os.path.join(DOWNLOADS, f"{MAME_TAG}.tar.gz")
    fetch(MAME_URL, tarball, MAME_SHA256)
    if sys.platform == "darwin":
        dmg = os.path.join(DOWNLOADS, f"SDL3-{SDL_VERSION}.dmg")
        fetch(SDL_URL, dmg, SDL_SHA256)
        if not os.path.isdir(os.path.join(FRAMEWORKS, "SDL3.framework")):
            mnt = os.path.join(GNW_DIR, "dmg")
            os.makedirs(mnt, exist_ok=True)
            subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mnt, dmg], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                os.makedirs(FRAMEWORKS, exist_ok=True)
                subprocess.run(["ditto", os.path.join(mnt, "SDL3.xcframework", "macos-arm64_x86_64", "SDL3.framework"),
                                os.path.join(FRAMEWORKS, "SDL3.framework")], check=True)
                shutil.copy(os.path.join(mnt, "LICENSE.txt"), os.path.join(FRAMEWORKS, "SDL3-LICENSE.txt"))
            finally:
                subprocess.run(["hdiutil", "detach", mnt], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                os.rmdir(mnt)
    if not os.path.isdir(MAME_SRC):
        print("unpacking MAME's source into tools/gnw/mame-src")
        subprocess.run(["tar", "-xzf", tarball, "-C", GNW_DIR], check=True)
        os.replace(os.path.join(GNW_DIR, f"mame-{MAME_TAG}"), MAME_SRC)
    cmd = ["make", "SUBTARGET=gnw", f"SOURCES={DRIVER}", "NOWERROR=1", f"-j{os.cpu_count() or 4}"]
    if sys.platform == "darwin":
        cmd.append(f"SDL_FRAMEWORK_PATH={FRAMEWORKS}/")
    log = os.path.join(LOGS, "mame-build.log")
    os.makedirs(LOGS, exist_ok=True)
    print(f"building MAME's Game & Watch driver ({' '.join(cmd[1:3])}); about ten minutes; log: {os.path.relpath(log, ROOT)}")
    env = dict(os.environ, HOME=MAME_HOME)
    with open(log, "w") as f:
        r = subprocess.run(cmd, cwd=MAME_SRC, stdout=f, stderr=subprocess.STDOUT, env=env)
    if r.returncode or not os.path.exists(MAME_EXE):
        sys.exit(f"the build failed: the end of {os.path.relpath(log, ROOT)} says why")
    print(f"{build()}: {os.path.getsize(MAME_EXE) / 1048576:.0f} MB")
    outside = written_outside(before, words)
    print("written outside the repository by the install:" if outside else "nothing written outside the repository by the install")
    for p in outside:
        print("  ", p)


def mame_env():
    env = dict(os.environ, HOME=MAME_HOME)
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"), ("XDG_CACHE_HOME", "cache"),
                     ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(MAME_HOME, sub)
    return env


def mame_args(zip_path):
    """MAME's arguments to run a ROM set: the set's name is the zip's, and its folder the rompath."""
    name = os.path.splitext(os.path.basename(zip_path))[0]
    return [name, "-rompath", os.path.dirname(os.path.abspath(zip_path)), "-skip_gameinfo", "-nowriteconfig"]


def mame(a):
    if not os.path.exists(MAME_EXE):
        sys.exit("no MAME under tools/gnw; run `python3 kit/scripts/tools.py get-mame` (kit/gnw/INSTALL.md)")
    if not a or not os.path.exists(a[0]):
        sys.exit("usage: tools.py mame <set.zip> [mame options]: the ROM set, as MAME names it (work/<set>.zip)")
    os.makedirs(MAME_HOME, exist_ok=True)
    sys.exit(subprocess.run([MAME_EXE] + mame_args(a[0]) + a[1:], cwd=MAME_HOME, env=mame_env()).returncode)


def gnw():
    exe = node()
    if not exe:
        sys.exit("no node on the path: the kit's Game & Watch server runs under Node (kit/gnw/INSTALL.md)")
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    os.makedirs(SNAPSHOTS, exist_ok=True)
    log = "gnw.log" if PORT == 6858 else f"gnw-{PORT}.log"
    env = dict(os.environ, HOME=HOME, KIT_GNW_PORT=str(PORT))
    start([exe, SERVER, "--port", str(PORT)], os.path.join(LOGS, log), env=env, cwd=ROOT, port=PORT, name="gnw server")


STOP_PATTERN = re.escape(SERVER)


def ours():
    r = subprocess.run(["ps", "-axo", "command="], capture_output=True, text=True)
    found = set()
    for line in r.stdout.splitlines():
        m = re.search(r"--port (\d+)", line)
        if m and SERVER in line and not line.lstrip().startswith(("script", "/usr/bin/script")):
            found.add(int(m.group(1)))
    return sorted(found)


def stop(quiet=False, port=None):
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
    import gnw as client_module
    return client_module


def status():
    running = up(PORT)
    nv = None
    if node():
        nv = subprocess.run([node(), "--version"], capture_output=True, text=True).stdout.strip()
    print(f"gnw server  :{PORT}  {'up' if running else 'down'}   node: {nv or 'MISSING'}")
    print(f"MAME        {build()}")
    others = [p for p in ours() if p != PORT]
    if others:
        print(f"  this clone's servers also answer on: {', '.join(f':{p}' for p in others)}")
    detail = foreign_detail(PORT)
    if detail:
        print(f"  WARNING: :{PORT} is answered by a server from another folder:\n{detail}")
    if running:
        try:
            with client().connect(port=PORT, timeout=5) as m:
                s = m.status()
            rom = s.get("rom") or {}
            print(f"  ROM: {rom.get('file', 'none')}   {'running' if s['running'] else 'stopped'}"
                  + (f" at {s['at']}, cycle {s['cycles']:,}" if "at" in s else "")
                  + f"   snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "gnw.json")
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['when']}: {len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


KNOWN_RESIDUE = ()


def verify_footprint():
    """Start the server and MAME, use them, stop them, and look for anything left outside the repository."""
    if up(PORT):
        sys.exit("stop the server first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("gnw", "mame", "sdl", "node")
    before = footprint_signatures(words)
    gnw()
    t0 = int(time.time())
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{t0}.gnw.json.gz")
    sys.path.insert(0, HERE)
    from check_emulator import test_rom   # noqa: E402
    rom = test_rom()
    with client().connect(port=PORT) as m:
        m.rom(rom)
        m.run(seconds=1)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("memory read through the server:", m.read("data", 0, 8).hex())
        m.load(snap)
    stop(quiet=True, port=PORT)
    if os.path.exists(MAME_EXE):
        from check_emulator import mame_set   # noqa: E402
        zip_path = mame_set(rom)
        subprocess.run([MAME_EXE] + mame_args(zip_path) + ["-video", "none", "-sound", "none", "-seconds_to_run", "2"],
                       cwd=MAME_HOME, env=mame_env(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("MAME ran the test program for two seconds of its time")
    else:
        print("no MAME under tools/gnw: only the server was checked")
    hits = written_outside(before, words)
    try:
        os.remove(snap)
    except OSError:
        pass
    judge_footprint(hits, KNOWN_RESIDUE, snap, covered="the server" + (" and MAME" if os.path.exists(MAME_EXE) else ""))


def take_port(a):
    global PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py gnw --port 6859")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    PORT = n
    os.environ["KIT_GNW_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    a, port = take_port(sys.argv[1:])
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "gnw":
        gnw()
    elif a[0] == "stop":
        if any(x not in ("gnw", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [gnw] [--port N]")
        stop(port=port)
    elif a[0] == "get-mame":
        get_mame()
    elif a[0] == "mame":
        mame(a[1:])
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
