#!/usr/bin/env python3
"""What $D41B reads, measured in the emulator to the cycle (#786).

$D41B gives the top eight bits of the SID's third oscillator, and a game that wants a random
number sets voice 3 to noise and reads it. What a read returns depends on the cycle it comes
on: the oscillator adds its frequency to a 24-bit count every cycle, and the noise register
shifts each time bit 19 of that count rises. site/lib/sid.js models the three oscillators on
the caller's clock (createOsc), and kit/c64/machine.js answers $D41B from it.

This assembles a probe for the C64 at $C000 for each case below: every oscillator register
cleared and the three test bits set for long enough to leave the noise register all ones,
then the case's writes and its reads of $D41B, each on an exact cycle, with the screen
blanked and interrupts off. It runs each in VICE for each SID model and writes the readings,
and each probe's bytes, to kit/c64/fixtures/sid-osc.json. kit/c64/test_sid_osc.js replays
them through createOsc and runs the probes on the kit's machine.

Usage:
  sid_osc.py record      measure in the running emulator (tools.py vice) and write the fixture
  sid_osc.py list        the cases, and each one's length in cycles for each model

What is measured is the emulator's model of the chip (its SID engine, named in the fixture),
not a physical SID. The emulator must be clocking the SID (kit/c64/sid_bus.py).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vice import connect, call, ask, poke, read_mem, pause, reset  # noqa: E402
from sid_bus import MODELS, Emulator, clocked, engine  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "sid-osc.json")
ORG, RESULT = 0xC000, 0xC800                 # the probe, and where it leaves what it read
# The engine's four fades, in cycles, measured here by moving a read across each: a noise
# register held by the test bit takes its first step towards all ones after `reset` cycles and
# one more every `reset_bit`; the output with no waveform selected loses bits after `float`
# cycles and again every `float_bit`.
TIMES = {"6581": {"reset": 50_000, "reset_bit": 15_000, "float": 54_000, "float_bit": 1_400},
         "8580": {"reset": 986_000, "reset_bit": 314_300, "float": 800_000, "float_bit": 50_000}}
# How long the test bits are held before a case starts: past the 22 steps that set every bit.
SETTLE = {m: t["reset"] + 22 * t["reset_bit"] + 20_000 for m, t in TIMES.items()}
V1, V2, V3 = 0x00, 0x07, 0x0E                # each voice's first register: frequency low


class Case:
    """A case's writes and reads in time order. Each write takes six cycles (LDA #, STA abs)
    and each read eight (LDA abs, STA abs); wait adds cycles between."""

    def __init__(self, name):
        self.name, self.events, self.t = name, [], 0

    def w(self, r, v):
        self.t += 6
        self.events.append([self.t - 1, r, v])       # the store's last cycle
        return self

    def freq(self, voice, f):
        return self.w(voice, f & 0xFF).w(voice + 1, f >> 8)

    def pw(self, voice, p):
        return self.w(voice + 2, p & 0xFF).w(voice + 3, p >> 8)

    def ctrl(self, voice, c):
        return self.w(voice + 4, c)

    def r(self, n=1, gap=0):
        """n reads of $D41B, gap cycles more than eight apart."""
        for _ in range(n):
            self.t += gap
            self.events.append([self.t + 3, 0x1B])   # the load's last cycle
            self.t += 8
        return self

    def wait(self, n):
        if n == 1:
            raise ValueError("no instruction takes one cycle")
        self.t += n
        return self


def cases(model):
    T = TIMES[model]
    out = []

    def case(name):
        c = Case(name)
        out.append(c)
        return c
    case("noise at the highest frequency").freq(V3, 0xFFFF).ctrl(V3, 0x80).r(24).r(16, 5).r(8, 1000)
    case("noise at frequency $1000, read every 8 cycles").freq(V3, 0x1000).ctrl(V3, 0x80).r(80)
    case("noise at frequency $1001, read every 11 cycles").freq(V3, 0x1001).ctrl(V3, 0x80).r(64, 3)
    case("noise at frequency $0123, read every 51 cycles").freq(V3, 0x0123).ctrl(V3, 0x80).r(40, 43)
    case("noise, the frequency changed between reads").freq(V3, 0x4000).ctrl(V3, 0x80).r(12) \
        .freq(V3, 0x0800).r(12, 2).w(V3 + 1, 0xF0).r(12).w(V3, 0x55).r(12, 3)
    case("noise selected before the test bit is cleared").freq(V3, 0x7000).ctrl(V3, 0x88).wait(100) \
        .ctrl(V3, 0x80).r(16)
    case("noise, the test bit set for 40 cycles and cleared").freq(V3, 0x6000).ctrl(V3, 0x80).r(8) \
        .ctrl(V3, 0x88).r(4).ctrl(V3, 0x80).r(16)
    case("noise, the test bit held past the register's first fades").freq(V3, 0x9000).ctrl(V3, 0x80) \
        .wait(5000).r(4).ctrl(V3, 0x88).wait(T["reset"] + 3 * T["reset_bit"] + 10).r(2).ctrl(V3, 0x80).r(16)
    case("sawtooth at frequency $2345").freq(V3, 0x2345).ctrl(V3, 0x20).r(24).r(16, 3)
    case("sawtooth, the frequency changed between reads").freq(V3, 0x1111).ctrl(V3, 0x20).r(6) \
        .freq(V3, 0xF00F).r(6).w(V3 + 1, 0x01).r(6)
    case("triangle at frequency $7F31").freq(V3, 0x7F31).ctrl(V3, 0x10).r(40, 3)
    case("pulse of width $800 at frequency $4000").pw(V3, 0x800).freq(V3, 0x4000).ctrl(V3, 0x40).r(40, 3)
    case("pulse of width $123 at frequency $0801, the width changed").pw(V3, 0x123).freq(V3, 0x0801) \
        .ctrl(V3, 0x40).r(40, 11).pw(V3, 0xE00).r(40, 11)
    case("pulse with the test bit set").pw(V3, 0x800).freq(V3, 0x4000).ctrl(V3, 0x48).r(4).ctrl(V3, 0x40).r(8)
    case("triangle ring-modulated by voice 2").freq(V2, 0x3000).ctrl(V2, 0x10).freq(V3, 0x0D00) \
        .ctrl(V3, 0x14).r(60, 5)
    case("sawtooth synchronised to voice 2").freq(V2, 0xC000).ctrl(V2, 0x10).freq(V3, 0x2800) \
        .ctrl(V3, 0x22).r(80, 3)
    case("all three voices synchronised in a ring").freq(V1, 0xE100).freq(V2, 0xB300).freq(V3, 0x3900) \
        .ctrl(V1, 0x22).ctrl(V2, 0x22).ctrl(V3, 0x22).r(100, 3)
    case("noise synchronised to voice 2").freq(V2, 0xFF00).ctrl(V2, 0x10).freq(V3, 0xA000) \
        .ctrl(V3, 0x82).r(60, 3)
    case("no waveform after a sawtooth, read as the output fades").freq(V3, 0x3F00).ctrl(V3, 0x20).wait(200) \
        .ctrl(V3, 0x00).r(4).wait(T["float"] - 100).r(4, 30).wait(T["float_bit"] - 80).r(4, 30) \
        .wait(T["float_bit"] * 3).r(2).wait(T["float_bit"] * 12).r(2)
    case("noise and triangle together").freq(V3, 0x5000).ctrl(V3, 0x90).r(48, 3)
    case("noise, then noise and sawtooth, then noise").freq(V3, 0x8000).ctrl(V3, 0x80).r(8) \
        .ctrl(V3, 0xA0).r(16).ctrl(V3, 0x80).r(16)
    return out


# --- the probe ------------------------------------------------------------------
HEAD = bytes([0x78,                          # sei
              0xA9, 0x00, 0x8D, 0x15, 0xD0,  # lda #0 : sta $d015       no sprites
              0xA9, 0x0B, 0x8D, 0x11, 0xD0,  # lda #$0b : sta $d011     the screen blanked
              0x2C, 0x11, 0xD0, 0x10, 0xFB,  # w1: bit $d011 : bpl w1
              0x2C, 0x11, 0xD0, 0x30, 0xFB])  # w2: bit $d011 : bmi w2   line 0, no bad lines


def delay(code, org, n):
    """Append instructions that take exactly n cycles (0, or 2 or more) and touch no chip: a
    Y loop round an X loop of 256 (1,286 cycles a round, and one), an X loop (5 a round, and
    one), a three-cycle BIT of zero page and two-cycle NOPs. A loop whose branch would cross
    a page, and take a cycle more, is moved on with NOPs first."""
    if n == 1 or n < 0:
        raise ValueError(f"no instruction sequence takes {n} cycles")
    while n >= 1286 + 1 + 2 + 16:
        while ((org + len(code) + 2) >> 8) != ((org + len(code) + 10) >> 8):
            code.append(0xEA)
            n -= 2
        m = min(256, (n - 1 - 2) // 1286)
        code += bytes([0xA0, m & 255, 0xA2, 0x00, 0xCA, 0xD0, 0xFD, 0x88, 0xD0, 0xF8])
        n -= m * 1286 + 1
    if n >= 6 + 2 + 8:
        while ((org + len(code) + 2) >> 8) != ((org + len(code) + 5) >> 8):
            code.append(0xEA)
            n -= 2
        x = min(256, (n - 1 - 2) // 5)
        code += bytes([0xA2, x & 255, 0xCA, 0xD0, 0xFD])
        n -= 5 * x + 1
    if n % 2:
        code += bytes([0x24, 0xFE])
        n -= 3
    code += bytes([0xEA] * (n // 2))


def events(model, case):
    """The whole probe's writes and reads, [cycle, register, value] and [cycle, register],
    from the first cycle after the wait for line 0: the oscillators' registers cleared, the
    test bits set, the wait, then the case."""
    pre = Case("")
    for v in (V1, V2, V3):
        pre.freq(v, 0).pw(v, 0).ctrl(v, 0x08)
    pre.wait(SETTLE[model])
    return pre.events + [[e[0] + pre.t] + e[1:] for e in case.events]


def program(evs):
    """The probe's bytes for those events: each write's store and each read's load end on
    the event's cycle, and each value read goes to RESULT + 1 on, in order."""
    code, at, n = bytearray(HEAD), 0, 0          # at: the cycle the next instruction starts on
    for e in evs:
        if len(e) == 3:
            delay(code, ORG, e[0] - 5 - at)
            code += bytes([0xA9, e[2], 0x8D, e[1], 0xD4])
            at = e[0] + 1
        else:
            delay(code, ORG, e[0] - 3 - at)
            a = RESULT + 1 + n
            code += bytes([0xAD, e[1], 0xD4, 0x8D, a & 255, a >> 8])
            at, n = e[0] + 5, n + 1
    done = ORG + len(code) + 5
    code += bytes([0xA9, 0x01, 0x8D, RESULT & 255, RESULT >> 8, 0x4C, done & 255, done >> 8])
    if ORG + len(code) > RESULT:
        raise ValueError("the probe runs into its results")
    return bytes(code), n


def run(em, code, n, cycles):
    pause(em.rpc)
    poke(em.rpc, ORG, code)
    poke(em.rpc, RESULT, [0] * (1 + n))
    call(em.rpc, "vice_registers_set", {"register": "PC", "value": ORG})
    call(em.rpc, "vice_execution_run", {})
    end = time.time() + 30 + cycles / 200_000     # a fifth of real speed at worst
    while time.time() < end:
        time.sleep(0.05)
        r = read_mem(em.rpc, RESULT, 1 + n)
        if r[0] == 1:
            return list(r[1:])
    raise SystemExit("the probe never finished: is the emulator running?")


def record():
    em = Emulator()
    reset(em.rpc, "hard")
    time.sleep(3)
    call(em.rpc, "vice_machine_config_set", {"resources": {"WarpMode": 1}})
    from tools import vice_build
    out = {"source": "kit/c64/sid_osc.py record", "recorded": time.strftime("%Y-%m-%d"),
           "emulator": f"VICE {ask(em.rpc, 'vice_ping', {}).get('version', '?')}, {vice_build()}",
           "engine": None, "org": ORG, "result": RESULT, "models": {}}
    try:
        for model in MODELS:
            em.set_model(model)
            if not clocked(em):
                raise SystemExit("the emulator is not clocking its SID, so its reads are not the chip's: "
                                 "start it with sound on (kit/c64/tools.py, SOUND)")
            out["engine"] = engine()
            rows = []
            for c in cases(model):
                evs = events(model, c)
                code, n = program(evs)
                got = run(em, code, n, evs[-1][0])
                rows.append({"name": c.name, "events": evs, "reads": got, "program": code.hex()})
                print(f"{model} {c.name}: " + " ".join(f"{v:02X}" for v in got), flush=True)
            out["models"][model] = rows
    finally:
        call(em.rpc, "vice_machine_config_set", {"resources": {"WarpMode": 0}})
    return out


def write(out):
    """The fixture, a case to a line."""
    head = {k: v for k, v in out.items() if k != "models"}
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v)}," for k, v in head.items()] + [' "models": {']
    for i, (model, rows) in enumerate(out["models"].items()):
        lines.append(f"  {json.dumps(model)}: [")
        lines += [f"   {json.dumps(r, separators=(',', ':'))}" + ("," if j < len(rows) - 1 else "")
                  for j, r in enumerate(rows)]
        lines.append("  ]" + ("," if i < len(out["models"]) - 1 else ""))
    lines += [" }", "}"]
    with open(FIXTURE, "w") as f:
        f.write("\n".join(lines) + "\n")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
    elif a[0] == "record":
        out = record()
        os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
        write(out)
        print(f"wrote {os.path.relpath(FIXTURE)}")
    elif a[0] == "list":
        for model in MODELS:
            for c in cases(model):
                evs = events(model, c)
                code, n = program(evs)
                print(f"{model}  {evs[-1][0]:>10,} cycles  {n:>3} reads  {len(code):>4} bytes  {c.name}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
