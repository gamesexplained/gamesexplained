#!/usr/bin/env python3
"""The kit's Commodore 16 and Plus/4: plus4emu's machine, driven through its own library, answering
the kit's protocol on a local socket.

    python3 kit/c16/p4emu_server.py --port 7501 --lib tools/c16/lib/libplus4emu.so
                                    --roms tools/c16/plus4emu/roms [--model c16pal|plus4pal]
                                    [--root <repository>] [--tmp <folder>]

The launcher builds the library and starts this (`python3 kit/scripts/tools.py plus4emu`), and
kit/c16/plus4emu.py is its client; kit/skills/c16/tool-plus4emu says what each command does. The
protocol is the one the kit's BBC Micro and Apple II servers speak: one JSON object a line, both
ways, `{"id": 7, "cmd": "read", "address": 8192}` and back `{"id": 7, "ok": true, ...}` or
`"ok": false` with `"error"`. A run holds its connection until it stops; a second connection is
answered meanwhile, between two calls into the library, and that is how `stop` reaches a run.

plus4emu (István Varga, GPL v2) is built by the launcher from its source at git 939e652, the
1.2.11 of its NEWS file, with kit/c16/codemap.patch applied. What its library gives, read in its
source (plus4lib/plus4emu.h, src/cpu.cpp, src/ted_main.cpp, src/plus4vm.cpp, src/fileio.cpp):

- Plus4VM_Run(us) runs TED's loop a whole TED cycle at a time (two 1.77 MHz half-cycles; the
  CPU runs in one or both). It cannot be stopped part way: a breakpoint only calls back, on the
  emulator's thread, from inside the cycle. So a stop is the callback waiting (the machine
  "parked" at an opcode fetch: PC is the instruction, which has not run).
- A snapshot (Plus4VM_SaveState) is exact only between two Run calls, at a TED cycle boundary.
  Saved from inside the callback it would repeat part of the cycle on loading. So `save` at a
  stop goes back to the last clean snapshot (one is kept every few frames), replays to the TED
  cycle boundary just before the stop, saves there, and runs on to the same opcode fetch. The
  file is plus4emu's own, with one chunk of the kit's added before its end (plus4emu passes
  over a chunk type it does not know, src/fileio.cpp, processAllChunks): the frame count, where
  the stop was, the registers and the bytes of RAM there (kit/c16/snapshot.py reads them).
- There is no cycle counter. The count here is TED's own position (line x 114 + column, counted
  from column 98, where TED steps the line) plus 35,568 a frame, the frames counted by a video
  breakpoint at line 0. A program that writes TED's raster counter makes it jump.
- Setting PC from the callback takes effect only after the instruction already fetched, so a PC
  set at a stop also goes back and replays, and sets it before the fetch.
- Snapshots keep neither the tape nor the disk drive (the tape's place, the 1541 and its disk),
  and the TAP reader cannot seek. So clean snapshots are taken only while no tape is in and no
  drive is on, putting a tape or a disk in is logged like any other change, and a replay starts
  with the tape out and the drive off and puts them in again at the same instruction. A save
  made while one is in carries that clean snapshot and the log in a second chunk of the kit's,
  and loading it replays them.

Every file it writes (a snapshot, a screenshot, a sound log) must lie inside --root, the
repository, and its rolling snapshots go in --tmp, which the launcher puts in tools/c16-home.
"""
import argparse, base64, collections, ctypes as C, json, os, queue, shutil, signal, socket, socketserver, struct, sys, \
    tempfile, threading, traceback, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(os.path.dirname(HERE), "cpu"))
import registers   # noqa: E402  kit/c16/registers.py, the chips' names
from m6502 import decode, operand   # noqa: E402

PROTOCOL = 1
PLUS4EMU = "1.2.11 (git 939e652)"
# What the server answers, in the order kit/skills/c16/tool-plus4emu lists them
COMMANDS = ("hello", "status", "reset", "tape", "disk", "program", "type", "key", "keys", "release-keys",
            "joystick", "run", "step", "stop", "read", "write", "registers", "set-registers", "disassemble",
            "chips", "text", "checkpoint", "checkpoints", "delete", "zero", "save", "load", "keep", "back",
            "screenshot", "sound", "codemap", "quit")

# Imported rather than run (CI's import check, kit/c16/test_server.py), it reads no arguments and
# starts no machine: what it declares is all there is to read.
SERVING = __name__ == "__main__"
ap = argparse.ArgumentParser(description="the kit's plus4emu server (kit/skills/c16/tool-plus4emu)")
ap.add_argument("--port", type=int, required=SERVING)
ap.add_argument("--model", default="c16pal", choices=["c16pal", "plus4pal"])
ap.add_argument("--lib", required=SERVING, help="plus4emu's library, built by kit/c16/tools.py")
ap.add_argument("--roms", required=SERVING, help="the ROMs' folder: plus4emu's own roms/, or VICE's PLUS4")
ap.add_argument("--drives", default=None, help="the drive ROMs' folder (default: --roms; VICE's DRIVES works too)")
ap.add_argument("--root", default=os.path.dirname(os.path.dirname(HERE)), help="files are written inside this folder only")
ap.add_argument("--tmp", default=None, help="the folder for the rolling snapshots (default: a new one in the system's)")
ap.add_argument("--clean-frames", type=int, default=25, help="frames between the clean snapshots a replay starts from")
args = ap.parse_args(None if SERVING else [])
args.drives = args.drives or args.roms
ROOT = os.path.realpath(args.root)

FRAME = 312 * 114                 # PAL: 312 lines of 114 half-cycles
CLOCK = 1773447                   # the half-cycle rate, 17,734,475 Hz / 10
US_PER_HALF = 1e6 / 1773447.5
SLICE_US = 20000                  # one Run call while running: about a frame
MARGIN = 300                      # half-cycles before a cycle target where every instruction calls back
DEFAULT_LIMIT = 60 * CLOCK        # a run given no limit of its own: a minute of the machine's time
STEP_LIMIT = 2 * CLOCK            # a step: two seconds of it
MODELS = {"c16pal": {"ram": 16, "func": False, "name": "Commodore 16, PAL, 16 KB"},
          "plus4pal": {"ram": 64, "func": True, "name": "Commodore Plus/4, PAL, 64 KB"}}
MODEL = MODELS[args.model]
# Each ROM under plus4emu's name (and where it starts in the file), then VICE's
ROMS = {0: [("p4_basic.rom", 0), ("basic-318006-01.bin", 0)], 1: [("p4kernal.rom", 0), ("kernal-318004-05.bin", 0)]}
if MODEL["func"]:
    ROMS.update({2: [("3plus1.rom", 0), ("3plus1-317053-01.bin", 0)], 3: [("3plus1.rom", 16384), ("3plus1-317054-01.bin", 0)]})
D1541 = [("dos1541.rom", 0), ("dos1541-325302-01+901229-05.bin", 0)]
JAMS = {0x02, 0x12, 0x22, 0x32, 0x42, 0x52, 0x62, 0x72, 0x92, 0xB2, 0xD2, 0xF2}   # src/cpuoptbl.cpp: CPU_OP_INVALID_OPCODE
JOY = {1: {1: 0x50, 2: 0x51, 4: 0x52, 8: 0x53, 16: 0x56}, 2: {1: 0x48, 2: 0x49, 4: 0x4A, 8: 0x4B, 16: 0x4F}}
JOY_BITS = {"up": 1, "down": 2, "left": 4, "right": 8, "fire": 16}
RAM_PHYS = {16: (0x3FC000, 0x3FFF), 32: (0x3F8000, 0x7FFF), 64: (0x3F0000, 0xFFFF)}[MODEL["ram"]]
SPACES = {"cpu": (0, 0xFFFF), "ram": (0, 0xFFFF), "basic": (0x8000, 0xBFFF), "kernal": (0xC000, 0xFFFF)}
if MODEL["func"]:
    SPACES.update({"funclo": (0x8000, 0xBFFF), "funchi": (0xC000, 0xFFFF)})
PHYS = {"basic": 0x000000 - 0x8000, "kernal": 0x004000 - 0xC000, "funclo": 0x008000 - 0x8000, "funchi": 0x00C000 - 0xC000}
# The kit's chunks in a snapshot: its notes (JSON), and the clean snapshot a replay starts from
KIT_NOTES, KIT_CLEAN = 0x4B495431, 0x4B495432       # "KIT1", "KIT2"
MAGIC = bytes.fromhex("5D12E4F4C9DAB6420133DE07D234F222")

# The keyboard: plus4emu's key code is row x 8 + column, the row the bit of $FD30 that selects
# it and the column the bit of $FF08 it pulls low (the KERNAL's table, ed7.src, mode1)
MATRIX = ["INST/DEL", "RETURN", "POUND", "HELP", "F1", "F2", "F3", "@",
          "3", "W", "A", "4", "Z", "S", "E", "SHIFT",
          "5", "R", "D", "6", "C", "F", "T", "X",
          "7", "Y", "G", "8", "B", "H", "U", "V",
          "9", "I", "J", "0", "M", "K", "O", "N",
          "DOWN", "P", "L", "UP", ".", ":", "-", ",",
          "LEFT", "*", ";", "RIGHT", "ESC", "=", "+", "/",
          "1", "CLR/HOME", "CTRL", "2", "SPACE", "C=", "Q", "RUN/STOP"]
KEY_ALIASES = {"DEL": "INST/DEL", "INST": "INST/DEL", "DELETE": "INST/DEL", "INSERT": "INST/DEL", "ENTER": "RETURN",
               "£": "POUND", "F7": "HELP", "F4": "F1", "F5": "F2", "F6": "F3", "CONTROL": "CTRL", "COMMODORE": "C=",
               "CBM": "C=", "ESCAPE": "ESC", "STOP": "RUN/STOP", "RUNSTOP": "RUN/STOP", "RUN": "RUN/STOP",
               "HOME": "CLR/HOME", "CLR": "CLR/HOME", " ": "SPACE", "LSHIFT": "SHIFT", "RSHIFT": "SHIFT"}

WORKAROUNDS = [
    "stops: the library calls back at an opcode fetch from inside a TED cycle; the server waits there (it cannot leave Run part way)",
    "cycles: TED's position (line x 114 + column from 98) plus 35,568 a frame, frames counted by a video breakpoint at line 0; between Run calls column 98 is counted on the next line, where TED's line count has not yet moved",
    "save at a stop, and a PC set at a stop: load the last clean snapshot, replay to the TED cycle boundary before the stop, act there, run on to the same fetch",
    "snapshot files: the library's own, made at a TED cycle boundary, with a chunk of the kit's before the end: the frame count, the stop, the registers and the bytes of RAM there",
    "load and reset at a stop: the rest of the current Run call is run with every callback ignored, then the load or reset is done between calls",
    "run cycles and frames: Run calls up to 300 half-cycles short, then a callback on every instruction until the count is passed",
    "code map: the library's own counters when it was built with codemap.patch (put back to the last stop's after an internal replay, load or reset), else a callback on every instruction; either way an instruction counts when it runs, so the one at a stop counts when the run goes on",
    "sound: write breakpoints on $FF0E-$FF12, each logged with the cycle",
    "screenshot: replay to the stop, run 2.2 frames forward with the display on, decode TED's output stream, then load the stop back; with a tape or disk in, the display stays on (slower) and the screenshot is the last whole frame before the stop (going back after it would mean replaying the load again)",
    "type: the server fills the KERNAL's keyboard buffer ($0527, count at $EF) between Run calls whenever it is empty, ten characters at a time; each fill is logged, so a replay repeats it (the library's own paste keeps state a snapshot does not)",
    "program loads: Plus4VM_LoadProgram, logged at the stop so a replay repeats it",
    "writes and keys made at a stop, when a save, a PC set or a screenshot then replays: made at the TED cycle boundary before the fetch and again at the fetch, so the instruction before can see them for one cycle",
    "a jammed CPU (opcodes $02, $12, ... $F2: plus4emu loops in them and calls nothing back): the PC unchanged for four lines with a JAM opcode before it ends the run with reason \"jam\"; the machine then waits between two Run calls",
    "disk: plus4emu makes the 1541 when the first disk goes in, so that drive is switched on then and runs its 1.1 s self-test; the reply says so (a real drive switched on late does the same)",
    "a tape or a disk: plus4emu's snapshots hold neither the tape's place nor the drive, so while one is in no clean snapshot is taken; a replay (a save, a PC set, a write over the instruction at the stop) starts from the last clean snapshot with the tape out and the drive off, and puts them in again where they went in; a save made then carries that snapshot and the log in a chunk of the kit's, and loading it replays them, so the tape and the drive are where they were",
    "tape, disk and their eject at a stop: done at the TED cycle boundary before the stop, between two Run calls (by the same replay as a save), because plus4emu starts the tape's clock only when a Run call begins; a replay then starts it at the same cycle",
    "disk eject switches the drive off: plus4emu keeps a 1541 running after its disk is removed, and its state is in no snapshot; to change disks, put the next one in without ejecting",
]


def find_rom(folder, names, need=True):
    for name, offset in names:
        if os.path.exists(os.path.join(folder, name)):
            return os.path.join(folder, name), offset
    if need:
        raise SystemExit(f"none of {', '.join(n for n, _ in names)} in {folder}")
    return None


# ------------------------------------------------------------------ the library
class Regs(C.Structure):
    _fields_ = [("pc", C.c_uint16), ("sr", C.c_uint8), ("a", C.c_uint8), ("x", C.c_uint8), ("y", C.c_uint8), ("sp", C.c_uint8)]


V = C.c_void_p
BPCB = C.CFUNCTYPE(None, V, C.c_int, C.c_int, C.c_uint16, C.c_uint8)
VIDCB = C.CFUNCTYPE(None, V, C.POINTER(C.c_uint8), C.c_size_t)
PROTOS = [
    ("Plus4VM_Create", [], V), ("Plus4VM_GetLastErrorMessage", [V], C.c_char_p),
    ("Plus4VM_Run", [V, C.c_size_t], C.c_int), ("Plus4VM_Reset", [V, C.c_int], None),
    ("Plus4VM_SetRAMConfiguration", [V, C.c_size_t, C.c_uint64], C.c_int),
    ("Plus4VM_LoadROM", [V, C.c_uint8, C.c_char_p, C.c_size_t], C.c_int),
    ("Plus4VM_SetEnableAudioOutput", [V, C.c_int], None), ("Plus4VM_SetEnableDisplay", [V, C.c_int], None),
    ("Plus4VM_SetVideoOutputCallback", [V, VIDCB, V], None),
    ("Plus4VM_SetBreakPointCallback", [V, BPCB, V], None),
    ("Plus4VM_AddBreakPoint", [V, C.c_int, C.c_uint16, C.c_int], C.c_int), ("Plus4VM_ClearBreakPoints", [V], None),
    ("Plus4VM_SetBPPriorityThreshold", [V, C.c_int], None), ("Plus4VM_SetSingleStepMode", [V, C.c_int], None),
    ("Plus4VM_ReadMemory", [V, C.c_uint32, C.c_int], C.c_uint8), ("Plus4VM_WriteMemory", [V, C.c_uint32, C.c_uint8, C.c_int], None),
    ("Plus4VM_GetMemoryPage", [V, C.c_int], C.c_uint8),
    ("Plus4VM_GetCPURegisters", [V, C.POINTER(Regs)], None), ("Plus4VM_SetCPURegisters", [V, C.POINTER(Regs)], None),
    ("Plus4VM_GetVideoPositionX", [V], C.c_int), ("Plus4VM_GetVideoPositionY", [V], C.c_int),
    ("Plus4VM_SaveState", [V, C.c_char_p], C.c_int), ("Plus4VM_LoadState", [V, C.c_char_p], C.c_int),
    ("Plus4VM_KeyboardEvent", [V, C.c_int, C.c_int], C.c_int),
    ("Plus4VM_SetTapeFileName", [V, C.c_char_p], C.c_int), ("Plus4VM_TapePlay", [V], C.c_int), ("Plus4VM_TapeStop", [V], C.c_int),
    ("Plus4VM_SetDiskImageFile", [V, C.c_int, C.c_char_p, C.c_int], C.c_int),
    ("Plus4VM_LoadProgram", [V, C.c_char_p], C.c_int),
    ("Plus4_ColorToRGB", [C.c_int, C.c_int, C.POINTER(C.c_float), C.POINTER(C.c_float), C.POINTER(C.c_float)], None),
]
L = CMAP = None
if SERVING:
    L = C.CDLL(args.lib)
    for _name, _at, _rt in PROTOS:
        _f = getattr(L, _name)
        _f.argtypes, _f.restype = _at, _rt
    # A library built with codemap.patch counts every opcode fetch itself, which costs nothing
    # measurable; without it the code map is a callback on every instruction.
    try:
        L.Plus4VM_SetCodeMap.argtypes, L.Plus4VM_SetCodeMap.restype = [V, V], None
        CMAP = (C.c_uint32 * 65536)()
    except AttributeError:
        CMAP = None


# A library built without libsndfile (kit/c16/tools.py, its stamp says "sndfile": "stub") cannot
# read a tape kept as a sound file, and plus4emu would then take the file for a tape of its own
# raw format and play noise: the KERNAL would search for ever. So such a tape is refused here.
SOUND_FILES = (b"RIFF", b"RIFX", b"RF64", b"FORM", b".snd", b"fLaC", b"OggS")


def reads_sound_files(lib):
    try:
        return json.load(open(os.path.join(os.path.dirname(lib), "build.json"))).get("sndfile") != "stub"
    except (OSError, ValueError):
        return True


SNDFILE = reads_sound_files(args.lib) if SERVING else True


class EmuError(Exception):
    pass


def ok(code, what):
    if code:
        msg = L.Plus4VM_GetLastErrorMessage(vm)
        raise EmuError(f"{what}: {msg.decode(errors='replace') if msg else code}")


vm = L.Plus4VM_Create() if SERVING else None
if SERVING and not vm:
    raise SystemExit("Plus4VM_Create failed")


IN_CB = [False]


def pos():
    """Half-cycles since this frame began at line 0, column 98. Between two Run calls TED can
    stand at column 98 with its line count not yet moved on (it moves in that cycle's second
    half, where the callbacks see it moved): that column belongs to the next line, and on the
    last line to the next frame, whose breakpoint has not fired yet."""
    y, col = L.Plus4VM_GetVideoPositionY(vm), L.Plus4VM_GetVideoPositionX(vm) >> 2
    if col == 98 and not IN_CB[0]:
        y += 1
    return y * 114 + (col - 98) % 114


def get_regs():
    r = Regs()
    L.Plus4VM_GetCPURegisters(vm, C.byref(r))
    return r


def inside_root(path):
    """An absolute path inside the repository, or an error: the server writes nowhere else."""
    full = os.path.realpath(os.path.abspath(path))
    if not (full == ROOT or full.startswith(ROOT + os.sep)):
        raise EmuError(f"{path}: outside the repository ({ROOT}); the server writes only inside it")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    return full


def address(v):
    """An address from a number, or from "$2000", "0x2000" or "2000" (hexadecimal)."""
    if isinstance(v, int):
        return v & 0xFFFF
    s = str(v).strip()
    for p in ("$", "0x", "0X"):
        if s.startswith(p):
            return int(s[len(p):], 16) & 0xFFFF
    return int(s, 16) & 0xFFFF


# ------------------------------------------------------------------ the kit's chunks
def hash32(buf):
    """plus4emu's chunk checksum (src/fileio.cpp, File::hash_32)."""
    h, n = 1, len(buf) >> 2
    for i in range(n):
        h ^= buf[4 * i] | buf[4 * i + 1] << 8 | buf[4 * i + 2] << 16 | buf[4 * i + 3] << 24
        t = h * 0xC2B0C3CC
        h = (t ^ (t >> 32)) & 0xFFFFFFFF
    rest = buf[4 * n:]
    if rest:
        if len(rest) == 3:
            h ^= rest[2] << 16
        if len(rest) >= 2:
            h ^= rest[1] << 8
        h ^= rest[0]
        t = h * 0xC2B0C3CC
        h = (t ^ (t >> 32)) & 0xFFFFFFFF
    return h


def chunk(kind, data):
    head = struct.pack(">II", kind, len(data)) + data
    return head + struct.pack(">I", hash32(head))


def add_chunks(path, notes, clean=None):
    """The file plus4emu saved at `path`, with the kit's notes (and the clean snapshot a replay
    needs) before its end chunk, written in place of it."""
    blob = open(path, "rb").read()
    if not blob.startswith(MAGIC) or blob[-12:-8] != b"\0\0\0\0":
        raise EmuError(f"{path}: plus4emu did not write the file the kit expects")
    extra = chunk(KIT_NOTES, json.dumps(notes, separators=(",", ":")).encode())
    if clean is not None:
        extra += chunk(KIT_CLEAN, clean)
    tmp = path + ".part"
    with open(tmp, "wb") as f:
        f.write(blob[:-12] + extra + blob[-12:])
    os.replace(tmp, path)


def read_chunks(path):
    """{type: data} of a plus4emu file written uncompressed; {} for anything else."""
    try:
        blob = open(path, "rb").read()
    except OSError as e:
        raise EmuError(f"{path}: {e}")
    if not blob.startswith(MAGIC):
        return {}
    out, o = {}, 16
    while o + 12 <= len(blob):
        t, n = struct.unpack_from(">II", blob, o)
        if t == 0:
            break
        out.setdefault(t, blob[o + 8:o + 8 + n])
        o += n + 12
    return out


# ------------------------------------------------------------------ the machine
class Emu:
    def __init__(self):
        self.q = queue.Queue()
        if args.tmp:
            os.makedirs(args.tmp, exist_ok=True)
        self.tmp = tempfile.mkdtemp(prefix="p4emu-", dir=args.tmp)
        self.frames = 0
        self.base = 0
        self.cps, self.next_id = {}, 1
        self.idx = {"exec": {}, "read": {}, "write": {}}
        self.keys, self.joys = set(), {1: 0, 2: 0}
        self.goal = None          # the run under way: target / until / steps / armed / repark, and who waits
        self.parked = None        # {"pc", "stamp"} while the machine waits at a stop
        self.stop_req = None      # a stop asked for: the item waiting on it
        self.pending = None       # an operation to do between Run calls: (op, args, item)
        self.abandon = False      # the rest of a Run call runs with every callback ignored
        self.replay = None
        self.clean = None         # the last clean snapshot: {"path", "stamp", "frames", "keys", "joys", "free"}
        self.nclean = 0
        self.log = []             # changes made since it: {"kind": "fetch"|"at", "stamp", "pc", "ops"}
        self.codemap = None
        self.cmap_on = False      # the library's own counters (CMAP) are counting
        self.cmap_park = None     # their copy at the last stop for the client, put back after an internal replay
        self.sound = None
        self.media = {"tape": None, "disk": None}
        self.drive_on = False     # plus4emu makes the 1541 when a disk first goes in, and a cold reset with no disk removes it
        self.vbuf = None
        self.vlive = None         # while a tape or disk is in: the last few frames of TED's output, for screenshots
        self.vlive_bytes = 0
        self.trace = False
        self.quitting = False
        self.notes = []
        self.typing = None        # text still to type: {"bytes", "pos", "since"}
        self.jam_pc, self.jam_probe = None, None
        self.nfetch = 0           # opcode fetches the library has called back for, in any mode
        self.kept = {}            # keep and back: name -> file in self.tmp
        self.cb = BPCB(self._cb)
        self.vcb = VIDCB(self._vcb)
        L.Plus4VM_SetBreakPointCallback(vm, self.cb, None)
        L.Plus4VM_SetVideoOutputCallback(vm, self.vcb, None)
        L.Plus4VM_SetEnableAudioOutput(vm, 0)
        L.Plus4VM_SetEnableDisplay(vm, 0)
        L.Plus4VM_SetBPPriorityThreshold(vm, 0)
        self.power_on()

    # ---------------------------------------------------------- setup
    def power_on(self):
        ok(L.Plus4VM_SetRAMConfiguration(vm, MODEL["ram"], 0), "RAM configuration")
        for seg, names in ROMS.items():
            path, offset = find_rom(args.roms, names)
            ok(L.Plus4VM_LoadROM(vm, seg, path.encode(), offset), f"ROM {path}")
        d1541 = find_rom(args.drives, D1541, need=False)
        if d1541:
            ok(L.Plus4VM_LoadROM(vm, 0x10, d1541[0].encode(), d1541[1]), "1541 ROM")
        L.Plus4VM_Reset(vm, 1)
        self.sync_bps()

    def stamp(self):
        return self.base + self.frames * FRAME + pos()

    def anchor(self, stamp):
        """Make the count read `stamp` now."""
        self.base = stamp - self.frames * FRAME - pos()

    def set_trace(self, on):
        on = bool(on)
        if on != self.trace:
            L.Plus4VM_SetSingleStepMode(vm, 3 if on else 0)
            self.trace = on

    def media_busy(self):
        return bool(self.media["tape"] or self.media["disk"])

    def can_rewind(self):
        """A replay is exact from a clean snapshot taken with no tape in and no drive on: it puts
        them in again where the log says they went in."""
        return self.clean is not None and self.clean["free"]

    def remove_drive(self):
        """Switch drive 8 off: asking for a 1551 with no disk deletes the 1541, and asking again
        for a 1541 clears the 1551 flag that left behind (plus4vm.cpp, setDiskImageFile)."""
        L.Plus4VM_SetDiskImageFile(vm, 0, b"", 1)
        L.Plus4VM_SetDiskImageFile(vm, 0, b"", 0)

    def media_out(self):
        """The tape out and the drive off, as they are in a clean snapshot."""
        L.Plus4VM_TapeStop(vm)
        L.Plus4VM_SetTapeFileName(vm, b"")
        self.remove_drive()

    def sync_bps(self):
        L.Plus4VM_ClearBreakPoints(vm)
        L.Plus4VM_AddBreakPoint(vm, 4, 97, 3)         # line 0, column 98 (the library adds one for $FF1E's delay)
        want = {}
        self.idx = {"exec": {}, "read": {}, "write": {}}
        for cp in self.cps.values():
            t = {"exec": 6, "read": 1, "write": 2}[cp["kind"]]
            for a in range(cp["address"], cp["end"] + 1):
                want.setdefault(a & 0xFFFF, set()).add(t)
                self.idx[cp["kind"]].setdefault(a & 0xFFFF, []).append(cp)
        if self.goal and self.goal.get("until") is not None:
            want.setdefault(self.goal["until"], set()).add(6)
        if self.sound is not None:
            for a in range(0xFF0E, 0xFF13):
                want.setdefault(a, set()).add(2)
        if self.replay is not None:
            for e in self.replay["fetch"]:
                want.setdefault(e["pc"], set()).add(6)
        for a, ts in want.items():
            for t in ts:
                L.Plus4VM_AddBreakPoint(vm, t, a, 3)

    # ---------------------------------------------------------- callbacks (the emulator's thread)
    def _vcb(self, ud, buf, n):
        if self.vbuf is not None:
            self.vbuf += C.string_at(buf, n)
        elif self.vlive is not None:
            self.vlive.append(C.string_at(buf, n))
            self.vlive_bytes += n
            while self.vlive_bytes > 800_000:
                self.vlive_bytes -= len(self.vlive.popleft())

    def set_live_video(self, on):
        """TED's output kept while a tape or disk is in, where a screenshot cannot replay."""
        if on and self.vlive is None:
            self.vlive, self.vlive_bytes = collections.deque(), 0
            L.Plus4VM_SetEnableDisplay(vm, 1)
        elif not on and self.vlive is not None:
            self.vlive, self.vlive_bytes = None, 0
            L.Plus4VM_SetEnableDisplay(vm, 0)

    def _cb(self, ud, ctx, typ, addr, val):
        IN_CB[0] = True
        try:
            if ctx != 0:
                return
            if typ == 4:
                self.frames += 1
                return
            if typ in (0, 3):
                self.nfetch += 1
            if self.abandon:
                return
            if self.replay is not None:
                if typ in (0, 3):
                    self._replay_fetch(addr)
                return
            if typ in (0, 3):
                self._fetch(addr)
            elif typ in (1, 2):
                self._access(typ, addr, val)
        except Exception:
            traceback.print_exc()
            sys.stderr.flush()
        finally:
            IN_CB[0] = False

    @staticmethod
    def matches(cp, pc=None, value=None):
        """A checkpoint's `when`: registers (a, x, y, s, p, pc) and, for a read or a write, the value."""
        w = cp.get("when")
        if not w:
            return True
        if "value" in w and value != w["value"]:
            return False
        regs = [k for k in w if k in ("a", "x", "y", "s", "p")]
        if regs:
            r = get_regs()
            got = {"a": r.a, "x": r.x, "y": r.y, "s": r.sp, "p": r.sr}
            if any(got[k] != w[k] for k in regs):
                return False
        if "pc" in w and pc is not None and pc != w["pc"]:
            return False
        return True

    def _fetch(self, pc):
        """An opcode fetch, before its instruction runs. The checkpoints on it count it here, once:
        a stop parks the machine here, and the run that goes on from the stop does not count it
        again. Nothing counts while the server runs the machine for itself (a load, a reset, or the
        replay back to a stop), because those instructions were counted when they first ran."""
        st = self.stamp()
        g = self.goal
        if g is None:
            return
        why = cpid = None
        if not g.get("internal"):
            for cp in self.idx["exec"].get(pc, ()):
                if not self.matches(cp, pc=pc):
                    continue
                cp["hits"] += 1
                cp["last"] = {"pc": pc, "cycles": st}
                if cp["stop"] and cp["hits"] > cp["ignore"] and why is None:
                    why, cpid = "checkpoint", cp["id"]
        if g.get("repark"):
            why, cpid = "repark", None
        elif why is None:
            if self.stop_req is not None:
                why = "stopped"
            elif g.get("armed"):
                why, cpid = g["armed"]
            elif g.get("until") == pc:
                why = "until"
            elif g.get("steps") is not None:
                g["steps"] -= 1
                if g["steps"] <= 0:
                    why = "step"
            if why is None and g.get("target") is not None and st >= g["target"]:
                why = g["tkind"]
        if why:
            self._park(pc, st, why, cpid)     # the code map counts it when the run goes on (serve)
        elif self.codemap is not None:
            self.codemap[pc] = self.codemap.get(pc, 0) + 1

    def _access(self, typ, addr, val):
        g = self.goal
        if g is None or g.get("internal"):    # the instruction before a stop, finished again after a replay
            return
        if typ == 2 and self.sound is not None and 0xFF0E <= addr <= 0xFF12:
            self.sound["writes"].append([self.stamp(), addr, val])
        for cp in self.idx["read" if typ == 1 else "write"].get(addr, ()):
            if not self.matches(cp, value=val):
                continue
            cp["hits"] += 1
            cp["last"] = {"address": addr, "value": val, "cycles": self.stamp()}
            if cp["stop"] and cp["hits"] > cp["ignore"] and not g.get("armed"):
                g["armed"] = ("checkpoint", cp["id"])
                self.set_trace(True)

    def _replay_fetch(self, pc):
        R = self.replay
        st = self.stamp()
        while R["i"] < len(R["fetch"]) and R["fetch"][R["i"]]["stamp"] < st:
            self.notes.append(f"replay passed a change at {R['fetch'][R['i']]['stamp']} without meeting it")
            R["i"] += 1
        # every change made at that stop, in the order it was made: several writes at one stop
        # are several entries with the same stamp and PC
        while R["i"] < len(R["fetch"]) and R["fetch"][R["i"]]["stamp"] == st and R["fetch"][R["i"]]["pc"] == pc:
            self.apply_ops(R["fetch"][R["i"]]["ops"])
            R["i"] += 1

    # ---------------------------------------------------------- stops
    def _park(self, pc, st, why, cpid):
        g, self.goal = self.goal, None
        self.set_trace(self.codemap is not None)
        self.parked = {"pc": pc, "stamp": st}
        self.cmap_mark(g.get("internal"))
        if g.get("until") is not None or g.get("repark"):
            self.sync_bps()
        if why == "repark":
            exp = g.get("expect")
            drift = None
            if exp and (exp[0] is not None and exp[0] != pc or exp[1] is not None and exp[1] != st):
                drift = f"expected the stop at pc ${exp[0] or 0:04X} cycle {exp[1]}, came to ${pc:04X} cycle {st}"
                self.notes.append(drift)
            for e in g.get("reapply", ()):          # what was changed at the stop, made again here
                self.apply_ops(e["ops"])
                e["stamp"], e["pc"] = st, pc
                self.log.append(e)
            res = dict(g.get("result") or {})
            if drift:
                res["drift"] = drift
            if g.get("item") is not None:
                reply(g["item"], res)
        else:
            if why == "checkpoint" and cpid in self.cps and self.cps[cpid].get("temporary"):
                del self.cps[cpid]
                self.sync_bps()
            res = dict(self.registers(), reason=why, hit=cpid)
            if why == "step":
                res["next"] = self.disassemble(pc, 1)[0]
            self.finish(g, res)
        if self.stop_req is not None:
            item, self.stop_req = self.stop_req, None
            reply(item, {"was_running": True, "pc": pc, "cycles": st})
        self.serve()

    def cmap_mark(self, internal):
        """The counts at a stop: an internal goal (a replay to the same stop, a load, a reset) ran
        instructions the client never asked for, so the counts go back to the last stop's."""
        if not self.cmap_on:
            return
        if internal and self.cmap_park is not None:
            C.memmove(CMAP, self.cmap_park, C.sizeof(CMAP))
        else:
            self.cmap_park = bytes(CMAP)

    def finish(self, g, res):
        if g.get("item") is not None:
            reply(g["item"], res)

    def serve(self):
        """Answer commands at a stop, until one runs the machine again or needs it out of Run."""
        while True:
            item = self.q.get()
            try:
                r = self.dispatch(item, stopped=True)
            except EmuError as e:
                reply(item, {"ok": False, "error": str(e)})
                continue
            except Exception as e:
                traceback.print_exc()
                reply(item, {"ok": False, "error": repr(e)})
                continue
            if r == "resume":
                # The instruction at the stop runs now: the code map counts it here, so that one a
                # replay or a load stops at again, or a PC set at the stop replaces, counts once or
                # not at all. Its checkpoints counted it when the machine stopped on it (_fetch).
                if self.codemap is not None and self.parked is not None and not self.parked.get("jam"):
                    pc = self.parked["pc"]
                    self.codemap[pc] = self.codemap.get(pc, 0) + 1
                self.parked = None
                return
            if r == "out":
                self.abandon = True
                self.set_trace(False)
                return

    # ---------------------------------------------------------- the emulator's thread
    def main(self):
        self.take_clean()
        self.goal = {"repark": True, "internal": True}
        self.set_trace(True)
        while not self.quitting:
            if self.pending:
                op = self.pending
                self.pending = None
                try:
                    self.do_pending(*op)
                except Exception as e:
                    traceback.print_exc()
                    reply(op[2], {"ok": False, "error": str(e) if isinstance(e, EmuError) else repr(e)})
                    self.goal = {"repark": True, "internal": True}
                    self.set_trace(True)
                continue
            while True:                       # commands while running, between two Run calls
                try:
                    item = self.q.get_nowait()
                except queue.Empty:
                    break
                try:
                    self.dispatch(item, stopped=False)
                except EmuError as e:
                    reply(item, {"ok": False, "error": str(e)})
                except Exception as e:
                    reply(item, {"ok": False, "error": repr(e)})
            if self.pending or self.quitting:
                continue
            g = self.goal
            if g is None:                     # nothing to run: should not happen, but stop at the next fetch
                self.goal = g = {"repark": True, "internal": True}
            st = self.stamp()
            if self.typing is not None and not g.get("repark"):
                self.feed_typing(st)
            if (not self.media_busy() and not self.drive_on and not g.get("repark") and
                    (self.clean is None or st - self.clean["stamp"] >= args.clean_frames * FRAME)):
                self.take_clean()
            us = SLICE_US
            want_trace = (self.codemap is not None or self.stop_req is not None or g.get("repark") or g.get("armed")
                          or g.get("steps") is not None)
            if g.get("target") is not None:
                left = g["target"] - st
                if left <= MARGIN:
                    want_trace = True
                else:
                    us = max(1, min(SLICE_US, int((left - MARGIN) * US_PER_HALF)))
            if self.jam_probe is not None:    # a PC that looks stuck: one traced slice of four lines decides
                want_trace, us = True, min(us, 260)
            self.set_trace(want_trace)
            n0 = self.nfetch
            L.Plus4VM_Run(vm, us)
            self.abandon = False
            self.check_jam(self.nfetch != n0)

    def check_jam(self, fetched):
        """Between two Run calls: a CPU stuck in a JAM opcode keeps its PC and calls nothing
        back, so a run would never end. The same PC at two slice boundaries, with a JAM
        opcode before it, earns a probe: the next slice is four lines long with every
        instruction calling back. Not one call back, and the machine stops here."""
        pc, st = get_regs().pc, self.stamp()
        if self.jam_probe is not None:
            probe, self.jam_probe = self.jam_probe, None
            if fetched or pc != probe or self.parked is not None:
                self.jam_pc = pc
                return
        else:
            same, self.jam_pc = pc == self.jam_pc, pc
            if same and self.peek("cpu", (pc - 1) & 0xFFFF, 1)[0] in JAMS:
                self.jam_probe = pc
            return
        at = (pc - 1) & 0xFFFF
        g, self.goal = self.goal, None
        self.set_trace(False)
        self.parked = {"pc": at, "stamp": st, "jam": True}
        self.cmap_mark(g is not None and g.get("internal"))
        self.notes.append(f"the CPU jammed at ${at:04X} (opcode ${self.peek('cpu', at, 1)[0]:02X}), cycle {st}")
        if g is not None:
            if g.get("repark"):
                if g.get("item") is not None:
                    reply(g["item"], dict(g.get("result") or {}, jam=f"the CPU is jammed at ${at:04X}"))
            else:
                self.finish(g, dict(self.registers(), reason="jam", hit=None))
        if self.stop_req is not None:
            item, self.stop_req = self.stop_req, None
            reply(item, {"was_running": True, "pc": at, "cycles": st})
        self.serve()
        self.jam_pc = None

    def typing_state(self):
        T = self.typing
        return {"bytes": T["bytes"].hex(), "pos": T["pos"], "since": T["since"]} if T else None

    def feed_typing(self, st):
        """Between two Run calls: when the KERNAL's keyboard buffer is empty, the next ten
        characters (or up to a RETURN) go into it, logged as writes at this count."""
        T = self.typing
        if self.peek("cpu", 0xEF, 1)[0]:
            if T["since"] is not None and st - T["since"] > 250 * FRAME:
                self.notes.append(f"typing given up: the keyboard buffer was not read for 250 frames ({len(T['bytes']) - T['pos']} characters left)")
                self.typing = None
            return
        chunk_ = bytearray()
        while T["pos"] < len(T["bytes"]) and len(chunk_) < 10:
            c = T["bytes"][T["pos"]]
            T["pos"] += 1
            chunk_.append(c)
            if c == 13:
                break
        if not chunk_:
            self.typing = None
            return
        ops = [("write", "cpu", 0x0527, chunk_.hex()), ("write", "cpu", 0xEF, f"{len(chunk_):02x}")]
        self.apply_ops(ops)
        self.log.append({"kind": "at", "stamp": st, "pc": None, "ops": ops})
        T["since"] = st
        if T["pos"] >= len(T["bytes"]):
            self.typing = None

    # ---------------------------------------------------------- clean snapshots and replay
    def take_clean(self):
        path = os.path.join(self.tmp, f"clean{self.nclean % 3}.p4emu")
        self.nclean += 1
        ok(L.Plus4VM_SaveState(vm, path.encode()), "save a clean snapshot")
        self.clean = {"path": path, "stamp": self.stamp(), "frames": self.frames, "keys": set(self.keys), "joys": dict(self.joys),
                      "free": not self.media_busy() and not self.drive_on}
        cut = self.clean["stamp"]
        self.log = [e for e in self.log if e["stamp"] > cut or (e["kind"] == "fetch" and e["stamp"] >= cut)]

    def load_file(self, path, frames, stamp, keys, joys):
        # The first Run call after a load clears the keyboard before it runs anything, so a
        # Run(0) follows the load. Run rounds its time account toward zero, so a Run(0) can
        # still run one TED cycle when the account is less than a cycle short; one Run(0)
        # before the load (whose cycle, if any, the load throws away) leaves it a whole
        # cycle short.
        self.abandon = True
        try:
            L.Plus4VM_Run(vm, 0)
        finally:
            self.abandon = False
        ok(L.Plus4VM_LoadState(vm, path.encode()), f"load {path}")
        before = pos()
        self.abandon = True
        try:
            L.Plus4VM_Run(vm, 0)
        finally:
            self.abandon = False
        if pos() != before:
            self.notes.append("Run(0) after a load ran a TED cycle")
        self.frames = frames
        self.anchor(stamp)
        for k in range(128):
            L.Plus4VM_KeyboardEvent(vm, k, 0)
        for k in keys:
            L.Plus4VM_KeyboardEvent(vm, k, 1)
        for port, bits in joys.items():
            for b, code in JOY[port].items():
                L.Plus4VM_KeyboardEvent(vm, code, 1 if bits & b else 0)

    def advance_to(self, t):
        """Run TED cycles until the count reaches t or the cycle that holds it."""
        guard = 0
        while True:
            s = self.stamp()
            if s >= t - 1:
                return s
            d = t - s
            if d > 4 * MARGIN:
                L.Plus4VM_Run(vm, max(1, int((d - 2 * MARGIN) * US_PER_HALF)))
            else:
                L.Plus4VM_Run(vm, 1)
            guard += 1
            if guard > 10_000_000:
                raise EmuError("replay did not reach its target")

    def rewind_to(self, tp):
        """From the last clean snapshot, replay to the TED cycle boundary before the fetch at tp."""
        c = self.clean
        if self.media_busy() or self.drive_on:
            self.media_out()          # the log puts them in again
        self.load_file(c["path"], c["frames"], c["stamp"], c["keys"], c["joys"])
        fetch = sorted((e for e in self.log if e["kind"] == "fetch" and c["stamp"] <= e["stamp"] < tp), key=lambda e: e["stamp"])
        ats = sorted((e for e in self.log if e["kind"] == "at" and c["stamp"] < e["stamp"] <= tp), key=lambda e: e["stamp"])
        self.replay = {"fetch": fetch, "i": 0}
        self.set_trace(False)
        self.sync_bps()
        try:
            for e in ats:
                s = self.advance_to(e["stamp"])
                if s != e["stamp"]:
                    self.notes.append(f"a change made at {e['stamp']} was replayed at {s}")
                self.apply_ops(e["ops"])
            s = self.advance_to(tp)
        finally:
            self.replay = None
            self.sync_bps()
        return s

    def apply_ops(self, ops):
        for op in ops:
            k = op[0]
            if k == "write":
                self.poke(op[1], op[2], bytes.fromhex(op[3]))
            elif k == "regs":
                r = get_regs()
                for f, v in op[1].items():
                    setattr(r, f, v)
                L.Plus4VM_SetCPURegisters(vm, C.byref(r))
            elif k == "key":
                L.Plus4VM_KeyboardEvent(vm, op[1], op[2])
            elif k == "prg":
                ok(L.Plus4VM_LoadProgram(vm, op[1].encode()), "program")
            elif k == "tape":
                ok(L.Plus4VM_SetTapeFileName(vm, op[1].encode()), "tape")
                ok(L.Plus4VM_TapePlay(vm), "play")
            elif k == "disk":
                ok(L.Plus4VM_SetDiskImageFile(vm, 0, op[1].encode(), 0), "disk")
            elif k == "tape-out":
                L.Plus4VM_TapeStop(vm)
                L.Plus4VM_SetTapeFileName(vm, b"")
            elif k == "disk-out":
                self.remove_drive()

    def record(self, ops):
        """Log a change made now, so that a replay makes it at the same point."""
        if self.parked is not None and not self.parked.get("jam"):
            self.log.append({"kind": "fetch", "stamp": self.parked["stamp"], "pc": self.parked["pc"], "ops": ops})
        else:
            self.log.append({"kind": "at", "stamp": self.stamp(), "pc": None, "ops": ops})

    # ---------------------------------------------------------- snapshot files
    def notes_for(self, exact, stamp, resume=None, regs=None, ram=None, **more):
        """The kit's chunk: what the library's file does not hold."""
        out = {"format": "plus4emu-kit-snapshot", "version": 1, "model": args.model, "ram_kb": MODEL["ram"],
               "plus4emu": PLUS4EMU, "exact": exact, "stamp": stamp, "frames": self.frames,
               "keys": sorted(self.keys), "joys": self.joys, "resume": resume, "regs": regs,
               "typing": self.typing_state(), "media": self.media}
        if ram is not None:
            out["ram_at_stop"] = ram
        out.update(more)
        return out

    def write_snapshot(self, path, notes, replay=None):
        ok(L.Plus4VM_SaveState(vm, path.encode()), f"save {path}")
        clean = None
        if replay is not None:
            notes["replay"] = replay
            clean = open(self.clean["path"], "rb").read()
        add_chunks(path, notes, clean)

    def ram_bytes(self):
        """The RAM as it is now: the 16, 32 or 64 KB the model has, once."""
        base, mask = RAM_PHYS
        return bytes(L.Plus4VM_ReadMemory(vm, base | a, 0) for a in range(mask + 1))

    # ---------------------------------------------------------- operations done between Run calls
    def do_pending(self, op, a, item):
        if op == "load":
            return self.do_load(a["path"], item)
        if op == "reset":
            return self.do_reset(bool(a.get("hard")), item)
        pc, tp = self.parked["pc"], self.parked["stamp"]
        regs = self.parked.get("regs")
        at_stop = self.parked.get("ram")
        self.parked = None
        here = [e for e in self.log if e["kind"] == "fetch" and e["stamp"] == tp and e["pc"] == pc]
        self.log = [e for e in self.log if not any(e is h for h in here)]
        s = self.rewind_to(tp)
        # Writes and keys made at the stop are made here too, before the fetch: the opcode a
        # new PC fetches, the file a save writes and the screen a screenshot shows all have to
        # see them. They are made again at the fetch (a write in the cycle between would
        # otherwise undo one); registers only there, where the instruction before has finished.
        for e in here:
            self.apply_ops([o for o in e["ops"] if o[0] in ("write", "key", "prg")])
        result, expect_pc = {}, pc
        if op == "save":
            path = a["path"]
            ops = [o for e in here for o in e["ops"]]
            diff = None
            if at_stop is not None:     # the last cycles of the instruction before can lie past the boundary
                now = self.ram_bytes()
                diff = [[i, at_stop[i]] for i in range(len(now)) if now[i] != at_stop[i]]
            notes = self.notes_for(True, s, resume={"pc": pc, "stamp": tp, "ops": ops}, regs=regs, ram=diff)
            self.write_snapshot(path, notes, self.replay_record())
            result = {"path": path, "cycles": tp, "pc": pc}
        elif op == "setpc":
            r = get_regs()
            if r.pc == a["pc"]:
                self.notes.append("PC set to the value the CPU holds part way through the instruction before; not applied")
            r.pc = a["pc"]
            L.Plus4VM_SetCPURegisters(vm, C.byref(r))
            expect_pc = a["pc"]
        elif op == "poke":
            self.poke(a["space"], a["address"], bytes.fromhex(a["hex"]))
        elif op == "screenshot":
            result = self.capture(a["path"])
        elif op == "media":
            result, ops = self.do_media(a["kind"], a.get("path"))
            self.log.append({"kind": "at", "stamp": s, "pc": None, "ops": ops})
        # No clean snapshot right after a tape goes in or out: plus4emu changes the tape's clock
        # at the next Run call, which a snapshot taken before it would not hold.
        if op != "media" and not self.media_busy() and not self.drive_on:
            self.take_clean()
            self.log = [e for e in self.log if e["stamp"] >= tp]
        self.goal = {"repark": True, "internal": True, "expect": (expect_pc, tp), "item": item, "result": result,
                     "reapply": here}

    def do_media(self, kind, path):
        """A tape in (PLAY pressed) or out, a disk in drive 8, or the drive off. The caller logs
        the ops it returns."""
        if kind == "tape":
            ok(L.Plus4VM_SetTapeFileName(vm, path.encode()), "tape")
            ok(L.Plus4VM_TapePlay(vm), "play")
            self.media["tape"] = path
            self.set_live_video(True)
            return {"tape": path}, [("tape", path)]
        if kind == "disk":
            ok(L.Plus4VM_SetDiskImageFile(vm, 0, path.encode(), 0), "disk")
            self.media["disk"] = path
            self.set_live_video(True)
            if not self.drive_on:
                self.drive_on = True
                return ({"disk": path, "note": "drive 8 was off and is switched on now: a 1541 runs its self-test "
                                                "for about 1.1 s (55 frames) before it answers, so wait before LOAD"},
                        [("disk", path)])
            return {"disk": path}, [("disk", path)]
        if kind == "tape-out":
            L.Plus4VM_TapeStop(vm)
            L.Plus4VM_SetTapeFileName(vm, b"")
            self.media["tape"] = None
        else:
            self.remove_drive()
            self.media["disk"] = None
            self.drive_on = False
        self.set_live_video(self.media_busy())
        return {"media": dict(self.media)}, [(kind,)]

    def replay_record(self):
        """What a save made while a tape or disk is in needs to be loaded again: the clean
        snapshot from before it went in (the file's second chunk of the kit's) and the log since."""
        if not (self.media_busy() or self.drive_on) or not self.can_rewind():
            return None
        c = self.clean
        return {"stamp": c["stamp"], "frames": c["frames"], "keys": sorted(c["keys"]), "joys": c["joys"],
                "log": self.log, "media": self.media}

    def do_load(self, path, item):
        ch = read_chunks(path)
        try:
            side = json.loads(ch[KIT_NOTES]) if KIT_NOTES in ch else {}
        except ValueError:
            side = {}
        if side.get("model", args.model) != args.model:
            reply(item, {"ok": False, "error": f"{path} is a {side['model']} snapshot and this server is a {args.model}: "
                                               f"start one with --model {side['model']}"})
            self.goal = {"repark": True, "internal": True}
            return
        self.parked = None
        res = side.get("resume")
        rp = side.get("replay")
        if rp:
            # the tape or disk the save was made with: replay from before it went in
            clean = os.path.join(self.tmp, "loaded-clean.p4emu")
            with open(clean, "wb") as f:
                f.write(ch[KIT_CLEAN])
            self.media_out()
            self.drive_on = False
            self.clean = {"path": clean, "stamp": rp["stamp"], "frames": rp["frames"], "keys": set(rp["keys"]),
                          "joys": {int(k): v for k, v in rp["joys"].items()}, "free": True}
            self.log = [dict(e, ops=[tuple(o) for o in e["ops"]]) for e in rp["log"]]
            self.media = dict(rp["media"])
            tp = res["stamp"] if res else side["stamp"]
            self.rewind_to(tp)
            if res:                   # as the save's own replay made them: before the fetch, and again at it
                self.apply_ops([tuple(o) for o in res["ops"] if o[0] in ("write", "key", "prg")])
            self.drive_on = bool(self.media["disk"])
            self.set_live_video(self.media_busy())
            self.keys, self.joys = set(side.get("keys", [])), {int(k): v for k, v in side.get("joys", {}).items()}
        else:
            if self.media_busy() or self.drive_on:
                self.media_out()
                self.media, self.drive_on = {"tape": None, "disk": None}, False
                self.set_live_video(False)
            self.keys = set(side.get("keys", []))
            self.joys = {int(k): v for k, v in side.get("joys", {1: 0, 2: 0}).items()}
            self.load_file(path, side.get("frames", 0), side.get("stamp", 0), self.keys, self.joys)
            self.log = []
            self.take_clean()
        t = side.get("typing")
        self.typing = {"bytes": bytes.fromhex(t["bytes"]), "pos": t["pos"], "since": t["since"]} if t else None
        result = {"path": path}
        if not side:
            result["note"] = "no notes of the kit's in the file (another program's snapshot): stopped at the next instruction"
        if res:
            again = [{"kind": "fetch", "stamp": res["stamp"], "pc": res["pc"], "ops": [tuple(o) for o in res["ops"]]}] \
                if res.get("ops") else []
            self.goal = {"repark": True, "internal": True, "expect": (res["pc"], res["stamp"]), "item": item,
                         "result": result, "reapply": again}
        else:
            self.goal = {"repark": True, "internal": True, "item": item, "result": result}

    def do_reset(self, hard, item):
        st = self.parked["stamp"] if self.parked else self.stamp()
        self.parked = None
        if hard:
            self.power_on()
            self.drive_on = bool(self.media["disk"])
        else:
            L.Plus4VM_Reset(vm, 0)
        self.anchor(st)
        for k in self.keys:
            L.Plus4VM_KeyboardEvent(vm, k, 1)
        self.typing = None
        self.log = []
        self.take_clean()
        self.goal = {"repark": True, "internal": True, "item": item, "result": {"hard": hard}}

    # ---------------------------------------------------------- memory
    def peek(self, space, addr, n):
        if space == "cpu":
            return bytes(L.Plus4VM_ReadMemory(vm, (addr + i) & 0xFFFF, 1) for i in range(n))
        if space == "ram":
            base, mask = RAM_PHYS
            return bytes(L.Plus4VM_ReadMemory(vm, base | ((addr + i) & mask), 0) for i in range(n))
        off = PHYS[space]
        return bytes(L.Plus4VM_ReadMemory(vm, off + addr + i, 0) for i in range(n))

    def poke(self, space, addr, data):
        if space == "cpu":
            for i, b in enumerate(data):
                L.Plus4VM_WriteMemory(vm, (addr + i) & 0xFFFF, b, 1)
        elif space == "ram":
            base, mask = RAM_PHYS
            for i, b in enumerate(data):
                L.Plus4VM_WriteMemory(vm, base | ((addr + i) & mask), b, 0)
        else:
            raise EmuError(f"the {space} space is ROM: write to cpu or ram")

    def covers_opcode(self, space, addr, n):
        pc = self.parked["pc"]
        if space == "cpu":
            return addr <= pc < addr + n
        base, mask = RAM_PHYS
        if L.Plus4VM_GetMemoryPage(vm, pc >> 14) < 0x08:      # the opcode came from ROM
            return False
        return any(((addr + i) & mask) == (pc & mask) for i in range(n))

    def registers(self):
        r = get_regs()
        pc = self.parked["pc"] if self.parked else r.pc
        p = r.sr
        return {"pc": pc, "a": r.a, "x": r.x, "y": r.y, "s": r.sp, "p": p,
                "flags": "".join(f if p & (0x80 >> i) else "-" for i, f in enumerate("NV-BDIZC")),
                "cycles": self.parked["stamp"] if self.parked else self.stamp(), "frames": self.frames}

    def disassemble(self, at, count):
        out = []
        for _ in range(max(1, min(int(count), 1000))):
            bs = self.peek("cpu", at, 3)
            d = decode(bs, 0)
            if d is None:
                out.append({"address": at, "bytes": bs[:1].hex(), "text": f".byte ${bs[0]:02X}", "length": 1})
                at = (at + 1) & 0xFFFF
                continue
            m, mode, n = d
            text, _ = operand(at, m, mode, bs[:n], {}, registers.NAMES, lambda t, a: 0xFD00 <= t <= 0xFF3F)
            out.append({"address": at, "bytes": bs[:n].hex(), "text": m + (" " + text if text else ""), "length": n})
            at = (at + n) & 0xFFFF
        return out

    def chips(self):
        regs = self.peek("cpu", 0xFF00, 0x20)
        p2, p3 = L.Plus4VM_GetMemoryPage(vm, 2), L.Plus4VM_GetMemoryPage(vm, 3)
        named = {registers.NAMES[0xFF00 + i]: regs[i] for i in range(0x20)}
        c1, c2, scr, cs, bm = regs[6], regs[7], regs[0x14], regs[0x13], regs[0x12]
        out = {"ted": named, "ted_bytes": regs.hex(),
               "raster": regs[0x1D] | (regs[0x1C] & 1) << 8, "line": L.Plus4VM_GetVideoPositionY(vm),
               "column": L.Plus4VM_GetVideoPositionX(vm) >> 2, "rom": bool(regs[0x13] & 1),
               "timers": [regs[0] | regs[1] << 8, regs[2] | regs[3] << 8, regs[4] | regs[5] << 8],
               "irq": {"mask": regs[0x0A], "flags": regs[0x09], "raster_compare": regs[0x0B] | (regs[0x0A] & 1) << 8},
               "video": {"display": bool(c1 & 0x10), "bitmap": bool(c1 & 0x20), "extended_colour": bool(c1 & 0x40),
                         "multicolour": bool(c2 & 0x10), "rows": 25 if c1 & 8 else 24, "columns": 40 if c2 & 8 else 38,
                         "scroll_x": c2 & 7, "scroll_y": c1 & 7, "reverse": not c2 & 0x80, "ntsc": bool(c2 & 0x40),
                         "screen": (scr & 0xF8) << 8, "charset": (cs & 0xFC) << 8, "charset_from_rom": bool(bm & 4),
                         "bitmap_base": (bm & 0x38) << 10, "single_clock": bool(cs & 2),
                         "cursor": regs[0x0D] | (regs[0x0C] & 3) << 8},
               "colours": {"background": regs[0x15], "colour1": regs[0x16], "colour2": regs[0x17],
                           "colour3": regs[0x18], "border": regs[0x19]},
               "sound": {"voice1": regs[0x0E] | (bm & 3) << 8, "voice2": regs[0x0F] | (regs[0x10] & 3) << 8,
                         "volume": regs[0x11] & 15, "voice1_on": bool(regs[0x11] & 0x10),
                         "voice2_on": bool(regs[0x11] & 0x20), "noise_on": bool(regs[0x11] & 0x40),
                         "da": bool(regs[0x11] & 0x80)},
               "keyboard_latch": self.peek("cpu", 0xFD30, 1)[0], "cpu_port": list(self.peek("cpu", 0, 2))}
        if p2 < 8 and p3 < 8:
            out["rom_bank"] = ((p2 >> 1) & 3) | ((p3 >> 1) & 3) << 2
        return out

    def text(self):
        """The text screen as lines: where TED's registers put it, in screen codes, read as the
        character ROM's two sets show them."""
        c = self.chips()["video"]
        base = c["screen"]
        codes = self.peek("ram", (base + 0x400) & 0xFFFF, 1000)
        lower = c["charset_from_rom"] and c["charset"] == 0xD400
        upper = c["charset_from_rom"] and c["charset"] == 0xD000

        def ch(b):
            b &= 0x7F if c["reverse"] else 0xFF
            b &= 0x7F
            if b == 0:
                return "@"
            if 1 <= b <= 26:
                return chr(96 + b) if lower else chr(64 + b)
            if lower and 65 <= b <= 90:
                return chr(b)
            if 32 <= b <= 63:
                return chr(b)
            return {27: "[", 28: "£", 29: "]", 30: "^", 31: "<"}.get(b, ".")
        lines = ["".join(ch(b) for b in codes[r * 40:(r + 1) * 40]) for r in range(25)]
        return {"lines": lines, "screen": base + 0x400, "attributes": base,
                "charset": "upper" if upper else "lower" if lower else "the game's own"}

    # ---------------------------------------------------------- screenshots
    def capture(self, path):
        """From a clean TED cycle boundary: run 2.2 frames with the display on, keep the last
        whole frame, and go back."""
        back = os.path.join(self.tmp, "shot.p4emu")
        ok(L.Plus4VM_SaveState(vm, back.encode()), "save before the screenshot")
        fr, st = self.frames, self.stamp()
        self.vbuf = bytearray()
        L.Plus4VM_SetEnableDisplay(vm, 1)
        self.abandon = True
        try:
            L.Plus4VM_Run(vm, int(2.2 * FRAME * US_PER_HALF))
        finally:
            self.abandon = False
            L.Plus4VM_SetEnableDisplay(vm, 1 if self.vlive is not None else 0)
            data, self.vbuf = bytes(self.vbuf), None
        self.load_file(back, fr, st, self.keys, self.joys)
        w, h = write_png(path, data)
        return {"path": path, "width": w, "height": h}

    # ---------------------------------------------------------- commands
    def checkpoint_list(self):
        keys = ("id", "address", "end", "kind", "stop", "ignore", "temporary", "when", "hits", "last")
        return [dict({k: cp.get(k) for k in keys}, checkpoint=cp["id"]) for cp in self.cps.values()]

    def status(self):
        running = self.goal is not None and not self.goal.get("internal")
        return {"running": running, "model": MODEL["name"], "pc": self.parked["pc"] if self.parked else get_regs().pc,
                "cycles": self.parked["stamp"] if self.parked else self.stamp(), "frames": self.frames,
                "typing": self.typing is not None, "checkpoints": len(self.cps),
                "codemap": self.codemap is not None or self.cmap_on, "sound": self.sound is not None,
                "media": dict(self.media), "drive_on": self.drive_on, "held": self.held(),
                "jammed": bool(self.parked and self.parked.get("jam")), "notes": self.notes[-10:]}

    def held(self):
        return {"keys": sorted(MATRIX[k] for k in self.keys), "joysticks": dict(self.joys)}

    def dispatch(self, item, stopped):
        a = item["a"]
        cmd = a.get("cmd")
        if cmd not in COMMANDS:
            raise EmuError(f"no command {json.dumps(cmd)}; the commands: {', '.join(COMMANDS)}")
        if cmd == "hello":
            return reply(item, hello())
        if cmd == "status":
            return reply(item, self.status())
        if cmd == "read":
            space = a.get("space") or "cpu"
            lo, hi = SPACES.get(space, (None, None))
            addr, n = address(a["address"]), int(a.get("length", 256))
            if lo is None:
                raise EmuError(f"no space {space!r}; the spaces: {', '.join(SPACES)}")
            if not (lo <= addr and addr + n - 1 <= hi) or n < 1:
                raise EmuError(f"{space} holds ${lo:04X}-${hi:04X}, not ${addr:04X} and {n} bytes")
            return reply(item, {"address": addr, "length": n, "space": space,
                                "data": base64.b64encode(self.peek(space, addr, n)).decode()})
        if cmd == "checkpoints":
            return reply(item, {"checkpoints": self.checkpoint_list()})
        if cmd == "checkpoint":
            kind = a.get("kind") or "exec"
            if kind not in ("exec", "read", "write"):
                raise EmuError(f"kind {kind!r}: exec, read or write")
            lo = address(a["address"])
            hi = address(a["end"]) if a.get("end") is not None else lo
            if hi < lo:
                raise EmuError("end comes before address")
            when = a.get("when") or None
            if when:
                bad = [k for k in when if k not in ("a", "x", "y", "s", "p", "pc", "value")]
                if bad or ("value" in when and kind == "exec"):
                    raise EmuError("when: a, x, y, s, p or pc, and value for a read or a write")
                when = {k: (address(v) if k == "pc" else int(v) & 0xFF) for k, v in when.items()}
            cp = {"id": self.next_id, "address": lo, "end": hi, "kind": kind, "stop": bool(a.get("stop", True)),
                  "ignore": int(a.get("ignore") or 0), "temporary": bool(a.get("temporary")), "when": when,
                  "hits": 0, "last": None}
            self.next_id += 1
            self.cps[cp["id"]] = cp
            self.sync_bps()
            return reply(item, {"checkpoint": cp["id"]})
        if cmd == "delete":
            if a.get("all") or a.get("checkpoint") is None:
                self.cps.clear()
            elif int(a["checkpoint"]) not in self.cps:
                raise EmuError(f"no checkpoint {a['checkpoint']}")
            else:
                del self.cps[int(a["checkpoint"])]
            self.sync_bps()
            return reply(item, {"checkpoints": len(self.cps)})
        if cmd == "zero":
            for cp in self.cps.values():
                if a.get("checkpoint") is None or cp["id"] == int(a["checkpoint"]):
                    cp["hits"], cp["last"] = 0, None
            return reply(item, {})
        if cmd == "chips":
            return reply(item, self.chips())
        if cmd == "text":
            return reply(item, self.text())
        if cmd == "registers":
            return reply(item, self.registers())
        if cmd == "disassemble":
            at = address(a["address"]) if a.get("address") is not None else self.registers()["pc"]
            return reply(item, {"instructions": self.disassemble(at, a.get("count", 1))})
        if cmd == "keys":
            return reply(item, {"held": self.held()})
        if cmd == "key":
            code = key_code(a)
            down = 1 if a.get("down", True) else 0
            (self.keys.add if down else self.keys.discard)(code)
            L.Plus4VM_KeyboardEvent(vm, code, down)
            self.record([("key", code, down)])
            return reply(item, {"key": MATRIX[code], "row": code // 8, "column": code % 8, "down": bool(down),
                                "held": self.held()})
        if cmd == "release-keys":
            ops = [("key", k, 0) for k in sorted(self.keys)]
            for port in (1, 2):
                if self.joys[port]:
                    ops += [("key", code, 0) for code in JOY[port].values()]
                    self.joys[port] = 0
            self.keys.clear()
            self.apply_ops(ops)
            if ops:
                self.record(ops)
            return reply(item, {"held": self.held()})
        if cmd == "joystick":
            port = int(a.get("port", 1))
            if port not in JOY:
                raise EmuError("port: 1 or 2")
            bits = int(a["bits"]) if a.get("bits") is not None else \
                sum(b for name, b in JOY_BITS.items() if a.get(name))
            self.joys[port] = bits & 31
            ops = [("key", code, 1 if bits & b else 0) for b, code in JOY[port].items()]
            self.apply_ops(ops)
            self.record(ops)
            return reply(item, {"held": self.held()})
        if cmd == "codemap":
            return reply(item, self.do_codemap(a.get("action") or "read", stopped))
        if cmd == "sound":
            return reply(item, self.do_sound(a.get("action"), a.get("path")))
        if cmd == "quit":
            self.quitting = True
            reply(item, {"bye": True})
            shutil.rmtree(self.tmp, ignore_errors=True)
            os._exit(0)
        if cmd == "save" and not stopped:
            path = inside_root(a["path"])
            self.write_snapshot(path, self.notes_for(True, self.stamp()), self.replay_record())
            return reply(item, {"path": path, "cycles": self.stamp(), "running": True})
        if cmd == "stop":
            if stopped:
                return reply(item, {"was_running": False, "pc": self.parked["pc"], "cycles": self.parked["stamp"]})
            if self.goal is not None and not self.goal.get("internal"):
                self.stop_req = item
                return None
            return reply(item, {"was_running": False, "pc": get_regs().pc, "cycles": self.stamp()})
        if cmd == "write":
            space = a.get("space") or "cpu"
            addr = address(a["address"])
            data = base64.b64decode(a["data"]) if a.get("data") is not None else bytes(int(x) & 0xFF for x in a.get("bytes", []))
            if space not in ("cpu", "ram"):
                raise EmuError(f"the {space} space is ROM: write to cpu or ram")
            if not data:
                raise EmuError("nothing to write: data (base64) or bytes")
            if stopped and not self.parked.get("jam") and self.covers_opcode(space, addr, len(data)) and self.can_rewind():
                self.pending = ("poke", {"space": space, "address": addr, "hex": data.hex()}, item)
                return "out"
            self.poke(space, addr, data)
            self.record([("write", space, addr, data.hex())])
            return reply(item, {"address": addr, "length": len(data), "space": space})
        if not stopped:
            raise EmuError(f"{cmd}: the machine is running (stop it first, from this connection's run or with stop)")
        # ------------------------------------------------- the rest only at a stop
        if cmd == "set-registers":
            r = get_regs()
            fields = {"a": "a", "x": "x", "y": "y", "s": "sp", "p": "sr"}
            ch = {fields[k]: int(a[k]) & 0xFF for k in fields if a.get(k) is not None}
            if ch:
                for f, v in ch.items():
                    setattr(r, f, v)
                r.pc = self.parked["pc"]
                L.Plus4VM_SetCPURegisters(vm, C.byref(r))
                self.record([("regs", ch)])
            if a.get("pc") is not None and address(a["pc"]) != self.parked["pc"]:
                newpc = address(a["pc"])
                if self.parked.get("jam"):          # between Run calls: the new PC ends the jam
                    r = get_regs()
                    r.pc = newpc
                    L.Plus4VM_SetCPURegisters(vm, C.byref(r))
                    self.log.append({"kind": "at", "stamp": self.stamp(), "pc": None, "ops": [("regs", {"pc": newpc})]})
                    self.goal = {"repark": True, "internal": True, "expect": (newpc, None), "item": item, "result": {}}
                    return "resume"
                if not self.can_rewind():
                    r = get_regs()
                    r.pc = newpc
                    L.Plus4VM_SetCPURegisters(vm, C.byref(r))
                    return reply(item, {"note": "no replay possible (a tape or disk, or no clean snapshot yet): the PC "
                                                "takes effect after the current instruction"})
                self.pending = ("setpc", {"pc": newpc}, item)
                return "out"
            return reply(item, self.registers())
        if cmd in ("save", "keep") and self.parked.get("jam"):      # between Run calls already: exact
            path = inside_root(a["path"]) if cmd == "save" else self.kept_path(a)
            self.write_snapshot(path, self.notes_for(True, self.stamp(), jam=self.parked["pc"]))
            return reply(item, {"path": path, "cycles": self.stamp(), "jammed": True})
        if cmd in ("save", "keep"):
            path = inside_root(a["path"]) if cmd == "save" else self.kept_path(a)
            if not self.can_rewind():
                regs = self.registers()
                self.write_snapshot(path, self.notes_for(False, self.parked["stamp"], pc=self.parked["pc"],
                                                         regs={k: regs[k] for k in ("pc", "a", "x", "y", "s", "p")}))
                return reply(item, {"path": path, "exact": False,
                                    "note": "no clean snapshot to replay from: the file is a few cycles off the stop"})
            regs = self.registers()
            self.parked["regs"] = {k: regs[k] for k in ("pc", "a", "x", "y", "s", "p")}
            self.parked["ram"] = self.ram_bytes()
            self.pending = ("save", {"path": path}, item)
            return "out"
        if cmd in ("load", "back"):
            path = os.path.abspath(a["path"]) if cmd == "load" else self.kept.get(a.get("name") or "default")
            if not path or not os.path.exists(path):
                raise EmuError(f"no file {a.get('path')}" if cmd == "load" else f"nothing kept as {a.get('name') or 'default'!r}")
            self.pending = ("load", {"path": path}, item)
            return "out"
        if cmd == "reset":
            self.pending = ("reset", {"hard": a.get("hard", True)}, item)
            return "out"
        if cmd == "screenshot" and self.parked.get("jam") and self.vlive is None:
            return reply(item, self.capture(inside_root(a["path"])))
        if cmd == "screenshot":
            path = inside_root(a["path"])
            if not self.can_rewind() or self.media_busy() or self.drive_on:
                if self.vlive is None:
                    raise EmuError("no clean snapshot to replay from yet: run a frame first")
                w, h = write_png(path, b"".join(self.vlive))
                return reply(item, {"path": path, "width": w, "height": h,
                                    "frame": "the last whole frame TED sent before the stop"})
            self.pending = ("screenshot", {"path": path}, item)
            return "out"
        if cmd == "run":
            st = self.parked["stamp"]
            g = {"item": item}
            if a.get("cycles") is not None:
                g["target"], g["tkind"] = st + int(a["cycles"]), "cycles"
            elif a.get("frames") is not None:
                g["target"], g["tkind"] = self.base + (self.frames + int(a["frames"])) * FRAME, "frames"
            elif a.get("seconds") is not None:
                g["target"], g["tkind"] = st + int(float(a["seconds"]) * CLOCK), "seconds"
            elif a.get("until") is not None:
                g["until"] = address(a["until"])
            limit = int(a["max_cycles"]) if a.get("max_cycles") is not None else \
                (None if g.get("target") is not None else DEFAULT_LIMIT)
            if limit is not None:
                mx = st + limit
                if g.get("target") is None or mx < g["target"]:
                    g["target"], g["tkind"] = mx, "timeout"
            self.goal = g
            if g.get("until") is not None:
                self.sync_bps()
            return "resume"
        if cmd == "step":
            self.goal = {"item": item, "steps": max(1, int(a.get("count", 1))), "target": self.parked["stamp"] + STEP_LIMIT,
                         "tkind": "timeout"}
            self.set_trace(True)
            return "resume"
        if cmd in ("tape", "disk"):
            kind = f"{cmd}-out" if a.get("eject") else cmd
            path = None
            if not a.get("eject"):
                path = os.path.abspath(a.get("path") or "")
                if not os.path.isfile(path):
                    raise EmuError(f"no file {a.get('path')}")
                if cmd == "tape" and not SNDFILE and open(path, "rb").read(4) in SOUND_FILES:
                    raise EmuError("this is a tape kept as a sound file, and the kit's library was built without "
                                   "libsndfile, so it reads none: install libsndfile and run `tools.py get-plus4emu` "
                                   "again (kit/c16/INSTALL.md, 'What you need first')")
            if self.can_rewind() and not self.parked.get("jam"):
                # Done between Run calls, at the TED cycle boundary before the stop: plus4emu starts
                # (or stops) the tape's clock only when a Run call begins, so a replay can do the
                # same at the same cycle only if the tape goes in between two calls.
                self.pending = ("media", {"kind": kind, "path": path}, item)
                return "out"
            res, ops = self.do_media(kind, path)
            self.record(ops)
            return reply(item, res)
        if cmd == "program":
            path = os.path.abspath(a.get("path") or "")
            if not os.path.isfile(path):
                raise EmuError(f"no file {a.get('path')}")
            ok(L.Plus4VM_LoadProgram(vm, path.encode()), "program")
            self.record([("prg", path)])
            blob = open(path, "rb").read(2)
            return reply(item, {"path": path, "load_address": blob[0] | blob[1] << 8 if len(blob) == 2 else None})
        if cmd == "type":
            out = bytearray()
            for ch in a.get("text", ""):
                c = ord(ch.upper()) if "a" <= ch <= "z" else ord(ch)
                if ch == "\n":
                    out.append(13)
                elif 32 <= c < 96:
                    out.append(c)
            if out:
                self.typing = {"bytes": bytes(out), "pos": 0, "since": None}
            return reply(item, {"typed": len(out), "queued": True})
        raise EmuError(f"{cmd}: not answered at a stop")

    def kept_path(self, a):
        name = str(a.get("name") or "default")
        if not name.replace("-", "").replace("_", "").isalnum():
            raise EmuError("name: letters, digits, - and _")
        self.kept[name] = os.path.join(self.tmp, f"kept-{name}.p4emu")
        return self.kept[name]

    def do_codemap(self, action, stopped):
        if action not in ("start", "read", "zap", "stop"):
            raise EmuError('action: "start", "read", "zap" or "stop"')
        if CMAP is not None:
            if action == "start":
                C.memset(CMAP, 0, C.sizeof(CMAP))
                L.Plus4VM_SetCodeMap(vm, CMAP)
                self.cmap_on, self.cmap_park = True, bytes(C.sizeof(CMAP)) if stopped else None
                return {"recording": True, "counts": "the library's"}
            if action == "zap":
                C.memset(CMAP, 0, C.sizeof(CMAP))
                if self.cmap_on and stopped:
                    self.cmap_park = bytes(C.sizeof(CMAP))
                return {"recording": self.cmap_on}
            counts = self.cmap_park if stopped and self.cmap_park is not None else bytes(CMAP)
            n = memoryview(counts).cast("I")
            ran = self.with_lengths([(k, n[k]) for k in range(65536) if n[k]])
            if action == "stop":
                L.Plus4VM_SetCodeMap(vm, None)
                self.cmap_on, self.cmap_park = False, None
            return {"recording": self.cmap_on, "instructions": ran}
        if action == "start":
            self.codemap = {}
            if stopped:
                self.set_trace(True)
            return {"recording": True, "counts": "a callback on every instruction"}
        if action == "zap":
            if self.codemap is not None:
                self.codemap = {}
            return {"recording": self.codemap is not None}
        ran = self.with_lengths(sorted((self.codemap or {}).items()))
        if action == "stop":
            self.codemap = None
            if stopped:
                self.set_trace(False)
        return {"recording": self.codemap is not None, "instructions": ran}

    def with_lengths(self, counts):
        """[address, length, count]: the length as the 6502 decodes the byte there now."""
        out = []
        for a, n in counts:
            d = decode(self.peek("cpu", a, 1), 0)
            out.append([a, d[2] if d else 1, n])
        return out

    def do_sound(self, action, path):
        if action == "start":
            self.sound = {"start": self.parked["stamp"] if self.parked else self.stamp(), "writes": []}
            self.sync_bps()
            return {"start": self.sound["start"]}
        if action != "stop":
            raise EmuError('action: "start" or "stop"')
        if self.sound is None:
            raise EmuError("no capture running: sound start first")
        cap, self.sound = self.sound, None
        self.sync_bps()
        out = {"format": "kit-c16-sound", "clock": CLOCK, "frame": FRAME, "model": args.model, "start": cap["start"],
               "end": self.parked["stamp"] if self.parked else self.stamp(), "writes": cap["writes"]}
        if not path:
            return dict(out, count=len(cap["writes"]))
        full = inside_root(path)
        with open(full, "w") as f:
            json.dump(out, f)
        return {"path": full, "count": len(cap["writes"]), "start": out["start"], "end": out["end"]}


def key_code(a):
    """plus4emu's key code (row x 8 + column) for a key given by name or by its place in the matrix."""
    if a.get("row") is not None:
        r, c = int(a["row"]), int(a.get("column", a.get("col", 0)))
        if not (0 <= r < 8 and 0 <= c < 8):
            raise EmuError("row and column: 0 to 7")
        return r * 8 + c
    k = a.get("key")
    if isinstance(k, int):
        if not 0 <= k < 64:
            raise EmuError("a key code is row x 8 + column, 0 to 63")
        return k
    name = str(k or "")
    name = name if name in MATRIX else KEY_ALIASES.get(name.upper(), name.upper())
    if name not in MATRIX:
        raise EmuError(f"no key {k!r}; the keys: {', '.join(MATRIX)}")
    return MATRIX.index(name)


def hello():
    return {"server": "kit plus4emu server", "protocol": PROTOCOL, "plus4emu": PLUS4EMU, "model": MODEL["name"],
            "model_id": args.model, "ram_kb": MODEL["ram"], "python": sys.version.split()[0], "clock": CLOCK,
            "frame": FRAME, "spaces": {k: [f"${lo:04X}", f"${hi:04X}"] for k, (lo, hi) in SPACES.items()},
            "commands": list(COMMANDS), "workarounds": WORKAROUNDS, "keys": MATRIX,
            "codemap": "the library's counters" if CMAP is not None else "a callback on every instruction",
            "roms": args.roms, "root": ROOT, "pid": os.getpid()}


# ------------------------------------------------------------------ TED's video stream to a PNG
_palette = None


def palette():
    global _palette
    if _palette is None:
        r, g, b = C.c_float(), C.c_float(), C.c_float()
        _palette = []
        for c in range(256):
            L.Plus4_ColorToRGB(c, 0, C.byref(r), C.byref(g), C.byref(b))
            _palette.append(bytes(max(0, min(255, int(v.value * 255 + 0.5))) for v in (r, g, b)))
    return _palette


def write_png(path, data):
    """TED's output: per half-cycle a flags byte (2: four colour bytes follow, else one; 16
    vertical and 32 horizontal blanking; 64 vertical sync), each colour four pixels wide."""
    ents, i = [], 0
    while i < len(data):
        fl = data[i]
        n = 4 if fl & 2 else 1
        ents.append((fl, data[i + 1:i + 1 + n]))
        i += 1 + n
    vs = [k for k in range(1, len(ents)) if ents[k][0] & 0x40 and not ents[k - 1][0] & 0x40]
    if len(vs) < 2:
        raise EmuError("screenshot: no whole frame in the video stream")
    frame = ents[vs[-2]:vs[-1]]
    pal = palette()
    rows, row = [], []
    for k, (fl, cols) in enumerate(frame):
        if k and fl & 0x20 and not frame[k - 1][0] & 0x20 and row:
            rows.append(row)
            row = []
        if not fl & 0x30:
            for c in (cols * 4 if len(cols) == 1 else cols):
                row.append(pal[c])
    if row:
        rows.append(row)
    rows = [r for r in rows if r]
    w = max(len(r) for r in rows)
    raw = b"".join(b"\0" + b"".join(r) + b"\0\0\0" * (w - len(r)) for r in rows)

    def png_chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", struct.pack(">IIBBBBB", w, len(rows), 8, 2, 0, 0, 0)) + \
        png_chunk(b"IDAT", zlib.compress(raw, 6)) + png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    return w, len(rows)


# ------------------------------------------------------------------ the socket side
def reply(item, obj):
    if item is None or item.get("done"):
        return None
    obj = dict(obj)
    obj.setdefault("ok", True)
    item["r"] = obj
    item["done"] = True
    item["ev"].set()
    return None


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        for line in self.rfile:
            if not line.strip():
                continue
            try:
                a = json.loads(line)
                if not isinstance(a, dict):
                    raise ValueError("a JSON object")
            except ValueError as e:
                self.wfile.write((json.dumps({"ok": False, "error": f"not JSON: {e}"}) + "\n").encode())
                continue
            if a.get("cmd") == "hello":
                r = dict(hello(), ok=True)
            else:
                item = {"a": a, "ev": threading.Event()}
                emu.q.put(item)
                if not item["ev"].wait(24 * 3600):
                    item["done"] = True
                    r = {"ok": False, "error": "no answer in a day"}
                else:
                    r = item["r"]
            r = dict(r, id=a.get("id"))
            try:
                self.wfile.write((json.dumps(r) + "\n").encode())
                self.wfile.flush()
            except OSError:
                return


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def stopped_by_signal(*_):
    shutil.rmtree(emu.tmp, ignore_errors=True)
    os._exit(0)


if SERVING:
    emu = Emu()
    signal.signal(signal.SIGTERM, stopped_by_signal)
    signal.signal(signal.SIGINT, stopped_by_signal)
    srv = Server(("127.0.0.1", args.port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print(f"kit plus4emu server: plus4emu {PLUS4EMU}, {MODEL['name']}, on 127.0.0.1:{args.port}", flush=True)
    emu.main()
