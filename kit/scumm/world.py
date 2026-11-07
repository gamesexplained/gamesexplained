#!/usr/bin/env python3
"""What a SCUMM game holds, gathered from every script for a reader: its verbs, its actors and
what they are called and wear, its rooms and the ways between them, what each object does with
each verb, every line of text and who says it, the sounds and who plays them, and where any
variable or object is used. It reads the disks through game.py and decodes through scode.py, so
it is only as right as they are (kit/scumm/test_scummvm.py checks them against ScummVM); what it
says about a script is what the script says, not what a player sees, until a run shows it.

  World(folder)            the game in folder, every handler decoded
  world.handlers           [Handler]: a global script, a room's entry or exit, or an object's
                           script for one verb (or for several, when they share it), each with
                           its instructions
  world.verbs()            {verb: [names]} from the game's verbOps, the @ padding taken off
  world.actors()           {actor: Actor}: names, costumes, rooms, talk colours, and where each
                           was set
  world.pseudo()           {pseudo room: room}: room numbers 128 and up that the game maps to a
                           room it has, so that one picture can be several places
  world.exits()            [(from room, handler, to room)] for every loadRoom and
                           loadRoomWithEgo whose room is a constant
  world.texts()            [(handler, speaker, text)]: every print, printEgo and setObjectName
  world.sounds()           {sound: [handler]} of startSound and startMusic
  world.uses(kind, n)      [(handler, Ins)] that read or write variable n (kind "var"), name
                           object n ("object") or actor n ("actor"). A variable is also used
                           where a script points variable 14, 15 or 16 at it (Var[14] = n, or
                           Var[14] += n): the game reads an array that starts at n through it.
                           An object is any word parameter of that value, so a number that only
                           happens to be the same (a count, a position) is listed with them

Run as a script:
  world.py <folder> verbs | actors | rooms | pseudo | sounds
  world.py <folder> text [REGEX]             every line of text, or those that match
  world.py <folder> objects ROOM             each object: its verbs by name, and for each verb
                                             what it tests, what it changes and what it says
  world.py <folder> object ROOM N            one object's scripts, decoded, each verb labelled
  world.py <folder> uses var|object|actor N  where it is read, set or named

How to use it to explore a game: kit/skills/cpu/scumm/explore.md.
"""
import collections
import os
import re
import signal
import sys
from dataclasses import dataclass, field

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scode  # noqa: E402
from game import Game  # noqa: E402

# Handlers that change the game's state, for an object's summary
EFFECTS = {"pickupObject", "setOwnerOf", "setObjectName", "loadRoom", "loadRoomWithEgo", "startScript",
           "chainScript", "startSound", "startMusic", "putActorInRoom", "doSentence", "drawObject",
           "setBitVar", "putActor", "putActorAtObject", "walkActorToObject", "cutscene"}
TEXTS = {"print", "printEgo", "setObjectName"}


@dataclass
class Handler:
    where: str          # g global, r in a room (an object, or 10002 entry / 10001 exit)
    number: int
    room: int           # None for a global script
    entry: str          # "start", "entry", "exit", or "verb N" ("verb N, verb M" for verbs that
    ins: list           # share one script)

    @property
    def verbs(self):
        return [int(v) for v in re.findall(r"verb (\d+)", self.entry)]

    @property
    def verb(self):
        return self.verbs[0] if self.verbs else None

    def label(self, world=None):
        if self.where == "g":
            return f"script {self.number}"
        if self.number in (10001, 10002):
            return f"room {self.room} {'entry' if self.number == 10002 else 'exit'}"
        name = world.object_name(self.number) if world else ""
        verb = " / ".join(world.verb_name(v) for v in self.verbs) if world and self.verbs else self.entry
        return f"room {self.room} object {self.number}" + (f" '{name}'" if name else "") + f", {verb}"


@dataclass
class Actor:
    number: int
    names: dict = field(default_factory=dict)       # name: [handler labels]
    costumes: dict = field(default_factory=dict)    # costume: [handler labels]
    rooms: dict = field(default_factory=dict)       # room (or "Var[n]"): [handler labels]
    talk: dict = field(default_factory=dict)        # talk colour: [handler labels]


def _const(op):
    """An operand's value when it is a constant, else None."""
    if op.kind in ("byte", "word", "raw") and not (op.kind == "var"):
        return op.value
    return None


def points(i):
    """True for an instruction that sets or adds to a pointer variable (14 to 16) with a constant."""
    ops = i.operands
    return i.name in ("move", "add") and len(ops) == 2 and ops[0].kind == "result" and \
        ops[0].value in scode.POINTER_VARS


def clean(name):
    return name.replace("@", "").strip()


class World:
    def __init__(self, folder):
        self.game = g = Game(folder)
        self.handlers = []
        self.names = {}          # object: name in its room
        self.object_room = {}
        for where, num, room, b, s, entries in g.scripts():
            if not entries:
                continue
            _, start, end = g.code(where, num, room)
            at = collections.defaultdict(list)      # verbs that share a script share its offset
            for ename, eoff in entries.items():
                at[eoff].append(ename)
            for eoff, names in sorted(at.items()):
                ins = scode.listing(b, eoff, end, g.version, g.platform, entries=[])
                self.handlers.append(Handler(where, num, room, ", ".join(names), ins))
        for r in range(1, g.n_rooms):
            if g.has_room(r):
                for o in g.objects(r):
                    self.names[o.number] = clean(o.name)
                    self.object_room[o.number] = r
        self._verbs = None

    # -- the game's own words
    def verbs(self):
        if self._verbs is None:
            out = collections.defaultdict(list)
            for h in self.handlers:
                for i in h.ins:
                    if i.name == "verbOps" and i.sub not in (None, 0, 0xFF):
                        name = [o.value for o in i.operands if o.kind == "name"]
                        if name and clean(name[0]) and clean(name[0]) not in out[i.sub]:
                            out[i.sub].append(clean(name[0]))
            self._verbs = dict(sorted(out.items()))
        return self._verbs

    def verb_name(self, verb):
        names = self.verbs().get(verb)
        return f"{names[0]} ({verb})" if names else f"verb {verb}"

    def object_name(self, n):
        return self.names.get(n, "")

    def actors(self):
        out = {}

        def get(n):
            return out.setdefault(n, Actor(n))
        for h in self.handlers:
            lab = h.label(self)
            for i in h.ins:
                ops = i.operands
                if i.name == "actorOps" and ops and ops[0].kind == "byte":
                    a = get(ops[0].value)
                    if i.sub == 3:
                        name = [o.value for o in ops if o.kind == "name"]
                        if name and clean(name[0]):
                            a.names.setdefault(clean(name[0]), []).append(lab)
                    elif i.sub in (4, 5) and len(ops) > 1:
                        key = ops[1].value if ops[1].kind == "byte" else f"Var[{ops[1].value}]"
                        (a.costumes if i.sub == 4 else a.talk).setdefault(key, []).append(lab)
                elif i.name == "putActorInRoom" and ops and ops[0].kind == "byte":
                    key = ops[1].value if ops[1].kind == "byte" else scode.var_name(ops[1].value)
                    get(ops[0].value).rooms.setdefault(key, []).append(lab)
        return dict(sorted(out.items()))

    def pseudo(self):
        out = {}
        for h in self.handlers:
            for i in h.ins:
                if i.name == "pseudoRoom":
                    vals = [o.value for o in i.operands]
                    for p in vals[1:]:
                        out[p & 0x7F | 0x80 if p >= 0x80 else p] = vals[0]
        return dict(sorted(out.items()))

    def exits(self):
        out = []
        for h in self.handlers:
            for i in h.ins:
                if i.name in ("loadRoom", "loadRoomWithEgo"):
                    op = i.operands[0] if i.name == "loadRoom" else i.operands[1]
                    if op.kind == "byte":
                        out.append((h.room, h, op.value))
        return out

    def texts(self):
        out = []
        for h in self.handlers:
            for i in h.ins:
                if i.name in TEXTS:
                    s = [o.value for o in i.operands if o.kind in ("string", "name")]
                    if not s or not clean(s[0]):
                        continue
                    if i.name == "printEgo":
                        who = "the kid the player moves"
                    elif i.name == "print":
                        a = i.operands[0]
                        who = ("narrator" if a.value == 255 else f"actor {a.value}") if a.kind == "byte" \
                            else scode.var_name(a.value)
                    else:
                        who = f"new name of object {i.operands[0].value}"
                    out.append((h, who, s[0]))
        return out

    def sounds(self):
        out = collections.defaultdict(list)
        for h in self.handlers:
            for i in h.ins:
                if i.name in ("startSound", "startMusic") and i.operands[0].kind == "byte":
                    out[(i.name, i.operands[0].value)].append(h)
        return dict(sorted(out.items(), key=lambda kv: kv[0][1]))

    def uses(self, kind, n):
        out = []
        for h in self.handlers:
            for i in h.ins:
                hit = False
                for o in i.operands:
                    if kind == "var" and o.kind in ("var", "result", "indirect") and o.value == n:
                        hit = True
                    elif kind == "var" and o is not i.operands[0] and _const(o) == n and points(i):
                        hit = True          # Var[14] = n: the array at n, read through Var[14]
                    elif kind == "object" and o.kind == "word" and o.value == n:
                        hit = True          # objects are words in versions 1 and 2; a byte is something else
                    elif kind == "actor" and o is i.operands[0] and o.kind == "byte" and o.value == n and \
                            ("Actor" in i.name or i.name in ("actorOps", "animateActor", "faceActor")):
                        hit = True
                if hit:
                    out.append((h, i))
        return out

    def summary(self, h):
        """What a handler tests, changes and says, each once, in order."""
        tests, effects, says = [], [], []
        for i in h.ins:
            if i.cond and i.cond not in tests:
                tests.append(i.cond)
            elif i.name in EFFECTS and i.text not in effects:
                effects.append(i.text)
            if i.name in ("print", "printEgo"):
                s = [o.value for o in i.operands if o.kind == "string"]
                if s and clean(s[0]):
                    says.append(clean(re.sub(r"\{[^}]*\}|\^", " ", s[0])))
        return tests, effects, says


def main(argv):
    if len(argv) < 2 or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    w = World(argv[0])
    cmd, rest = argv[1], argv[2:]
    if cmd == "verbs":
        for v, names in w.verbs().items():
            print(f"verb {v:3}: {' / '.join(names)}")
    elif cmd == "actors":
        for n, a in w.actors().items():
            print(f"actor {n}:")
            for title, d in (("named", a.names), ("costume", a.costumes), ("in room", a.rooms), ("talks in colour", a.talk)):
                for k, labs in d.items():
                    more = f" and {len(labs) - 3} more" if len(labs) > 3 else ""
                    print(f"  {title} {k}: {'; '.join(labs[:3])}{more}")
    elif cmd == "pseudo":
        for p, r in w.pseudo().items():
            print(f"room {p} is room {r}")
    elif cmd == "rooms":
        pseudo = collections.defaultdict(list)
        for p, r in w.pseudo().items():
            pseudo[r].append(p)
        ways = collections.defaultdict(set)
        for frm, h, to in w.exits():
            if frm is not None and to != frm:
                ways[frm].add(to)
        for r in range(1, w.game.n_rooms):
            if not w.game.has_room(r):
                continue
            objs = [o for o in w.game.objects(r)]
            named = [clean(o.name) for o in objs if clean(o.name)]
            print(f"room {r}: {len(objs)} objects" + (f", also rooms {', '.join(map(str, pseudo[r]))}" if pseudo[r] else ""))
            if ways[r]:
                print(f"  leads to: {', '.join(str(t) + (f' (room {w.pseudo()[t]})' if t in w.pseudo() else '') for t in sorted(ways[r]))}")
            if named:
                print(f"  {', '.join(named)}")
    elif cmd == "text":
        pat = re.compile(rest[0], re.I) if rest else None
        for h, who, s in w.texts():
            if not pat or pat.search(s):
                print(f"{h.label(w)} [{who}]: {s}")
    elif cmd == "sounds":
        for (kind, n), hs in w.sounds().items():
            labs = sorted({h.label(w) for h in hs})
            print(f"{'tune' if kind == 'startMusic' else 'sound'} {n}: {'; '.join(labs[:6])}"
                  + (f" and {len(labs) - 6} more" if len(labs) > 6 else ""))
    elif cmd == "objects":
        room = int(rest[0])
        for h in w.handlers:
            if h.where == "r" and h.room == room and h.number < 10000:
                tests, effects, says = w.summary(h)
                print(h.label(w))
                for t in tests:
                    print(f"  if {t}")
                for e in effects:
                    print(f"  does {e}")
                for s in says:
                    print(f"  says \"{s}\"")
    elif cmd == "object":
        room, num = int(rest[0]), int(rest[1])
        for h in w.handlers:
            if h.where == "r" and h.room == room and h.number == num:
                print(f"; {h.label(w)}")
                for i in h.ins:
                    print(f"  {i.at:04X}  {i.text}")
    elif cmd == "uses":
        kind, n = rest[0], int(rest[1])
        for h, i in w.uses(kind, n):
            print(f"{h.label(w)} {i.at:04X}: {i.text}")
    else:
        sys.exit(f"world.py: no command {cmd!r}; see -h")
    return 0


if __name__ == "__main__":
    if hasattr(signal, "SIGPIPE"):        # quietly, when the output is cut short (| head)
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    sys.exit(main(sys.argv[1:]))
