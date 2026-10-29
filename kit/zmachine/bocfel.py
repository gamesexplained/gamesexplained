#!/usr/bin/env python3
"""Bocfel, the Z-machine interpreter the kit uses: install it into tools/, build it with the
kit's instruction trace, and run a story with it. A Z-machine story runs the same on it
whatever machine the game was sold for, so this serves every platform's Infocom games and
belongs to none (kit/zmachine/INSTALL.md).

Reached through `python3 kit/scripts/tools.py get-bocfel` and `tools.py bocfel ...`, which
need no --platform.

Everything goes under tools/ (gitignored):
  tools/zmachine/bocfel-2.6/    Bocfel 2.6's source (cspiegel.github.io/bocfel, MIT), from its
                                release tarball, with the kit's trace added, and the program
                                built from it, `bocfel`
  tools/zmachine-home/          the home directory it runs with (HOME and the XDG folders)

The build is Bocfel's plain one, with no Glk library and no terminal library: it reads
commands from standard input and writes the game's text to standard output. Patches to
Infocom games are off (-p), and so is the configuration file (-C), so that what runs is the
story as it was shipped. The trace is kit/zmachine/bocfel_trace.cpp; kit/zmachine/ztrace.py
reads it.

Usage:
  bocfel.py get                       download Bocfel 2.6, check its SHA-256, add the trace, build
  bocfel.py status                    which build is there
  bocfel.py run <story> [--commands FILE] [--trace FILE] [--seed N] [--meta]
                                      play the story: commands from FILE (else standard input),
                                      every instruction into the trace FILE, the random numbers
                                      from seed N (the same each run), and Bocfel's own /commands
                                      only with --meta
  bocfel.py verify-footprint          run a story with a trace and list what was written outside
                                      the repository; an empty list is the pass
"""
import hashlib, os, shutil, subprocess, sys, tarfile, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TOOLS = os.path.join(ROOT, "tools")
DIR = os.path.join(TOOLS, "zmachine")
HOME = os.path.join(TOOLS, "zmachine-home")
VERSION = "2.6"
URL = f"https://cspiegel.github.io/bocfel/downloads/bocfel-{VERSION}.tar.gz"
SHA256 = "8541a1c59271f7977e81680e29d9be60d633311870f05bb579f317a6fb37c7b8"   # the release, 6 September 2026
SRC = os.path.join(DIR, f"bocfel-{VERSION}")
EXE = os.path.join(SRC, "bocfel.exe" if os.name == "nt" else "bocfel")
STAMP = os.path.join(SRC, "KIT_BUILD")

# What the kit adds to Bocfel: two files of its own, and these edits, each of which must
# match exactly once or the build stops, so a release that has moved them is noticed.
KIT_FILES = {"trace.h": "bocfel_trace.h", "trace.cpp": "bocfel_trace.cpp"}
EDITS = (
    ("Makefile", "stash.cpp unicode.cpp", "stash.cpp trace.cpp unicode.cpp"),
    ("process.cpp", '#include "sound.h"\n', '#include "sound.h"\n#include "trace.h"\n'),
    ("process.cpp", "    processing_level++;\n\n    while (true) {",
     "    processing_level++;\n\n    static bool trace_ready = false;\n    if (!trace_ready) {\n"
     "        trace_init();\n        trace_ready = true;\n    }\n\n    while (true) {"),
    ("process.cpp", "        try {\n            opcodes[opcode]();\n        } catch",
     "        try {\n            if (trace_enabled) {\n                trace_before();\n"
     "                TraceGuard guard;\n                opcodes[opcode]();\n            } else {\n"
     "                opcodes[opcode]();\n            }\n        } catch"),
    ("process.cpp", "    decode_var(byte(pc++));\n\n    ext_opcodes[opcode]();",
     "    decode_var(byte(pc++));\n\n    if (trace_enabled) {\n        trace_extended();\n    }\n\n"
     "    ext_opcodes[opcode]();"),
    ("stack.h", "uint16_t variable(uint16_t var);\n", "uint16_t variable(uint16_t var);\nlong call_depth();\n"),
    ("stack.cpp", '#include "stack.h"\n', '#include "stack.h"\n#include "trace.h"\n'),
    ("stack.cpp", "void store_variable(uint16_t var, uint16_t n)\n{\n",
     "long call_depth()\n{\n    return NFRAMES;\n}\n\nvoid store_variable(uint16_t var, uint16_t n)\n{\n"
     "    trace_write(var, n);\n\n"),
)


def _read(path, mode="r"):
    with open(path, mode) as f:
        return f.read()


def _sha256(path):
    return hashlib.sha256(_read(path, "rb")).hexdigest()


def stamp():
    """What the program is built from: the release, and a digest of the kit's additions."""
    h = hashlib.sha256(repr(EDITS).encode())
    for name in sorted(KIT_FILES.values()):
        h.update(name.encode() + b"\0" + _read(os.path.join(HERE, name), "rb") + b"\0")
    return f"bocfel-{VERSION} kit-{h.hexdigest()[:16]}"


def build_line():
    """Which Bocfel is there, as a line that can go into game.json."""
    if not os.path.isfile(EXE):
        return "MISSING (run: tools.py get-bocfel)"
    try:
        built = _read(STAMP).strip()
    except OSError:
        built = ""
    if built != stamp():
        return f"Bocfel {VERSION}, the kit's trace build: OUT OF DATE (run: tools.py get-bocfel)"
    return f"Bocfel {VERSION} (cspiegel.github.io/bocfel), the kit's trace build"


def download():
    import urllib.request
    os.makedirs(DIR, exist_ok=True)
    path = os.path.join(DIR, os.path.basename(URL))
    print(f"downloading Bocfel {VERSION} (Chris Spiegel, MIT) from its own site:\n  {URL}")
    with urllib.request.urlopen(URL, timeout=60) as r, open(path + ".part", "wb") as f:
        shutil.copyfileobj(r, f, 1 << 20)
    got = _sha256(path + ".part")
    if got != SHA256:
        os.remove(path + ".part")
        sys.exit(f"{os.path.basename(URL)}: SHA-256 {got}, where the kit expects {SHA256}; nothing was installed")
    os.replace(path + ".part", path)
    print(f"SHA-256 matches the release the kit was measured on: {SHA256}")
    return path


def unpack(tarball):
    shutil.rmtree(SRC, ignore_errors=True)
    with tarfile.open(tarball) as t:
        for m in t.getmembers():
            top = m.name.split("/")[0]
            if top != f"bocfel-{VERSION}" or ".." in m.name.split("/") or not (m.isfile() or m.isdir()):
                sys.exit(f"{os.path.basename(tarball)}: unexpected member {m.name!r}; nothing was built")
        if hasattr(tarfile, "data_filter"):
            t.extractall(DIR, filter="data")
        else:
            t.extractall(DIR)


def add_trace():
    for dest, src in KIT_FILES.items():
        shutil.copy(os.path.join(HERE, src), os.path.join(SRC, dest))
    for name, old, new in EDITS:
        path = os.path.join(SRC, name)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        if text.count(old) != 1:
            sys.exit(f"Bocfel {VERSION}'s {name} has {text.count(old)} copies of what the kit edits, where it "
                     f"expects one; kit/zmachine/bocfel.py, EDITS:\n{old}")
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(old, new))


def compile_it():
    make = shutil.which("gmake") or shutil.which("make")
    if not make:
        sys.exit("Bocfel builds with GNU make and a C++17 compiler, and there is no make here "
                 "(kit/zmachine/INSTALL.md, 'What you need first')")
    # PLATFORM empty: the plain build, standard C++ only, so no terminal library is needed
    with open(os.path.join(SRC, "local.mk"), "w") as f:
        f.write("PLATFORM=\n")
    jobs = str(os.cpu_count() or 2)
    r = subprocess.run([make, "-j", jobs], cwd=SRC, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.isfile(EXE):
        sys.exit(f"Bocfel did not build:\n{r.stdout[-3000:]}{r.stderr[-3000:]}")
    for d, _, files in os.walk(SRC):      # every build starts from the tarball, so the objects go
        for f in files:
            if f.endswith(".o") or f.endswith(".d"):
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
    """A new folder in Bocfel's home, which a fresh clone has not made yet, for a run's story and trace."""
    os.makedirs(HOME, exist_ok=True)
    return tempfile.mkdtemp(prefix=prefix, dir=HOME)


def environment():
    env = dict(os.environ)
    env["HOME"] = HOME
    for var, sub in (("XDG_CONFIG_HOME", "config"), ("XDG_STATE_HOME", "state"),
                     ("XDG_CACHE_HOME", "cache"), ("XDG_DATA_HOME", "data")):
        env[var] = os.path.join(HOME, sub)
        os.makedirs(env[var], exist_ok=True)
    env.pop("BOCFEL_TRACE", None)
    return env


def available():
    """True when the trace build is there and up to date."""
    return os.path.isfile(EXE) and os.path.isfile(STAMP) and _read(STAMP).strip() == stamp()


def run(story, commands="", trace=None, seed=None, meta=False, timeout=120):
    """Play `story` with `commands` (text, a line each); returns what the game printed.
    With trace, every instruction goes into that file (kit/zmachine/ztrace.py reads it)."""
    if not available():
        sys.exit(f"no up-to-date Bocfel: {build_line()}")
    env = environment()
    args = [EXE, "-p", "-C"] + ([] if meta else ["-m"])
    if seed is not None:        # -z seeds the PRNG; -Z would read one number from a file, then the clock's
        args += ["-z", str(int(seed))]
    if trace:
        env["BOCFEL_TRACE"] = os.path.abspath(trace)
    r = subprocess.run(args + [os.path.abspath(story)], input=commands, env=env, cwd=HOME,
                       capture_output=True, text=True, timeout=timeout)
    return r.stdout + r.stderr


def verify_footprint():
    sys.path.insert(0, HERE)
    sys.path.insert(0, os.path.join(ROOT, "kit", "scripts"))
    from launcher import footprint_signatures, written_outside, judge_footprint
    import zasm
    words = ["bocfel", "zterp", "zmachine"]
    before = footprint_signatures(words)
    work = scratch("footprint-")
    try:
        story = os.path.join(work, "check.z5")
        with open(story, "wb") as f:
            f.write(zasm.assemble(5, 'main: .routine 0\n print "footprint"\n new_line\n quit\n').story)
        trace = os.path.join(work, "check.trace")
        out = run(story, trace=trace, seed=1)
        print("the story printed:", out.strip())
        hits = written_outside(before, words)
        judge_footprint(hits, [], trace if os.path.getsize(trace) else "", "Bocfel and its trace")
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
        ap = argparse.ArgumentParser(prog="bocfel.py run")
        ap.add_argument("story")
        ap.add_argument("--commands")
        ap.add_argument("--trace")
        ap.add_argument("--seed", type=int)
        ap.add_argument("--meta", action="store_true")
        a = ap.parse_args(rest)
        commands = _read(a.commands) if a.commands else sys.stdin.read()
        sys.stdout.write(run(a.story, commands, a.trace, a.seed, a.meta))
    else:
        sys.exit(f"bocfel.py: no command {cmd!r}; see -h")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
