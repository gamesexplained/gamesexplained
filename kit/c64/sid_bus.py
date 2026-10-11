#!/usr/bin/env python3
"""What the SID's write-only registers read back, measured in the emulator (#194).

Most of the SID's registers cannot be read: $D400-$D418 are written, and only $D419-$D41C
answer a read. A read of any other register returns what the data bus last carried to the
chip, the most recent value written to any of its registers, until that charge fades. A
driver that reads a write-only register (Jumpman's reads $D404 after writing $D406) sees the
last write to the chip, not the last write to that register, so a port tested against a
per-register shadow agrees with the original for the wrong reason.

This assembles a probe for the C64 at $C000: write registers, wait an exact number of
cycles with the screen blanked and interrupts off, read a register. It runs the probe in
VICE for each SID model and case, finds how long each value holds, and writes the readings
to kit/c64/fixtures/sid-bus.json. kit/c64/test_sid_bus.js holds the model of the bus in
site/lib/sid.js, which kit/c64/machine.js uses too, against that file.

Usage:
  sid_bus.py record      measure in the running emulator (tools.py vice) and write the fixture
  sid_bus.py probe REG=VAL[,REG=VAL...] READ CYCLES [MODEL]
                         one probe: the writes, in order, then a read of READ CYCLES cycles
                         after the last write's cycle (hex registers $D400-$D41F; MODEL 6581
                         or 8580); prints the value read

What is measured is the emulator's model of the chip (its SID engine, named in the
fixture), not a physical SID: real chips fade bit by bit, at rates that differ from chip to
chip and with temperature. The emulator must be clocking the SID: with its sound off, or on
a sound device nothing drains, VICE's reads are not the chip's (virtual_display in
kit/c64/tools.py), and record stops with that.
"""
import json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from asm import assemble  # noqa: E402
from vice import connect, call, ask, poke, read_mem, pause, reset  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "sid-bus.json")
LOG = os.path.join(HERE, "..", "..", "tools", "logs", "vice.log")
ORG, RESULT = 0xC000, 0xC3F0                 # the probe, and where it leaves what it read
MODELS = {"6581": 0, "8580": 1}              # VICE's SidModel resource
FAR = 2_000_000                              # longer than any hold: a value still there holds
# Each case: the writes in order, any reads before the one measured, as [register, cycles
# after the last write], and the register the measured read is of.
CASES = [
    {"name": "a write to $D406, read at $D404", "writes": [[0x06, 0xA5]], "read": 0x04},
    {"name": "$D404 then $D406 written, read at $D404", "writes": [[0x04, 0x81], [0x06, 0x21]], "read": 0x04},
    {"name": "a write to $D418, read at $D400", "writes": [[0x18, 0x5F]], "read": 0x00},
    {"name": "a write to $D400, read at $D41D, past the chip's registers", "writes": [[0x00, 0x3C]], "read": 0x1D},
    {"name": "a write to $D41F, past the chip's registers, read at $D406", "writes": [[0x1F, 0xC3]], "read": 0x06},
    {"name": "a write to $D406, read at $D404 twice", "writes": [[0x06, 0xA5]], "before": [[0x04, 4]], "read": 0x04},
    {"name": "a write to $D406, then $D41B read, then $D404", "writes": [[0x12, 0x48], [0x06, 0xA5]],
     "before": [[0x1B, 4]], "read": 0x04},
    {"name": "a write to $D406, then $D419 read, then $D404", "writes": [[0x06, 0xA5]],
     "before": [[0x19, 4]], "read": 0x04},
    {"name": "a write to $D406, read at $D419", "writes": [[0x06, 0xA5]], "read": 0x19},
]


def delay(n):
    """6502 source that takes exactly n cycles (n = 0 or n >= 2) and touches no chip: loops on X
    and Y, then two-cycle NOPs and at most one three-cycle BIT of zero page. The caller keeps
    each loop's branch inside one page (a branch taken across a page takes one cycle more)."""
    if n == 1 or n < 0:
        raise ValueError(f"no instruction sequence takes {n} cycles")
    src, k = [], 0

    def label():
        nonlocal k
        k += 1
        return f"d{k}"
    # A Y loop of m rounds round an X loop of 256: m * (5 * 256 + 6) + 1 cycles
    while n >= 1286 + 1 + 2:
        m = min(256, (n - 1 - 2) // 1286)
        o, i = label(), label()
        src += [f"ldy #{m & 255}", f"{o}: ldx #0", f"{i}: dex", f"bne {i}", "dey", f"bne {o}"]
        n -= m * 1286 + 1
    # An X loop of x rounds: 5 * x + 1 cycles
    if n >= 6 + 2:
        x = min(256, (n - 1 - 2) // 5)
        i = label()
        src += [f"ldx #{x & 255}", f"{i}: dex", f"bne {i}"]
        n -= 5 * x + 1
    if n % 2:
        src.append("bit $fe")
        n -= 3
    src += ["nop"] * (n // 2)
    return "\n".join(src)


def program(writes, reads):
    """The probe: the writes in order, then each read [register, cycles] that many cycles after
    the last write's cycle. An absolute store writes, and an absolute load reads, on its fourth
    and last cycle; each read is stored, four cycles, before the wait for the next."""
    body, at = [], None
    for r, v in writes:
        body.append(f"lda #${v:02x}\nsta ${0xD400 + r:04x}")
    for i, (r, t) in enumerate(reads):
        wait = t - 4 if at is None else t - at - 8
        body += [delay(wait), f"lda ${0xD400 + r:04x}", f"sta ${RESULT + 1 + i:04x}"]
        at = t
    src = f"""
start:  sei
        lda #0
        sta $d015          ; no sprites
        lda #$0b
        sta $d011          ; the screen blanked: no bad lines from the next frame on
w1:     bit $d011
        bpl w1
w2:     bit $d011
        bmi w2             ; line 0 of a frame with no bad lines: every cycle is the processor's
{chr(10).join(body)}
        lda #1
        sta ${RESULT:04x}
done:   jmp done
"""
    code, labels = assemble(src, ORG)
    for name, a in labels.items():            # every loop's branch inside one page
        if re.fullmatch(r"d\d+", name) and (a >> 8) != ((a + 7) >> 8):
            raise ValueError(f"loop {name} at ${a:04X} crosses a page")
    if ORG + len(code) > RESULT:
        raise ValueError("the probe runs into its result")
    return code


class Emulator:
    def __init__(self):
        self.rpc = connect()

    def set_model(self, model):
        call(self.rpc, "vice_machine_config_set", {"resources": {"SidModel": MODELS[model]}})
        got = ask(self.rpc, "vice_machine_config_get", {}).get("resources", {}).get("SidModel")
        if got != MODELS[model]:
            raise SystemExit(f"the emulator kept SidModel {got}, asked for {MODELS[model]} ({model})")

    def probe(self, writes, reads):
        """The values the reads return, in order."""
        pause(self.rpc)
        poke(self.rpc, ORG, program(writes, reads))
        poke(self.rpc, RESULT, [0] * (1 + len(reads)))     # the flag the probe sets when done
        call(self.rpc, "vice_registers_set", {"register": "PC", "value": ORG})
        call(self.rpc, "vice_execution_run", {})
        for _ in range(1000):
            time.sleep(0.02)
            r = read_mem(self.rpc, RESULT, 1 + len(reads))
            if r[0] == 1:
                return list(r[1:])
        raise SystemExit("the probe never finished: is the emulator running?")

    def last(self, case, t):
        return self.probe(case["writes"], case.get("before", []) + [[case["read"], t]])[-1]


def clocked(em):
    """True when the emulator runs the SID: voice 3's noise at full rate reads differently a
    few hundred cycles apart. With sound off VICE reads $D41B as the cycle counter's low byte,
    so the test also asks that a value repeat when the read is moved by 256 cycles."""
    w = [[0x0E, 0xFF], [0x0F, 0xFF], [0x12, 0x80]]
    a = em.probe(w, [[0x1B, 1000], [0x1B, 1300], [0x1B, 1556]])
    return len(set(a)) > 1 and a[1] != a[2]


def hold_time(em, case):
    """The first time, in cycles after the last write, at which the measured read no longer
    returns what it returns at once: bisected. None when it still does at FAR."""
    first = case["before"][-1][1] if case.get("before") else None
    lo = first + 8 if first is not None else 4
    want = em.last(case, lo)
    if em.last(case, FAR) == want:
        return None
    hi = FAR
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if mid == 5 or first is not None and mid == first + 9:
            mid += 1
            if mid >= hi:
                break
        if em.last(case, mid) == want:
            lo = mid
        else:
            hi = mid
    return hi


def engine():
    """The SID engine VICE last reported in its log, as 'reSIDfp'."""
    try:
        found = re.findall(r"(FastSID|reSIDfp|reSID|ReSID\w*): *(MOS\d+)", open(LOG, errors="replace").read())
    except OSError:
        return None
    return found[-1][0] if found else None


def record():
    em = Emulator()
    reset(em.rpc, "hard")
    time.sleep(3)
    call(em.rpc, "vice_machine_config_set", {"resources": {"WarpMode": 1}})
    from tools import vice_build
    out = {"source": "kit/c64/sid_bus.py record", "recorded": time.strftime("%Y-%m-%d"),
           "emulator": f"VICE {ask(em.rpc, 'vice_ping', {}).get('version', '?')}, {vice_build()}",
           "engine": None, "models": {}}
    try:
        for model in MODELS:
            em.set_model(model)
            if not clocked(em):
                raise SystemExit("the emulator is not clocking its SID, so its reads are not the chip's: "
                                 "start it with sound on (kit/c64/tools.py, virtual_display)")
            out["engine"] = engine()
            rows = []
            for case in CASES:
                t = hold_time(em, case)
                first = case["before"][-1][1] if case.get("before") else None
                start = first + 8 if first is not None else 4
                times = {start, start + 2, 100, 1000} | ({t - 1, t, t + 1, 2 * t} if t else {FAR})
                reads = [[c, em.last(case, c)] for c in sorted(times) if c >= start and c != 5
                         and (first is None or c != first + 9)]
                row = {"name": case["name"], "writes": case["writes"]}
                if case.get("before"):
                    row["before"] = case["before"]
                row.update({"read": case["read"], "hold": t, "reads": reads})
                rows.append(row)
                print(f"{model} {case['name']}: " + (f"holds {t} cycles" if t else f"holds past {FAR}") +
                      "; " + ", ".join(f"{c}: ${v:02X}" for c, v in reads), flush=True)
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
        lines += [f"   {json.dumps(r)}" + ("," if j < len(rows) - 1 else "") for j, r in enumerate(rows)]
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
    elif a[0] == "probe" and len(a) >= 4:
        writes = []
        for w in a[1].replace("$", "").split(","):
            r, v = w.split("=")
            writes.append([int(r, 16) & 0x1F, int(v, 16)])
        em = Emulator()
        if len(a) > 4:
            em.set_model(a[4])
        print(f"${em.probe(writes, [[int(a[2].replace('$', ''), 16) & 0x1F, int(a[3])]])[0]:02X}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
