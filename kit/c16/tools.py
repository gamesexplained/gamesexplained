#!/usr/bin/env python3
"""The Commodore 16 and Plus/4 launcher: get, build, start, check and stop the kit's plus4emu
server, all inside this repository.

Reached through `python3 kit/scripts/tools.py`, which picks the platform: `plus4emu` and
`get-plus4emu` are this launcher's alone; `status`, `stop`, `snapshots`, `check-emulator` and
`verify-footprint` need `--platform c16` when another platform has a launcher too.

Everything the kit installs lives under tools/ (gitignored):
  tools/c16/plus4emu/      plus4emu's source at git 939e652 (github.com/istvan-v/plus4emu, GPL v2),
                           one commit fetched with git, with kit/c16/codemap.patch applied. Its
                           roms/ folder holds the machine's ROMs, which the server loads from there
  tools/c16/build/         the compiled sources, and tools/c16/lib/ the library built from them:
                           plus4emu's machine without its window, its sound or its menus
  tools/c16-home/          the server's home directory (HOME and the XDG folders point here), its
                           rolling snapshots in tools/c16-home/tmp, and the snapshots the kit
                           saves, in tools/c16-home/snapshots
  tools/logs/              the server's log, plus4emu.log
Deleting the repository removes all of it. See kit/c16/INSTALL.md, "Uninstall".

The library is compiled here, with the computer's own C++ compiler, which the kit does not install
(kit/c16/INSTALL.md, "What you need first"). plus4emu reads a tape kept as a sound file (WAV) through
libsndfile: when the compiler finds libsndfile, the library uses it, and when it does not (or
KIT_PLUS4EMU_NO_SNDFILE=1 is set), the library is built against kit/c16/sndfile/sndfile.h, which
opens no sound file, and reads every other tape as before. The server runs the library from
Python with ctypes: it opens no window and makes no sound. A screenshot is drawn from TED's own
output and the sound is a log of TED's sound registers.

The server listens on 127.0.0.1:7501. `--port N` (or KIT_PLUS4EMU_PORT) puts it on another port,
for a run that needs more than one machine at once; every command takes it, and passes it on to
the scripts it starts. `--model plus4pal` starts a Plus/4 (64 KB, its function ROMs) in place of
the C16 (16 KB). `stop` stops every server this clone started, and `stop --port N` only that one.

Usage:
  tools.py status [--port N]
  tools.py plus4emu [--port N] [--model c16pal|plus4pal]
                                            start it: a PAL C16 (or Plus/4), powered on with no
                                            tape or disk, waiting on 127.0.0.1:7501, or N
  tools.py stop [plus4emu] [--port N]       stop this clone's servers, or the one on N
  tools.py get-plus4emu                     fetch plus4emu's source into tools/c16, patch it and
                                            build its library
  tools.py snapshots                        where snapshots land, and what is there
  tools.py check-emulator [--keep]          test it against kit/EMULATOR.md (kit/c16/check_emulator.py)
  tools.py verify-footprint                 prove it writes nothing outside this repository

verify-footprint is how the clean-footprint principle (AGENTS.md, kit/INSTALL.md) is checked: it
starts the server, has it save a snapshot, take a screenshot and read memory, stops it, and then
lists every file outside the repository that changed meanwhile and looks like it belongs to
plus4emu. An empty list is the pass.
"""
import concurrent.futures, hashlib, json, os, re, shutil, subprocess, sys, time

# What this launcher serves, read by the dispatcher (kit/scripts/tools.py) when several
# platforms have a launcher. Keep in step with main() below.
COMMANDS = ("status", "plus4emu", "stop", "get-plus4emu", "snapshots", "check-emulator", "verify-footprint")
TOOL_NAMES = ("plus4emu",)   # what `stop` takes

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
C16_DIR = os.path.join(TOOLS, "c16")
CHECKOUT = os.path.join(C16_DIR, "plus4emu")
OBJ = os.path.join(C16_DIR, "build")
LIBDIR = os.path.join(C16_DIR, "lib")
LIB = os.path.join(LIBDIR, "libplus4emu.dylib" if sys.platform == "darwin" else "libplus4emu.so")
STAMP = os.path.join(LIBDIR, "build.json")
ROMS = os.path.join(CHECKOUT, "roms")
HOME = os.path.join(TOOLS, "c16-home")
SNAPSHOTS = os.path.join(HOME, "snapshots")
LOGS = os.path.join(TOOLS, "logs")
SERVER = os.path.join(HERE, "p4emu_server.py")
PATCH = os.path.join(HERE, "codemap.patch")
SNDFILE_STUB = os.path.join(HERE, "sndfile")    # its sndfile.h, for a computer without libsndfile
PLUS4EMU_REPO = "https://github.com/istvan-v/plus4emu.git"
PLUS4EMU_VERSION = "1.2.11"    # the version its NEWS file names at this commit
PLUS4EMU_COMMIT = "939e65233b227a47e5523eca149de8247176e28f"   # 2 April 2020, the newest on 19 October 2026
PORT = int(os.environ.get("KIT_PLUS4EMU_PORT") or 7501)   # loopback only; `--port N` in main() sets both
MODELS = ("c16pal", "plus4pal")

# The library's sources and flags: plus4emu's SConstruct for its C library on Linux, with the
# four files of its GUI library that the C library also calls (character conversion and the
# snapshot compression), built with a C++ compiler alone: no SCons, FLTK, SDL or PortAudio.
SOURCES = """src/cpu.cpp src/cpuoptbl.cpp src/memory.cpp src/render.cpp src/ted_api.cpp src/ted_init.cpp
 src/ted_main.cpp src/ted_read.cpp src/ted_snd.cpp src/ted_write.cpp src/vc1541.cpp src/vc1551.cpp src/vc1581.cpp
 src/via6522.cpp src/plus4vm.cpp src/vm.cpp src/acia6551.cpp src/bplist.cpp src/cia8520.cpp src/d64image.cpp
 src/disasm.cpp src/display.cpp src/dotconf.c src/fileio.cpp src/iecdrive.cpp src/mps801.cpp src/riot6532.cpp
 src/snd_conv.cpp src/soundio.cpp src/system.cpp src/tape.cpp src/vc1526.cpp src/videorec.cpp src/wd177x.cpp
 resid/dac.cpp resid/envelope.cpp resid/extfilt.cpp resid/filter.cpp resid/pot.cpp resid/sid.cpp resid/version.cpp
 resid/voice.cpp resid/wave.cpp plus4lib/plus4api.cpp src/charconv.cpp src/compress.cpp src/comprlib.cpp
 src/decompm2.cpp""".split()
FLAGS = ["-Wall", "-O3", "-fno-inline-functions", "-fomit-frame-pointer", "-ffast-math", "-fPIC",
         "-fvisibility=hidden", "-DHAVE_STDINT_H", "-I.", "-Isrc", "-Iresid", "-Iplus4lib"]

sys.path.append(os.path.join(os.path.dirname(HERE), "scripts"))
from launcher import up, start, port_owner, foreign_detail, kill_matching, footprint_signatures, \
    written_outside, judge_footprint   # noqa: E402


def compilers():
    """(C++, C) compilers on the path, or None for one that is missing."""
    cxx = os.environ.get("CXX") or shutil.which("g++") or shutil.which("c++") or shutil.which("clang++")
    cc = os.environ.get("CC") or shutil.which("gcc") or shutil.which("cc") or shutil.which("clang")
    return cxx, cc


def sndfile_found(cxx):
    """True when the compiler finds libsndfile's header and library: a one-line program that
    calls it compiles and links. KIT_PLUS4EMU_NO_SNDFILE=1 answers False without trying."""
    if os.environ.get("KIT_PLUS4EMU_NO_SNDFILE") == "1":
        return False
    os.makedirs(OBJ, exist_ok=True)
    src, exe = os.path.join(OBJ, "sndfile-probe.cpp"), os.path.join(OBJ, "sndfile-probe")
    with open(src, "w") as f:
        f.write("#include <sndfile.h>\nint main() { SF_INFO i = SF_INFO(); return sf_open(\"\", SFM_READ, &i) ? 1 : 0; }\n")
    try:
        return subprocess.run([cxx, src, "-o", exe, "-lsndfile"], capture_output=True, timeout=120).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def compiler_version(exe):
    try:
        return subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=20).stdout.splitlines()[0]
    except (OSError, subprocess.SubprocessError, IndexError):
        return None


def stamp():
    """What the library is built from: plus4emu's commit and a digest of the kit's patch."""
    h = hashlib.sha256(open(PATCH, "rb").read()).hexdigest()[:16]
    return {"plus4emu": PLUS4EMU_COMMIT, "patch": h, "sources": len(SOURCES)}


def built():
    """The stamp beside the library, or None when there is no library."""
    if not os.path.isfile(LIB):
        return None
    try:
        return json.load(open(STAMP))
    except (OSError, ValueError):
        return {}


def build():
    """Which plus4emu the server runs, as a line that can go into game.json."""
    b = built()
    if b is None:
        return "MISSING (run: tools.py get-plus4emu)"
    if {k: b.get(k) for k in stamp()} != stamp():
        return f"plus4emu {PLUS4EMU_VERSION} (git {PLUS4EMU_COMMIT[:7]}), the kit's library: OUT OF DATE (run: tools.py get-plus4emu)"
    without = ", reading no WAV tapes (built without libsndfile)" if b.get("sndfile") == "stub" else ""
    return f"plus4emu {PLUS4EMU_VERSION} (git {PLUS4EMU_COMMIT[:7]}) with kit/c16/codemap.patch, in the kit's server{without}"


def environment(home=HOME):
    """The environment that contains the server: its home directory is tools/c16-home.

    plus4emu's library writes nothing to a home directory when it is driven this way (measured,
    kit/c16/INSTALL.md); HOME and the XDG variables point inside anyway, so that nothing it
    might start to write can land outside."""
    env = dict(os.environ)
    env["HOME"] = home
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(home, sub)
        os.makedirs(env[var], exist_ok=True)
    env["TMPDIR"] = os.path.join(home, "tmp")
    os.makedirs(env["TMPDIR"], exist_ok=True)
    env["KIT_PLUS4EMU_PORT"] = str(PORT)
    return env


def checkout_commit():
    try:
        return subprocess.run(["git", "-C", CHECKOUT, "rev-parse", "HEAD"], capture_output=True, text=True,
                              timeout=20).stdout.strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def patched():
    """True when kit/c16/codemap.patch is applied to the checkout."""
    return subprocess.run(["git", "-C", CHECKOUT, "apply", "--reverse", "--check", PATCH],
                          capture_output=True).returncode == 0


def fetch():
    """plus4emu's source at PLUS4EMU_COMMIT, one commit deep, with the kit's patch applied."""
    git = shutil.which("git")
    if not git:
        sys.exit("no git on the path: plus4emu's source is fetched with git (kit/c16/INSTALL.md, 'What you need first')")
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    if checkout_commit() != PLUS4EMU_COMMIT:
        shutil.rmtree(CHECKOUT, ignore_errors=True)
        os.makedirs(CHECKOUT)
        print(f"fetching plus4emu {PLUS4EMU_VERSION} at git {PLUS4EMU_COMMIT[:7]} (github.com/istvan-v/plus4emu, "
              "GPL v2) into tools/c16/plus4emu")
        for args in (["init", "--quiet"], ["remote", "add", "origin", PLUS4EMU_REPO],
                     ["fetch", "--quiet", "--depth", "1", "origin", PLUS4EMU_COMMIT],
                     ["-c", "advice.detachedHead=false", "checkout", "--quiet", "--detach", "FETCH_HEAD"]):
            subprocess.run([git, "-C", CHECKOUT, *args], check=True, env=env)
        got = checkout_commit()
        if got != PLUS4EMU_COMMIT:
            shutil.rmtree(CHECKOUT, ignore_errors=True)
            sys.exit(f"git fetched {got}, not {PLUS4EMU_COMMIT}: the kit's checks do not cover it. Say so in kit-feedback.md.")
    if not patched():
        subprocess.run([git, "-C", CHECKOUT, "checkout", "--quiet", "--", "."], check=True, env=env)
        r = subprocess.run([git, "-C", CHECKOUT, "apply", PATCH], capture_output=True, text=True)
        if r.returncode:
            sys.exit(f"kit/c16/codemap.patch does not apply to plus4emu at {PLUS4EMU_COMMIT[:7]}:\n{r.stderr}")
        print("applied kit/c16/codemap.patch: the library counts each instruction it runs, for the code map")


def compile_library():
    """The library from the checkout's sources, one compiler call a file, as many at once as the
    computer has cores. About 8 seconds on four cores, measured on 19 October 2026."""
    cxx, cc = compilers()
    if not cxx or not cc:
        sys.exit("no C++ compiler on the path: plus4emu's library is compiled here (kit/c16/INSTALL.md, 'What you need first')")
    os.makedirs(OBJ, exist_ok=True)
    os.makedirs(LIBDIR, exist_ok=True)
    tune = [] if sys.platform == "darwin" else ["-mtune=generic"]
    real = sndfile_found(cxx)
    stub = [] if real else ["-I" + SNDFILE_STUB]
    if not real:
        print("libsndfile not found by the compiler: building against kit/c16/sndfile/sndfile.h, so the server "
              "reads no tape kept as a WAV file (kit/c16/INSTALL.md, 'What you need first')")

    def one(src):
        obj = os.path.join(OBJ, src.replace("/", "_") + ".o")
        cmd = [cc if src.endswith(".c") else cxx, *FLAGS, *stub, *tune, "-c", src, "-o", obj]
        r = subprocess.run(cmd, cwd=CHECKOUT, capture_output=True, text=True)
        return src, obj, r
    print(f"compiling plus4emu's library: {len(SOURCES)} files with {compiler_version(cxx) or cxx}")
    t0 = time.time()
    objs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as pool:
        for src, obj, r in pool.map(one, SOURCES):
            if r.returncode:
                sys.exit(f"{src} did not compile:\n{r.stderr[-2000:]}")
            objs.append(obj)
    link = [cxx, "-dynamiclib" if sys.platform == "darwin" else "-shared", "-o", LIB, *objs,
            *(["-lsndfile"] if real else []), "-lpthread"]
    r = subprocess.run(link, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"the library did not link:\n{r.stderr[-2000:]}")
    with open(STAMP, "w") as f:
        json.dump(dict(stamp(), compiler=compiler_version(cxx), sndfile="libsndfile" if real else "stub",
                       built=time.strftime("%Y-%m-%d %H:%M")), f, indent=1)
    print(f"built {os.path.relpath(LIB, ROOT)} ({os.path.getsize(LIB) // 1024} KB) in {time.time() - t0:.0f} s")


def get_plus4emu():
    """Fetch plus4emu's source, apply the kit's patch, and build the library, all into tools/c16."""
    words = ("plus4emu", "plus4")
    before = footprint_signatures(words)
    os.makedirs(C16_DIR, exist_ok=True)
    fetch()
    compile_library()
    total = 0
    for d, _, fs in os.walk(C16_DIR):
        total += sum(os.lstat(os.path.join(d, f)).st_size for f in fs)
    print(f"{build()} at tools/c16, {total / 1048576:.0f} MB; tools/ is gitignored")
    outside = written_outside(before, words)
    if outside:
        print("written outside the repository by the install (list them under Uninstall in kit/c16/INSTALL.md):")
        for p in outside:
            print("  ", p)
    else:
        print("nothing written outside the repository by the install")


def plus4emu(extra=()):
    if built() is None:
        sys.exit("no plus4emu library under tools/c16; run `python3 kit/scripts/tools.py get-plus4emu` (kit/c16/INSTALL.md)")
    detail = foreign_detail(PORT)
    if detail:
        sys.exit(f"a server started from another folder already answers on :{PORT}:\n{detail}\n"
                 "stop it there (its own `tools.py stop`) before starting this clone's, or use --port")
    if up(PORT):
        print(f"emulator already answering on :{PORT}")
        return
    if "OUT OF DATE" in build():
        print("the library is older than kit/c16/codemap.patch: rebuilding it")
        fetch()
        compile_library()
    extra = list(extra)
    if "--model" in extra:
        i = extra.index("--model")
        if i + 1 >= len(extra) or extra[i + 1] not in MODELS:
            sys.exit(f"--model takes one of {', '.join(MODELS)}")
    os.makedirs(SNAPSHOTS, exist_ok=True)
    env = environment()
    cmd = [sys.executable, SERVER, "--port", str(PORT), "--lib", LIB, "--roms", ROMS, "--root", ROOT,
           "--tmp", env["TMPDIR"]] + extra
    log = "plus4emu.log" if PORT == 7501 else f"plus4emu-{PORT}.log"
    start(cmd, os.path.join(LOGS, log), env=env, cwd=ROOT, port=PORT, name="emulator")


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
    import plus4emu as client_module
    return client_module


def status():
    running = up(PORT)
    cxx = compilers()[0]
    print(f"emulator  :{PORT}  {'up' if running else 'down'}   build: {build()} (tools/c16)   "
          f"compiler: {compiler_version(cxx) if cxx else 'MISSING'}")
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
            print(f"  machine: {h['model']}   plus4emu {h['plus4emu']}   {'running' if s['running'] else 'stopped'} "
                  f"at PC ${s['pc']:04X}   snapshots: {os.path.relpath(SNAPSHOTS, ROOT)}")
        except Exception as e:
            print(f"  the server did not answer: {e}")
    result = os.path.join(LOGS, "check-emulator", "c16.json")     # its own file: each platform's check writes one
    if os.path.exists(result):
        try:
            r = json.load(open(result))
            print(f"  last check-emulator: {r['build']}, {r['when']}: "
                  f"{len(r['passed'])} passed, {len(r['failed'])} failed")
        except (OSError, ValueError, KeyError):
            pass


def snapshots():
    """Where the kit puts snapshots (the server's own folders are all inside tools/c16-home)."""
    print(os.path.relpath(SNAPSHOTS, ROOT))
    for f in sorted(os.listdir(SNAPSHOTS)) if os.path.isdir(SNAPSHOTS) else []:
        print("  ", f, os.path.getsize(os.path.join(SNAPSHOTS, f)), "bytes")


# Leftovers we know about and list under "Uninstall" in kit/c16/INSTALL.md.
KNOWN_RESIDUE = ()


def verify_footprint():
    """Launch, use and stop the server, then look for anything it left outside the repository."""
    t0 = time.time() - 1
    if up(PORT):
        sys.exit("stop the emulator first (tools.py stop): the check has to see a whole launch-to-exit cycle")
    words = ("plus4emu", "plus4", "p4emu", "c16")
    before = footprint_signatures(words)
    plus4emu()
    snap = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.p4emu")
    shot = os.path.join(SNAPSHOTS, f"footprint_check_{int(t0)}.png")
    with client().connect(port=PORT) as m:
        m.frames(60)
        print("snapshot written to:", os.path.relpath(m.save(snap)["path"], ROOT))
        print("screenshot written to:", os.path.relpath(m.screenshot(shot)["path"], ROOT))
        print("memory read through the server:", m.read(0xFFFC, 2, space="kernal").hex())
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
    """Take `--port N` out of the arguments: it becomes PORT here and KIT_PLUS4EMU_PORT for every
    script started from here. Returns the rest, and N or None."""
    global PORT
    if "--port" not in a:
        return a, None
    i = a.index("--port")
    try:
        n = int(a[i + 1])
    except (IndexError, ValueError):
        sys.exit("--port takes a number: tools.py plus4emu --port 7502")
    if not 1024 <= n <= 65535:
        sys.exit(f"--port {n}: use a port from 1024 to 65535")
    PORT = n
    os.environ["KIT_PLUS4EMU_PORT"] = str(n)
    return a[:i] + a[i + 2:], n


def main():
    a, port = take_port(sys.argv[1:])
    if not a or a[0] in ("-h", "--help"):
        print(__doc__); return
    if a[0] == "status":
        status()
    elif a[0] == "plus4emu":
        plus4emu(a[1:])
    elif a[0] == "stop":
        if any(x not in ("plus4emu", "all", "--force") for x in a[1:]):
            sys.exit("usage: tools.py stop [plus4emu] [--port N]")
        stop(port=port)
    elif a[0] == "get-plus4emu":
        get_plus4emu()
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
