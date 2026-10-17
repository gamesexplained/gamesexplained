#!/usr/bin/env python3
"""Tests for paddle() in kit/c64/vice.py, which answers a game's reads of the SID's paddle registers.

    python3 kit/c64/test_vice_paddle.py           against a stand-in for the server (CI; no emulator)
    python3 kit/c64/test_vice_paddle.py --live    on the emulator that answers: resets the machine

The stand-in stops where the v3.13.2 release was measured to stop (16 October 2026): a load
checkpoint after the reading instruction, with its register loaded with the SID's $FF, or on an
interrupt handler's first instruction when one was due as the read ended; an exec checkpoint
before its instruction. Each test gives it the stops a program would make and checks what the
helper set. --live runs a program of its own that reads $D419 and $D41A once a frame in every
form the helper covers, keeps what it read, and checks that against what the helper answered;
then the interrupt case, a stop of the caller's own, and the reads a second. Run --live on a new
emulator build, before a game is loaded: it resets the machine, as check-emulator does.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "cpu"))
import vice   # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not ok else ""))
    if not ok:
        failures.append(name)


class Fake:
    """A stopped machine and a list of the stops its program would make, one per frame advance."""

    def __init__(self, stops=(), running=False):
        self.paused = not running
        self.mem = bytearray(0x10000)
        self.mem[0xFFFA:0x10000] = bytes([0x43, 0xFE, 0xE2, 0xFC, 0x48, 0xFF])   # the KERNAL's vectors
        self.regs = {"PC": 0xC000, "A": 0, "X": 0, "Y": 0, "SP": 0xF3,
                     "N": False, "V": False, "B": False, "D": False, "I": False, "Z": False, "C": False}
        self.stops = list(stops)
        self.cps, self.next_cp, self.sets = {}, 1, []

    def tool(self, name, a):
        if name == "vice_ping":
            return {"execution": "paused" if self.paused else "running"}
        if name == "vice_execution_pause":
            self.paused = True
            return {"status": "ok"}
        if name == "vice_execution_run":
            self.paused = False
            return {"status": "ok"}
        if name == "vice_frame_advance":
            if not self.paused:
                return {"error": "Emulator must be paused"}
            if not self.stops:
                return {"status": "ok", "frames": a["frames"], "PC": self.regs["PC"]}
            stop = self.stops.pop(0)
            if stop.get("boundary"):
                return {"status": "ok", "frames": a["frames"], "PC": self.regs["PC"]}
            self.regs.update(stop.get("regs", {}))
            for addr, data in stop.get("mem", {}).items():
                self.mem[addr:addr + len(data)] = bytes(data)
            if stop.get("load"):
                for c in self.cps.values():
                    if c["load"]:
                        c["hit_count"] += 1
            return {"status": "ok", "frames": stop.get("frames", 0), "PC": self.regs["PC"], "stopped_early": True}
        if name == "vice_registers_get":
            return dict(self.regs)
        if name == "vice_registers_set":
            k, v = a["register"], a["value"]
            self.regs[k] = bool(v) if k in "NVBDIZC" else v
            self.sets.append((k, v))
            return {"status": "ok"}
        if name == "vice_memory_read":
            start = int(a["address"].lstrip("$"), 16)
            return {"data_hex": bytes(self.mem[(start + i) & 0xFFFF] for i in range(a["size"])).hex()}
        if name == "vice_memory_write":
            start = int(a["address"].lstrip("$"), 16)
            for i, b in enumerate(a["data"]):
                self.mem[(start + i) & 0xFFFF] = b
            return {"status": "ok"}
        if name == "vice_checkpoint_add":
            n, self.next_cp = self.next_cp, self.next_cp + 1
            start = int(a["start"].lstrip("$"), 16)
            self.cps[n] = {"checkpoint_num": n, "start": start, "end": int(a.get("end", a["start"]).lstrip("$"), 16),
                           "load": a.get("load", False), "exec": a.get("exec", True), "stop": a.get("stop", True),
                           "hit_count": 0}
            return {"status": "ok", "checkpoint_num": n}
        if name == "vice_checkpoint_delete":
            self.cps.pop(a["checkpoint_num"], None)
            return {"status": "ok"}
        if name == "vice_checkpoint_list":
            return {"checkpoints": list(self.cps.values())}
        return {"error": f"no tool {name}"}

    def rpc(self, method, params=None):
        r = self.tool(params["name"], params.get("arguments", {}))
        if "error" in r:
            return {"error": {"code": -32000, "message": r["error"]}}
        return {"result": {"content": [{"text": json.dumps(r)}]}}

    def put(self, addr, data):
        self.mem[addr:addr + len(data)] = bytes(data)


AFTER_FF = {"N": True, "Z": False}          # the flags a load of the SID's $FF leaves


def standin():
    # LDA $D419 at $C002: answered after, A and N set, Z already clear
    f = Fake([{"load": True, "regs": {"PC": 0xC005, "A": 0xFF, **AFTER_FF}}, {"boundary": True}])
    f.put(0xC002, [0xAD, 0x19, 0xD4])
    with vice.paddle(f.rpc, x=0x10) as pad:
        hits = pad.frames(1)
    check("LDA $D419: the register and flags set after it, one frame run",
          f.regs["A"] == 0x10 and not f.regs["N"] and not f.regs["Z"] and pad.frame == 1
          and [(h["pot"], h["op"], h["pc"], h["value"], h["stop"]) for h in hits] == [("x", "lda", 0xC002, 0x10, "after")],
          (f.regs, hits))
    check("the checkpoints are deleted at the end of the block", f.cps == {}, f.cps)
    check("only the flags that differ are set", ("Z", 0) not in f.sets and ("N", 0) in f.sets, f.sets)

    # LDX $D419,Y with Y=1 reads $D41A: y's value goes in X; 0 sets Z
    f = Fake([{"load": True, "regs": {"PC": 0xC005, "X": 0xFF, "Y": 1, **AFTER_FF}}])
    f.put(0xC002, [0xBE, 0x19, 0xD4])
    with vice.paddle(f.rpc, x=5, y=0) as pad:
        hits = pad.reads(1)
    check("LDX $D419,Y: the index taken into account, X set, Z set for 0",
          f.regs["X"] == 0 and f.regs["Z"] and not f.regs["N"] and hits[0]["pot"] == "y" and len(hits) == 1, (f.regs, hits))

    # LDA ($FB),Y: the pointer read from zero page
    f = Fake([{"load": True, "regs": {"PC": 0xC004, "A": 0xFF, "Y": 0x19, **AFTER_FF}}])
    f.put(0xC002, [0xB1, 0xFB])
    f.put(0x00FB, [0x00, 0xD4])
    with vice.paddle(f.rpc, x=0x90) as pad:
        hits = pad.reads(1)
    check("LDA ($FB),Y: the pointer read from zero page",
          f.regs["A"] == 0x90 and f.regs["N"] and hits and hits[0]["pc"] == 0xC002, (f.regs, hits))

    # CMP $D41A with A=$80 answered $80: equal, carry set
    f = Fake([{"load": True, "regs": {"PC": 0xC005, "A": 0x80, "C": False, "Z": False, "N": False}}])
    f.put(0xC002, [0xCD, 0x1A, 0xD4])
    with vice.paddle(f.rpc, y=0x80) as pad:
        pad.reads(1)
    check("CMP $D41A: carry and zero set from the value, A untouched",
          f.regs["A"] == 0x80 and f.regs["C"] and f.regs["Z"] and not f.regs["N"], f.regs)

    # BIT $D419 with A=$0F answered $C0
    f = Fake([{"load": True, "regs": {"PC": 0xC005, "A": 0x0F, "N": True, "V": True, "Z": False}}])
    f.put(0xC002, [0x2C, 0x19, 0xD4])
    with vice.paddle(f.rpc, x=0xC0) as pad:
        pad.reads(1)
    check("BIT $D419: N and V from the value, Z from A AND it", f.regs["N"] and f.regs["V"] and f.regs["Z"], f.regs)

    # an interrupt taken as the read ended: the stop is at $FF48, the read before the return address
    f = Fake([{"load": True, "regs": {"PC": 0xFF48, "A": 0xFF, "SP": 0xF0, "I": True, **AFTER_FF},
               "mem": {0x01F1: [0xA0, 0x2B, 0xC0]}}])
    f.put(0xC028, [0xAD, 0x19, 0xD4])
    with vice.paddle(f.rpc, x=0) as pad:
        hits = pad.reads(1)
    check("an interrupt as the read ends: A set, the stacked flags corrected for RTI",
          f.regs["A"] == 0 and f.mem[0x01F1] == 0x22 and hits and hits[0]["stop"] == "interrupt"
          and hits[0]["pc"] == 0xC028, (f.regs, f.mem[0x01F1], hits))

    # SBC $D419,Y found by its first read: that read unanswered, the next answered before it
    f = Fake([{"load": True, "regs": {"PC": 0xC012, "A": 0xC9, "Y": 0, "C": False, "N": True}},
              {"frames": 1, "regs": {"PC": 0xC00F, "A": 0xC8, "Y": 0, "C": True, "N": True, "V": False, "D": False}}])
    f.put(0xC00F, [0xF9, 0x19, 0xD4])
    with vice.paddle(f.rpc, x=0x48) as pad:
        first = pad.reads(1)
        armed = sorted(c["start"] for c in f.cps.values() if c["exec"])
        second = pad.reads(1)
    check("SBC $D419,Y: the first read is returned unanswered, and a stop before it is added",
          first and not first[0]["answered"] and first[0]["value"] is None and armed == [0xC00F], (first, armed))
    check("SBC $D419,Y: from then on done by the helper, the PC moved past it",
          second and second[0]["stop"] == "before" and f.regs["A"] == 0x80 and f.regs["C"] and f.regs["N"]
          and not f.regs["V"] and not f.regs["Z"] and f.regs["PC"] == 0xC012, (second, f.regs))

    # at=: answered from the first read on
    f = Fake([{"regs": {"PC": 0xC00F, "A": 0x10, "Y": 1, "C": True}}])
    f.put(0xC00F, [0xF9, 0x19, 0xD4])
    with vice.paddle(f.rpc, y=0x20, at=[0xC00F]) as pad:
        hits = pad.reads(1)
    check("at=: the first read by SBC answered, with a borrow out",
          hits and hits[0]["answered"] and f.regs["A"] == 0xF0 and not f.regs["C"] and f.regs["N"], (hits, f.regs))

    # the caller's own stopping checkpoint: the run ends there
    f = Fake([{"regs": {"PC": 0xC020}}])
    f.put(0xC01D, [0xEA, 0xEA, 0xEA])
    with vice.paddle(f.rpc, x=1) as pad:
        hits = pad.frames(2)
    check("another stop ends the run, with stopped_at its address", hits == [] and pad.stopped_at == 0xC020, pad.stopped_at)

    # INC $D419 is a read the helper cannot answer
    f = Fake([{"load": True, "regs": {"PC": 0xC005}}])
    f.put(0xC002, [0xEE, 0x19, 0xD4])
    try:
        with vice.paddle(f.rpc, x=1) as pad:
            pad.frames(1)
        e = None
    except vice.ViceError as err:
        e = err
    check("a read by an instruction it does not cover raises, and the checkpoints still go",
          e is not None and "C005" in str(e) and f.cps == {}, e)

    # a running machine is stopped first and set running again; a value of 300 is refused
    f = Fake([], running=True)
    with vice.paddle(f.rpc, x=1):
        stopped = f.paused
    check("a running machine is stopped for the block and set running after it", stopped and not f.paused)
    f = Fake([{"load": True, "regs": {"PC": 0xC005}}])
    f.put(0xC002, [0xAD, 0x19, 0xD4])
    try:
        with vice.paddle(f.rpc, x=lambda hit: 300) as pad:
            pad.frames(1)
        e = None
    except ValueError as err:
        e = err
    check("a value outside 0 to 255 is refused", e is not None, e)


# --- on the emulator ---------------------------------------------------------------------------

PROGRAM = """
wait:   lda $d012
        cmp #$80
        bne wait
        lda $d419          ; 0 x
        sta $c100
        ldx $d41a          ; 1 y
        stx $c101
        ldy #$01
        lda $d419,y        ; 2 y
        sta $c102
        ldx #$00
        ldy $d419,x        ; 3 x
        sty $c103
        ldy #$19
        lda ($fb),y        ; 4 x
        sta $c104
        lda $d41a          ; 5 y, for its flags
        php
        pla
        sta $c105
        lda #$80
        cmp $d419          ; 6 x
        php
        pla
        sta $c106
        lda #$0f
        bit $d41a          ; 7 y
        php
        pla
        sta $c107
        ldy #$00
        sec
        lda #$c8
sbc:    sbc $d419,y        ; 8 x, as Clowns reads it
        sta $c108
        php
        pla
        sta $c109
done:   inc $c10f
leave:  lda $d012
        cmp #$80
        beq leave
        jmp wait
"""
POTS = ["x", "y", "y", "x", "x", "y", "x", "y", "x"]
OPS = ["lda", "ldx", "lda", "ldy", "lda", "lda", "cmp", "bit", "sbc"]
VALUES = [0x00, 0x01, 0x7F, 0x80, 0xC0, 0xFF, 0x40, 0x0F, 0x3C, 0xA5, 0x5A]


def flags(p, *names):
    return {k: bool(p & vice._FLAG_BITS[k]) for k in names}


def expected(hits):
    """What the program keeps at $C100-$C109 for a frame's nine reads."""
    v = [h["value"] if h["answered"] else 0xFF for h in hits]
    sbc = (0xC8 - v[8]) & 0xFF
    return {0: v[0], 1: v[1], 2: v[2], 3: v[3], 4: v[4],
            5: {"N": v[5] >= 0x80, "Z": v[5] == 0},
            6: {"C": 0x80 >= v[6], "Z": v[6] == 0x80, "N": bool((0x80 - v[6]) & 0x80)},
            7: {"N": bool(v[7] & 0x80), "V": bool(v[7] & 0x40), "Z": (0x0F & v[7]) == 0},
            8: sbc,
            9: {"C": 0xC8 >= v[8], "N": sbc >= 0x80, "Z": sbc == 0,
                "V": bool((0xC8 ^ v[8]) & (0xC8 ^ sbc) & 0x80)}}


def kept(rpc):
    b = vice.read_mem(rpc, 0xC100, 10)
    out = {i: b[i] for i in (0, 1, 2, 3, 4, 8)}
    out.update({5: flags(b[5], "N", "Z"), 6: flags(b[6], "C", "Z", "N"), 7: flags(b[7], "N", "V", "Z"),
                9: flags(b[9], "C", "N", "Z", "V")})
    return out


def start(rpc, code, org=0xC000):
    """A hard reset, then the program at org on a machine stopped at a frame boundary."""
    vice.clear_checkpoints(rpc)
    vice.call(rpc, "vice_machine_reset", {"mode": "hard", "run_after": True})
    vice.call(rpc, "vice_execution_run", {})
    for _ in range(300):
        if bytes((0x12, 0x05, 0x01, 0x04, 0x19, 0x2E)) in vice.read_mem(rpc, 0x0400, 1000):    # READY.
            break
        time.sleep(0.1)
    vice.pause(rpc)
    vice.poke(rpc, org, code)
    vice.poke(rpc, 0xC100, [0] * 16)
    vice.poke(rpc, 0x00FB, [0x00, 0xD4])
    vice.ask(rpc, "vice_registers_set", {"register": "PC", "value": org})


def live():
    from asm6502 import assemble
    rpc = vice.connect()
    code, labels = assemble(PROGRAM, 0xC000)
    x = lambda h: VALUES[h["n"] % len(VALUES)]                  # noqa: E731
    y = lambda h: VALUES[(3 * h["n"] + 1) % len(VALUES)]        # noqa: E731

    start(rpc, code)
    with vice.paddle(rpc, x=x, y=y) as pad:
        for frame in range(6):
            hits = pad.frames(1)
            ok = ([h["pot"] for h in hits] == POTS and [h["op"] for h in hits] == OPS
                  and kept(rpc) == expected(hits))
            if frame == 0:
                check("live: nine forms in one frame, each answered, the SBC's first read left as the SID gave it",
                      ok and not hits[8]["answered"] and all(h["answered"] for h in hits[:8]),
                      (kept(rpc), expected(hits), hits))
            elif frame == 5:
                check("live: five frames more, every read answered, SBC from a stop before it",
                      ok and all(h["answered"] for h in hits) and hits[8]["stop"] == "before"
                      and pad.frame == 6, (kept(rpc), expected(hits), hits))
            elif not ok:
                check(f"live: frame {frame + 1}", False, (kept(rpc), expected(hits), hits))

    start(rpc, code)
    with vice.paddle(rpc, x=x, y=y, at=[labels["sbc"]]) as pad:
        first = pad.reads(4)
        b = vice.read_mem(rpc, 0xC100, 3)
        rest = pad.frames(1)
        hits = first + rest
    check("live: reads(4) stops after the fourth read, and at= answers the SBC's first read",
          len(first) == 4 and list(b) == [h["value"] for h in first[:3]] and len(rest) == 5
          and kept(rpc) == expected(hits) and hits[8]["answered"], (b, kept(rpc), expected(hits)))

    start(rpc, code)
    with vice.paddle(rpc, x=7, at=[labels["sbc"]]) as pad:
        n = vice.arm(rpc, labels["done"])
        hits = pad.frames(3)
        vice.call(rpc, "vice_checkpoint_delete", {"checkpoint_num": n})
    check("live: a stop of the caller's own ends the run there, x's five reads answered",
          pad.stopped_at == labels["done"] and len(hits) == 5 and all(h["value"] == 7 for h in hits),
          (pad.stopped_at, hits))

    irq = """
        sei
        lda #<handler
        sta $0314
        lda #>handler
        sta $0315
        lda #$7f
        sta $dc0d
        lda $dc0d
        lda #$81
        sta $dc0d
        lda #$00
        sta $dc04
        sta $dc05
        cli
        lda #$19           ; timer A one-shot from 0: due as the next read ends
        sta $dc0e
read:   lda $d419
        sta $c100
        php
        pla
        sta $c102
halt:   jmp halt
handler: inc $c101
        lda $dc0d
        jmp $ea81
    """
    code2, labels2 = assemble(irq, 0xC000)
    start(rpc, code2)
    with vice.paddle(rpc, x=0x33) as pad:
        hits = pad.frames(1)
    b = vice.read_mem(rpc, 0xC100, 3)
    check("live: an interrupt as the read ends, answered from the handler's first instruction",
          [h["stop"] for h in hits] == ["interrupt"] and hits[0]["pc"] == labels2["read"]
          and b[0] == 0x33 and b[1] == 1 and not flags(b[2], "N")["N"], (hits, b.hex()))

    for name, src, at in (("LDA $D419", "loop: lda $d419\n sta $c100\n jmp loop", ()),
                          ("SBC $D419,Y", "loop: ldy #0\n sec\n lda #$c8\nsbc: sbc $d419,y\n sta $c100\n jmp loop", "sbc")):
        c, lab = assemble(src, 0xC000)
        start(rpc, c)
        with vice.paddle(rpc, x=lambda h: h["n"] & 0xFF, at=[lab[at]] if at else ()) as pad:
            t0 = time.time()
            hits = pad.reads(60)
            rate = len(hits) / (time.time() - t0)
        print(f"      {name}: {rate:.1f} reads a second")
    vice.reset(rpc, "hard")
    vice.clear_checkpoints(rpc)


if __name__ == "__main__":
    if sys.argv[1:] in (["-h"], ["--help"]):
        print(__doc__)
        sys.exit(0)
    try:
        live() if "--live" in sys.argv else standin()
    except Exception as e:                               # the rest did not run
        check("ran to the end", False, f"{type(e).__name__}: {e}")
    print(f"\n{'all passed' if not failures else str(len(failures)) + ' failed'}")
    sys.exit(1 if failures else 0)
