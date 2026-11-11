# Icicle Works: orientation

## Image and machine

The contributor supplied `icicle_works.prg`, 30,977 bytes including its
little-endian `$1001` load address. SHA-256:
`0f51fa8c277d9ed4893899059cd34c18e8d68c1935ce3c10fb4655476009c14e`.
The BASIC line is `SYS4160:GYROS`; the repacker's provenance is unknown.
The game title credits Doug Turner and Commodore, 1985. No trainer menu
appeared and no cheat option was selected. No other game image was fetched.

The analysed machine is a PAL Plus/4 with 64 KB, BASIC 318006-01 and
KERNAL 318004-05, in plus4emu 1.2.11, commit 939e652, with the kit's
codemap patch and without libsndfile. This copy uses RAM above `$3FFF`
and is not a stock 16 KB C16 program. An expanded C16 was not tested.
All 46 `check-emulator` tests passed on port 7510 in 209 seconds.
The emulator footprint check on port 7512 reported no unexpected writes
outside this clone. Ports belonging to other checkouts were left alone.

## From power-on to the analysed states

Start the emulator through the launcher:

```
python3 kit/scripts/tools.py plus4emu --port 7510 --model plus4pal
```

Copy the supplied file to the game's ignored `work/icicle_works.prg`.
The following recipe uses `kit/c16/plus4emu.py` from the repository root:

```python
import sys
sys.path.insert(0, 'kit/c16')
from plus4emu import connect
p = 'games/c16/icicle-works/'
m = connect(port=7510)
m.delete()
m.release_keys()
m.tape(eject=True)
m.disk(eject=True)
m.reset(hard=True)
m.frames(150)
m.program(p + 'work/icicle_works.prg')
m.checkpoint(0x1040, temporary=True)
m.type('RUN\n')
m.run(frames=100)                  # stopped before SYS target $1040
m.checkpoint(0x6000, temporary=True)
m.run(frames=250)                  # stopped before game_entry
m.save(p + 'work/entry.p4emu')
m.frames(150)
m.save(p + 'work/title.p4emu')
m.key('SPACE')
m.frames(10)
m.key('SPACE', False)
m.frames(25)
m.save(p + 'work/play-room1.p4emu')  # room introduction, before steady play
m.frames(350)
m.save(p + 'work/play-stable.p4emu')
```

`entry.p4emu` is the listing's image. Its initialisation code and authored
assets remain available there; the steady-play snapshot is the comparison
image for the loaded-data audit. Rebuild the listing with both full paths:

```
python3 kit/scripts/listing.py games/c16/icicle-works games/c16/icicle-works/work/entry.p4emu --entry games/c16/icicle-works/work/play-stable.p4emu
```

Start the disassembler on the snapshot, rebuilding the project from the
canonical symbol map. Port 3010 avoids another checkout's disassembler:

```
KIT_R2000_PORT=3010 python3 kit/scripts/tools.py r2000 games/c16/icicle-works/work/entry.p4emu
```

## Steady state and memory

The hardware IRQ vector at `$FFFE` is `$6722`. The old KERNAL vectors at
`$0312/$0314` remain `$CE42/$CE0E`; the ROMs are disabled, so those are
not the game's interrupt path. TED selects the RAM charset at `$5000`,
attributes at `$0800`, characters at `$0C00`, multicolour text and a
24-row window. The game uses the PAL rate constant 50.

The resident program and assets occupy `$6000-$A5F0` and `$A800-$C81F`.
The startup copies the grid-pointer helper from `$6D29` to `$0400` and
copies the ROM keyboard scanner's ten pages into RAM `$DB00-$E4FF`.
Those generated copies and runtime screen/grid/charset buffers are outside
the authored-byte count. `$2000-$5FFF` initially duplicates `$6000-$9FFF`;
play overwrites portions with its grids and live charset. The retained
`$C820-$C8FF` tail equals `$8820-$88FF` byte for byte.

All sixteen rooms are in this resident image. There is no additional
image to supply for the room loads: `$6377` selects their pointers from
the in-memory tables. `media.json` accounts for the one supplied file as
the packed resident part.

## Assisted states and the frame comparison

Room previews beyond room 1 were reached by restoring `play-stable`,
setting player 1's room byte at `$53`, setting its incomplete flag to 1,
and running `$6377` to its RTS at `$6678`. Both 1,026-byte grids and the
toy window were checked there before allowing the simulation to advance.
The images whose names end in `-assisted.png` are examples of those states.

The five-letter name demonstration sets player 1's score to qualify for
the table, enters `$8AF7` and supplies `ABCDE`, then RETURN, through the
keyboard buffer. It demonstrates the entry limit, not a played score.

`display-still.p4emu` is a copy of `play-stable` with the CPU held in a
private loop at `$E500` and interrupts disabled. This leaves the displayed
RAM unchanged during the emulator's two-frame screenshot capture.
`reference/rebuilt-target.png` is that capture. The page uses its 2 KB
screen/attributes, 2 KB live charset and TED registers, without the loop
or any program bytes. `C16.render` matched all 64,000 display pixels.

## Loader

The BASIC launcher enters `$1040`, unpacks and relocates the resident
program, and transfers control to `$6000`. The lower copy and the 224-byte
upper relocation tail remain in RAM. The listing begins at the game's
hand-over rather than annotating the repacker. The PRG loads directly;
there is no tape/disk drive attached during analysis or play.
