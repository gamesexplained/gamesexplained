#!/usr/bin/env python3
"""SCUMM's instructions, versions 1 and 2: the opcode table, decoding, and the text of an
instruction. A SCUMM game's scripts are its program: Lucasfilm Games wrote them in SCUMM's own
language and compiled them to these bytes, which each machine's interpreter runs. This module
reads them; game.py takes them out of the game's disks.

  decode(code, at, version=1, platform="c64") -> Ins (or raises ScummError)
  OPCODES_V12                       the handler of each of the 256 opcodes, by ScummVM's names
  READS                             what each handler reads after its opcode, in order
  listing(code, start, end, ...)    [Ins] of a script, decoded from start, in order of address

What each handler reads is ScummVM's (engines/scumm/script_v2.cpp, and the script_v5.cpp,
script_v4.cpp and script_v3.cpp handlers version 2 shares), and kit/scumm/strace.py checks it
against what ScummVM ran. In READS:
  B1 B2 B3   a byte, or a variable's number when the opcode's bit $80, $40 or $20 is set
  W1 W2 W3   a word, signed, or a variable's number (one byte) when that bit is set
  V          a variable's number, whose value the handler reads
  R          a variable's number, where the result goes
  RI         a variable's number; the result goes to the variable whose number it holds
  b w sb     a byte, a word, a signed byte, read as they are
  J          a jump: a signed word, from the end of the instruction
  S          a message: characters to a 0 byte (kit/skills/cpu/scumm/reference.md, "Parameters")
  N          a name: characters to a 0 byte
The B and W reads are the "parameters", the ones the kit's ScummVM writes in its trace.

Run as a script: scode.py <game folder> script N | entry ROOM | exit ROOM | object ROOM N | all
"""
import os, signal, sys
from dataclasses import dataclass, field

HERE = os.path.dirname(os.path.abspath(__file__))

PARAM = {"1": 0x80, "2": 0x40, "3": 0x20}

OPCODES_V12 = """
stopObjectCode putActor startMusic getActorRoom isGreaterEqual drawObject getActorElevation setStateIntrinsicOn
isNotEqual faceActor assignVarWordIndirect setObjPreposition resourceRoutines walkActorToActor putActorAtObject
ifStateIntrinsicOn getObjectOwner animateActor panCameraTo actorOps print actorFromPos getRandomNr
setStateTouchable jumpRelative doSentence move setBitVar startSound ifClassOfIs walkActorTo ifStateTouchable
stopMusic putActor saveLoadGame getActorY loadRoomWithEgo drawObject setVarRange setStateLocked equalZero
setOwnerOf addIndirect delayVariable assignVarByte putActorInRoom delay ifStateLocked setBoxFlags getBitVar
setCameraAt roomOps getDist findObject walkActorToObject setStatePickupable isLessEqual doSentence subtract
waitForActor stopSound setActorElevation walkActorTo ifStatePickupable cutscene putActor startScript getActorX
isLess drawObject increment setStateIntrinsicOff isEqual faceActor chainScript setObjPreposition waitForSentence
walkActorToActor putActorAtObject ifStateIntrinsicOff pickupObject animateActor actorFollowCamera actorOps
setObjectName actorFromPos getActorMoving setStateUntouchable beginOverride doSentence add setBitVar dummy
ifClassOfIs walkActorTo ifStateUntouchable cursorCommand putActor stopScript getActorFacing loadRoomWithEgo
drawObject getClosestObjActor setStateUnlocked isScriptRunning setOwnerOf subIndirect dummy getObjPreposition
putActorInRoom dummy ifStateUnlocked lights getActorCostume loadRoom roomOps getDist findObject walkActorToObject
setStateUnpickupable isGreater doSentence verbOps getActorWalkBox isSoundRunning setActorElevation walkActorTo
ifStateUnpickupable breakHere putActor startMusic getActorRoom isGreaterEqual drawObject getActorElevation
setStateIntrinsicOn isNotEqual faceActor assignVarWordIndirect setObjPreposition resourceRoutines walkActorToActor
putActorAtObject ifStateIntrinsicOn getObjectOwner animateActor panCameraTo actorOps print actorFromPos
getRandomNr setStateTouchable restart doSentence move setBitVar startSound ifClassOfIs walkActorTo
ifStateTouchable stopObjectCode putActor saveLoadGame getActorY loadRoomWithEgo drawObject setVarRange
setStateLocked notEqualZero setOwnerOf addIndirect switchCostumeSet drawSentence putActorInRoom waitForMessage
ifStateLocked setBoxFlags getBitVar setCameraAt roomOps getDist findObject walkActorToObject setStatePickupable
isLessEqual doSentence subtract waitForActor stopSound setActorElevation walkActorTo ifStatePickupable endCutscene
putActor startScript getActorX isLess drawObject decrement setStateIntrinsicOff isEqual faceActor chainScript
setObjPreposition pseudoRoom walkActorToActor putActorAtObject ifStateIntrinsicOff pickupObject animateActor
actorFollowCamera actorOps setObjectName actorFromPos getActorMoving setStateUntouchable printEgo doSentence add
setBitVar dummy ifClassOfIs walkActorTo ifStateUntouchable cursorCommand putActor stopScript getActorFacing
loadRoomWithEgo drawObject getClosestObjActor setStateUnlocked isScriptRunning setOwnerOf subIndirect dummy
getObjPreposition putActorInRoom dummy ifStateUnlocked lights getActorCostume loadRoom roomOps getDist findObject
walkActorToObject setStateUnpickupable isGreater doSentence verbOps getActorWalkBox isSoundRunning
setActorElevation walkActorTo ifStateUnpickupable
""".split()
assert len(OPCODES_V12) == 256

# What each handler reads after its opcode. Handlers missing here read in their own way (decode()).
READS = {
    "stopObjectCode": "", "putActor": "B1 B2 B3", "startMusic": "B1", "getActorRoom": "R B1",
    "isGreaterEqual": "V W1 J", "drawObject": "W1 B2 B3", "getActorElevation": "R B1", "isNotEqual": "V W1 J",
    "faceActor": "B1 W2", "assignVarWordIndirect": "RI W1", "setObjPreposition": "W1 b",
    "resourceRoutines": "B1 b", "walkActorToActor": "B1 B2 b", "putActorAtObject": "B1 W2",
    "getObjectOwner": "R W1", "animateActor": "B1 B2", "panCameraTo": "B1", "print": "B1 S",
    "actorFromPos": "R B1 B2", "getRandomNr": "R B1", "jumpRelative": "J", "move": "R W1",
    "setBitVar": "w B1 B2", "startSound": "B1", "ifClassOfIs": "W1 B2 J", "walkActorTo": "B1 B2 B3",
    "stopMusic": "", "saveLoadGame": "R B1", "getActorY": "R B1", "loadRoomWithEgo": "W1 B2 sb sb",
    "equalZero": "V J", "setOwnerOf": "W1 B2", "addIndirect": "RI W1", "delayVariable": "V",
    "assignVarByte": "R b", "putActorInRoom": "B1 B2", "delay": "b b b", "setBoxFlags": "B1 b",
    "getBitVar": "R w B1", "setCameraAt": "B1", "roomOps": "B1 B2 b", "getDist": "R W1 W2",
    "findObject": "R B1 B2", "walkActorToObject": "B1 W2", "isLessEqual": "V W1 J", "subtract": "R W1",
    "waitForActor": "B1", "stopSound": "B1", "setActorElevation": "B1 B2", "cutscene": "", "startScript": "B1",
    "getActorX": "R B1", "isLess": "V W1 J", "increment": "R", "isEqual": "V W1 J", "chainScript": "B1",
    "waitForSentence": "", "pickupObject": "W1", "actorFollowCamera": "B1", "setObjectName": "W1 N",
    "getActorMoving": "R B1", "beginOverride": "b w", "add": "R W1", "dummy": "", "cursorCommand": "W1",
    "stopScript": "B1", "getActorFacing": "R B1", "getClosestObjActor": "R W1", "isScriptRunning": "R B1",
    "subIndirect": "RI W1", "getObjPreposition": "R W1", "lights": "B1 b b", "getActorCostume": "R B1",
    "loadRoom": "B1", "isGreater": "V W1 J", "getActorWalkBox": "R B1", "isSoundRunning": "R B1",
    "breakHere": "", "restart": "", "notEqualZero": "V J", "drawSentence": "", "waitForMessage": "",
    "endCutscene": "", "decrement": "R", "printEgo": "S",
}
for _s in ("IntrinsicOn", "IntrinsicOff", "Locked", "Unlocked", "Untouchable", "Touchable", "Pickupable",
           "Unpickupable"):
    READS["setState" + _s] = "W1"
    READS["ifState" + _s] = "W1 J"

# The state bit each setState/ifState handler works on, and whether it sets (or jumps on) it
STATE_BITS = {"Pickupable": 1, "Untouchable": 2, "Locked": 4, "Intrinsic": 8}
STATE_OPS = {   # name: (bit name, True: set / continue when the bit is set)
    "setStateIntrinsicOn": ("Intrinsic", True), "setStateIntrinsicOff": ("Intrinsic", False),
    "setStateLocked": ("Locked", True), "setStateUnlocked": ("Locked", False),
    "setStateUntouchable": ("Untouchable", True), "setStateTouchable": ("Untouchable", False),
    "setStatePickupable": ("Pickupable", True), "setStateUnpickupable": ("Pickupable", False),
    # ifStateZeroCommon jumps when the bit is clear; ifStateNotZeroCommon when it is set
    "ifStateIntrinsicOff": ("Intrinsic", True), "ifStateIntrinsicOn": ("Intrinsic", False),
    "ifStateUnlocked": ("Locked", True), "ifStateLocked": ("Locked", False),
    "ifStateTouchable": ("Untouchable", True), "ifStateUntouchable": ("Untouchable", False),
    "ifStateUnpickupable": ("Pickupable", True), "ifStatePickupable": ("Pickupable", False),
}

# Comparisons: jumpRelative(cond) goes on when cond holds and jumps when it does not.
# (handler: the condition, with a for the variable's value and b for the parameter)
CONDITIONS = {"isEqual": "{a} == {b}", "isNotEqual": "{a} != {b}", "isGreater": "{a} < {b}",
              "isGreaterEqual": "{a} <= {b}", "isLess": "{a} > {b}", "isLessEqual": "{a} >= {b}",
              "equalZero": "{a} == 0", "notEqualZero": "{a} != 0"}

# The variables the interpreter itself reads or writes, by ScummVM's names (vars.cpp)
VARS_V12 = {0: "VAR_EGO", 2: "VAR_CAMERA_POS_X", 3: "VAR_HAVE_MSG", 4: "VAR_ROOM", 5: "VAR_OVERRIDE",
            6: "VAR_MACHINE_SPEED", 7: "VAR_CHARCOUNT", 8: "VAR_ACTIVE_VERB", 9: "VAR_ACTIVE_OBJECT1",
            10: "VAR_ACTIVE_OBJECT2", 11: "VAR_NUM_ACTOR", 12: "VAR_CURRENT_LIGHTS", 13: "VAR_CURRENTDRIVE",
            17: "VAR_MUSIC_TIMER", 18: "VAR_VERB_ALLOWED", 19: "VAR_ACTOR_RANGE_MIN", 20: "VAR_ACTOR_RANGE_MAX",
            21: "VAR_CURSORSTATE", 23: "VAR_CAMERA_MIN_X", 24: "VAR_CAMERA_MAX_X", 25: "VAR_TIMER_NEXT",
            26: "VAR_SENTENCE_VERB", 27: "VAR_SENTENCE_OBJECT1", 28: "VAR_SENTENCE_OBJECT2",
            29: "VAR_SENTENCE_PREPOSITION", 30: "VAR_VIRT_MOUSE_X", 31: "VAR_VIRT_MOUSE_Y", 32: "VAR_CLICK_AREA",
            33: "VAR_CLICK_VERB", 35: "VAR_CLICK_OBJECT", 36: "VAR_ROOM_RESOURCE", 37: "VAR_LAST_SOUND",
            38: "VAR_BACKUP_VERB", 39: "VAR_KEYPRESS", 40: "VAR_CUTSCENEEXIT_KEY", 41: "VAR_TALK_ACTOR"}

# Variables 14, 15 and 16 point: reading one reads the variable whose number it holds, so that
# Var[14] = 68 then drawObject(Var[14]) draws the object Var[68] holds. Writing one writes it
# (ScummVM's ScummEngine_v2::readVar, versions 1 and 2; add and subtract write without reading
# through it, increment and decrement read through it)
POINTER_VARS = (14, 15, 16)

# How the script goes on after each handler, besides to its next instruction
JUMPS = {"jumpRelative"}
ENDS = {"stopObjectCode", "restart", "chainScript"}          # the script stops (stopScript(0) too)
WAITS = {"waitForActor", "waitForMessage", "waitForSentence"}  # may run again next frame, from the start
YIELDS = {"breakHere", "delay", "delayVariable"} | WAITS     # the script gives way to the others


class ScummError(Exception):
    pass


@dataclass
class Operand:
    kind: str        # var, byte, word, result, indirect, raw, string, name
    value: object
    param: bool = False   # read through getVarOrDirectByte/Word: in the trace's a: list

    def text(self, names=None):
        if self.kind == "var":
            if self.value in POINTER_VARS:      # read through: the variable it points at
                return f"Var[{var_name(self.value, names)}]"
            return var_name(self.value, names)
        if self.kind == "result":
            return var_name(self.value, names)
        if self.kind == "indirect":
            return f"Var[{var_name(self.value, names)}]"
        if self.kind in ("string", "name"):
            return '"' + self.value + '"'
        return str(self.value)


@dataclass
class Ins:
    at: int
    opcode: int
    name: str
    operands: list = field(default_factory=list)
    end: int = 0
    target: int = None       # where a jump goes
    cond: str = None         # a conditional jump goes on when this holds, and jumps when it does not
    sub: int = None          # the sub-opcode of actorOps, roomOps, verbOps, doSentence, resourceRoutines
    text: str = ""

    @property
    def params(self):
        return [o for o in self.operands if o.param]

    @property
    def length(self):
        return self.end - self.at

    def ends(self):
        if self.name in ENDS:
            return True
        if self.name == "stopScript" and self.operands and self.operands[0].kind == "byte" and self.operands[0].value == 0:
            return True
        return self.name in JUMPS

    def successors(self):
        """The addresses the script can go on to (not counting a stop)."""
        out = []
        if not self.ends():
            out.append(self.end)
        if self.target is not None:
            out.append(self.target)
        return out


def var_name(n, names=None):
    if names and n in names:
        return names[n]
    return VARS_V12.get(n, f"Var[{n}]")


def message(raw):
    """A message's bytes as text: printable characters as they are, the control codes in braces."""
    out, i = [], 0
    while i < len(raw):
        c = raw[i]
        space = c & 0x80
        c &= 0x7F
        if c < 8:
            if c == 1:
                out.append("\\n")
            elif c == 2:
                out.append("{keep}")
            elif c == 3:
                out.append("{wait}")
            elif c > 3:
                i += 1
                arg = raw[i] if i < len(raw) else 0
                out.append("{" + {4: "var", 5: "verb", 6: "name", 7: "string"}[c] + f" {arg}}}")
            else:
                out.append("{0}")
        elif 32 <= c < 127 and c not in (ord('"'), ord("\\"), ord("{"), ord("}")):
            out.append(chr(c))
        else:
            out.append(f"\\x{c:02X}")
        if space:
            out.append(" ")
        i += 1
    return "".join(out)


def read_message(code, p):
    """(text, end) of a version 1-2 message at p: to its 0 byte; codes 4-7 take a byte after."""
    start = p
    while True:
        if p >= len(code):
            raise ScummError(f"a message from {start:04X} runs off the end of the resource")
        c = code[p]
        p += 1
        if c == 0:
            break
        if (c & 0x7F) < 8 and (c & 0x7F) > 3:
            p += 1
    return message(code[start:p - 1]), p


def read_name(code, p):
    """(text, end) of a name at p, as loadPtrToResource copies it: to the 0 byte, an $FF and the
    byte after it taken together, with two more after codes other than 1, 2, 3 and 8."""
    start, out = p, bytearray()
    while True:
        if p >= len(code):
            raise ScummError(f"a name from {start:04X} runs off the end of the resource")
        c = code[p]
        p += 1
        if c == 0:
            break
        if c == 0xFF:
            k = code[p]
            p += 1 if k in (1, 2, 3, 8) else 3
            continue
        out.append(c)
    return message(bytes(out)), p


class Reader:
    def __init__(self, code, at, opcode):
        self.code, self.p, self.opcode = code, at + 1, opcode

    def byte(self):
        if self.p >= len(self.code):
            raise ScummError(f"the instruction runs off the end of the resource at {self.p:04X}")
        v = self.code[self.p]
        self.p += 1
        return v

    def word(self):
        lo = self.byte()
        return lo | self.byte() << 8

    def sword(self):
        w = self.word()
        return w - 0x10000 if w & 0x8000 else w

    def read(self, spec, ins, platform="c64"):
        for r in spec.split():
            if r[0] in "BW" and len(r) == 2:
                if self.opcode & PARAM[r[1]]:
                    ins.operands.append(Operand("var", self.byte(), True))
                elif r[0] == "B":
                    ins.operands.append(Operand("byte", self.byte(), True))
                else:
                    ins.operands.append(Operand("word", self.sword(), True))
            elif r == "V":
                ins.operands.append(Operand("var", self.byte()))
            elif r == "R":
                ins.operands.append(Operand("result", self.byte()))
            elif r == "RI":
                ins.operands.append(Operand("indirect", self.byte()))
            elif r == "b":
                ins.operands.append(Operand("raw", self.byte()))
            elif r == "sb":
                v = self.byte()
                ins.operands.append(Operand("raw", v - 256 if v & 0x80 else v))
            elif r == "w":
                ins.operands.append(Operand("raw", self.word()))
            elif r == "J":
                off = self.sword()
                ins.target = self.p + off
            elif r == "S":
                text, self.p = read_message(self.code, self.p)
                ins.operands.append(Operand("string", text))
            elif r == "N":
                text, self.p = read_name(self.code, self.p)
                ins.operands.append(Operand("name", text))
            else:
                raise ValueError(r)


def decode(code, at, version=1, platform="c64", names=None):
    """The instruction at `at` in `code` (the whole resource, as the interpreter holds it)."""
    if version not in (1, 2):
        raise ScummError(f"SCUMM version {version}: the kit decodes versions 1 and 2")
    if at >= len(code):
        raise ScummError(f"{at:04X} is past the end of the resource ({len(code)} bytes)")
    op = code[at]
    name = OPCODES_V12[op]
    ins = Ins(at, op, name)
    r = Reader(code, at, op)
    if name in READS:
        r.read(READS[name], ins, platform)
    elif name == "actorOps":
        r.read("B1 B2", ins)
        ins.sub = r.byte()
        if ins.sub == 2 and version == 2:
            ins.operands.append(Operand("raw", r.byte()))
        elif ins.sub == 3:
            text, r.p = read_name(code, r.p)
            ins.operands.append(Operand("name", text))
    elif name == "doSentence":
        r.read("B1", ins)
        first = ins.operands[0]
        if not (first.kind == "byte" and first.value in (0xFB, 0xFC)):
            r.read("W2 W3", ins)
            ins.sub = r.byte()
    elif name == "verbOps":
        ins.sub = r.byte()
        if ins.sub == 0:
            r.read("B1", ins)
        elif ins.sub == 0xFF:
            r.read("b b", ins)
        else:
            r.read("b b B1 b N", ins)
    elif name == "setVarRange":
        r.read("R b", ins)
        for _ in range(ins.operands[1].value or 256):
            ins.operands.append(Operand("raw", r.sword() if op & 0x80 else r.byte()))
    elif name == "pseudoRoom":
        r.read("b", ins)
        while True:
            v = r.byte()
            if v == 0:
                break
            ins.operands.append(Operand("raw", v))
    elif name == "switchCostumeSet":
        if platform in ("c64", "nes"):    # ScummVM reads a byte on these two only
            r.read("b", ins)
    else:
        raise ScummError(f"no decoder for {name}")
    if name == "beginOverride":
        jump = ins.operands[0].value
        ins.target = (r.p + ins.operands[1].value - (0x10000 if ins.operands[1].value & 0x8000 else 0))
        if jump != 0x18:
            raise ScummError(f"beginOverride at {at:04X} is followed by ${jump:02X}, where a jump ($18) belongs")
    if name in ("roomOps",):
        ins.sub = ins.operands[2].value
    if name == "resourceRoutines":
        ins.sub = ins.operands[1].value
    ins.end = r.p
    if name in CONDITIONS:
        a = ins.operands[0].text(names)
        b = ins.operands[1].text(names) if len(ins.operands) > 1 else ""
        ins.cond = CONDITIONS[name].format(a=a, b=b)
    elif name in STATE_OPS and name.startswith("ifState"):
        bit, on = STATE_OPS[name]
        ins.cond = f"state of {ins.operands[0].text(names)} has {bit}" if on else \
            f"state of {ins.operands[0].text(names)} lacks {bit}"
    elif name == "ifClassOfIs":
        ins.cond = f"class of {ins.operands[0].text(names)} has all of {ins.operands[1].text(names)}"
    ins.text = render(ins, names)
    return ins


def render(ins, names=None):
    ops = [o for o in ins.operands]
    t = lambda o: o.text(names)
    n = ins.name
    if n == "jumpRelative":
        return f"goto {ins.target:04X}"
    if ins.cond is not None:
        return f"unless ({ins.cond}) goto {ins.target:04X}"
    if n == "beginOverride":
        return f"beginOverride (on escape, goto {ins.target:04X})"
    if n == "assignVarByte" or n == "move":
        return f"{t(ops[0])} = {t(ops[1])}"
    if n == "assignVarWordIndirect":
        return f"{t(ops[0])} = {t(ops[1])}"
    if n in ("add", "addIndirect"):
        return f"{t(ops[0])} += {t(ops[1])}"
    if n in ("subtract", "subIndirect"):
        return f"{t(ops[0])} -= {t(ops[1])}"
    if n in ("increment", "decrement") and ops[0].value in POINTER_VARS:   # reads through it
        return f"{t(ops[0])} = Var[{t(ops[0])}] {'+' if n == 'increment' else '-'} 1"
    if n == "increment":
        return f"{t(ops[0])}++"
    if n == "decrement":
        return f"{t(ops[0])}--"
    if n == "setVarRange":
        return f"{t(ops[0])}[0..{ops[1].value - 1}] = {', '.join(t(o) for o in ops[2:])}"
    if n == "setBitVar":
        return f"Bit[{ops[0].value} + {t(ops[1])}] = {t(ops[2])}"
    if n == "getBitVar":
        return f"{t(ops[0])} = Bit[{ops[1].value} + {t(ops[2])}]"
    if n == "delay":        # the three bytes hold $FFFFFF less the frames to wait
        return f"delay({0xFFFFFF - (ops[0].value | ops[1].value << 8 | ops[2].value << 16)})"
    if n == "print":
        return f"print({t(ops[0])}, {t(ops[1])})"
    if n in STATE_OPS:
        bit, on = STATE_OPS[n]
        return f"{'setState' if on else 'clearState'}({t(ops[0])}, {bit})"
    if n == "actorOps":
        sub = {1: "sound", 2: "palette", 3: "name", 4: "costume", 5: "talkColor"}.get(ins.sub, f"sub{ins.sub}")
        return f"actorOps({t(ops[0])}, {sub}, {', '.join(t(o) for o in ops[1:])})"
    if n == "roomOps":
        sub = {1: "scroll", 2: "color"}.get(ins.sub & 0x1F, f"sub{ins.sub}")
        return f"roomOps({sub}, {t(ops[0])}, {t(ops[1])})"
    if n == "verbOps":
        if ins.sub == 0:
            return f"verbOps(delete, slot {t(ops[0])})"
        if ins.sub == 0xFF:
            return f"verbOps(verb {ops[0].value}, mode {ops[1].value})"
        return f"verbOps(new verb {ins.sub}, x {ops[0].value}, y {ops[1].value}, slot {t(ops[2])}, " \
               f"preposition {ops[3].value}, {t(ops[4])})"
    if n == "doSentence":
        if ins.sub is None:
            return f"doSentence({t(ops[0])})"
        how = {0: "queue", 1: "run", 2: "show"}.get(ins.sub, f"sub{ins.sub}")
        return f"doSentence({how}, {', '.join(t(o) for o in ops)})"
    if n == "resourceRoutines":
        kind = {2: "costume", 3: "room", 5: "script", 6: "sound"}.get(ins.sub >> 4)
        if kind is None or ins.sub & 15 == 0:      # ScummVM does nothing for these
            return f"resourceRoutines(${ins.sub:02X}, {t(ops[0])})"
        what = "load" if ins.sub & 15 == 1 else "lock" if ins.sub & 1 else "unlock"
        return f"resourceRoutines({what} {kind} {t(ops[0])})"
    res = [o for o in ops if o.kind in ("result", "indirect")]
    rest = [o for o in ops if o.kind not in ("result", "indirect")]
    call = f"{n}({', '.join(t(o) for o in rest)})"
    if res:
        return f"{t(res[0])} = {call}"
    return call


def listing(code, start, end=None, version=1, platform="c64", names=None, entries=None):
    """[Ins] reached from start and from entries (offsets), each once, in order of address; a
    run of bytes no flow reaches is left out (the caller sees the gap)."""
    end = len(code) if end is None else end
    todo = [start] + list(entries or ())
    seen = {}
    while todo:
        a = todo.pop()
        while start <= a < end and a not in seen:
            try:
                ins = decode(code, a, version, platform, names)
            except ScummError:
                break
            seen[a] = ins
            nxt = ins.successors()
            todo.extend(x for x in nxt if x != ins.end)
            if ins.end not in nxt:
                break
            a = ins.end
    return [seen[a] for a in sorted(seen)]


def main(argv):
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__); return 0
    sys.path.insert(0, HERE)
    from game import Game, HEADER
    g = Game(argv[0])
    cmd = argv[1]
    targets = []
    if cmd == "script":
        n = int(argv[2])
        b = g.script(n)
        targets.append((f"global script {n}", b, HEADER, len(b), []))
    elif cmd in ("entry", "exit"):
        room = int(argv[2])
        b, s, e = g.code("r", 10002 if cmd == "entry" else 10001, room)
        targets.append((f"room {room} {cmd} script", b, s, e, []))
    elif cmd == "object":
        room, num = int(argv[2]), int(argv[3])
        b, s, e = g.code("r", num, room)
        o = [o for o in g.objects(room) if o.number == num][0]
        targets.append((f"object {num} ({o.name!r}) in room {room}", b, s + min(o.verbs.values() or [0]), e,
                        [s + v for v in o.verbs.values()]))
    elif cmd == "all":
        for where, num, room, b, s, entries in g.scripts():
            if not entries:
                continue
            label = f"global script {num}" if where == "g" else f"room {room} " + (
                {10002: "entry", 10001: "exit"}.get(num) or f"object {num}")
            _, start, end = g.code(where, num, room)
            targets.append((label, b, min(entries.values()), end, list(entries.values())))
    else:
        sys.exit(f"scode.py: no command {cmd!r}; see -h")
    for label, b, s, e, entries in targets:
        print(f"; {label}")
        for ins in listing(b, s, e, g.version, g.platform, entries=entries):
            raw = b[ins.at:ins.end]
            hexs = raw[:8].hex(" ") + (" .." if len(raw) > 8 else "")
            print(f"  {ins.at:04X}  {hexs:<26} {ins.text}")
    return 0


if __name__ == "__main__":
    if hasattr(signal, "SIGPIPE"):        # quietly, when the output is cut short (| head)
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    sys.exit(main(sys.argv[1:]))
