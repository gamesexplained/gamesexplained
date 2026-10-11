# Valhalla — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Valhalla (1983)(Legend).tzx` from the TOSEC ZX Spectrum set (the entry
with no `[a]` flag: the original Legend release, English), 47,920 bytes,
SHA-256 `26ff54b554613e147cdc20e3b4b9f3cf4868b8840ab4ba9a90dab51aed81ed1d`.
The file's header reads `ZXTape!` version 1.10, written by Ramsoft
MakeTZX. It holds eight standard-speed ROM blocks (a header and a data
block for each of four files) and a text block; every block's checksum
is good. There is no turbo loader and no protection: the ROM's own
`LOAD` reads everything.

| File | Type | Length | Loads at | What it is |
|---|---|---|---|---|
| `VALHALLA` | BASIC, autostart line 10 | 203 | PROG | the loader: four lines |
| `vlogo` | CODE | 6,912 | `$4000` | the loading screen (helmet, Legend and Movisoft logos, title) |
| `vmc` | CODE | 12,185 | `$D066`–`$FFFE` | the machine code: screen, animation, parser, input editor |
| `vdrive` | BASIC, autostart line 9800 | 28,456 (program 20,623) | PROG `$5CCB` | the game itself, saved with its variables: the program at `$5CCB`–`$AD59` and 7,833 bytes of variables (the world's data tables) at `$AD5A`–`$CBF2`, ended by the `$80` that LOAD writes at `$CBF3` |

The loader is:

```
10 CLEAR 53349: INK 0: PAPER 0: BORDER 0: CLS : PRINT AT 11,6; INK 7;"VALHALLA is loading."
20 POKE 23659,0: LOAD "vlogo" CODE
30 BRIGHT 0: PRINT AT 9,0: LOAD "vmc" CODE
40 PRINT AT 9,0: LOAD "vdrive"
```

`CLEAR 53349` puts RAMTOP at `$D065`, just below the machine code;
`POKE 23659,0` (DF_SZ) gives the lower screen no lines, so the ROM's
`Bytes:` messages do not scroll the loading picture.

## From power-on to play

1. Start the emulator (`tools.py --platform spectrum zesarux`), power-cycle
   it (`hard-reset-cpu`), and `smartload` the `.tzx`. ZEsarUX reads the
   ROM-speed blocks through its tape traps: the whole tape is in memory
   about 13 s after the load starts.
2. There is no menu, trainer or title screen. The loading picture stays up
   while `vmc` and `vdrive` load.
3. **The hand-over**: `vdrive` autostarts at line 9800. A checkpoint on
   `PEEKW(23621)=9800` (PPC, the line being run) stops on the ROM's
   statement loop at `$1BCA`, before any statement of line 9800 has run.
   Saved there as `work/entry.sna` (SHA-256
   `55177a0e4ff099443f41213d4967805346f5ae7127d3879abe663d20b10697e0`). The
   screen still holds the loading picture; every variable is as the tape
   saved it.
4. Play starts by itself: line 9800 clears the screen, starts the machine
   code (`USR ioad`, `USR priad`), draws the first location (Valheim, in
   Asgard) and enters the main loop at line 8100. About 1,000 frames
   after the hand-over the picture is drawn and the player can type.
   `work/play-1.sna` is the machine after `where`, `who`, `what`, `list`,
   `how` and `help` typed from the hand-over, each key held 10 frames and
   released 20, with 400 frames after each command.

Commands are typed on the keyboard matrix (`set-ui-io-ports`), one key at
a time, held 10 frames and released 20, then ENTER. The game reads the
keyboard in its own interrupt, so a command can be typed at any moment;
it is acted on when the BASIC main loop next looks at the flag at
`$D2B3` (`fad`), which the interrupt sets when ENTER is pressed. Wait
until that byte is 0 again, then for the reply. A line the parser
rejects stays on the input line with the cursor after the word it
stopped at; CAPS SHIFT 1 clears it.

## Steady state

- **Interrupts**: at the hand-over the machine is in `IM 1` with the
  ROM's handler. Line 9800's `USR ioad` (`$D48D`) switches to `IM 2` with
  `I` = `$09`: the vector is read from the ROM at `$09FF`, which holds
  `$FE69`, so the game's handler is at `$FE69` (seen in the play snapshot:
  `I`=9, `IM`=2). It also calls the ROM's keyboard scan, so the BASIC
  system variables stay alive.
- **Memory**: screen `$4000`–`$5AFF`; system variables; the BASIC program
  `$5CCB`–`$AD59` (its line 1 is a `REM` holding 19 bytes of machine code
  at `$5CD0`); its variables `$AD5A`–`$CBF2`; the ROM's workspace and
  calculator stack above them; the machine stack just under RAMTOP
  (`$D065`); the machine code `$D066`–`$FFFE`.
- **What changes in play**: in the BASIC program, only the hidden
  argument slots of the `DEF FN` lines (the ROM writes each call's
  arguments there); in the variables, the world's state (where everyone
  is, what they carry); in the machine code, its own variables and
  buffers. The program's text and the machine code's routines do not
  change, so the hand-over is the image the listing is built from: it is
  the only one that holds the variables as authored.
- **Nothing is reloaded.** The game is one load. `save` and `load` write
  and read a game position on tape from the running game.
- **The code map**, `codemap.json`, comes from
  `python3 kit/spectrum/codemap.py games/spectrum/valhalla work/entry.sna
  --entry D073 D48D D6EB D5DD F7AF FE69 5CD0 5CF0 5D0B --map
  <the work/executed-*.txt lists but g1 and k1> --inline DADB:6 DBDE:6
  DED0:4 E077:3 E146:2`: every machine-code address the BASIC calls with
  `USR`, the interrupt, the 21 executed lists of the play sessions that
  did not end in a BASIC error (g1 and k1 did, and their crash ran through
  the machine stack at `$D05C`–`$D060`), and the five drawers that read
  their arguments from the bytes after the `CALL`.

## The loader, in a paragraph

The tape is four ROM-format files and the loader is four lines of BASIC:
clear memory below `$D066`, show the loading picture, load the machine
code above RAMTOP, and load the game's BASIC program with its variables,
which starts itself at line 9800. Nothing is packed, moved or decrypted.
