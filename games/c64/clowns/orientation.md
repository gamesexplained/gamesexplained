# Clowns — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Clowns.crt`, 8,272 bytes. The header reads `C64 CARTRIDGE`, hardware
type 0 (a plain cartridge), EXROM 1 and GAME 0, so the GAME line is held
low and EXROM is not: the **Ultimax** configuration. The cartridge name
field reads `Clowns`. One `CHIP` packet: bank 0, 8,192 bytes, loading at
`$E000`-`$FFFF` (`python3 kit/c64/crt.py work/Clowns.crt`).

| | |
|---|---|
| SHA-1 of the `.crt` | `56f8e0ad7b0a2ce8eb031fe7a80dc6b59e0db508` |
| SHA-1 of the 8 KB ROM alone | `ffebfc19263dc50d3a808135dbe88567617af6b8` |
| MD5 of the 8 KB ROM alone | `126dac5d98bea5f2a388eaf97fa842d0` |

The title screen reads `©1982 BALLY/MIDWAY ©1982 COMMODORE`. Nothing on
screen or in the image suggests a crack or trainer: there is no loader,
and the CPU's reset, IRQ and NMI vectors at `$FFFA`-`$FFFF` all point into
the cartridge.

## From power-on to play

1. Attach and autostart `work/Clowns.crt`. VICE attaches it as a
   cartridge and resets; there is no load. The title screen appears at
   once: three rows of balloons, `PUSH 'F1' TO BEGIN`, the high score, the
   copyright line, and a clown and see-saw playing on their own.
2. Press **F1**. The prompt changes to `PUSH / F1 FOR 1 PLAYER, F3 FOR 2
   PLAYERS.`
3. Press **F1** again for one player. `PLAYER 1` is shown in the middle
   of the field, `JUMPS 5` in the top line, and play starts within about
   two seconds: a clown jumps from a platform on the left and falls
   towards the see-saw.
4. Snapshots:
   - `work/play.vsf`: one-player game in progress, saved on the running
     machine about four seconds after the second F1, no input given (the
     jump counter had fallen to 3: two clowns had fallen past the see-saw).
   - `work/entry.vsf`: the hand-over. Power-cycle (`vice_machine_reset`
     `hard`, with the cartridge attached) with a stopping checkpoint on
     `$F766`, the reset vector's target, and save at the stop. RAM there
     is the emulator's power-on pattern only (16 distinct byte values in
     `$0000`-`$0FFF`); `$00`/`$01` read `$00`/`$17`.

**The game is played with paddles.** The joystick does nothing: holding
left on either port for 25 frames moved nothing. The ROM reads
`$D419,Y` (the SID's paddle inputs) at `$F18F` and the fire buttons from
`$DC01` at `$F4AB` and `$F4BD`, after writing `$DC00` to select a pair
(`$F4A8`, `$F4BA`, `$F4D7`). The vice-mcp server has no paddle tool
(v3.13.2, 11 October 2026), so live tests set the value the game reads
by stopping after that read.

## Steady state

The listing is built from the cartridge image itself, `work/Clowns.crt`:
every byte of the program is in the ROM at `$E000`-`$FFFF`, and the
CPU runs it there. Neither snapshot holds it, because a snapshot's RAM
image is the RAM beneath the cartridge (VICE's `ram` bank at `$E000` reads
the power-on pattern, `cart` and `cpu` read the ROM).

- **No interrupts.** The IRQ and NMI vectors both point at `$F765`, a
  lone `RTI`; the reset vector points at `$F766`. The cold start masks
  CIA 1's interrupts (`$7F` to `$DC0D`). The game runs as one loop; the
  program counter sampled at `$F711`-`$F715` on eight pauses during play,
  a wait loop.
- **Cold start** (`$F766`-`$F7E4`): `SEI`, `CLD`, stack at `$01FF`; 30
  bytes from `$F733` into the video chip's `$D011`-`$D02E`; 22 bytes from
  `$F74C` into the SID's `$D400`-`$D415`; CIA 1 interrupts off, CIA 1
  timer A set to `$2710` and started as a one-shot (`$18` to `$DC0E`),
  port A all outputs and port B all inputs; `$E5` to `$01` and `$2F` to
  `$00`; sprite 0's pointer `$07F8` = `$0F`; zero page from `$02` and
  `$0200`-`$03FF` cleared; one call to `$F4EE` and two to `$F668`; then
  `JMP $E000`.
- **Video**, read in play: `$DD00` = `$BF` (video bank 0, `$0000`-`$3FFF`),
  `$D018` = `$1F` (screen at `$0400`, character set at `$3800`), `$D011` =
  `$1B`. What the video chip fetches at `$3800` in the Ultimax
  configuration is checked in `facts.md`.
- **Nothing is reloaded.** There is no disk or tape; the game is one part.

## Emulator

Build: own build of github.com/barryw/vice-mcp, release v3.13.2, commit
1e83aab134 (`tools.py status`, 11 October 2026). `check-emulator`: 57
passed, 0 failed.

## The loader, in a paragraph

There is none. The cartridge takes the place of the KERNAL: the CPU's
reset vector is the cartridge's own, and the KERNAL never runs, so the
game sets up the video chip, the SID and CIA 1 itself.
