#!/usr/bin/env python3
"""Read the trace the kit's ScummVM writes (kit/scumm/scummvm_kit.cpp): show it with the game's
instructions, check the kit's decoder against it, and sum up which scripts ran.

  steps(path)                  -> [Step], in the order the instructions started
  check(game, steps)           -> [(step, problem)]: where scode.py disagrees with what ran
  annotate(game, step)         -> the line with the instruction's text

Usage:
  strace.py show <game folder> <trace> [--from N] [--count N]   the instructions as they ran
  strace.py check <game folder> <trace>                         every place that ran, decoded
                                                               again from the disks and compared
  strace.py scripts <game folder> <trace>                       each script that ran: how often
                                                               and how many of its places

A trace line is one instruction, written when it has finished:
  SEQ DEPTH MS WHERE ROOM AT OP END [a:ARGS]
SEQ numbers the instructions in the order they started (an instruction that runs a script
finishes after that script's instructions, so its line comes after theirs); DEPTH is how many
scripts were nested; MS the game's clock; WHERE the script: g and its number for a global
script, r and an object's number (or 10001 for the room's exit script, 10002 its entry) for a
room's, i and the object's number for an object carried in the inventory; ROOM the room loaded;
AT and OP the opcode's offset in the resource and the opcode, in hex; END where the script went
on from (hex; - when it stopped); ARGS each parameter the handler read, in order, a v before one
read from a variable. A line that starts with # is a note: the input given at that time.

The check compares, for each place that ran: that the decoder finds the same opcode there (the
disks are read as ScummVM reads them), that it reads as many parameters, each from a variable or
a constant as ScummVM did, and the constants' values, and that the script went on to a place the
instruction can reach: its next instruction, its jump's target, itself again for a handler that
waits, or nowhere for one that stopped the script (what the trace shows after an instruction that
always stops its script, such as restart, belongs to the script that runs in its place). kit/scumm/test_scummvm.py runs it on the kit's
test game; on a game, it is the test that the decoder reads its scripts as ScummVM runs them.
"""
import argparse, collections, os, re, sys
from dataclasses import dataclass

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import scode  # noqa: E402
from game import Game, GameError  # noqa: E402

LINE = re.compile(r"^(\d+) (\d+) (\d+) ([a-z?])(\d+) (\d+) ([0-9A-F]+) ([0-9A-F]{2}) (-|[0-9A-F]+)(?: a:(\S+))?$")


@dataclass
class Step:
    seq: int
    depth: int
    ms: int
    where: str
    number: int
    room: int
    at: int
    opcode: int
    end: int            # None: the script stopped
    args: list          # [(value, from a variable)]

    def script(self):
        """The script, as one key: a room's scripts are told apart by their room."""
        return (self.where, self.number, self.room if self.where == "r" else None)


def parse(line):
    m = LINE.match(line.rstrip("\n"))
    if not m:
        return None
    args = []
    if m[10]:
        for a in m[10].split(","):
            args.append((int(a[1:]), True) if a.startswith("v") else (int(a), False))
    return Step(int(m[1]), int(m[2]), int(m[3]), m[4], int(m[5]), int(m[6]), int(m[7], 16), int(m[8], 16),
                None if m[9] == "-" else int(m[9], 16), args)


def steps(path):
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("#"):
                continue
            s = parse(line)
            if s:
                out.append(s)
    out.sort(key=lambda s: s.seq)
    return out


def notes(path):
    """[(ms, text)] of the input the trace notes."""
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"^# (\d+) (.*)$", line.rstrip("\n"))
            if m:
                out.append((int(m[1]), m[2]))
    return out


def decode_step(game, s):
    code, start, end = game.code(s.where, s.number, s.room)
    return scode.decode(code, s.at, game.version, game.platform)


def check(game, ss):
    """[(step, problem)] for the first time each place ran, and for every way out of it that the
    trace shows; an empty list is the pass."""
    problems, seen, ways = [], {}, set()
    for s in ss:
        key = (s.script(), s.at)
        first = key not in seen
        if first:
            try:
                seen[key] = decode_step(game, s)
            except (scode.ScummError, GameError, IndexError) as e:
                seen[key] = None
                problems.append((s, f"does not decode: {e}"))
                continue
        ins = seen[key]
        if ins is None:
            continue
        if first:
            if ins.opcode != s.opcode:
                problems.append((s, f"the disks hold ${ins.opcode:02X} here, where ScummVM ran ${s.opcode:02X}"))
                continue
            mine = ins.params
            if len(mine) != len(s.args):
                problems.append((s, f"{ins.name}: {len(mine)} parameters, where ScummVM read {len(s.args)}"))
            else:
                for k, (o, (val, var)) in enumerate(zip(mine, s.args)):
                    if (o.kind == "var") != var:
                        problems.append((s, f"{ins.name}: parameter {k + 1} is "
                                            f"{'a variable' if o.kind == 'var' else 'a constant'}, where ScummVM read "
                                            f"{'a variable' if var else 'a constant'}"))
                    elif not var and o.value != val:
                        problems.append((s, f"{ins.name}: parameter {k + 1} is {o.value}, where ScummVM read {val}"))
        if s.end is None or (key, s.end) in ways:
            continue
        if not ins.successors():    # it always stops the script: what runs in its place next (after
            continue                # restart, the new game's script 1) is another script's
        ways.add((key, s.end))
        reach = set(ins.successors())
        if ins.name in scode.WAITS:
            reach.add(ins.at)
        if s.end not in reach:
            problems.append((s, f"{ins.name}: went on to {s.end:04X}, where the instruction reaches "
                                f"{', '.join(f'{r:04X}' for r in sorted(reach)) or 'nowhere'}"))
    return problems


def label(s):
    if s.where == "g":
        return f"script {s.number}"
    if s.where == "r":
        return {10001: f"room {s.room} exit", 10002: f"room {s.room} entry"}.get(s.number, f"room {s.room} object {s.number}")
    if s.where == "i":
        return f"inventory object {s.number}"
    return f"{s.where}{s.number}"


def annotate(game, s):
    try:
        text = decode_step(game, s).text
    except (scode.ScummError, GameError, IndexError) as e:
        text = f"?? {e}"
    end = "stops" if s.end is None else f"-> {s.end:04X}"
    return f"{s.seq:7} {s.ms:8} {'  ' * min(s.depth, 8)}{label(s):<26} {s.at:04X}  {text}   {end}"


def main(argv):
    ap = argparse.ArgumentParser(prog="strace.py")
    ap.add_argument("command", choices=("show", "check", "scripts"))
    ap.add_argument("game")
    ap.add_argument("trace")
    ap.add_argument("--from", dest="start", type=int, default=0)
    ap.add_argument("--count", type=int, default=200)
    a = ap.parse_args(argv)
    game = Game(a.game)
    ss = steps(a.trace)
    if a.command == "show":
        for s in ss[a.start:a.start + a.count]:
            print(annotate(game, s))
    elif a.command == "check":
        problems = check(game, ss)
        places = {(s.script(), s.at) for s in ss}
        scripts = {s.script() for s in ss}
        for s, p in problems:
            print(f"{label(s)} at {s.at:04X} (instruction {s.seq}): {p}")
        print(f"{len(ss)} instructions at {len(places)} places in {len(scripts)} scripts; "
              f"{len(problems)} where the decoder and ScummVM disagree")
        return 1 if problems else 0
    elif a.command == "scripts":
        runs = collections.Counter(s.script() for s in ss)
        places = collections.defaultdict(set)
        for s in ss:
            places[s.script()].add(s.at)
        for key in sorted(runs, key=lambda k: (k[0], k[2] or 0, k[1])):
            s0 = next(s for s in ss if s.script() == key)
            print(f"{label(s0):<28} {runs[key]:7} instructions at {len(places[key]):4} places")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
