# Jet Set Willy — orientation

How to get from the contributor's own copy to the analysed state.

## The image

`Jet Set Willy - BCS.d64`, a 35-track D64 (SHA-256 `107b1b5d…a8a12426`),
the contributor's upload, kept in `work/bcs.d64`. It is a crack by the
Berlin Cracking Service (BCS), whose title message dates it
16 October 1984. Directory, disk name `JET SET WILLY`, ID `BCS`:

| File | Blocks | Loads at | What it is |
|---|---|---|---|
| `LADER` | 1 | $0801-$0849 | a four-line BASIC loader ("Lader" is German for loader) |
| `JET` | 202 | $0801-$CFFF | the game, title and all, saved from memory after a game had begun |
| `SET WILLY` | 33 | $E000-$FFFF | rooms 30 to 59, under the KERNAL ROM |

`LADER` counts up a variable each time it runs: it loads `SET WILLY`,
then `JET`, each with `,8,1`, and loading in a running program starts it
again. `JET` replaces `LADER` with its own line, `10 SYS2061`, so the
next start runs the crackers' start-up at $080D, which sets the processor
port to $36 (BASIC ROM out, KERNAL and I/O in) and jumps to the title at
$A000. The original's copy protection, a colour code card, is still in
memory at $3A02 and never runs.

Not original: the BASIC line and start-up at $0801-$081C; the crackers'
part of the title message at $A2C8-$A67F, which replaces the game's
credits; the cartridge header at $8000, where $8005 is $00 instead of $C2;
and the in-game tune's set-up byte at $2020, which is $01 here and $00 in
another crack of the game (see `facts.md`, "Sound"). Which crack changed
it is unknown.

## From power-on to play

1. Hard-reset a PAL C64 in VICE and autostart `LADER` from `work/bcs.d64`
   (`work/scripts/boot.py`).
2. A checkpoint at $080D stops at the start-up; step to $A000 and save
   `work/entry.vsf`, the hand-over. Every byte the game loaded is in
   memory, and nothing of the title has run.
3. Let it run: the title shows the logo, plays the tune and scrolls the
   message. Saved as `work/title.vsf`.
4. Return (or fire, while a key is held) starts a game in The Bathroom,
   the status line reading ITEMS COLLECTED: 00 and TIME: 07:00:00.
   Saved as `work/play.vsf`.

No trainer, no menu, no code card.

## Steady state

Play runs with the processor port at $36, the video chip in bank 1
($4000-$7FFF: sprites from $4000, character set $7800, screen $7C00) in
extended colour mode, and the raster interrupt at $33E1 through the
KERNAL's vector at $0314. The title's interrupt is $A801. Nothing is
loaded again: rooms 0-29 are at $B000-$CDFF, rooms 30-59 at
$E000-$FDFF, and the room copy at $2E55 turns the ROMs off for the
moment it reads one.

The listing is built from `work/entry.vsf`, with `work/play.vsf` as the
second image: no code differs between the two, and the bytes play
changes are runtime state.

## The loader, in a paragraph

`LADER` is the BCS's chain loader, described above. The original
release's loader is not on this disk: what is left of the original's way
in is the code card at $3A02, which shows LOADING COMPLETE... PRESS A
KEY TO START, asks for the colours at a grid location of the card and
starts the title through $0FA0 when they are right.
