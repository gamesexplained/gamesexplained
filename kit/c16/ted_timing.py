#!/usr/bin/env python3
"""TED's timing as plus4emu gives it, recorded so that kit/c16/machine.js can be checked against it.

    python3 kit/scripts/tools.py plus4emu &          # the kit's plus4emu server
    python3 kit/c16/ted_timing.py record             # writes kit/c16/fixtures/ted-timing.json

record runs the kit's own probe programs (below) on the emulator, each from a C16 just reset, and
writes what they read; kit/c16/test_machine.js runs the same programs on the machine and compares,
with no emulator. The probes:

  position (twice, the display on and off): reads $FF1E, $FF1D, timer 1 and timer 2 at places
           that drift over two frames, into a buffer;
  raster   128 raster interrupts through the KERNAL, on lines 23 apart: the position and the line
           at the handler's first instruction;
  timer    timer 1 interrupts through the KERNAL, at three periods, over a stream of mixed
           instructions with SEI ... CLI and PHP ... PLP in it: the position, the line and the
           address the interrupt returns to;
  stream   a stream of mixed instructions, stepped one at a time: the tick each one begins on;
  charline (four times, the display on: 25 rows with the vertical scroll at 3, 0 and 7, and 24
           rows): reads $FF1F, $FF1D, $FF1C and $FF1E at places that drift over two frames, into a
           buffer.

The programs are the kit's, assembled by kit/cpu/asm6502.py: the fixture holds no byte of a game
or of a ROM.
"""
import base64
import datetime
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "cpu"))
from asm6502 import assemble  # noqa: E402

FIXTURE = os.path.join(HERE, "fixtures", "ted-timing.json")
ORG = 0x1000

POSITION = """
start:  sei
        lda #$00
        sta $FF0A
        lda #$02
        sta $FF09
        lda #${den:02X}
        sta $FF06
        lda #$34
        sta $FF00
        lda #$12
        sta $FF01
        lda #$FF
        sta $FF02
        sta $FF03
        lda #$00
        sta $FF04
        lda #$80
        sta $FF05
        lda #$04
        sta $40
round:  ldx #$00
loop:   lda $FF1E
s1:     sta $2000,x
        lda $FF1D
s2:     sta $2100,x
        lda $FF00
s3:     sta $2200,x
        lda $FF01
s4:     sta $2300,x
        lda $FF02
s5:     sta $2400,x
        txa
        and #$07
        tay
d:      dey
        bpl d
        inx
        bne loop
        lda s1+2
        clc
        adc #$05
        sta s1+2
        lda s2+2
        clc
        adc #$05
        sta s2+2
        lda s3+2
        clc
        adc #$05
        sta s3+2
        lda s4+2
        clc
        adc #$05
        sta s4+2
        lda s5+2
        clc
        adc #$05
        sta s5+2
        dec $40
        bne round
end:    jmp end
"""

CHARLINE = """
start:  sei
        lda #$00
        sta $FF0A
        lda #$02
        sta $FF09
        lda #${ff06:02X}
        sta $FF06
        lda #$04
        sta $40
round:  ldx #$00
loop:   lda $FF1F
s1:     sta $2000,x
        lda $FF1D
s2:     sta $2100,x
        lda $FF1C
s3:     sta $2200,x
        lda $FF1E
s4:     sta $2300,x
        txa
        and #$07
        tay
d:      dey
        bpl d
        inx
        bne loop
        lda s1+2
        clc
        adc #$04
        sta s1+2
        lda s2+2
        clc
        adc #$04
        sta s2+2
        lda s3+2
        clc
        adc #$04
        sta s3+2
        lda s4+2
        clc
        adc #$04
        sta s4+2
        dec $40
        bne round
end:    jmp end
"""

RASTER = """
start:  sei
        lda #$1B
        sta $FF06
        lda #<handler
        sta $0314
        lda #>handler
        sta $0315
        lda #$00
        sta $41
        lda #$05
        sta $FF0B
        lda #$02
        sta $FF0A
        sta $FF09
        cli
        jmp main
handler: lda $FF1E
        ldx $41
        sta $2000,x
        lda $FF1D
        sta $2100,x
        lda $FF0B
        sta $2200,x
        clc
        adc #23
        cmp #250
        bcc ok
        sbc #250
ok:     sta $FF0B
        lda #$02
        sta $FF09
        inc $41
        lda $41
        cmp #$80
        bne cont
        lda #$00
        sta $FF0A
cont:   pla
        tay
        pla
        tax
        pla
        rti
main:   .fill 300, $EA
        jmp main
"""

TIMER = """
start:  jmp go
sub:    rts
go:     sei
        lda #$1B
        sta $FF06
        lda #<handler
        sta $0314
        lda #>handler
        sta $0315
        lda #$00
        sta $41
        ldx #$20
        ldy #$05
        sta $82
        lda #$30
        sta $83
        lda #<{latch}
        sta $FF00
        lda #>{latch}
        sta $FF01
        lda #$08
        sta $FF0A
        sta $FF09
        cli
        jmp main
handler: lda $FF1E
        sta $44
        lda $FF1D
        sta $45
        txa
        tay
        lda $0105,y
        sta $46
        lda $0106,y
        sta $47
        ldx $41
        lda $44
        sta $3800,x
        lda $45
        sta $3900,x
        lda $46
        sta $3A00,x
        lda $47
        sta $3B00,x
        lda #$08
        sta $FF09
        inc $41
        bne cont
        lda #$00
        sta $FF0A
cont:   pla
        tay
        pla
        tax
        pla
        rti
main:
"""

STREAM = """
start:  jmp go
sub:    rts
go:     sei
        ldx #$20
        ldy #$05
        lda #$00
        sta $82
        lda #$30
        sta $83
main:
"""

# The stream's instructions: stores, loads and read-modify-writes plain and indexed (some crossing
# a page), a JSR to an RTS, PHA and PLA, a STA ($82),Y, and for the timer probe the spans that
# hold the interrupt off and let it through.
KINDS = ["nop", "sta $3000", "sta $3000,x", "lda $3000", "lda $3000,x", "inc $3010", "inc $80", "sta $81",
         "pha\npla", "lda #$12", "jsr sub", "sta ($82),y", "lda $30F0,x", "asl $3000,x", "stx $3020"]
SPANS = ["sei\nnop\nnop\ncli", "php\nsei\nnop\nplp", "cli", "php\ncli\nplp", "bne next{n}\nnext{n}:", "beq next{n}\nnext{n}:"]


def stream(head, seed, n, spans):
    r = random.Random(seed)
    lines = []
    for i in range(n):
        lines.append(r.choice(KINDS + (SPANS if spans else [])).replace("{n}", str(i)))
    src = head + "\n".join(lines) + "\nend:    jmp " + ("main" if spans else "end") + "\n"
    code, labels = assemble(src, ORG)
    if ORG + len(code) > 0x3000:
        raise SystemExit("ted_timing: the stream runs into its data at $3000")
    return code, labels


def probes():
    """Every probe: name, its code and labels, how it runs, and the buffer it leaves."""
    out = []
    for name, den in (("position-on", 0x1B), ("position-off", 0x0B)):
        code, labels = assemble(POSITION.replace("{den:02X}", "%02X" % den), ORG)
        out.append((name, code, labels, {"until": labels["end"]}, (0x2000, 20 * 256)))
    code, labels = assemble(RASTER, ORG)
    out.append(("raster", code, labels, {"frames": 14}, (0x2000, 3 * 256)))
    for i, latch in enumerate((1789, 2003, 997)):
        code, labels = stream(TIMER.replace("{latch}", str(latch)), 3 + i, 2500, True)
        out.append(("timer-%d" % latch, code, labels, {"frames": 40}, (0x3800, 4 * 256)))
    for ff06 in (0x1B, 0x18, 0x1F, 0x13):
        code, labels = assemble(CHARLINE.replace("{ff06:02X}", "%02X" % ff06), ORG)
        out.append(("charline-%02X" % ff06, code, labels, {"until": labels["end"]}, (0x2000, 16 * 256)))
    return out


def record(path):
    sys.path.insert(0, HERE)
    from plus4emu import connect
    m = connect()

    def boot(code):
        m.call("delete", all=True)
        m.call("reset", hard=True)
        m.frames(150)
        c = m.chips()
        m.call("write", address=ORG, data=base64.b64encode(code).decode(), space="ram")
        m.call("set-registers", pc=ORG)
        return [c["line"], c["column"]]

    fixture = {"source": "kit/c16/ted_timing.py record", "recorded": datetime.date.today().isoformat(),
               "emulator": "plus4emu 1.2.11, git 939e652, as a C16, in the kit's server (kit/c16/p4emu_server.py)",
               "probes": {}}
    for name, code, labels, run, (buf, n) in probes():
        start = boot(code)
        m.call("write", address=buf, data=base64.b64encode(bytes(n)).decode(), space="ram")
        r = m.until(run["until"], max_cycles=10_000_000) if "until" in run else m.frames(run["frames"])
        if r.get("reason") == "jam":
            raise SystemExit("ted_timing: %s stopped: %s" % (name, r.get("reason")))
        fixture["probes"][name] = {"code": code.hex(), "start": start, "run": run, "buffer": [buf, n],
                                   "result": m.read(buf, n, space="ram").hex()}
        print(name, "from line %d column %d" % tuple(start), r.get("reason"))
    code, labels = stream(STREAM, 1, 3000, False)
    start = boot(code)
    ticks, last = [], None
    while True:
        r = m.step(1)
        if last is not None:
            ticks.append(r["cycles"] - last)
        last = r["cycles"]
        if r["pc"] == labels["end"]:
            break
    fixture["stream"] = {"code": code.hex(), "start": start, "end": labels["end"], "ticks": ticks}
    print("stream", len(ticks) + 1, "instructions")
    with open(path, "w") as f:
        json.dump(fixture, f, separators=(",", ":"))
        f.write("\n")
    print("wrote", os.path.relpath(path))


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv[0] == "record":
        record(argv[1] if len(argv) > 1 else FIXTURE)
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
