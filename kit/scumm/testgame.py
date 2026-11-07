#!/usr/bin/env python3
"""A SCUMM game the kit writes itself, so that ScummVM can be run and its trace checked without
anyone's disks: two C64 disk images laid out as Zak McKracken's are (kit/scumm/game.py says how),
holding two small rooms and scripts that run every SCUMM version 1 instruction ScummVM can run
without the game's own data. kit/scumm/test_scummvm.py runs it in the kit's ScummVM.

  write(folder)       zak1.d64 and zak2.d64 into folder (ScummVM takes them for the C64 Zak)
  EXPECT              {(where, number, room, at): (end, why)}: where each conditional jump in
                      the test game must go, worked out from the condition scode.py writes for it
  NOT_RUN             the handlers the test game leaves out, and why
  Asm, Var            an assembler for SCUMM version 1 and 2 scripts: Asm().op(name, operands),
                      or Asm().name(operands); Var(n) is a parameter read from variable n

The test game has no costumes, sounds or tunes, so actors are not drawn and nothing plays;
startSound and startMusic, which need a tune, are left out. The scripts end with restart, so the
game runs again from the start until the run is stopped.

Run as a script: testgame.py <folder>
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scode  # noqa: E402

SIDE_1_TAG, SIDE_2_TAG = 0x0A31, 0x0132
OBJECTS, ROOMS, COSTUMES, SCRIPTS, SOUNDS = 775, 59, 38, 155, 127
SPT = [0] + [21] * 17 + [19] * 7 + [18] * 6 + [17] * 10      # sectors on each track of a 1541 disk
D64_SIZE = sum(SPT[1:36]) * 256      # 35 tracks
# How many resources each room's file holds, the room first: ScummVM reads that many from the
# room's first sector on (engines/scumm/file.cpp, zakResourcesPerFile)
RESOURCES_PER_FILE = [0, 29, 12, 14, 13, 4, 4, 10, 7, 4, 14, 19, 5, 4, 7, 6, 11, 9, 4, 4, 1, 3, 3, 5, 1, 9,
                      4, 10, 13, 6, 7, 10, 2, 6, 1, 11, 2, 5, 7, 1, 7, 1, 4, 2, 8, 6, 6, 6, 4, 13, 3, 1, 2, 1,
                      2, 1, 10, 1, 1]

NOT_RUN = {
    "startSound": "needs a sound resource, which the test game does not have",
    "startMusic": "needs a sound resource, which the test game does not have",
}


class Var(int):
    """A parameter read from variable n, where the instruction takes a variable or a constant."""


class Asm:
    """SCUMM version 1-2 instructions, assembled into bytes. Each handler is a method taking its
    operands in the order scode.READS reads them; a jump takes a label's name."""

    def __init__(self, version=1, platform="c64"):
        self.version, self.platform = version, platform
        self.code = bytearray()
        self.labels, self.fixups, self.expects = {}, [], {}

    def label(self, name):
        if name in self.labels:
            raise ValueError(f"label {name} twice")
        self.labels[name] = len(self.code)

    def assemble(self):
        out = bytearray(self.code)
        for at, name, end in self.fixups:
            off = self.labels[name] - end
            out[at:at + 2] = (off & 0xFFFF).to_bytes(2, "little")
        return bytes(out)

    def __getattr__(self, name):
        if name in scode.OPCODES_V12:
            return lambda *args, **kw: self.op(name, *args, **kw)
        raise AttributeError(name)

    def _read(self, spec, args):
        bits = used = 0
        for r in spec.split():
            if r[0] in "BW" and len(r) == 2:
                used |= scode.PARAM[r[1]]
                a = args.pop(0)
                if isinstance(a, Var):
                    bits |= scode.PARAM[r[1]]
                    self.code.append(int(a))
                elif r[0] == "B":
                    self.code.append(a & 0xFF)
                else:
                    self.code += (a & 0xFFFF).to_bytes(2, "little")
            elif r in ("V", "R", "RI", "b", "sb"):
                self.code.append(int(args.pop(0)) & 0xFF)
            elif r == "w":
                self.code += (args.pop(0) & 0xFFFF).to_bytes(2, "little")
            elif r == "J":
                self.fixups.append((len(self.code), args.pop(0), len(self.code) + 2))
                self.code += b"\0\0"
            elif r in ("S", "N"):
                t = args.pop(0)
                self.code += (t.encode("latin-1") if isinstance(t, str) else bytes(t)) + b"\0"
            else:
                raise ValueError(r)
        return bits, used

    def op(self, name, *args, expect=None):
        """Assemble one instruction; expect ("next" or "jump") is where a conditional jump must
        go when the test game runs."""
        args = list(args)
        at = len(self.code)
        self.code.append(0)
        bits = used = 0
        opcode = None
        if name == "delay":                  # three bytes: $FFFFFF less the frames to wait
            n = 0xFFFFFF - args.pop(0)
            self.code += n.to_bytes(3, "little")
        elif name == "actorOps":             # actor, value, sub-opcode [, name | palette]
            bits, used = self._read("B1 B2", args[:2])
            sub = args[2]
            self.code.append(sub)
            if sub == 3:
                self._read("N", args[3:4])
            elif sub == 2 and self.version == 2:
                self.code.append(args[3])
            args = []
        elif name == "doSentence":           # verb [, object, object, how]
            bits, used = self._read("B1", args[:1])
            if not (not isinstance(args[0], Var) and args[0] in (0xFB, 0xFC)):
                b2, u2 = self._read("W2 W3", args[1:3])
                bits, used = bits | b2, used | u2
                self.code.append(args[3])
            args = []
        elif name == "verbOps":              # 0, slot | $FF, verb, mode | verb, x, y, slot, preposition, name
            sub = args.pop(0)
            self.code.append(sub)
            spec = "B1" if sub == 0 else "b b" if sub == 0xFF else "b b B1 b N"
            bits, used = self._read(spec, args)
        elif name == "setVarRange":          # variable, [values], words
            var, values = args[0], args[1]
            words = len(args) > 2 and args[2]
            self.code += bytes([var, len(values)])
            for v in values:
                self.code += (v & 0xFFFF).to_bytes(2, "little") if words else bytes([v & 0xFF])
            opcode = 0xA6 if words else 0x26
            args = []
        elif name == "pseudoRoom":           # room, [resource numbers]
            self.code.append(args[0])
            self.code += bytes(args[1]) + b"\0"
            args = []
        elif name == "switchCostumeSet":
            if self.platform in ("c64", "nes"):
                self.code.append(args.pop(0))
        elif name == "beginOverride":        # the label escape goes to, in the jump that follows
            self.code.append(0x18)
            self.fixups.append((len(self.code), args.pop(0), len(self.code) + 2))
            self.code += b"\0\0"
        else:
            bits, used = self._read(scode.READS[name], args)
        if args:
            raise ValueError(f"{name}: operands left over: {args}")
        if opcode is None:
            found = [o for o, n in enumerate(scode.OPCODES_V12) if n == name and o & used == bits]
            if not found:
                raise ValueError(f"{name}: no opcode for those parameters")
            opcode = min(found)
        self.code[at] = opcode
        if expect:
            self.expects[at] = expect
        return at


# ---- the test game's objects, rooms and scripts ----

LAMP, BOX, KEY, DOOR = 100, 101, 102, 103
# where each object is: room, x, y, width, height (in 8-pixel cells), class, verbs
OBJECTS_AT = {
    LAMP: (1, 4, 8, 2, 2, 0x05, "LAMP"),
    BOX: (1, 30, 10, 3, 2, 0x00, "BOX"),
    KEY: (1, 18, 12, 1, 1, 0x00, "KEY"),
    DOOR: (2, 10, 6, 2, 4, 0x00, "DOOR"),
}


def verb_scripts(number):
    """{verb: Asm} of each object's scripts: each counts how often it ran in a variable of its own."""
    count = {LAMP: 170, BOX: 173, KEY: 172, DOOR: 174}[number]
    look = Asm()
    look.increment(count)
    look.stopObjectCode()
    out = {1: look}
    if number == BOX:           # USE shares LOOK's script: one offset in the verb table for both
        out[2] = look
    if number == LAMP:          # the verb any other verb falls back to
        other = Asm()
        other.increment(171)
        other.stopObjectCode()
        out[0xFF] = other
    return out


def counting_script(var):
    a = Asm()
    a.increment(var)
    a.stopObjectCode()
    return a


def boot():
    """Script 1, which ScummVM starts the game with."""
    a = Asm()
    n = iter(range(1000))

    def check(op, *args, expect):
        """A conditional jump to a label just past one instruction, so that going on and jumping
        are told apart: expect is where it must go, by the condition scode.py writes for it."""
        label = f"check{next(n)}"
        a.op(op, *args, label, expect=expect)
        a.increment(199)
        a.label(label)

    # -- the interpreter's own state, actors and interface
    a.assignVarByte(0, 1)                    # VAR_EGO: actor 1
    a.actorOps(0, 9, 5)                      # the default talk colour
    a.actorOps(1, 7, 1)                      # sound
    a.actorOps(1, 3, 5)                      # talk colour
    a.actorOps(1, 0, 3, "KIT")               # name
    a.actorOps(1, 1, 4)                      # costume 1
    a.actorOps(Var(0), 6, 2)                 # palette
    a.lights(11, 0, 0)
    a.cursorCommand(0xF601)                  # interface and cursor on
    a.resourceRoutines(1, 0x31)              # load room 1
    a.resourceRoutines(3, 0x51)              # load script 3
    a.resourceRoutines(3, 0x53)              # lock it
    a.resourceRoutines(3, 0x52)              # unlock it
    a.move(120, 3)
    a.resourceRoutines(Var(120), 0x50)       # nothing (the low four bits are 0)
    # -- variables 14 to 16 point: Var[14] holds 130, so a read of it reads Var[130]
    a.move(130, 7)
    a.move(14, 130)
    check("isEqual", 14, 7, expect="next")
    check("isEqual", 14, 130, expect="jump")
    a.add(14, 1)                             # add writes the pointer without reading through it
    check("isEqual", 14, 0, expect="next")   # Var[131], still 0
    a.pseudoRoom(1, [0x80 | 60])
    a.switchCostumeSet(0)
    a.op("dummy")
    a.verbOps(1, 1, 0, 0, 0, "LOOK")         # verb 1 in slot 1
    a.verbOps(2, 8, 0, Var(120), 0, "USE")   # verb 2 in slot 4
    a.verbOps(0xFF, 1, 1)                    # verb 1 on
    a.verbOps(0, 3)                          # slot 4 deleted
    # -- rooms: the entry script runs inside loadRoom
    a.loadRoom(1)
    check("isEqual", 141, 1, expect="next")
    a.putActorInRoom(1, 1)
    a.putActor(1, 10, 40)
    a.move(150, 30)
    a.putActorInRoom(2, Var(4))              # VAR_ROOM
    a.putActor(2, Var(150), 40)
    a.setCameraAt(20)
    a.panCameraTo(20)
    a.actorFollowCamera(1)
    a.roomOps(0, 39, 1)                      # scroll limits
    a.roomOps(5, 6, 2)                       # colours
    a.setBoxFlags(0, 0)
    # -- actors walking
    a.walkActorTo(1, 20, 40)
    a.waitForActor(1)
    a.walkActorToObject(1, LAMP)
    a.waitForActor(Var(0))
    a.walkActorToActor(1, 2, 3)
    a.waitForActor(1)
    a.faceActor(1, 2)
    a.faceActor(1, LAMP)
    a.animateActor(1, 249)                   # face a direction
    a.setActorElevation(1, 0)
    a.putActorAtObject(2, BOX)
    for i, h in enumerate(("getActorX", "getActorY", "getActorRoom", "getActorFacing", "getActorCostume",
                           "getActorElevation", "getActorMoving", "getActorWalkBox")):
        a.op(h, 200 + i, 1)
    check("isEqual", 202, 1, expect="next")  # actor 1 is in room 1
    check("isEqual", 207, 0, expect="next")  # in walk box 0
    a.actorFromPos(208, 20, 40)
    a.getClosestObjActor(209, 1)
    a.getDist(210, 1, 2)
    a.getDist(211, Var(0), LAMP)
    a.findObject(212, 4, 16)
    # -- objects
    a.getObjectOwner(213, LAMP)
    check("isEqual", 213, 15, expect="next")  # in a room
    a.setObjPreposition(LAMP, 2)
    a.getObjPreposition(214, LAMP)
    check("isEqual", 214, 2, expect="next")
    check("ifClassOfIs", LAMP, 0x04, expect="next")      # class $05 has all of $04
    check("ifClassOfIs", LAMP, 0x02, expect="jump")
    a.move(121, 2)
    a.move(122, LAMP)
    check("ifClassOfIs", Var(122), Var(121), expect="jump")
    a.drawObject(LAMP, 0xFF, 0xFF)
    a.drawObject(BOX, 30, 10)
    a.setObjectName(BOX, "CRATE")
    a.setOwnerOf(BOX, 3)
    a.setOwnerOf(BOX, 15)
    # each state bit set and cleared, and tested both ways each time; ScummVM's names: an ifState
    # handler goes on when the state is the other way from its name (scode.STATE_OPS)
    a.move(122, LAMP)
    for on, off in (("IntrinsicOn", "IntrinsicOff"), ("Locked", "Unlocked"), ("Untouchable", "Touchable"),
                    ("Pickupable", "Unpickupable")):
        a.op("setState" + on, LAMP)
        check("ifState" + on, LAMP, expect="jump")
        check("ifState" + off, Var(122), expect="next")
        a.op("setState" + off, Var(122))
        check("ifState" + on, Var(122), expect="next")
        check("ifState" + off, LAMP, expect="jump")
    # -- sentences: queued (ScummVM's script 2 runs it), run at once, and shown
    a.doSentence(1, LAMP, 0, 0)
    a.waitForSentence()
    check("isEqual", 170, 1, expect="next")
    a.doSentence(2, LAMP, 0, 1)              # a verb the lamp falls back on
    check("isEqual", 171, 1, expect="next")
    a.move(123, 1)
    a.move(124, LAMP)
    a.doSentence(Var(123), Var(124), Var(198), 2)
    a.drawSentence()
    a.doSentence(0xFB)
    a.doSentence(0xFC)
    a.move(126, BOX)
    a.doSentence(1, Var(126), 0, 1)
    check("isEqual", 173, 1, expect="next")
    a.pickupObject(KEY)
    a.doSentence(1, KEY, 0, 1)               # its script runs from the inventory
    check("isEqual", 172, 1, expect="next")
    # -- text
    a.print(1, "HELLO")
    a.waitForMessage()
    a.printEgo("BYE")
    a.waitForMessage()
    # -- variables
    a.move(100, 5)
    a.move(101, Var(100))
    a.add(100, 3)
    a.add(100, Var(101))
    a.subtract(100, 2)
    a.subtract(100, Var(101))
    a.increment(100)
    a.decrement(100)
    check("isEqual", 100, 6, expect="next")
    a.assignVarByte(102, 103)
    a.assignVarWordIndirect(102, 1000)       # Var[103] = 1000
    a.addIndirect(102, 7)
    a.subIndirect(102, Var(101))
    check("isEqual", 103, 1002, expect="next")
    a.setVarRange(110, [1, 2, 3])
    a.setVarRange(113, [-300, 400], True)
    check("isEqual", 113, -300, expect="next")
    a.setBitVar(4800, 3, 1)                  # bit 3 of Var[300]
    a.getBitVar(115, 4800, 3)
    check("isEqual", 115, 1, expect="next")
    a.setBitVar(4800, Var(120), Var(198))    # cleared again (Var[198] is never set)
    a.getRandomNr(116, 9)
    # each comparison with the variable greater, equal and less than the value
    a.move(117, 5)
    for op, holds in (("isEqual", (False, True, False)), ("isNotEqual", (True, False, True)),
                      ("isGreater", (False, False, True)), ("isGreaterEqual", (False, True, True)),
                      ("isLess", (True, False, False)), ("isLessEqual", (True, True, False))):
        for value, h in zip((4, 5, 6), holds):
            check(op, 117, value, expect="next" if h else "jump")
    check("isLess", 117, Var(100), expect="jump")         # 5 > 6 does not hold
    check("equalZero", 198, expect="next")
    check("notEqualZero", 198, expect="jump")
    check("equalZero", 117, expect="jump")
    check("notEqualZero", 117, expect="next")
    a.jumpRelative("over")                   # forward, back, and forward again
    a.label("back")
    a.increment(199)
    a.jumpRelative("done")
    a.label("over")
    a.jumpRelative("back")
    a.label("done")
    # -- scripts
    a.startScript(3)                         # a background loop
    a.breakHere()
    a.isScriptRunning(130, 3)
    check("isEqual", 130, 1, expect="next")
    a.delay(3)
    a.move(131, 2)
    a.delayVariable(131)
    a.stopScript(3)
    a.isScriptRunning(130, 3)
    check("isEqual", 130, 0, expect="next")
    a.startScript(8)                         # chains to script 9
    check("isEqual", 181, 1, expect="next")
    a.move(132, 7)
    a.startScript(Var(132))                  # stops itself
    check("isEqual", 182, 1, expect="next")
    a.cutscene()
    a.beginOverride("overridden")
    a.increment(133)
    a.label("overridden")
    a.op("endCutscene")
    # -- sounds that are not playing
    a.isSoundRunning(134, 1)
    a.stopSound(1)
    a.stopMusic()
    # -- another room, on the other disk, and back
    a.loadRoomWithEgo(DOOR, 2, -1, -1)
    check("isEqual", 143, 1, expect="next")  # room 2's entry script ran
    a.doSentence(1, DOOR, 0, 1)
    a.loadRoom(1)
    check("isEqual", 144, 1, expect="next")  # room 2's exit script ran
    a.saveLoadGame(135, 2)                   # save
    a.breakHere()
    # -- clicks: 120 frames for the input's verb, object and sentence lines to click, and its until
    # lines to see what script 4 kept of each
    a.move(190, 1)
    a.label("clicks")
    a.breakHere()
    a.increment(191)
    a.op("isGreaterEqual", 191, 120, "clicked")
    a.jumpRelative("clicks")
    a.label("clicked")
    a.restart()
    return a


def background():
    """Script 3: counts frames until it is stopped."""
    a = Asm()
    a.label("loop")
    a.increment(160)
    a.breakHere()
    a.jumpRelative("loop")
    return a


def sentence():
    """Script 2: ScummVM runs it for a sentence queued, with its verb and objects in variables 8, 9
    and 10 (and in 18 whether the object has a script for the verb); it runs the verb's script."""
    a = Asm()
    a.doSentence(Var(8), Var(9), Var(10), 1)
    a.stopObjectCode()
    return a


def input_script():
    """Script 4: ScummVM runs it for each click and key (versions 1 and 2), with where it was in
    VAR_CLICK_AREA; it keeps what each click hit, for test_scummvm.py's until lines to wait for."""
    a = Asm()
    a.op("isEqual", 32, 1, "not_verb")       # VAR_CLICK_AREA 1: a verb, in VAR_CLICK_VERB
    a.move(186, Var(33))
    a.label("not_verb")
    a.op("isEqual", 32, 2, "not_room")       # 2: the room, at VAR_VIRT_MOUSE_X and Y
    a.findObject(187, Var(30), Var(31))
    a.label("not_room")
    a.op("isEqual", 32, 3, "not_inventory")  # 3: the inventory, the object in VAR_CLICK_OBJECT
    a.move(188, Var(35))
    a.label("not_inventory")
    a.op("isEqual", 32, 5, "not_sentence")   # 5: the sentence line
    a.increment(184)
    a.label("not_sentence")
    a.stopObjectCode()
    return a


def room_entered():
    """Script 5: ScummVM runs it after every room it enters (version 1 and 2)."""
    return counting_script(145)


def chaining():
    a = Asm()
    a.increment(180)
    a.chainScript(9)
    return a


def chained():
    return counting_script(181)


def stops_itself():
    a = Asm()
    a.increment(182)
    a.stopScript(0)
    return a


GLOBAL_SCRIPTS = {1: boot, 2: sentence, 3: background, 4: input_script, 5: room_entered, 7: stops_itself, 8: chaining, 9: chained}
ROOM_SCRIPTS = {1: (141, 142), 2: (143, 144)}       # room: (variable its entry counts, its exit)


# ---- packing ----

def rle(data):
    """data packed as GdiV1::decodeV1Gfx unpacks it: four bytes it can repeat by a code of their
    own (all 0 here), then runs: $40+n and a byte for n+1 of it, n for the n+1 bytes after."""
    out, i = bytearray(4), 0
    while i < len(data):
        j = i
        while j < len(data) and data[j] == data[i] and j - i < 64:
            j += 1
        if j - i >= 2:
            out += bytes([0x40 | (j - i - 1), data[i]])
            i = j
            continue
        k = i + 1
        while k < len(data) and k - i < 64 and not (k + 1 < len(data) and data[k] == data[k + 1]):
            k += 1
        out.append(k - i - 1)
        out += data[i:k]
        i = k
    return bytes(out)


def obcd(number, x, y, w, h, klass, name, scripts):
    """An object's code block: its header, its verbs' offsets, its name, its scripts."""
    head = bytearray(15)
    head[4:6] = number.to_bytes(2, "little")
    head[6], head[7], head[8], head[9] = klass, x, y, w
    head[11], head[12], head[13] = x, y + h, (h * 8) & 0xF8
    table_len = 2 * len(scripts) + 1
    name_at = 15 + table_len
    p = name_at + len(name) + 1
    table = bytearray()
    body = bytearray()
    placed = {}                 # a script that several verbs share is written once
    for verb, asm in scripts.items():
        if id(asm) not in placed:
            placed[id(asm)] = p + len(body)
            body += asm.assemble()
        table += bytes([verb, placed[id(asm)]])
    head[14] = name_at
    block = head + table + b"\0" + name.encode("latin-1") + b"\0" + body
    if len(block) > 255:
        raise ValueError(f"object {number}: {len(block)} bytes, where a verb's offset is one byte")
    block[0:2] = len(block).to_bytes(2, "little")
    return bytes(block)


def room(number):
    """Room `number`'s resource: header, box, graphics, objects, exit and entry scripts."""
    width, height = 40, 16
    objs = [(o, row) for o, row in OBJECTS_AT.items() if row[0] == number]
    head = bytearray(28)
    head[4], head[5] = width, height
    head[6:10] = bytes([0, 11, 12, 5])
    head[20] = len(objs)
    table_at = 28
    box_at = table_at + 4 * len(objs)
    box = bytes([1, 20, 60, 0, 39, 0, 39, 0, 0]) + bytes([0, 0])     # one box over the floor, its matrix
    chars = bytearray(2048)
    chars[8:16] = b"\x55" * 8                # 1: the room's first colour
    chars[16:24] = b"\xAA" * 8               # 2: its second
    chars[24:32] = b"\xFF" * 8               # 3: each cell's own colour
    pic = bytearray()
    for x in range(width):                   # column by column
        for y in range(height):
            pic.append(3 if x in (0, width - 1) else 1 if y < 10 else 2)
    colours = bytes([number + 1] * (width * height))
    gfx = [rle(bytes(chars)), rle(bytes(pic)), rle(colours), rle(bytes(width * height))]
    mask = rle(b"\xFF" * 8)                  # mask character 0: masks nothing
    out = bytearray(head) + bytes(4 * len(objs)) + box
    for k, part in enumerate(gfx):
        head_at = 10 + 2 * k
        out[head_at:head_at + 2] = len(out).to_bytes(2, "little")
        out += part
    out[18:20] = len(out).to_bytes(2, "little")
    out += (8 + 8).to_bytes(2, "little")     # ScummVM unpacks this less 8 bytes (gfx.cpp, bug #3458)
    out += mask
    for i, (o, row) in enumerate(objs):
        _, x, y, w, h, klass, name = row
        at = len(out)
        out[table_at + 2 * i:table_at + 2 * i + 2] = at.to_bytes(2, "little")
        image = bytes([3] * (w * h)) + bytes([7] * (w * h)) + bytes(w * h)   # characters, colours, masks
        out += rle(image)
    for i, (o, row) in enumerate(objs):
        _, x, y, w, h, klass, name = row
        at = len(out)
        p = table_at + 2 * len(objs) + 2 * i
        out[p:p + 2] = at.to_bytes(2, "little")
        out += obcd(o, x, y, w, h, klass, name, verb_scripts(o))
    entry_var, exit_var = ROOM_SCRIPTS[number]
    out[24:26] = len(out).to_bytes(2, "little")
    out += counting_script(exit_var).assemble()
    out[26:28] = len(out).to_bytes(2, "little")
    out += counting_script(entry_var).assemble()
    out[21] = box_at
    out[0:2] = len(out).to_bytes(2, "little")
    return bytes(out)


def script_resource(code):
    return (len(code) + 4).to_bytes(2, "little") + b"\0\0" + code


def costume():
    """A costume with no animations, in version 1's format ($57): enough for ScummVM to put an
    actor in a room, which draws nothing for it (engines/scumm/costume.cpp, ClassicCostumeLoader)."""
    res = bytearray(32)
    res[0:2] = len(res).to_bytes(2, "little")
    res[4], res[5] = 0, 0x57          # animations, format
    return bytes(res)


COSTUMES_USED = (1, 2)      # version 1 gives actor n costume n to start with (scumm.cpp, "from IDB")


def files():
    """{room: [resources]} of each room's file, {script: (room, offset)} and {costume: (room, offset)}."""
    per_room = {1: [room(1)], 2: [room(2)]}
    where, costumes = {}, {}
    for n in COSTUMES_USED:
        costumes[n] = (1, sum(len(x) for x in per_room[1]))
        per_room[1].append(costume())
    for n, make in sorted(GLOBAL_SCRIPTS.items()):
        r = 2 if n == 9 else 1              # one script is stored with room 2, on the other disk
        where[n] = (r, sum(len(x) for x in per_room[r]))
        per_room[r].append(script_resource(make().assemble()))
    for r, res in per_room.items():
        if len(res) > RESOURCES_PER_FILE[r]:
            raise ValueError(f"room {r}: {len(res)} resources, where ScummVM reads {RESOURCES_PER_FILE[r]}")
        res += [b"\x02\x00"] * (RESOURCES_PER_FILE[r] - len(res))     # empty resources: a length alone
    return per_room, where, costumes


def sector_at(track, sector):
    return (sum(SPT[1:track]) + sector) * 256


def write(folder):
    """zak1.d64 and zak2.d64 of the test game into folder; returns the folder."""
    per_room, where, costumes = files()
    sides = {1: bytearray(D64_SIZE), 2: bytearray(D64_SIZE)}
    index = bytearray(SIDE_1_TAG.to_bytes(2, "little"))
    index += bytes([0x0F] * OBJECTS)                   # every object in a room, state 0
    # room 1 on side 1 after the index, room 2 on side 2 after its tag
    layout = {}
    index_len = 2 + OBJECTS + ROOMS * 3 + (COSTUMES + SCRIPTS + SOUNDS) * 3
    starts = {1: (1, 1, (index_len + 255) // 256), 2: (2, 1, 1)}
    for r, (side, track, sector) in starts.items():
        blob = b"".join(per_room[r])
        p = sector_at(track, sector)
        sides[side][p:p + len(blob)] = blob
        layout[r] = (side, track, sector)
    index += bytes(ord(str(layout[r][0])) if r in layout else 0 for r in range(ROOMS))
    for r in range(ROOMS):
        side, track, sector = layout.get(r, (0, 0, 0))
        index += bytes([sector, track])
    for kind, count in (("costume", COSTUMES), ("script", SCRIPTS), ("sound", SOUNDS)):
        known = {"script": where, "costume": costumes}.get(kind, {})
        rows = [known.get(n, (0, 0xFFFF)) for n in range(count)]
        index += bytes(r for r, _ in rows)
        index += b"".join(off.to_bytes(2, "little") for _, off in rows)
    assert len(index) == index_len
    sides[1][0:len(index)] = index
    sides[2][0:2] = SIDE_2_TAG.to_bytes(2, "little")
    os.makedirs(folder, exist_ok=True)
    for side, name in ((1, "zak1.d64"), (2, "zak2.d64")):
        with open(os.path.join(folder, name), "wb") as f:
            f.write(sides[side])
    return folder


def expectations():
    """{(where, number, room, at): end} of each conditional jump the test game checks."""
    out = {}
    for n, make in GLOBAL_SCRIPTS.items():
        a = make()
        code = a.assemble()
        for at, expect in a.expects.items():
            ins = scode.decode(script_resource(code), at + 4)
            out[("g", n, None, at + 4)] = ins.end if expect == "next" else ins.target
    return out


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    print(f"wrote {os.path.join(write(argv[0]), 'zak1.d64')} and zak2.d64")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
