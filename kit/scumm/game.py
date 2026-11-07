#!/usr/bin/env python3
"""A SCUMM game's resources, read from the disks it was sold on: the index, the rooms, the
global scripts, the objects and their scripts, the costumes and sounds as bytes. SCUMM is the
system Lucasfilm Games wrote its adventures in; each machine's release carries the same kinds of
resource, packed its own way, and an interpreter for that machine. This module unpacks them;
scode.py decodes the scripts.

  Game(folder)                  the game whose disk images are in folder (names below)
  game.script(n)                a global script's resource, as the interpreter holds it in memory:
                                its two-byte length first, the code from game.HEADER
  game.room(n)                  a room's resource, as the interpreter holds it
  game.objects(n)               [Obj] of the room: number, offset of its code block in the room,
                                its name, and {verb: offset} of its scripts
  game.entry(n), game.exit(n)   offsets in the room of its entry and exit scripts (0: none)
  game.code(where, number, room)  (bytes, start, end) of the script a trace names: where is g
                                (global), r (in a room: an object, or entry 10002 / exit 10001) or
                                i (an object carried in the inventory), as kit/scumm/strace.py reads
  game.scripts()                every script of the game: [(where, number, room, bytes, entries)]

Versions and machines read, and the disk images each needs (any of .d64 and .g64 for a 1541
disk, read through kit/c64/disk.py; the names are the ones ScummVM looks for):

  zak     Zak McKracken and the Alien Mindbenders, Commodore 64: version 1, zak1.d64 (side 1)
          and zak2.d64 (side 2)
  maniac  Maniac Mansion, Commodore 64: version 0, maniac1.d64 and maniac2.d64 (the counts are
          ScummVM's; kit/scumm/test_scode.py reads only the version 1 layout, and scode.py
          decodes versions 1 and 2)

How the C64 releases pack them, from the disks and from ScummVM's reader (engines/scumm/file.cpp,
resource_v2.cpp), checked against what ScummVM runs (kit/scumm/test_scummvm.py): side 1 starts at
track 1 sector 0 with $0A31 and the index, side 2 with $0132. The index is the object flags (a
byte each: owner in the low four bits, state in the high), then for each room its side (the character 1 or 2), then for
each room its first sector and track, then for each costume, script and sound the room it is
stored with and an offset, a word, into that room's file. A room's file runs on from its first
sector through the sectors in their order on the disk (track 1 sector 0, 1, ... then track 2):
the room first, then the resources stored with it, each starting with its length, a word that
counts itself. In memory a resource keeps that length; a script's code starts four bytes in.

Run as a script: game.py <folder> [index | rooms | scripts | room N | objects N]
"""
import os, signal, sys
from dataclasses import dataclass, field

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "c64"))

HEADER = 4          # a script's code starts this far into its resource (versions 0-2)
SPT = [0] + [21] * 17 + [19] * 7 + [18] * 6 + [17] * 10      # sectors on each track of a 1541 disk

# id: (title, version, platform, objects, rooms, costumes, scripts, sounds, image names)
GAMES = {
    "zak": ("Zak McKracken and the Alien Mindbenders", 1, "c64", 775, 59, 38, 155, 127, ("zak1", "zak2")),
    "maniac": ("Maniac Mansion", 0, "c64", 256, 55, 25, 160, 70, ("maniac1", "maniac2")),
}


class GameError(Exception):
    pass


@dataclass
class Obj:
    number: int
    offset: int                 # of its code block in the room's resource
    size: int
    name: str
    verbs: dict = field(default_factory=dict)    # verb -> offset from the code block's start
    name_at: int = 0            # offset of the name from the code block's start
    klass: int = 0
    # where it is in the room, in pixels (versions 1 and 2; ScummVM's resetRoomObject reads them
    # the same way): its box, where an actor walks to reach it, and the object (0: none) it can
    # be found only with, when that one's state is parent_state
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    walk_x: int = 0
    walk_y: int = 0
    parent: int = 0
    parent_state: int = 0


def find_images(folder, names):
    out = []
    for n in names:
        for ext in (".d64", ".g64", ".D64", ".G64"):
            p = os.path.join(folder, n + ext)
            if os.path.isfile(p):
                out.append(p)
                break
        else:
            out.append(None)
    return out


class C64Side:
    """A 1541 disk's sectors in the order a SCUMM room file runs through them."""
    def __init__(self, path):
        from disk import Disk
        d = Disk(path)
        self.path = path
        self.blob = bytearray()
        self.missing = []
        for t in range(1, 36):
            for s in range(SPT[t]):
                b = d.sectors.get((t, s))
                if b is None:
                    self.missing.append((t, s))
                    b = bytes(256)
                self.blob += b

    def at(self, track, sector):
        return (sum(SPT[1:track]) + sector) * 256


class Game:
    def __init__(self, folder, game=None):
        self.folder = folder
        if game is None:
            for gid, row in GAMES.items():
                if find_images(folder, row[8])[0]:
                    game = gid
                    break
            else:
                raise GameError(f"{folder}: no disk image the kit knows a SCUMM game by "
                                f"({', '.join(r[8][0] + '.d64' for r in GAMES.values())})")
        self.id = game
        (self.title, self.version, self.platform, self.n_objects, self.n_rooms, self.n_costumes,
         self.n_scripts, self.n_sounds, names) = GAMES[game]
        paths = find_images(folder, names)
        if not paths[0]:
            raise GameError(f"{folder}: no {names[0]}.d64 or .g64")
        self.sides = {1: C64Side(paths[0])}
        if paths[1]:
            self.sides[2] = C64Side(paths[1])
        self._read_index()
        self._rooms = {}

    def _read_index(self):
        b = self.sides[1].blob
        if b[0] | b[1] << 8 != 0x0A31:
            raise GameError(f"{self.sides[1].path}: no $0A31 at track 1 sector 0, where side 1's index starts")
        if 2 in self.sides and self.sides[2].blob[0] | self.sides[2].blob[1] << 8 != 0x0132:
            raise GameError(f"{self.sides[2].path}: no $0132 at track 1 sector 0, where side 2 starts")
        p = 2
        self.object_flags = list(b[p:p + self.n_objects]); p += self.n_objects
        self.room_side = list(b[p:p + self.n_rooms]); p += self.n_rooms
        self.room_start = []
        for i in range(self.n_rooms):
            self.room_start.append((b[p + 1], b[p])); p += 2           # (track, sector)
        self.index = {}
        for kind, n in (("costume", self.n_costumes), ("script", self.n_scripts), ("sound", self.n_sounds)):
            rooms = list(b[p:p + n]); p += n
            offs = [b[p + 2 * i] | b[p + 2 * i + 1] << 8 for i in range(n)]; p += 2 * n
            self.index[kind] = [(r, o) for r, o in zip(rooms, offs)]
        self.index_end = p

    def _room_file_at(self, room):
        side = self.room_side[room]
        side = side - ord("0") if side in (ord("1"), ord("2")) else side     # the C64's sides are "1" and "2"
        if side not in self.sides:
            raise GameError(f"room {room} is on side {side}, and there is no image of it")
        track, sector = self.room_start[room]
        if not 1 <= track <= 35:
            raise GameError(f"room {room}: no file (track {track}, sector {sector})")
        d = self.sides[side]
        return d, d.at(track, sector)

    def room_file_size(self, room):
        """How far room `room`'s file can run: to the start of the next room's file on its side."""
        d, base = self._room_file_at(room)
        nxt = len(d.blob)
        for r in range(1, self.n_rooms):
            try:
                d2, b2 = self._room_file_at(r)
            except GameError:
                continue
            if d2 is d and base < b2 < nxt:
                nxt = b2
        return nxt - base

    def resource_at(self, room, offset):
        """The resource at `offset` in room `room`'s file: its length word, counting itself, first.
        An index entry the game never uses can point at bytes that are not a resource: one that
        would run into the next room's file is refused."""
        d, base = self._room_file_at(room)
        p = base + offset
        n = d.blob[p] | d.blob[p + 1] << 8
        if n < 2 or offset + n > self.room_file_size(room):
            raise GameError(f"room {room} offset {offset:04X}: a length of {n}, which runs past the room's file")
        return bytes(d.blob[p:p + n])

    def resource(self, kind, n):
        if kind == "room":
            return self.room(n)
        room, off = self.index[kind][n]
        if off == 0xFFFF or room == 0 and off == 0:
            return None
        return self.resource_at(room, off)

    def script(self, n):
        return self.resource("script", n)

    def room(self, n):
        if n not in self._rooms:
            self._rooms[n] = self.resource_at(n, 0)
        return self._rooms[n]

    def has_room(self, n):
        try:
            self.room(n)
            return True
        except (GameError, IndexError):
            return False

    # ---- what is in a room (versions 0-2: engines/scumm/room.cpp, object.cpp) ----

    def entry(self, n):
        r = self.room(n)
        return r[0x1A] | r[0x1B] << 8

    def exit(self, n):
        r = self.room(n)
        return r[0x18] | r[0x19] << 8

    def objects(self, n):
        r = self.room(n)
        count = r[20]
        out = []
        for i in range(count):
            p = 28 + 2 * count + 2 * i
            off = r[p] | r[p + 1] << 8
            ob = r[off:]
            size = ob[0] | ob[1] << 8
            number = ob[4] | ob[5] << 8
            name_at = ob[13] if self.version == 0 else ob[14]
            verbs, q = {}, 14 if self.version == 0 else 15
            while ob[q]:
                verbs.setdefault(ob[q], ob[q + 1])
                q += 2
            name = bytearray()
            k = name_at
            while k < size and ob[k]:
                name.append(ob[k] & 0x7F); k += 1
            o = Obj(number, off, size, name.decode("latin-1"), verbs, name_at, ob[6])
            if self.version >= 1:     # ScummEngine_v4::resetRoomObject, from two bytes before the block
                o.x, o.y, o.width, o.height = ob[7] * 8, (ob[8] & 0x7F) * 8, ob[9] * 8, ob[13] & 0xF8
                o.walk_x, o.walk_y = ob[11] * 8, (ob[12] & 0x1F) * 8
                o.parent, o.parent_state = ob[10], 8 if ob[8] & 0x80 else 0
            out.append(o)
        for o in out:               # the parent is the room's object slot, counted from 1: its number here
            o.parent = out[o.parent - 1].number if 0 < o.parent <= len(out) else 0
        return out

    def object(self, number):
        """(room, Obj) of the object of that number, or None."""
        if not hasattr(self, "_objects"):
            self._objects = {}
            for room in range(1, self.n_rooms):
                if self.has_room(room):
                    for o in self.objects(room):
                        self._objects.setdefault(o.number, (room, o))
        return self._objects.get(number)

    def code(self, where, number, room=None):
        """(bytes, start, end): the resource a trace's instruction is read from, as the
        interpreter holds it, and where the script's code runs in it. A global script is its own
        resource; a room's and an object's scripts run in the room's resource; an object carried
        in the inventory runs in a copy of its code block."""
        if where == "g":
            b = self.script(number)
            if b is None:
                raise GameError(f"no global script {number}")
            return b, HEADER, len(b)
        if where == "r":
            r = self.room(room)
            if number in (10001, 10002):
                start = self.exit(room) if number == 10001 else self.entry(room)
                ends = sorted(x for x in [self.exit(room), self.entry(room), len(r)] if x > start)
                return r, start, ends[0] if ends else len(r)
            for o in self.objects(room):
                if o.number == number:
                    return r, o.offset, o.offset + o.size
            raise GameError(f"no object {number} in room {room}")
        if where == "i":
            found = self.object(number)
            if not found:
                raise GameError(f"no object {number} in any room")
            room, o = found
            r = self.room(room)
            return r[o.offset:o.offset + o.size], 0, o.size
        raise GameError(f"scripts of kind {where!r} are not in versions 0-2")

    def scripts(self):
        """Every script: [(where, number, room, bytes, start, entries)]: entries are the offsets the
        interpreter starts it at (a global script's start; an object's verbs)."""
        out = []
        self.unreadable = []
        for n in range(1, self.n_scripts):
            try:
                b = self.script(n) if self.index["script"][n][0] else None
            except GameError as e:      # an entry the game never uses can point past its room's file
                self.unreadable.append(("g", n, str(e)))
                continue
            if b:
                out.append(("g", n, None, b, HEADER, {"start": HEADER}))
        for room in range(1, self.n_rooms):
            if not self.has_room(room):
                continue
            r = self.room(room)
            for num, start in ((10002, self.entry(room)), (10001, self.exit(room))):
                if start:
                    out.append(("r", num, room, r, start, {"entry" if num == 10002 else "exit": start}))
            for o in self.objects(room):
                entries = {f"verb {v}": o.offset + off for v, off in o.verbs.items() if off}
                out.append(("r", o.number, room, r, o.offset, entries))
        return out


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    g = Game(argv[0])
    cmd = argv[1] if len(argv) > 1 else "index"
    if cmd == "index":
        print(f"{g.title}, SCUMM version {g.version}, {g.platform}: {g.n_objects} objects, {g.n_rooms} rooms, "
              f"{g.n_costumes} costumes, {g.n_scripts} scripts, {g.n_sounds} sounds; index {g.index_end} bytes")
        for kind in ("costume", "script", "sound"):
            used = sum(1 for r, o in g.index[kind] if r)
            print(f"  {kind}s: {used} stored")
    elif cmd == "rooms":
        for n in range(1, g.n_rooms):
            if g.has_room(n):
                r = g.room(n)
                side = g.room_side[n]
                side = side - ord("0") if side in (ord("1"), ord("2")) else side
                print(f"room {n:2}: side {side}, track {g.room_start[n][0]:2} sector {g.room_start[n][1]:2}, "
                      f"{len(r):5} bytes, {r[4] * 8}x{r[5] * 8}, {r[20]} objects, entry {g.entry(n):04X}, exit {g.exit(n):04X}")
    elif cmd == "scripts":
        for n, (room, off) in enumerate(g.index["script"]):
            if room:
                try:
                    print(f"script {n:3}: room {room:2} offset {off:04X}, {len(g.script(n)):5} bytes")
                except GameError as e:
                    print(f"script {n:3}: {e}")
    elif cmd == "objects":
        for o in g.objects(int(argv[2])):
            verbs = " ".join(f"{v}:{off:02X}" for v, off in o.verbs.items())
            where = f"x {o.x:3} y {o.y:3} {o.width:3}x{o.height:<3}" + (
                f" shown with object {o.parent} in state {o.parent_state}" if o.parent else "")
            print(f"object {o.number:4} at {o.offset:04X}, {o.size:4} bytes, {where}, {o.name!r}: {verbs}")
    elif cmd == "room":
        r = g.room(int(argv[2]))
        print(f"{len(r)} bytes: {r[:32].hex(' ')}")
    else:
        sys.exit(f"game.py: no command {cmd!r}; see -h")
    return 0


if __name__ == "__main__":
    if hasattr(signal, "SIGPIPE"):        # quietly, when the output is cut short (| head)
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    sys.exit(main(sys.argv[1:]))
