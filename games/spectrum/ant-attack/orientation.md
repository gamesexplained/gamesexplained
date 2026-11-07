# Ant Attack — orientation

## Image and machine

The contributor supplied `AntAttack.tzx.zip`. Its member is `Ant Attack.tzx`,
42,138 bytes, with the `ZXTape!` signature and TZX version 1.10. The copy in
`work/ant-attack.tzx` has SHA-256
`98ce71d3cd79fb2faac8524428ba53492d05a5e62efcad340236abd50d8d6f7f`.
It is a tape recording, not a saved running machine. No trainer appeared.

ZEsarUX 13.0, official `ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`, runs as a
48K Spectrum. SkoolKit 10.1 reads the snapshot and control file. On this
Linux x86_64 cloud host, the emulator check passed 47 of 50. The failed
checks were `count-while-running`, `load-keeps-frame-phase` and `warp`.
Use bounded runs and read between them; compare experiments that both begin
with a snapshot load; select speed at emulator launch. The launcher footprint
check found no unexpected writes outside the repository.

## Route from power-on

Start with `python3 kit/scripts/tools.py --platform spectrum zesarux`.
Use `kit/spectrum/zesarux.py`'s client. Stop, hard-reset, and smartload the
absolute path to `work/ant-attack.tzx`. The filename used with ZRCP has no
spaces: the uploaded name with a space produced `Unknown file format`.
Clear breakpoints and set a stopping breakpoint at PC `$9700` before running.
Run bounded chunks until PC is exactly `$9700` (the chunk limit alone is
not a successful stop). Save `work/entry.sna`. This is the loader's return
target after the final tape block, before the program's startup.

Clear that breakpoint and advance 1,500 display frames to reach the title
and its `Girl or Boy (g/b)?` prompt; save `work/title.sna`. The engine is
not running here. Choose B through keyboard row 7 bit 4, held for 25 frames,
then release and advance 500 frames. The welcome screen eventually says
`PRESS ANY KEY`. Hold Space (row 7 bit 0) for 20 frames, release and advance
200 frames. Save `work/ready.sna`: the city is drawn and the message says
`READY WHEN YOU ARE`. Hold V (row 0 bit 4) for 20 frames, release and
advance 30 frames. Save `work/play-round1.sna`. The player stands inside
the gate and the timer reads 998. The screenshot is `reference/play.png`.

The primary listing image is `work/entry.sna`. All 6,144 bytes from
`$8000–$97FF` agree between entry and play; 2,229 bytes in `$9800–$B3FF`
and 304 in `$B400–$BFFF` change, so their producers must be distinguished
from authored graphics. Five city bytes in `$C000–$FFFF` also change.

## Tape files and memory

`tools/skoolkit/bin/tapinfo.py` lists the tape. The first block is a
MakeTZX description, followed by a program header, its 76-byte payload,
and one 41,984-byte payload (lengths here omit flag and checksum).

| Tape block | Meaning | Destination | Evidence |
|---|---|---|---|
| 2 | Header, `ANT ATTACK`, autostart line 1 | ROM tape workspace | Header decoded by tapinfo |
| 3 | BASIC bootstrap and 23-byte machine loader | BASIC at `$5CCB`, loader at `$5D00` | Line 1 calls PROG+53 |
| 4 | Complete game image | `$5C00–$FFFF` | 41,984 of 41,984 bytes match entry snapshot at that offset |

The bootstrap disables interrupts, sets IX=`$5C00`, DE=`$A400`, flag
`$FF`, moves SP to `$5BF0`, pushes `$9700`, and enters the ROM tape reader
at `$0562`. The image overwrites the bootstrap. `$9700` checks the load,
sets I=`$98` and IM 2, then jumps to `$97A0`, which prepares a BASIC RUN
through the ROM. The game has one resident load; no additional tape
payload remains for later rounds.

## Execution and interrupts

In play PC was `$851B`, IX=`$B458`, IY=`$8203`, I=`$98`; interrupts were
disabled. The title snapshot also had I=`$98`, IM 2, IFF2 clear. The
startup installs IM 2 while BASIC handles menus; the engine enters with
DI at `$8000` and returns with EI. The engine's top-level loop is
`$8009`, reached after `$81E4` draws the first view. The BASIC callers
enter at `$8000`, `$8090` (choice scan), `$8097` (wait for a key), and
`$8EF2` (ending picture). The first control file is
`work/ant-attack.ctl`; it is rebuilt from the symbol map and entry snapshot.
