# Balloon Fight — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Balloon Fight (USA).nes`, 24,592 bytes, copied to `work/game.nes`. SHA-1
`49dd51d3dcdc7624b69798f472d4edc3874f3502`; CRC32 of the PRG and CHR
without the header `401349A8`, the figure NesCartDB lists for a release.
The file's name says the North American release; which board it was
dumped from is not checked against NesCartDB in this run yet.

The header (`nes-reference`, "The cartridge image") is
`4E 45 53 1A 01 01 00 08 00 00 00 00 00 00 00 01`: one 16 KB unit of PRG
ROM, one 8 KB unit of CHR ROM, byte 6 zero (horizontal mirroring, no
battery, no trainer), byte 7 `$08` (an NES 2.0 header; mapper 0 in both
nybbles), and byte 15 `$01` (NES 2.0's default expansion device, the
standard controllers). So the board is NROM-128: no mapper registers, no
cartridge RAM, the 16 KB of PRG at `$8000` and again at `$C000`, and the
8 KB of CHR fixed in the PPU's `$0000-$1FFF`.

The file maps onto the machine in two pieces, both checked byte for byte
against the play snapshot (SHA-1 of the file's PRG and of `$C000-$FFFF`
in the snapshot both `6742fa2ea498e5b73dc2024ad3888a64e6b894e4`):

| File offset | Length | Where it lands |
|---|---|---|
| `$0010-$400F` | 16,384 | CPU `$C000-$FFFF`, and the same bytes at `$8000-$BFFF` |
| `$4010-$600F` | 8,192 | PPU `$0000-$1FFF`, the two pattern tables |

Nothing else: no loader, no trainer, no menu in front of the game. It is
the original program as the cartridge carries it, not a crack.

## From power-on to play

Everything is through the kit's jsnes server (`kit/skills/nes/tool-jsnes`),
started with `python3 kit/scripts/tools.py jsnes`, and `kit/nes/jsnes.py`'s
client; `frames(n)` is the server's `run` with `frames`, which stops after
the instruction in which the last frame's vertical blank began.

1. `cartridge("work/game.nes")`: the cartridge goes in and the machine
   powers on, the CPU at the reset vector. The hand-over is the first
   instruction the game runs, `$C000`, seven cycles after power-on: a stopping
   checkpoint on `$C000`, `run(frames=1)`, then `save` as
   `work/entry.json.gz`.
2. `frames(120)`: the title screen is up from the first second, with the
   options `A 1-PLAYER GAME`, `B 2-PLAYER GAME`, `C BALLOON TRIP` and
   `©1984 NINTENDO`. Left alone it starts an attract-mode game of its
   own after a few seconds. `work/title.json.gz` is the machine here, at
   frame 120.
3. Start, held for 5 frames (`button("start")`, `frames(5)`, released), on
   the first option: `PHASE-01` is shown under the score line and play
   begins at once, the player at the bottom left with two balloons and
   three birds on the platforms.
4. Eight times: A held for 3 frames, then 27 frames with nothing held,
   which keeps the player flapping near the ground. `work/play-phase1.json.gz`
   is saved after the eighth, at frame 365, cycle 10,869,944, the player
   on the ground at the bottom left, the three birds still on their
   platforms, no collision yet. The screenshot of that moment is
   `reference/play-phase1.png` (the server's `screenshot` of the frame
   it had just finished).

Every snapshot names the cartridge by path and SHA-1; `load` puts it in
again if another is in the machine.

## Steady state

- **Vectors** (`$FFFA-$FFFF`, in ROM, so the same at the hand-over and in
  play): NMI `$C094`, reset `$C000`, IRQ `$C0F7`. The IRQ vector points at
  `JMP $C0F7`, a jump to itself, and the I flag stays set in play
  (P `$37`): the game never takes an interrupt but the NMI, and an IRQ
  would hang it.
- **The NMI handler** at `$C094` is the frame: it saves A, X and Y, sends
  page `$02` to the PPU's sprite table (`STA $2003` with 0, then `$02` to
  `$4014`), so `$0200-$02FF` is the sprite table's copy; compares `$52`
  with `$53` and calls three routines (`$C17C`, `$D60D`, `$D798`) when
  they differ; counts `$19` up; sets the VRAM address to `$2000` and the
  scroll to 0, 0; and calls `$FFF7`, a tiny routine beside the vectors.
- **The main loop** waits at `$F469`: `LDA $02 / BEQ $F469`, until the
  NMI leaves something other than zero in `$02`. The program counter
  sampled once a second for six seconds of play, and after each
  snapshot, was `$F469` or `$F46B` every time: the game's logic runs from
  the NMI or from what the wait returns to, one pass a frame.
- **The PPU in play**: PPUCTRL `$90` (NMI on, background tiles from
  `$1000`, sprites from `$0000`, 8 by 8 sprites, nametable 0), PPUMASK
  `$1E` (background and sprites on, the left 8 pixels shown), scroll 0, 0.
  Horizontal mirroring, from the header.
- **Where the code is**: `$C000-$FFFF`, all of it ROM. Traced from the
  three vectors on the play snapshot, regenerator2000 found 11,088 bytes
  of code in 79 blocks, none of it in the `$8000` half, so the listing is
  of the `$C000` half and `$8000-$BFFF` is excluded in `game.json` as the
  mirror. No code in RAM: the 2 KB at `$0000-$07FF` holds the game's
  variables, the stack and the sprite table. `$6000-$7FFF` is zero and
  the board has nothing there.
- **Nothing is reloaded.** The PRG and CHR are the same bytes at the
  hand-over and in play, and the board has no banking, so the game is
  one part and one snapshot shows all of it.

## The loader, in a paragraph

There is no loader. The reset vector is the game's own start-up at
`$C000`, which the hand-over snapshot catches before its first
instruction, and the cartridge holds the whole program at fixed
addresses. What the start-up does is described with the rest of the
code, not here.
