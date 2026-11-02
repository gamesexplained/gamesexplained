# Driller — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Driller (1987)(Incentive).tzx` from the TOSEC ZX Spectrum set
(V2017-11-01; the entry with no `[a]`, `[b]`, `[h]` or `[cr]` flag:
Incentive Software's original 48K tape), 52,230 bytes, SHA-256
`fd7922c70b5b07938423455c9205fc9c35464de2dfac4d1911eba42a0d8b18f7`. The
header is `ZXTape!` version 1.10, and its first block says `Created with
Ramsoft MakeTZX`. SkoolKit's `tapinfo.py` lists eight blocks:

| Block | What |
|---|---|
| 1 | text: `Created with Ramsoft MakeTZX` |
| 2, 3 | the header and 205 bytes of the BASIC program `DRILLER`, auto-run from line 10 |
| 4, 5 | the header and 448 bytes of `load`, code saved from 32768 but loaded at 65088 (`$FE40`) by the BASIC |
| 6 | a turbo block of 6,912 bytes: the loading screen |
| 7 | a turbo block of 37,590 bytes: the game, `$6B12`-`$FDE7` |
| 8 | a turbo block of 6,912 bytes: the game's own screen (the cockpit panel), `$4000`-`$5AFF` |

The turbo blocks are recorded with shorter pulses than the ROM's (pilot
2,165, sync 714 and 714, bits 583 and 1,166 T-states) and are not
encoded: blocks 7 and 8 land in memory byte for byte as they are on the
tape (`work/scripts/tzx_blocks.py` writes them out).

The TOSEC set also has a `.z80` of the game (SHA-256
`3a518dd64aa6c8a9a62c0aae6afd63382e6a205e927e19e44615024e50deced9`). It
was not used for the listing, but it was compared: it is the game in
play, and it differs from `work/play-start.sna` in 58 bytes between
`$6B12` and `$FDE7`, all of them variables the game writes as it runs.
So its code is this tape's code.

## From power-on to play

1. Start ZEsarUX as a 48K Spectrum (the launcher's default):
   `python3 kit/scripts/tools.py --platform spectrum zesarux`, adding
   `--emulatorspeed 5000` to load at warp. `smartload` the `.tzx`. At
   warp the load took 54 seconds of wall clock.
2. The BASIC is `10 BORDER 0: PAPER 0: INK 0: CLEAR 32767`, `20 LOAD ""
   CODE 65088`, `30 RANDOMIZE USR 65088`; lines 40 to 80 are never
   reached. The loader at `$FE40` decrypts itself and loads the three
   turbo blocks.
3. **The hand-over**: the loader jumps to `$97A4`, the game's first
   instruction, with the stack at `$5DAE`. `work/scripts/entry.py` arms a
   checkpoint on any PC from `$6B12` to `$FDE7` before the load, runs the
   tape in bounded chunks, and saves the machine when it fires:
   `work/entry.sna` (49,179 bytes, SHA-256
   `8a7f7292b79e1176840c2bcb64212c64c1737927479b16b49334a25d9abb1e54`).
   At that moment `$6B12`-`$FDE7` and `$4000`-`$5AFF` hold blocks 7 and 8
   exactly. This is the image the listing is built from.
4. The game shows "DRILLER introducing FREESCAPE" in its window for 175
   frames, then the **security input station**: a page, a line and a word
   number of the booklet's Federation briefing, and a prompt. The answer
   is in the program (`facts.md`, "The security question"):
   `work/scripts/keys.py` reads the three numbers off `$CB38`, `$CB52`
   and `$CB6C` and looks the word up in the table at `$ABC1`. Type it in
   capitals, each letter held 6 frames and released 6, then Enter. With
   `work/entry.sna` the question was page 17, line 4, word 1: IMPROVE.
5. The **control options** menu: 1 Keyboard (chosen), 2 Sinclair
   joystick, 3 Kempston joystick, 4 Cursor joystick, Enter to begin.
   Press Enter, held 10 frames: play starts in the Amethyst sector with
   the clock at 4:00:00. `work/scripts/toplay.py` and `step2.py` do
   steps 4 and 5; `work/play-start.sna` is the machine in play.

## Steady state

Interrupt mode 2, `I` = `$FE`. The 257-byte table at `$FE00`-`$FF00` is all
`$FD`, so every interrupt goes through `$FDFD`, which is `JP $BAE6`: the
game's frame interrupt handler. The table and the jump are built over
the loader once the game runs. A 48K game: no banking, nothing reloaded.
The game's code and data are `$6B12`-`$FDE7` as loaded; the cockpit
screen is `$4000`-`$5AFF`; the stack is at the top of memory (`$FFEE` in
play).

Emulator: ZEsarUX 13.0 (`ZEsarUX_linux-13.0-ubuntu24_x86_64.tar.gz`).
`check-emulator` failed `count-while-running`, `load-keeps-frame-phase`
and `warp`, the three the platform notes record for this build.

## The loader, in a paragraph

The BASIC loads 448 bytes to `$FE40` and calls it. Its first 19 bytes
decrypt the next 384 in place, from `$FE53`, with interrupts off: each
byte is XORed with the refresh register `R`, which the loop loads with
the byte it decrypted last and reads back two counts later (`LD R,A`,
`LD A,R`, `XOR (HL)`). The first byte it decrypts is the displacement of
its own `JR`, so the code only comes out right on a Z80 that counts `R`
exactly as the real one does. The decrypted loader reads the three turbo blocks with
timings of its own and jumps into the game at `$97A4`. It is not
annotated further. The protection that matters to the game is the one
inside it: the security question, and the two bytes at `$6B12` that only a
right answer repairs (`facts.md`).
