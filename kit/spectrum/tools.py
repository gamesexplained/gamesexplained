#!/usr/bin/env python3
"""The ZX Spectrum launcher: start, check and stop ZEsarUX, all inside this repository.

Reached through `python3 kit/scripts/tools.py --platform spectrum`, which picks the
platform; do not run this file directly.

Everything the kit installs lives under tools/ (gitignored):
  tools/zesarux/       the emulator, unpacked from the project's own release (`tools.py
                       get-zesarux download`); zesarux.app on macOS, zesarux elsewhere
  tools/zesarux-home/  everything the emulator would write in a home directory: its
                       .zesaruxrc (HOME is pointed here), any XDG folder it uses, and
                       the snapshots the kit saves
  tools/logs/          terminal logs
  tools/skoolkit/      SkoolKit, the Z80 disassembler and control-file tool (`tools.py
                       get-skoolkit`): a virtual environment with SkoolKit 10.1 from PyPI
                       (skoolkit.ca, open source)
Deleting the repository removes all of it. See kit/spectrum/INSTALL.md, "Uninstall".

ZEsarUX is started with `--vo null --ao null`: a ZX Spectrum screen is not needed to
drive it over ZRCP, and no window opens over whatever the contributor is doing. Pass
`--vo cocoa` (macOS) or `--vo stdout` to watch it.

It is also started with `--stats-disable-check-updates` and
`--stats-disable-check-yesterday-users`: by default ZEsarUX opens two plain-HTTP
connections at start-up, its update check and a "yesterday users" count, and an
undisclosed network call is what the footprint rule does not allow.

Usage:
  tools.py status
  tools.py zesarux [more ZEsarUX options]   start it, ZRCP on 127.0.0.1:10000
  tools.py stop                             stop it (only yours: scoped to this clone)
  tools.py get-zesarux [download [tag]]     the newest release for this machine; plain, it
                                            only says what that is (kit/spectrum/get_zesarux.py)
  tools.py get-skoolkit                     install SkoolKit under tools/skoolkit (PyPI)
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep]          test it against kit/EMULATOR.md (kit/spectrum/check_emulator.py)
  tools.py verify-footprint                 prove it writes nothing outside this repository

Three of those, `snapshots`, `check-emulator` and `verify-footprint`, are not
reached by a bare command: the C64 launcher serves them too, so name the platform
for them (`tools.py --platform spectrum check-emulator`). `zesarux`, `get-zesarux`
and `stop` are unambiguous.

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is
checked: it starts the emulator, has it write a snapshot, reads memory through ZRCP,
stops it, and then lists every file outside the repository that changed meanwhile and
looks like it belongs to ZEsarUX. An empty list is the pass.
"""
import glob, json, os, re, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "zesarux", "stop", "snapshots", "verify-footprint", "check-emulator",
            "get-zesarux", "get-skoolkit")
TOOL_NAMES = ()

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
ZESARUX_DIR = os.path.join(TOOLS, "zesarux")
ZESARUX_HOME = os.path.join(TOOLS, "zesarux-home")
SKOOLKIT_DIR = os.path.join(TOOLS, "skoolkit")
SKOOLKIT_VERSION = ".kit-version"
SNAPSHOTS = os.path.join(ZESARUX_HOME, "snapshots")
LOGS = os.path.join(TOOLS, "logs")
DOWNLOADS = os.path.join(TOOLS, "downloads")
RELEASE_NOTE = ".kit-release"    # written by get-zesarux into a downloaded release: "<tag> <asset>"
PORT = 10000                     # pinned, loopback only: the launcher always uses it, and so does zesarux.py
FRAME_TSTATES = 69888

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import (up, start, port_owner, foreign_detail, missing_libraries,   # noqa: E402
                      kill_matching, footprint_signatures, written_outside, judge_footprint)
import launcher  # noqa: E402


def say_missing(libs):
    return launcher.say_missing(libs, "kit/spectrum/INSTALL.md, 'Linux'")


def app_path():
    """The emulator binary for this machine, or None when nothing is installed."""
    if sys.platform == "darwin":
        p = os.path.join(ZESARUX_DIR, "zesarux.app", "Contents", "MacOS", "zesarux")
    else:
        p = os.path.join(ZESARUX_DIR, "zesarux")
    if os.path.exists(p):
        return p
    found = glob.glob(os.path.join(ZESARUX_DIR, "**", "zesarux"), recursive=True)
    return found[0] if found else None


def build():
    """Which release tools/zesarux is, as a line that can go into game.json."""
    if not app_path():
        return "MISSING"
    try:
        tag, asset = open(os.path.join(ZESARUX_DIR, RELEASE_NOTE)).read().split()[:2]
        return f"release {tag}, {asset}"
    except (OSError, ValueError):
        return "release, version not recorded (unpacked by hand): say which in game.json"


def skoolkit_build():
    """Which SkoolKit tools/skoolkit holds, or None when it is not installed."""
    try:
        return open(os.path.join(SKOOLKIT_DIR, SKOOLKIT_VERSION)).read().strip()
    except OSError:
        return None


def _subdir():
    return "Scripts" if sys.platform.startswith("win") else "bin"


def _dir_size(path):
    total = 0
    for d, _, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(d, f))
            except OSError:
                pass
    return f"{total / 1048576:.0f} MB"


def get_skoolkit():
    """Install SkoolKit into tools/skoolkit, from PyPI (the project's own release)."""
    if not os.path.isdir(SKOOLKIT_DIR):
        print("creating the virtual environment tools/skoolkit")
        subprocess.run([sys.executable, "-m", "venv", SKOOLKIT_DIR], check=True)
    pip = os.path.join(SKOOLKIT_DIR, _subdir(), "pip")
    env = dict(os.environ, PIP_CACHE_DIR=os.path.join(DOWNLOADS, "pip"), PIP_CONFIG_FILE=os.devnull)
    print("installing SkoolKit from PyPI (skoolkit.ca, open source) into tools/skoolkit, nothing else")
    subprocess.run([pip, "install", "--disable-pip-version-check", "--no-cache-dir", "--upgrade", "skoolkit"],
                   check=True, env=env)
    py = os.path.join(SKOOLKIT_DIR, _subdir(), "python")
    v = subprocess.run([py if os.path.exists(py) else sys.executable, "-c",
                        "import importlib.metadata as m; print(m.version('skoolkit'))"],
                       capture_output=True, text=True, check=True).stdout.strip()
    os.makedirs(SKOOLKIT_DIR, exist_ok=True)
    open(os.path.join(SKOOLKIT_DIR, SKOOLKIT_VERSION), "w").write(f"skoolkit {v} (PyPI)")
    print(f"SkoolKit {v} at tools/skoolkit ({_dir_size(SKOOLKIT_DIR)}); "
          "kit/spectrum/skoolkit.py drives it, and tools/ is gitignored")


def emulator_env():
    """The environment that contains ZEsarUX: its home directory is tools/zesarux-home.

    ZEsarUX writes ~/.zesaruxrc on first run (and reads it on every run), so HOME is
    what has to move; the XDG variables are pointed there too for anything that uses
    them, the way the Commodore 64 launcher does."""
    env = dict(os.environ)
    env["HOME"] = ZESARUX_HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(ZESARUX_HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    return env


def zesarux(extra=()):
    exe = app_path()
    if not exe:
        sys.exit(f"no emulator under {os.path.relpath(ZESARUX_DIR, ROOT)}; "
                 "see kit/spectrum/INSTALL.md, 'Get the emulator'")
    libs = missing_libraries(exe)
    if libs:
        sys.exit(say_missing(libs))
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"an emulator started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's")
    os.makedirs(ZESARUX_HOME, exist_ok=True)
    os.makedirs(SNAPSHOTS, exist_ok=True)
    cmd = [os.path.abspath(exe), "--enable-remoteprotocol", "--remoteprotocol-port", str(PORT),
           "--configfile", os.path.join(ZESARUX_HOME, "zesaruxrc"), "--quickexit", "--nosplash",
           "--stats-disable-check-updates", "--stats-disable-check-yesterday-users",
           "--snap-no-change-machine"]
    if not extra:
        cmd += ["--vo", "null", "--ao", "null"]
    start(cmd + list(extra), os.path.join(LOGS, "zesarux.log"), env=emulator_env(),
          cwd=ROOT, port=PORT, name="emulator")


# only this clone's emulator: another clone on the same machine keeps its own.
# The path is written out in full (the launcher starts it by absolute path), so no
# other clone's folder can match.
STOP_PATTERN = re.escape(os.path.abspath(ZESARUX_DIR) + os.sep) + ".*zesarux"


def stop(quiet=False):
    kill_matching(STOP_PATTERN)
    time.sleep(1)
    left = port_owner(PORT) if up(PORT) else None
    if left:      # not ours: the pattern is this clone's absolute path, and a launcher is not the only way in
        print(f"something still answers on :{PORT} and it is not this clone's emulator, so it was left alone:\n  {left}")
    if not quiet:
        status()


def rpc_args():
    """The spectrum client's shape: one port, no arguments to guess."""
    return [sys.executable, os.path.join(HERE, "zesarux.py")]


def client(command, args=None):
    """One ZRCP call through kit/spectrum/zesarux.py, as JSON in and text out."""
    cmd = rpc_args() + [command] + ([json.dumps(args)] if args is not None else [])
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stdout.strip() or r.stderr.strip() or f"zesarux.py {command} failed")
    return r.stdout.strip()


def status():
    running = up(PORT)
    print(f"emulator  :{PORT}  {'up' if running else 'down'}   build: {build()} (tools/zesarux)")
    print(f"skoolkit  tools/skoolkit   {skoolkit_build() or 'MISSING (run: tools.py get-skoolkit)'}")
    detail = foreign_detail(PORT)
    if detail:
        print(f"  WARNING: :{PORT} is answered by an emulator from another folder:\n{detail}")
    if running:
        try:
            sys.path.insert(0, HERE)
            import zesarux as zx
            rpc = zx.connect(port=PORT, timeout=5)
            print(f"  machine: {rpc.machine()}   emulator: ZEsarUX {rpc.version()}   "
                  f"snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
            rpc.close()
        except Exception as e:
            print(f"  ZRCP did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "result.json")
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (the emulator's own folders are all inside tools/zesarux-home)."""
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/spectrum/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint():
    """Launch, use and stop the emulator, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    if up(PORT):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("zesarux", "zsf")
    before = footprint_signatures(words)
    zesarux()
    os.makedirs(SNAPSHOTS, exist_ok=True)
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.sna")
    where = client("snapshot-save", {"path": snap})
    print("snapshot written to:", os.path.relpath(where, ROOT))
    print("memory read through ZRCP:", client("read-memory", {"addr": "4000H", "len": 8})[:32], "...")
    stop(quiet=True)
    hits = written_outside(before, words)
    try:
        os.remove(snap)
    except OSError:
        pass
    judge_footprint(hits, KNOWN_RESIDUE, snap)


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "zesarux":
        zesarux(a[1:])
    elif a[0] == "stop":
        stop()
    elif a[0] == "snapshots":
        snapshots()
    elif a[0] == "verify-footprint":
        verify_footprint()
    elif a[0] == "check-emulator":
        sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "check_emulator.py"), *a[1:]]).returncode)
    elif a[0] == "get-zesarux":
        sys.exit(subprocess.run([sys.executable, os.path.join(HERE, "get_zesarux.py"), *a[1:]]).returncode)
    elif a[0] == "get-skoolkit":
        get_skoolkit()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
