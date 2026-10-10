#!/usr/bin/env python3
"""Measure ZEsarUX's Z80 against public test programs, and print what each one said.

    python3 kit/scripts/tools.py --platform spectrum zesarux        (start it first)
    python3 kit/scripts/tools.py --platform spectrum z80-accuracy
    python3 kit/spectrum/z80_accuracy.py [--program NAME] [--timeout SECONDS] [--no-fetch]

Each program is a 48K `.tap` that loads itself, runs and prints its own verdict on the
Spectrum's screen, so this needs no game and no snapshot of ours. The script plays the
tape through ZRCP (`smartload`), reads the machine's screen ten times a second until the
program's own last line is there in full, and prints PASS, FAIL or UNKNOWN with that
line as it stands. The stop is that kind's own verdict parser, so a poll that catches the
line half-written (`Result: 002 of 160 tests`, say) is not mistaken for the end of the
run; a line that arrives in pieces is believed once its last character is there. Nothing
is judged by wall clock: PASS is the words the program
printed, and a program that does not reach its last line in `--timeout` seconds is
UNKNOWN, which is what it is. What is on screen apart from that line goes to
`tools/logs/z80-accuracy/`: every distinct screen line the polls saw, the last screen
whole, and the `.tap`'s URL, licence and sha256, per program.

The programs, and who they belong to. **None of it is vendored.** The first run
downloads each project's file into the gitignored `tools/z80-accuracy/`, naming the
URL, the licence and the size before it does; `--no-fetch` refuses to download, and
then only the programs already there can run.

  z80full, z80doc, z80flags, z80memptr, z80ccf
      Patrik Rak's z80test 1.2a — the release's own prebuilt 48K `.tap`s, MIT licence,
      `github.com/raxoft/z80test`. Its CRCs were computed by a real Zilog Z80 in a 48K
      Spectrum, so a mismatch is a difference from that part, not from a specification.
      Two of the release's files are not run here: `z80docflags` (z80doc with only the
      documented flags checked) and `z80ccfscr`, which is a visual test — it draws which
      CPU variant it emulates and prints no pass or fail at all.
  zexdoc, zexall
      Frank Cringle's Z80 instruction exerciser, the CP/M `ZEXDOC`/`ZEXALL`, as the 48K
      `.tap` conversion by J.G.Harston and Stuart Brady, GPL-2.0-or-later. This is the
      one download from outside its own project: the exerciser itself ships CP/M `.COM`
      files and Z80 sources, and the Spectrum form is a third party's, which the URL in
      the output says plainly. One line per instruction, ending `Tests complete`; it
      never returns to BASIC (it ends in `jp stop`), so the final screen is the
      observable and this script resets the machine when it is done.
  FUSE's Z80 core tests
      Not runnable here, and not attempted. They are a host program (`z80/coretest.c`,
      `z80/tests/tests.in`, `z80/tests/tests.expected`) linked against FUSE's own CPU
      core: there is no `.tap`, no release asset, no way to build a Spectrum program out
      of them, and what they exercise is FUSE's core, not the CPU of the machine under
      test. `kit/spectrum/INSTALL.md` records that beside the row, and the script prints
      it rather than pretending otherwise.

What it reads, and what it does not. Each program prints far more than the 24 lines the
screen holds, so the lines are accumulated as the polls see them and the count the
program itself reported is the one to trust; when the two disagree the run says so. The
screen is decoded out of the machine's memory, not taken from ZRCP's `get-ocr`, which
keeps serving the last screen it drew even after a reset, and it is emptied before every
run for the same reason.
A full screen makes the ROM ask `scroll?` and wait for a key, which is the one thing a
program cannot do for itself here, so the script presses ENTER (holding it 0.3 s, then
releasing it: the ROM wants a press it can see) and counts the presses in the log.
ZEsarUX is never started from here — the launcher does that (AGENTS.md, "Leave the
cleanest footprint you can"); `KIT_ZESARUX_PORT` picks a second machine, as
`kit/spectrum/zesarux.py` documents.

Run it after installing, and again after any new release or build: it is the CPU half
of `check-emulator`'s picture, which measures the machine's interface rather than its
arithmetic.
"""
import hashlib, json, os, re, shutil, sys, time, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from zesarux import ZesaruxError, connect    # noqa: E402

TOOLS = os.path.join(ROOT, "tools")
RESULT = "spectrum.json"

POLL = 0.1                                  # seconds between reads of the text screen
# ENTER (row $BFFE, bit 0) then no joystick: what the ROM's "scroll?" wait accepts. SPACE
# is the one key not to use — measured on 13.0, a SPACE press while the tape's BASIC
# loader is running breaks it ("D BREAK - CONT repeats"), because BREAK is SPACE with
# CAPS SHIFT and only one of the two is needed to reach the ROM's break test.
SCROLL_KEY = "ff" * 6 + "fe" + "ff" + "00"
FRAMES = 0x5C78          # the ROM's 3-byte frame counter: one increment a frame, at 50 Hz
SCREEN, SCREEN_BYTES, FONT, FONT_BYTES = 0x4000, 6912, 0x3D00, 0x300

# Where each program comes from. `url` is the project's own release, except for the
# exerciser, whose own files are CP/M and whose Spectrum form is a third party's.
SOURCES = {
    "z80test": {"what": "raxoft/z80test 1.2a (github.com/raxoft/z80test)",
                "url": "https://github.com/raxoft/z80test/releases/download/v1.2a/z80test-1.2a.zip",
                "archive": "z80test-1.2a.zip",
                "inner": "z80test-1.2a/%s.tap",
                "licence": "MIT (Patrik Rak, 2012-2023)"},
    "zex": {"what": "Frank Cringle's Z80 instruction exerciser (YAZE), the Spectrum .tap "
                    "conversion by J.G.Harston and Stuart Brady (mdfs.net)",
            "url": "http://mdfs.net/Software/Z80/Exerciser/Spectrum/%s.tap",
            "archive": None,
            "licence": "GPL-2.0-or-later"},
}

# The text each kind of program prints to end its run: the last line it writes itself,
# and what `clear_screen` looks for in a screen it has emptied.
ENDS = ("Result:", "Tests complete")

PROGRAMS = [
    {"name": "z80full", "source": "z80test", "tap": "z80full.tap", "kind": "z80test",
     "what": "all flags and registers"},
    {"name": "z80doc", "source": "z80test", "tap": "z80doc.tap", "kind": "z80test",
     "what": "all registers, documented flags only"},
    {"name": "z80flags", "source": "z80test", "tap": "z80flags.tap", "kind": "z80test",
     "what": "all flags, registers ignored"},
    {"name": "z80memptr", "source": "z80test", "tap": "z80memptr.tap", "kind": "z80test",
     "what": "all flags after BIT N,(HL), which is where MEMPTR shows"},
    {"name": "z80ccf", "source": "z80test", "tap": "z80ccf.tap", "kind": "z80test",
     "what": "flags after CCF, which only a genuine Zilog part passes"},
    {"name": "zexdoc", "source": "zex", "tap": "zexdoc.tap", "kind": "zex",
     "what": "the instruction exerciser, documented flags"},
    {"name": "zexall", "source": "zex", "tap": "zexall.tap", "kind": "zex",
     "what": "the instruction exerciser, all flags"},
]

FUSE = {"name": "fuse-coretest", "runnable": False,
        "why": "FUSE's Z80 core tests are a host program linked against FUSE's own CPU core "
               "(z80/coretest.c with tests.in/tests.expected): no .tap, no release asset, and "
               "nothing a 48K Spectrum can load. They test FUSE's core, not the machine under "
               "test, so there is no result to record here"}

# z80test's last line, and the two shapes of its failure lines.
RESULT_LINE = re.compile(r"Result: (?:(all tests passed)\.|(\d+) of (\d+) tests failed)\.?")
Z80TEST_FAILED = re.compile(r"^\d{3} \S.*?\s+FAILED\s*$")
Z80TEST_CRC = re.compile(r"^\s*CRC:([0-9A-Fa-f]{8})\s+Expected:([0-9A-Fa-f]{8})\s*$")
ZEX_CRC = re.compile(r"^\s*CRC:([0-9A-Fa-f]{8})\s+expected:([0-9A-Fa-f]{8})\s*$")
ZEX_RUNNING = re.compile(r"^\s*([^.\s][^.]*?)\.+\s*$")   # a name and its dots, no verdict yet

results = []
notes = []


# --- what the programs printed ---------------------------------------------
def z80test_verdict(lines):
    """(verdict, summary, named lines) from the lines z80test put on screen.

    The last line is `Result: all tests passed.` or `Result: N of M tests failed.`, and
    each failing test prints `...FAILED` and then its own `CRC:xxxxxxxx   Expected:yyyyyyyy`.
    The N is the count to trust: the screen shows 24 lines and the program prints more,
    so a poll can miss a failing line, and when the two counts disagree the summary says
    so rather than passing off the shorter list as the whole truth.
    """
    line = next((l for l in reversed(lines) if RESULT_LINE.search(l)), None)
    if line is None:
        return "UNKNOWN", "the program did not print its last line", []
    m = RESULT_LINE.search(line)
    named = [l for l in lines if Z80TEST_FAILED.match(l) or Z80TEST_CRC.match(l)]
    if m.group(1):
        return "PASS", line.strip(), []
    summary = f"{m.group(2)} of {m.group(3)} tests failed"
    failed = len([l for l in named if Z80TEST_FAILED.match(l)])
    if failed != int(m.group(2)):
        summary += (f"; the screen kept {failed} of the failing lines"
                    " (it shows 24 at a time and the program prints more)")
    return "FAIL", summary, named


def zex_verdict(lines):
    """(verdict, summary, named lines) from the lines ZEXDOC/ZEXALL put on screen.

    One line per instruction: its name padded with dots while it runs, then `OK` straight
    after the dots; a failing one gets a `CRC:xxxxxxxx expected:yyyyyyyy` line under it
    instead — the exerciser's own computed CRC first — and the run carries on, so
    `Tests complete` arrives either way. That last line is what says the run is over, and
    a CRC line anywhere means a failure. The instruction it belongs to is the line before
    it as the polls first saw them, the name with no verdict.

    No count of `OK` lines is given. A poll made while the ROM scrolls reads cells that
    are half one line and half the next, and those decode as dots, the character the
    exerciser pads its names with: on 13.0 (10 October 2026) the polls read
    `ld (nnnn),....................OK` and `ld ...........................OK`, which
    nothing tells apart from a real instruction ending OK.
    """
    if not any("Tests complete" in l for l in lines):
        return "UNKNOWN", "the exerciser did not print its last line", []
    failed, named = [], []
    for i, line in enumerate(lines):
        if ZEX_CRC.match(line):
            running = ZEX_RUNNING.match(lines[i - 1]) if i else None
            failed.append(running.group(1) if running else "a name the polls did not catch")
            named += ([lines[i - 1]] if running else []) + [line]
    if failed:
        return "FAIL", f"{len(failed)} instructions printed a CRC line: {', '.join(failed)}", named
    return "PASS", "Tests complete, and no instruction printed a CRC line", []


VERDICTS = {"z80test": z80test_verdict, "zex": zex_verdict}


# --- fetching, into tools/ and nowhere else --------------------------------
def under_tools(*parts):
    """A path under tools/, which is where everything this script writes goes: the
    downloads, the unpacked test programs and the logs. Nothing is committed (the folder
    is gitignored) and nothing is written outside it (AGENTS.md, "No binaries, ever",
    and the footprint rule)."""
    path = os.path.abspath(os.path.join(TOOLS, *parts))
    if not path.startswith(TOOLS + os.sep):
        raise ValueError(f"{path} is outside tools/")
    return path


ACCURACY = under_tools("z80-accuracy")     # the fetched .tap files, gitignored
DOWNLOADS = under_tools("downloads")       # where a download lands, until it is unpacked
LOGS = under_tools("logs", "z80-accuracy")


def tap_path(program):
    return os.path.join(ACCURACY, program["tap"])


def download(url, name, licence):
    """Fetch one file into tools/downloads and return its path.

    The size the server states is checked when it states one; the caller's unpack is the
    real check (a named member in the archive, a .tap that is not empty).
    """
    os.makedirs(DOWNLOADS, exist_ok=True)
    path = os.path.join(DOWNLOADS, name)
    print(f"  fetching {url}", flush=True)
    print(f"           {licence}", flush=True)
    try:
        with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
            stated = int(r.headers.get("Content-Length") or 0)
            shutil.copyfileobj(r, f)
    except Exception as e:
        raise ZesaruxError(f"could not fetch {url}: {e}")
    got = os.path.getsize(path)
    print(f"           {got} bytes", flush=True)
    if stated and got != stated:
        os.remove(path)
        raise ZesaruxError(f"{name} came back {got} bytes, the server said {stated}; not kept")
    return path


def unpack_zip(zip_path, taps, dest=None):
    """Put the named `.tap`s from one release archive into tools/z80-accuracy.

    The path to a member inside the archive is the source's own `inner` template: the
    archive unpacks to a folder named after the release (`z80test-1.2a/z80full.tap`),
    and a wrong guess there is what would make the whole check report a missing file.
    """
    dest = dest or ACCURACY
    os.makedirs(dest, exist_ok=True)
    template = SOURCES["z80test"]["inner"]
    with zipfile.ZipFile(zip_path) as z:
        for tap in taps:
            with z.open(template % tap[:-4]) as f, open(os.path.join(dest, tap), "wb") as out:
                shutil.copyfileobj(f, out)


def fetch(source, taps):
    """Download one project's file and unpack `taps` out of it into tools/z80-accuracy.

    One archive covers several programs (z80test ships five of the six .tap files this
    script runs), so every file that project is asked for is unpacked in one go, and the
    download itself is deleted once it has been: `tools/downloads` is a way in, not a
    store (kit/spectrum/INSTALL.md, "What goes where").
    """
    src = SOURCES[source]
    os.makedirs(ACCURACY, exist_ok=True)
    if src["archive"]:
        zip_path = download(src["url"], src["archive"], src["licence"])
        unpack_zip(zip_path, taps)
        os.remove(zip_path)
    else:
        for tap in taps:
            path = download(src["url"] % tap[:-4], tap, src["licence"])
            os.replace(path, os.path.join(ACCURACY, tap))
    for tap in taps:
        if os.path.getsize(os.path.join(ACCURACY, tap)) == 0:
            raise ZesaruxError(f"{tap} is empty after unpacking")


def provenance(program):
    """What the .tap is, for the record: where it came from, its licence, its size and hash."""
    path = tap_path(program)
    src = SOURCES[program["source"]]
    return {"file": program["tap"],
            "url": (src["url"] % program["tap"][:-4]) if not src["archive"] else src["url"],
            "member": (src["inner"] % program["tap"][:-4]) if src["archive"] else None,
            "licence": src["licence"],
            "bytes": os.path.getsize(path),
            "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()}


# --- running one program ---------------------------------------------------
def cell_offset(row, column, scanline):
    """Where one byte of one character cell is in the screen file at $4000.

    A cell is 8x8 pixels and its eight bytes are not next to each other: the third of
    the screen a row is in comes first, then the scanline within the cell, then the
    pixel row of the cell within its third. Getting this wrong reads a screen that is
    plausible and wrong (`kit/skills/spectrum/zx-spectrum-reference`).
    """
    return (row // 8) * 0x800 + scanline * 0x100 + (row % 8) * 0x20 + column


def screen_text(rpc):
    """The machine's screen as 24 lines of 32 characters, read out of its memory.

    Not ZRCP's `get-ocr`: that answered with the last screen it had drawn even after
    `hard-reset-cpu`, so a program run straight after another read the previous run's
    `Result:` line as its own verdict (measured on 13.0, 4 October 2026). The screen
    file is the same memory the machine displays, and the ROM's own character set — 96
    glyphs of eight bytes at $3D00 — is the decoder. A cell matching no glyph is a block
    graphic, a cursor or an arrow, none of which these programs print, and comes back as
    a full stop rather than being guessed at.
    """
    screen = rpc.read_memory(SCREEN, SCREEN_BYTES)
    font = rpc.read_memory(FONT, FONT_BYTES)
    glyphs = {font[i * 8:i * 8 + 8]: chr(32 + i) for i in range(FONT_BYTES // 8)}
    return "\n".join(
        "".join(glyphs.get(bytes(screen[cell_offset(row, col, s)] for s in range(8)), ".")
                for col in range(32))
        for row in range(24))


def read_screen(rpc):
    return screen_text(rpc)


def clear_screen(rpc):
    """Empty the screen before a run, and refuse to start if it will not empty.

    `hard-reset-cpu` does not clear it (measured on 13.0, 4 October 2026: the previous
    program's `Result:` line is still in the screen file afterwards), and every program
    here ends by printing that line, so back-to-back runs would read the last run's
    verdict as their own. The write needs the machine stopped, and the marks that must
    be gone are exactly the two end-of-run lines a verdict is read from.
    """
    rpc.enter_step()
    rpc.write_memory(SCREEN, bytes(SCREEN_BYTES))
    rpc.exit_step()
    left = [line.strip() for line in screen_text(rpc).split("\n")
            if any(end in line for end in ENDS)]
    if left:
        raise ZesaruxError("the screen still shows " + repr(left[0]) + " after it was cleared, so "
                           "this run's verdict could not be told from the last one's")


def real_speed(rpc):
    """How fast this machine is going, in multiples of the 48K's 50 frames a second.

    `--emulatorspeed N` is a launch option and ZRCP has no setter, so what warp the
    emulator actually reached is measured here rather than asked for: these programs are
    compute-bound, and a reading of several times real speed is the difference between a
    run that finishes and one that does not. The ROM's own frame counter is the clock,
    so this needs no wall-clock assumption beyond the 48K's 50 Hz.
    """
    before = int.from_bytes(rpc.read_memory(FRAMES, 3), "little")
    started = time.time()
    time.sleep(0.5)
    after = int.from_bytes(rpc.read_memory(FRAMES, 3), "little")
    return ((after - before) % 2 ** 24) / (time.time() - started) / 50.0


def press_scroll_key(rpc):
    """Hold ENTER for a moment and let it go: the ROM's `scroll?` wait wants a press it
    can see, and the keys of the matrix are active low."""
    rpc.set_input(SCROLL_KEY)
    time.sleep(0.3)
    rpc.release_input()
    time.sleep(0.3)


def watch(read, kind, timeout, on_scroll=None):
    """Read the screen until the program's own last line is there in full, or the time is up.

    (lines seen, final screen, seconds, ended, key presses). `read` returns the machine's
    screen as text (in a run, `lambda: read_screen(rpc)`), so this half can be driven from
    a script of screens with no emulator.

    The stop is the kind's own verdict parser (`VERDICTS`): the run is over when a verdict
    can be read out of what the screen has shown, not when the words `Result:` appear,
    because a poll can catch that line while it is still being written and stopping there
    reports a run that printed its verdict as one that never did. Measured on ZEsarUX 13.0,
    5 October 2026: z80memptr's `Result: 002 of 160 tests failed.` was read at its first 24
    columns, and the run was called UNKNOWN for a line the program had printed. A line that
    arrives in pieces is believed once its last character is there.

    The lines accumulate because the screen holds 24 at a time and each program prints more,
    so a line stays readable after it has scrolled away; the final screen is kept whole, so
    the raw text of the end of the run is in the log as well as the lines the polls caught.
    """
    seen, screen, presses = [], "", 0
    started = time.time()
    while True:
        screen = read()
        for line in screen.split("\n"):
            line = line.rstrip()
            if line and line not in seen:
                seen.append(line)
        if VERDICTS[kind](seen)[0] != "UNKNOWN":
            return seen, screen, time.time() - started, True, presses
        if time.time() - started >= timeout:
            return seen, screen, time.time() - started, False, presses
        if "scroll?" in screen and on_scroll:
            on_scroll()
            presses += 1
        time.sleep(POLL)


def run_program(rpc, program, timeout):
    """Hard-reset the machine, empty the screen, play this program's tape, read its verdict."""
    rpc.cmd("hard-reset-cpu")
    clear_screen(rpc)
    rpc.smartload(tap_path(program))
    lines, screen, seconds, ended, presses = watch(
        lambda: read_screen(rpc), program["kind"], timeout, lambda: press_scroll_key(rpc))
    verdict, summary, named = VERDICTS[program["kind"]](lines)
    if verdict == "UNKNOWN" and not ended:
        summary += f" (the read timed out after {timeout:.0f} s)"
    return ({"name": program["name"], "what": program["what"], "verdict": verdict,
             "summary": summary, "named": named, "seconds": round(seconds, 1),
             "scroll_presses": presses, "tap": provenance(program)}, lines, screen)


def write_log(result, lines, screen):
    """The working record, in tools/logs/z80-accuracy: every distinct line the polls saw,
    then the last screen whole. The verdict is reprinted from the program's own words."""
    os.makedirs(LOGS, exist_ok=True)
    path = os.path.join(LOGS, result["name"] + ".txt")
    with open(path, "w") as f:
        f.write(f"{result['name']}: {result['verdict']} — {result['summary']}\n"
                f"{result['tap']['file']} from {result['tap']['url']} ({result['tap']['licence']}), "
                f"{result['tap']['bytes']} bytes, sha256 {result['tap']['sha256']}\n"
                f"{result['seconds']} s, {result['scroll_presses']} scroll? key presses\n\n"
                "the distinct screen lines, in the order the polls first saw them:\n")
        f.write("\n".join("  " + l for l in lines) + "\n\n")
        f.write("the last screen, whole:\n")
        f.write("\n".join("  |" + l for l in screen.split("\n")) + "\n")
    return path


# --- reporting -------------------------------------------------------------
def report(result, log_path):
    print(f"{result['verdict']:7} {result['name']:11} {result['summary']}"
          f"   [{result['seconds']:.0f} s, {os.path.relpath(log_path, ROOT)}]", flush=True)
    for line in result["named"]:
        print(f"        {line.strip()}")
    result["log"] = os.path.relpath(log_path, ROOT)
    results.append(result)


def main(argv):
    timeout, only, fetch_ok = 1800.0, None, True
    while argv:
        a = argv.pop(0)
        if a == "--timeout":
            timeout = float(argv.pop(0))
        elif a == "--program":
            only = argv.pop(0)
        elif a == "--no-fetch":
            fetch_ok = False
        elif a in ("-h", "--help"):
            print(__doc__)
            return 0
        else:
            sys.exit(f"no such option: {a} (try --help)")
    chosen = [p for p in PROGRAMS if only in (None, p["name"])]
    if not chosen:
        sys.exit(f"no program called {only}: {', '.join(p['name'] for p in PROGRAMS)}")
    try:
        rpc = connect(timeout=30)
    except ZesaruxError as e:
        sys.exit(f"{e}")
    try:
        machine = rpc.machine()
        if machine != "ZX Spectrum 48k":
            sys.exit(f"this is a {machine}: these programs are 48K Spectrum tapes, and every CRC "
                     "in them comes from that machine. Start the launcher's default machine "
                     "(kit/scripts/tools.py --platform spectrum zesarux) and run it again.")
        started = time.time()
        speed = real_speed(rpc)
        build = f"ZEsarUX {rpc.version()} on {sys.platform}"       # read once, while the connection is up
        print(f"{build}, {machine}, ZRCP :{rpc.port}, "
              f"running {speed:.1f}x the 48K's 50 frames a second")
        missing = [p for p in chosen if not os.path.exists(tap_path(p))]
        if missing and fetch_ok:
            for source in dict.fromkeys(p["source"] for p in missing):
                fetch(source, [p["tap"] for p in missing if p["source"] == source])
        for program in chosen:
            if not os.path.exists(tap_path(program)):
                print(f"NOT RUN {program['name']:11} {tap_path(program)} is not there and --no-fetch "
                      "was given: run it again without --no-fetch to download it", flush=True)
                continue
            try:
                result, lines, screen = run_program(rpc, program, timeout)
            except ZesaruxError as e:
                # the tape did not load, or the connection went: said as it is, not guessed at
                result, lines, screen = ({"name": program["name"], "what": program["what"],
                                          "verdict": "UNKNOWN", "summary": f"the run failed: {e}",
                                          "named": [], "seconds": 0.0, "scroll_presses": 0,
                                          "tap": provenance(program)}, [], "")
            report(result, write_log(result, lines, screen))
            result["when"] = time.strftime("%Y-%m-%d %H:%M")
            result["speed"] = round(speed, 1)
        print(f"NOT RUN {FUSE['name']:11} {FUSE['why']}", flush=True)
        rpc.cmd("hard-reset-cpu")            # the exercisers end in a loop of their own: leave the machine at BASIC
    finally:
        rpc.close()
    passed = [r for r in results if r["verdict"] == "PASS"]
    failed = [r for r in results if r["verdict"] == "FAIL"]
    unknown = [r for r in results if r["verdict"] == "UNKNOWN"]
    print(f"\n=== {len(passed)} passed, {len(failed)} failed, {len(unknown)} unknown, "
          f"{round(time.time() - started)} s at {speed:.1f}x real speed, {build}")
    summary = {"build": build, "machine": machine, "not_run": [FUSE], "notes": notes,
               "programs": list(results)}
    written = save_summary(summary)
    print(f"written to {os.path.relpath(written, ROOT)}")
    return 1 if failed else 0


def save_summary(summary):
    """Merge this run into tools/logs/z80-accuracy/spectrum.json and return its path.

    A run of one program (`--program`) must not erase what an earlier run measured: the
    file is the record `kit/spectrum/INSTALL.md` states, and the programs are keyed by
    name, in the order they are listed above, each with the date and the speed it was
    measured at.
    """
    path = os.path.join(LOGS, RESULT)
    kept = {}
    if os.path.exists(path):
        try:
            kept = {p["name"]: p for p in json.load(open(path)).get("programs", [])}
        except (OSError, ValueError, KeyError):
            kept = {}
    for program in summary["programs"]:
        kept[program["name"]] = program
    order = [p["name"] for p in PROGRAMS]
    summary["programs"] = [kept[n] for n in order if n in kept]
    os.makedirs(LOGS, exist_ok=True)
    with open(path, "w") as f:
        json.dump(summary, f, indent=2)
    return path


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
