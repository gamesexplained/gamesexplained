#!/usr/bin/env python3
"""ScummVM, the SCUMM interpreter the kit checks its script decoder against: install it into
tools/, build its SCUMM engine with the kit's trace, and run a game with it. A SCUMM game's
scripts run the same in it whatever machine the game was sold for, so this serves every
platform's SCUMM games and belongs to none (kit/scumm/INSTALL.md).

Reached through `python3 kit/scripts/tools.py get-scummvm` and `tools.py scummvm ...`, which
need no --platform.

Everything goes under tools/ (gitignored):
  tools/scumm/scummvm-2026.4.0/   ScummVM 2026.4.0's source (scummvm.org, GPLv3), the parts of its
                                  release tarball that the SCUMM engine needs, with the kit's
                                  additions, and the program built from it, `scummvm`
  tools/scumm-home/               the home directory it runs with (HOME and the XDG folders)

The build has the SCUMM engine alone, on ScummVM's null backend: no window, no sound device,
no libraries beyond the C++ compiler's own. The kit adds to it (kit/scumm/scummvm_kit.h):
a clock that moves only when the engine waits, so that a run is as fast as the computer allows
and the same every time; the trace, every SCUMM instruction it runs (kit/scumm/strace.py reads
it); input at set times from a file; and screenshots. ScummVM's own improvements to the games
are off (enhancements=0) and the games' copy protection on, so that what runs is the scripts
as they shipped; --no-copy-protection turns on ScummVM's own way past it (for Zak McKracken, it
skips the script that asks for the code at the airports), for a replay of a solution that should
need no manual.

Usage:
  scummvm.py get                       download ScummVM 2026.4.0, check its SHA-256, add the kit's
                                       trace, build
  scummvm.py status                    which build is there
  scummvm.py run <game folder> [--input FILE] [--trace FILE] [--stop SECONDS] [--seed N]
                 [--no-copy-protection]
                                       play the game in that folder (the files ScummVM detects:
                                       zak1.d64 and zak2.d64 for the C64 Zak McKracken), with
                                       clicks and keys from FILE, every instruction into the trace
                                       FILE, until SECONDS of the game's clock have passed (or the
                                       input's `quit`), the random numbers from seed N; with
                                       --no-copy-protection, past the game's code checks
  scummvm.py verify-footprint          build the kit's test game, run it with a trace and list what
                                       was written outside the repository; an empty list is the pass

The input file has a line for each thing to do, at a time on the game's clock in milliseconds,
or "+N", N milliseconds after the line before; # starts a comment, at the start of a line or
after a space:
  1000 click 160 100      move the mouse to x 160, y 100 on the game's screen and press the left
                          button (rclick: the right one; move: move it only)
  +500 key RETURN         press a key: a character, or RETURN, ESCAPE, SPACE, BACKSPACE, TAB,
                          UP, DOWN, LEFT, RIGHT, F1-F12
  +500 type hello         each character in turn, 100 ms apart
  +200 shot title.png     the screen as it is drawn next, as a PNG (a path from the input file's
                          folder)
  +0 show var 131 6       the values of variables 131 to 136 at that moment, written in the
                          trace (what the game chose at random, say); bit, owner, state and
                          sound the same way
  60000 quit              stop

A thing the game shows can be clicked by its number, at a point where the engine's own hit test
finds it when the line's time comes, so that a recording does not depend on where the camera is:
  +0 verb 14              verb 14, where it is drawn
  +0 object 16            object 16: in the room, a point where a click finds it and no actor
                          stands; in the inventory of the actor the player moves, its line,
                          clicking the inventory's arrows first to bring it into view
  +0 actor 10             actor 10, in the room
  +0 object 572|573|574   the first of them that is on the screen, for a room whose ways out
                          change from one visit to the next
  +0 sentence             the sentence line
  +0 walkto 112           walk to the screen's edge on the side of object 112 of the room,
                          until the room has scrolled to show it (nothing, when it shows or
                          is not in the room), at a point no way out covers, since a click on
                          one would take the actor through it
If the thing is nowhere on the screen, the run stops with exit status 3 and says which line.

  +0 until ready          wait until the game takes clicks, the actor the player moves stands
                          still, no sentence waits and nothing is being said, for two seconds
                          running (a verb's script may pause between two of its steps); `until
                          ready 500`: for 500 ms
  +0 until room 5         or until the room is 5 (VAR_ROOM: a pseudo room keeps its own number),
  +0 until ego 2            the player moves actor 2,
  +0 until var 66 = 3       variable 66 is 3 (=, !=, <, >, <=, >=),
  +0 until bit 1470 = 1     bit variable 1470 is 1,
  +0 until owner 16 = 1     actor 1 has object 16,
  +0 until state 94 = 1     object 94's state is 1 (state 94 has 8: that bit of it is set;
                            lacks 2: it is clear, as when the object can be touched),
  +0 until sound 33 = 0     or sound (or tune) 33 is not playing (1: it is)
  ... within 60000        at most this long (the default is 120000 ms); if it does not hold by
                          then, the run stops with exit status 3 and says which line
The lines after an until are timed from the moment it held, so every line after the first until
is "+N". The trace has a note for each line, where each click landed, and when each until held.
"""
import hashlib, os, re, shutil, subprocess, sys, tarfile, tempfile, zlib, struct

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
DIR = os.path.join(TOOLS, "scumm")
HOME = os.path.join(TOOLS, "scumm-home")
VERSION = "2026.4.0"
URL = f"https://downloads.scummvm.org/frs/scummvm/{VERSION}/scummvm-{VERSION}.tar.xz"
SHA256 = "cd660b34104da7f85ed0a11b7c6c2320c629bb87ee297935711ebc1e09731f12"   # the release, 10 October 2026
TOP = f"scummvm-{VERSION}"
SRC = os.path.join(DIR, TOP)
EXE = os.path.join(SRC, "scummvm.exe" if os.name == "nt" else "scummvm")
STAMP = os.path.join(SRC, "KIT_BUILD")

# The tarball is 223 MB, most of it other engines, packaging and documentation: only these are
# unpacked (about 50 MB), the rest skipped by the first part of the member's path.
SKIP_TOP = {"dists", "devtools", "doc", "po"}
KEEP_ENGINE = "scumm"

# SCUMM alone, on the null backend, and every optional library off, so that the build is the
# same on every computer and needs nothing but make and a C++ compiler.
CONFIGURE = [
    "--backend=null", "--disable-all-engines", f"--enable-engine={KEEP_ENGINE}", "--disable-detection-full",
    "--disable-debug", "--enable-optimizations",
    "--disable-mt32emu", "--disable-seq-midi", "--disable-timidity", "--disable-lua", "--disable-scalers",
    "--disable-hq-scalers", "--disable-edge-scalers", "--disable-translation", "--disable-taskbar",
    "--disable-cloud", "--disable-system-dialogs", "--disable-eventrecorder", "--disable-tts", "--disable-bink",
    "--disable-tinygl", "--disable-alsa", "--disable-ogg", "--disable-vorbis", "--disable-tremor", "--disable-mad",
    "--disable-fribidi", "--disable-flac", "--disable-zlib", "--disable-opengl-game",
    "--disable-opengl-game-classic", "--disable-opengl-game-shaders", "--disable-jpeg", "--disable-png",
    "--disable-gif", "--disable-theoradec", "--disable-vpx", "--disable-faad", "--disable-fluidsynth",
    "--disable-fluidlite", "--disable-sonivox", "--disable-freetype2", "--disable-nasm", "--disable-readline",
    "--disable-libunity", "--disable-gtk", "--disable-sndio", "--disable-sdlnet", "--disable-libcurl",
    "--disable-enet", "--disable-discord",
]

# What the kit adds to ScummVM: three files of its own, and these edits, each of which must match
# exactly once or the build stops, so a release that has moved them is noticed.
KIT_FILES = {"kit_scumm.h": "scummvm_kit.h", "backends/platform/null/kit_scumm.cpp": "scummvm_kit.cpp",
             "engines/scumm/kit_scumm_engine.cpp": "scummvm_kit_engine.cpp"}
EDITS = (
    ("backends/platform/null/module.mk", "MODULE_OBJS := \\\n\tnull.o\n",
     "MODULE_OBJS := \\\n\tnull.o \\\n\tkit_scumm.o\n"),
    ("backends/platform/null/null.cpp", '#include "base/main.h"\n', '#include "base/main.h"\n#include "kit_scumm.h"\n'),
    ("backends/platform/null/null.cpp", "\t_timerManager = new DefaultTimerManager();\n",
     "\tkitInit();\n\t_timerManager = new DefaultTimerManager();\n"),
    ("backends/platform/null/null.cpp", "\t_graphicsManager = new NullGraphicsManager();\n",
     "\t_graphicsManager = kitGraphicsManager();\n"),
    ("backends/platform/null/null.cpp", "\t((NullMixerManager *)_mixerManager)->update(1);\n",
     "\tkitMix(((NullMixerManager *)_mixerManager)->getMixer());\n\tif (kitPollEvent(event))\n\t\treturn true;\n"),
    ("backends/platform/null/null.cpp", "uint32 OSystem_NULL::getMillis(bool skipRecord) {\n",
     "uint32 OSystem_NULL::getMillis(bool skipRecord) {\n\treturn kitMillis();\n"),
    ("backends/platform/null/null.cpp", "void OSystem_NULL::delayMillis(uint msecs) {\n",
     "void OSystem_NULL::delayMillis(uint msecs) {\n\tkitDelay(msecs);\n\treturn;\n"),
    ("engines/scumm/script.cpp", '#include "scumm/util.h"\n', '#include "scumm/util.h"\n#include "kit_scumm.h"\n'),
    ("engines/scumm/script.cpp", "\t\texecuteOpcode(_opcode);\n\n\t}\n}",
     "\t\tif (kitTraceOn) {\n"
     "\t\t\tint kitSlot = _currentScript;\n"
     "\t\t\tScriptSlot kitWas = vm.slot[kitSlot];\n"
     "\t\t\tkitTraceBegin(vm.numNestedScripts, kitWas.where < 5 ? \"irglf\"[kitWas.where] : '?', kitWas.number,\n"
     "\t\t\t              _roomResource, (long)(_scriptPointer - _scriptOrgPointer) - 1, _opcode);\n"
     "\t\t\texecuteOpcode(_opcode);\n"
     "\t\t\tconst ScriptSlot &kitNow = vm.slot[kitSlot];\n"
     "\t\t\tlong kitEnd = -1;\n"
     "\t\t\tif (kitNow.number == kitWas.number && kitNow.where == kitWas.where && kitNow.status != ssDead)\n"
     "\t\t\t\tkitEnd = _currentScript == kitSlot ? (long)(_scriptPointer - _scriptOrgPointer) : (long)kitNow.offs;\n"
     "\t\t\tkitTraceEnd(kitEnd);\n"
     "\t\t} else {\n"
     "\t\t\texecuteOpcode(_opcode);\n"
     "\t\t}\n\n\t}\n}"),
    ("engines/scumm/script_v5.cpp", '#include "scumm/util.h"\n', '#include "scumm/util.h"\n#include "kit_scumm.h"\n'),
    ("engines/scumm/script_v5.cpp",
     "int ScummEngine_v5::getVarOrDirectByte(byte mask) {\n\tif (_opcode & mask)\n\t\treturn getVar();\n"
     "\treturn fetchScriptByte();\n}",
     "int ScummEngine_v5::getVarOrDirectByte(byte mask) {\n\tbool kitVar = (_opcode & mask) != 0;\n"
     "\tint kitValue = kitVar ? getVar() : (int)fetchScriptByte();\n\tif (kitTraceOn)\n"
     "\t\tkitTraceArg(kitValue, kitVar);\n\treturn kitValue;\n}"),
    ("engines/scumm/script_v5.cpp",
     "int ScummEngine_v5::getVarOrDirectWord(byte mask) {\n\tif (_opcode & mask)\n\t\treturn getVar();\n"
     "\treturn fetchScriptWordSigned();\n}",
     "int ScummEngine_v5::getVarOrDirectWord(byte mask) {\n\tbool kitVar = (_opcode & mask) != 0;\n"
     "\tint kitValue = kitVar ? getVar() : fetchScriptWordSigned();\n\tif (kitTraceOn)\n"
     "\t\tkitTraceArg(kitValue, kitVar);\n\treturn kitValue;\n}"),
    # the engine's side of the input's verb, object, actor, sentence and until lines
    ("engines/scumm/module.mk", "MODULE_OBJS := \\\n\tactor.o \\\n",
     "MODULE_OBJS := \\\n\tactor.o \\\n\tkit_scumm_engine.o \\\n"),
    ("engines/scumm/scumm.h", "\tfriend class ScummEditor;\n", "\tfriend class ScummEditor;\n\tfriend class KitScumm;\n"),
    ("engines/scumm/scumm_v2.h", "class ScummEngine_v2 : public ScummEngine_v3old {\nprotected:\n",
     "class ScummEngine_v2 : public ScummEngine_v3old {\n\tfriend class KitScumm;\nprotected:\n"),
    ("engines/scumm/scumm.cpp", '#include "scumm/object.h"\n', '#include "scumm/object.h"\n#include "kit_scumm.h"\n'),
    ("engines/scumm/scumm.cpp", "\tsetTotalPlayTime();\n\n\t_lastWaitTime = _system->getMillis();\n",
     "\tsetTotalPlayTime();\n\tkitEngineStart(this);\n\n\t_lastWaitTime = _system->getMillis();\n"),
)


def _read(path, mode="r"):
    with open(path, mode) as f:
        return f.read()


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def stamp():
    """What the program is built from: the release, and a digest of the kit's additions."""
    h = hashlib.sha256(repr((EDITS, CONFIGURE)).encode())
    for name in sorted(KIT_FILES.values()):
        h.update(name.encode() + b"\0" + _read(os.path.join(HERE, name), "rb") + b"\0")
    return f"scummvm-{VERSION} kit-{h.hexdigest()[:16]}"


def build_line():
    """Which ScummVM is there, as a line that can go into game.json."""
    if not os.path.isfile(EXE):
        return "MISSING (run: tools.py get-scummvm)"
    try:
        built = _read(STAMP).strip()
    except OSError:
        built = ""
    if built != stamp():
        return f"ScummVM {VERSION}, the kit's trace build: OUT OF DATE (run: tools.py get-scummvm)"
    return f"ScummVM {VERSION} (scummvm.org), SCUMM engine only, the kit's trace build"


def available():
    """True when the trace build is there and up to date."""
    return os.path.isfile(EXE) and os.path.isfile(STAMP) and _read(STAMP).strip() == stamp()


def download():
    import urllib.request
    os.makedirs(DIR, exist_ok=True)
    path = os.path.join(DIR, os.path.basename(URL))
    print(f"downloading ScummVM {VERSION}'s source (the ScummVM team, GPLv3) from its own site:\n  {URL}")
    with urllib.request.urlopen(URL, timeout=120) as r, open(path + ".part", "wb") as f:
        shutil.copyfileobj(r, f, 1 << 20)
    got = _sha256(path + ".part")
    if got != SHA256:
        os.remove(path + ".part")
        sys.exit(f"{os.path.basename(URL)}: SHA-256 {got}, where the kit expects {SHA256}; nothing was installed")
    os.replace(path + ".part", path)
    print(f"SHA-256 matches the release the kit was measured on: {SHA256}")
    return path


def wanted(name):
    """Whether a member of the tarball is unpacked: not the other engines, packaging or documents."""
    parts = name.split("/")
    if len(parts) < 2:
        return True
    if parts[1] in SKIP_TOP:
        return len(parts) == 2 or parts[2] == ""
    if parts[1] == "engines" and len(parts) >= 4 and parts[2] != KEEP_ENGINE:
        return False
    return True


def unpack(tarball):
    shutil.rmtree(SRC, ignore_errors=True)
    print(f"unpacking the parts the SCUMM engine needs into {os.path.relpath(SRC, ROOT)}")
    with tarfile.open(tarball) as t:
        members = []
        for m in t:
            parts = m.name.split("/")
            if parts[0] != TOP or ".." in parts or not (m.isfile() or m.isdir()):
                sys.exit(f"{os.path.basename(tarball)}: unexpected member {m.name!r}; nothing was built")
            if wanted(m.name):
                members.append(m)
        if hasattr(tarfile, "data_filter"):
            t.extractall(DIR, members=members, filter="data")
        else:
            t.extractall(DIR, members=members)


def add_trace():
    for dest, src in KIT_FILES.items():
        shutil.copy(os.path.join(HERE, src), os.path.join(SRC, dest))
    for name, old, new in EDITS:
        path = os.path.join(SRC, name)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        if text.count(old) != 1:
            sys.exit(f"ScummVM {VERSION}'s {name} has {text.count(old)} copies of what the kit edits, where it "
                     f"expects one; kit/scumm/scummvm.py, EDITS:\n{old}")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(old, new))


def compile_it():
    make = shutil.which("gmake") or shutil.which("make")
    if not make:
        sys.exit("ScummVM builds with GNU make and a C++ compiler, and there is no make here "
                 "(kit/scumm/INSTALL.md, 'What you need first')")
    sh = shutil.which("sh") or shutil.which("bash")
    r = subprocess.run([sh, "./configure", *CONFIGURE], cwd=SRC, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"ScummVM's configure stopped:\n{r.stdout[-3000:]}{r.stderr[-3000:]}")
    jobs = str(os.cpu_count() or 2)
    print(f"building ScummVM's SCUMM engine with {jobs} jobs (about a minute and a half on four cores)")
    r = subprocess.run([make, "-j", jobs], cwd=SRC, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.isfile(EXE):
        sys.exit(f"ScummVM did not build:\n{r.stdout[-3000:]}{r.stderr[-3000:]}")
    for d, _, files in os.walk(SRC):      # every build starts from the tarball, so the objects go
        for f in files:
            if f.endswith(".o") or f.endswith(".d") or f.endswith(".a"):
                os.remove(os.path.join(d, f))
    with open(STAMP, "w") as f:
        f.write(stamp() + "\n")


def get():
    tarball = os.path.join(DIR, os.path.basename(URL))
    if not (os.path.isfile(tarball) and _sha256(tarball) == SHA256):
        tarball = download()
    unpack(tarball)
    add_trace()
    compile_it()
    print(f"built {os.path.relpath(EXE, ROOT)}: {build_line()}")


def scratch(prefix):
    """A new folder in ScummVM's home, for a run's settings, saved games, input and trace."""
    os.makedirs(HOME, exist_ok=True)
    return tempfile.mkdtemp(prefix=prefix, dir=HOME)


def environment():
    env = dict(os.environ)
    env["HOME"] = HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    for var in ("SCUMM_KIT_TRACE", "SCUMM_KIT_INPUT", "SCUMM_KIT_STOP"):
        env.pop(var, None)
    return env


def png(ppm_path, png_path):
    """A PPM (what the kit's ScummVM writes) as a PNG, with nothing but zlib."""
    data = _read(ppm_path, "rb")
    m = re.match(rb"P6\s+(\d+)\s+(\d+)\s+255\s", data)
    w, h = int(m[1]), int(m[2])
    pix = data[m.end():]
    rows = b"".join(b"\0" + pix[y * w * 3:(y + 1) * w * 3] for y in range(h))

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)
    with open(png_path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


last_status = None      # the exit status of the last run: 3 when its input stopped it


def run(game, input_text=None, input_dir=None, trace=None, stop=None, seed=1, timeout=1800,
        copy_protection=True):
    """Play the game in folder `game`; returns what ScummVM printed, and leaves its exit status in
    last_status. input_text is the input file's text, its screenshots' paths taken from input_dir;
    stop is seconds of the game's clock."""
    if not available():
        sys.exit(f"no up-to-date ScummVM: {build_line()}")
    work = scratch("run-")
    try:
        env = environment()
        ini = os.path.join(work, "scummvm.ini")
        with open(ini, "w") as f:   # ScummVM's improvements off: the scripts as they shipped
            f.write("[scummvm]\nenhancements=0\ncopy_protection=%s\nsubtitles=true\n"
                    % ("true" if copy_protection else "false"))
        shots = []
        if input_text is not None:
            lines = []
            for line in input_text.splitlines():
                m = re.match(r"(\s*\+?\d+\s+shot\s+)(.+?)\s*$", line)
                if m:
                    dest = os.path.abspath(os.path.join(input_dir or os.getcwd(), m[2]))
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    shots.append(dest)
                    line = m[1] + dest + ".ppm"
                lines.append(line)
            path = os.path.join(work, "input.txt")
            with open(path, "w") as f:
                f.write("\n".join(lines) + "\n")
            env["SCUMM_KIT_INPUT"] = path
        if trace:
            env["SCUMM_KIT_TRACE"] = os.path.abspath(trace)
        if stop is not None:
            env["SCUMM_KIT_STOP"] = str(int(float(stop) * 1000))
        args = [EXE, "-c", ini, f"--savepath={work}", f"--random-seed={int(seed)}"] + \
            (["--copy-protection"] if copy_protection else []) + \
            [f"--path={os.path.abspath(game)}", "--auto-detect"]
        r = subprocess.run(args, env=env, cwd=work, capture_output=True, text=True, timeout=timeout)
        global last_status
        last_status = r.returncode
        for dest in shots:
            if os.path.isfile(dest + ".ppm"):
                if dest.lower().endswith(".png"):
                    png(dest + ".ppm", dest)
                    os.remove(dest + ".ppm")
                else:
                    os.replace(dest + ".ppm", dest)
        return r.stdout + r.stderr
    finally:
        shutil.rmtree(work, ignore_errors=True)


def verify_footprint():
    sys.path.insert(0, HERE)
    sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
    from launcher import footprint_signatures, written_outside, judge_footprint
    import testgame
    words = ["scummvm", "scumm"]
    before = footprint_signatures(words)
    work = scratch("footprint-")
    try:
        testgame.write(work)
        trace = os.path.join(work, "check.trace")
        out = run(work, trace=trace, stop=6)      # past the test game's save
        print("ScummVM printed:", out.strip().splitlines()[-1] if out.strip() else "(nothing)")
        hits = written_outside(before, words)
        judge_footprint(hits, [], trace if os.path.isfile(trace) and os.path.getsize(trace) else "",
                        "ScummVM and its trace")
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    cmd, rest = argv[0], argv[1:]
    if cmd == "get":
        get()
    elif cmd == "status":
        print(build_line())
    elif cmd == "verify-footprint":
        verify_footprint()
    elif cmd == "run":
        import argparse
        ap = argparse.ArgumentParser(prog="scummvm.py run")
        ap.add_argument("game")
        ap.add_argument("--input")
        ap.add_argument("--trace")
        ap.add_argument("--stop", type=float, help="seconds of the game's clock")
        ap.add_argument("--seed", type=int, default=1)
        ap.add_argument("--no-copy-protection", action="store_true")
        a = ap.parse_args(rest)
        if a.input is None and a.stop is None:
            sys.exit("scummvm.py run: give --stop SECONDS or an --input file that ends with quit; "
                     "otherwise the game runs until it is stopped")
        text = _read(a.input) if a.input else None
        sys.stdout.write(run(a.game, text, os.path.dirname(os.path.abspath(a.input)) if a.input else None,
                             a.trace, a.stop, a.seed, copy_protection=not a.no_copy_protection))
        if last_status == 3:
            return 3        # a thing to click was not on the screen, or an until did not hold
    else:
        sys.exit(f"scummvm.py: no command {cmd!r}; see -h")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
