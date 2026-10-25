# Pool of Radiance — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

SSI's original release, version 1.0 (1988): eight D64 images, one per
disk side, from archive.org's item
`d64_Pool_of_Radiance_v1.0_1988_SSI_Disk_1_of_4_Side_A`. Each side's
directory header names it: `DISK A SIDE 1` and `DISK A SIDE 2` on disk 1,
up to `DISK D SIDE 8` on disk 4. Side 1 holds `BOOT`, the program
`LOAD"*",8` starts, and the game's own copy of the pre-rolled party.

| File | SHA-256 |
|---|---|
| `disk1_of_4_Side_A.d64` (side 1) | `41936d21410f2ca4fbe268c498813c0a95a27791d3c653c869d9bb5b02111b28` |
| `disk1_of_4_Side_B.d64` (side 2) | `2ec824f0882082b220af2df0c67a787b9526feb807584af9cbb39f80a7715113` |
| `disk2_of_4_Side_A.d64` (side 3) | `51b6fac7ce28c82ee570cb8f1b21fa16461d9b8a7265833ba430a5df2467253a` |
| `disk2_of_4_Side_B.d64` (side 4) | `5084af5102c85b346921d74c04e4f8e3d0c9ff44367933680d14ae9f747ef185` |
| `disk3_of_4_Side_A.d64` (side 5) | `e95e148f45c2db1ebd2550d8a20559bcfcf6a851bf85d73074d38651a31f1dde` |
| `disk3_of_4_Side_B.d64` (side 6) | `3faf4edffaa93176e09ffcb5cb833eef3d3cc16eafe833c37ded04b04517e4ca` |
| `disk4_of_4_Side_A.d64` (side 7) | `e8f12532fe955c36a840e728883f3af58e97c625bd1b49845e9d39dfbc93f3bb` |
| `disk4_of_4_Side_B.d64` (side 8) | `01bcbbd5d7975a6fcb81a088505cc9bd9e8cecc701fe524b08b96288108a973f` |

The same archive.org collection also holds a version 1.1 set. It is a
crack: its credits end with "RIPPED BY S.C.I.", and its code-word check is
changed. It was not used except to compare.

The game's files are ordinary PRG files on each side (`kit/c64/disk.py
extract`). The game asks for a side by its number, "INSERT SIDE # n, AND
PRESS ANY KEY", whenever the file it wants is not on the side in the
drive. A blank disk formatted by the game holds saved games; the run used
a D64 the game formatted from the party menu.

## From power-on to play

1. Attach side 1 to drive 8 and autostart it (`LOAD"*",8`, `RUN`).
2. `BOOT` prints "POOL OF RADIANCE, VERSION 1.0" and asks "DISABLE
   FASTLOADER (Y/N) ?". Press N: the game's own fast loader (`FAST1.O`)
   is used. `BOOT` then loads `LINKER` and `LIBRARY` and calls the
   linker, which loads `INIT`.
3. `INIT` loads the title picture and its music. Any key passes the
   title; the credits follow, then a menu: press RETURN to play.
4. The code word: two runes and a path are shown, and the word read along
   that path on the translation wheel must be typed: one of twelve
   six-letter words, the same whichever of the three paths is shown. The
   word is picked at random from
   a table in `INIT` (the pick is at `$1376` and `$1377`, the table at
   `$1039`), so it differs from one boot to the next; the snapshot
   `codeword_prompt` wanted KNIGHT. Two wrong words stop the game.
5. The party creation menu appears, with side 3 asked for. Choose LOAD
   SAVED GAME and give it side 1 as the save disk: the pre-rolled party
   of six (Arax the Bold, Lara Spellsword, Tanarakis, Hogarth, Shara the
   Gray, Zarrada) is loaded. Choose BEGIN ADVENTURING.
6. Rolf greets the party and gives a tour of New Phlan's main street;
   press RETURN through its pages. Play starts at the Adventure Menu
   ("MOVE VIEW CAST AREA ENCAMP SEARCH LOOK").

A menu takes the joystick or the cursor keys to move its highlight and
RETURN or fire to choose; the game takes one key at a time from the
keyboard buffer, so a script feeds it one character and waits for the
buffer to empty (`work/scripts/typer.py`). Left arrow leaves a menu.

Snapshots (in `work/`, VICE `.vsf` without ROMs):

| Snapshot | State |
|---|---|
| `title_play` | the title picture with its music playing |
| `codeword_prompt` | the code-word prompt |
| `party_menu`, `party_prerolled` | the party creation menu, empty and with the pre-rolled party |
| `phlan_intro` | Rolf's first page |
| `phlan_party` | in play in New Phlan after the tour, the Adventure Menu |
| `slums_enter` | just inside the slums, at 15,4 facing west |
| `encounter_kobolds` | an encounter in the slums: COMBAT WAIT FLEE PARLAY |
| `combat_kobolds` | the first combat menu of that fight |
| `postcom_won`, `postcom_treasure` | after the fight: the experience shares, then the treasure menu |
| `camp` | the Encamp Menu in New Phlan |

## The parts

The game is a set of program modules that one small resident loader
swaps in at `$0800`, over a resident library, so each module is a part
(`kit/skills/core/15-parts`). Every module's hand-over is a stop at
`$2BB5`, the linker's `JSR $0800`, after it has loaded the module whose
number is at `$6E11`; each part's `work/entry.vsf` is that stop, and its
play snapshot is beside it.

| Part | Module or files | Loaded at | Route to its snapshots |
|---|---|---|---|
| `resident` | `LINKER`, `LIBRARY`, `FAST1.O` | `$2B80`-`$48FB`, `$B700`-`$B8AC` | `BOOT` loads them; entry: the stop into `INIT`; play: `phlan_party` |
| `title` | `INIT` (module 3), `MDRIVER`, `CHARSET`, `TITLEPG`, `SPR.TP`, `MUSIC` | `$0800`, `$BA00`, `$6500`, `$6F00`, `$C000`, `$C400` | step 3 above; `title_play` |
| `tables` | `SOUNDFX`, `ITEMS`, `ITEMNAMES`, `DUNGEON2`, loaded by `INIT` after the code word | `$BA00`, `$7B00`, `$6F00`, `$7A00` | entry: the stop into `GEN`; play: `phlan_party` |
| `gen` | `GEN` (module 0) | `$0800` | after the code word; `party_menu` |
| `icons` | `SPELLN64`, loaded by `GEN`'s CREATE NEW CHARACTER; `CHARPIC00` and `SPELLE64`, loaded by its own first lines | `$AF00`, `$9900`, `$A700` | create a character from `party_menu` (side 3 in the drive) and answer YES to SAVE? and KEEP to the portrait: entry, a stop at `$AF3A` after its two loads; play: `icon_editor`, the menu ICON: PARTS COLOR SIZE EXIT |
| `view` | `GDRIVE01`, loaded by `DUNGEON` as it starts | `$C000` | entry: the stop into `DUNGEON`; play: `phlan_party` |
| `dungeon` | `DUNGEON` (module 1) | `$0800` | BEGIN ADVENTURING; `phlan_party` |
| `camp` | `CAMP` (module 9) | `$0800` | ENCAMP from the Adventure Menu; `camp` |
| `com-prep` | `COM.PREP` (module 4) | `$0800` | COMBAT at an encounter (the kobolds in the slums) |
| `combat-set` | `GDRIVE00`, `SQRPACI01`, `SECSET64`, `ECL64`, `SPELLE65`, `SPELLN00`, loaded by `COM.PREP` | `$C000`, `$0400`, `$6500`, `$9900`, `$A700`, `$AF00` | entry: the stop into `COMBAT`; play: `combat_kobolds` |
| `combat` | `COMBAT` (module 2) | `$0800` | after `COM.PREP`; `combat_kobolds` |
| `post-com` | `POST.COM` (module 5) | `$0800` | winning the fight; `postcom_treasure` |
| `final` | `FINAL` (module 8) | `$0800` | see below |

`FINAL` is the end of the game, played after the last battle. Playing
there was not practical, so the module number was set and the game's own
linker called instead: from `postcom_leave` (the treasure menu after the
kobold fight), with a stop at `$2B80`, LEAVE TREASURE was chosen; at the
stop `$6E11` was set to 8 and the machine run on. The linker asked for
side 5, loaded `FINAL` and stopped at `$2BB5` (`entry_final`). Run on, it
plays the ending's messages over the party list ("MORTALLY WOUNDED, THE
DRAGON ROARS!", Tyranthraxus's speech, "NOOOO ...") and hands back to
`DUNGEON`.

Where each file sits in memory, from `work/scripts/filemap.py` (a match
of the file's bytes against a snapshot) and `work/scripts/loadlog.py`
(a stop at the KERNAL's `LOAD`, `$FFD5`, printing the name and address of
every file the game loads):

| File | Part | Address | Bytes |
|---|---|---|---|
| `FAST1.O` | resident | `$B700`-`$B8AC` | 429 |
| `LINKER` | resident | `$2B80`-`$2C07` | 136 |
| `LIBRARY` | resident | `$2C48`-`$48FB` | 7348 |
| `INIT` | title | `$0800`-`$137A` | 2939 |
| `MDRIVER` | title | `$BA00`-`$BDD2` | 979 |
| `CHARSET` | title | `$6500`-`$66FF` | 512 |
| `TITLEPG` | title | `$6F00`-`$7E5A` | 3931 |
| `SPR.TP` | title | `$C000`-`$C1BF` | 448 |
| `MUSIC` | title | `$C400`-`$CF5A` | 2907 |
| `SOUNDFX` | tables | `$BA00`-`$BF53` | 1364 |
| `ITEMS` | tables | `$7B00`-`$82FF` | 2048 |
| `ITEMNAMES` | tables | `$6F00`-`$797B` | 2684 |
| `DUNGEON2` | tables | `$7A00`-`$7AB8` | 185 |
| `COMBAT3` | tables | `$7AC0`-`$7AFE` | 63 |
| `GEN` | gen | `$0800`-`$2B7A` | 9083 |
| `SPELLN64` | icons | `$AF00`-`$B655` | 1878 |
| `CHARPIC00` | icons | `$9900`-`$A0ED` | 2030 |
| `SPELLE64` | icons | `$A700`-`$AE59` | 1882 |
| `GDRIVE01` | view | `$C000`-`$C9FF` | 2560 |
| `DUNGEON` | dungeon | `$0800`-`$2B7F` | 9088 |
| `CAMP` | camp | `$0800`-`$2B7F` | 9088 |
| `COM.PREP` | com-prep | `$0800`-`$1813` | 4116 |
| `GDRIVE00` | combat-set | `$C000`-`$CBDD` | 3038 |
| `SQRPACI01` | combat-set | `$0400`-`$07FF` | 1024 |
| `SECSET64` | combat-set | `$6500`-`$6AFF` | 1536 |
| `ECL64` | combat-set | `$9900`-`$9BE6` | 743 |
| `SPELLE65` | combat-set | `$A700`-`$AEFF` (the rest is under `SPELLN00`) | 3062 |
| `SPELLN00` | combat-set | `$AF00`-`$B5EF` | 1776 |
| `COMBAT` | combat | `$0800`-`$2B7F` | 9088 |
| `POST.COM` | post-com | `$0800`-`$2B79` | 9082 |
| `FINAL` | final | `$0800`-`$0D62` | 1379 |

A module's file says it loads at `$1000`; the linker loads every module
at `$0800` instead.

Files the game loads into a buffer as it plays, by kind, with the
addresses `LIBRARY`'s table at `$41BE`/`$41D7` gives them: `ECLnn` (a
block's script, `$9900`), `GEOnn` (its map, `$0400`), `SECSETnn` and
three `WALLSETnn` (`$6500`-`$6AFF`), `WALLDEFnn` (`$8C00`, unpacked
from there), `WALLSnn` (`$ED50`), `PICnn`, `BODYnn`, `CHARPICnn`,
`COMPICnn` and `SQRDATAnn` (`$8C00`), `HEADnn` (`$9000`), `SPRITEnn` and
`ANIMATEnn` (`$8400`), `MONnn` (`$6B00`), `SPELLNnn` (`$AF00`),
`SPELLEnn` (`$A700`), `SQRPACInn` (`$0400`), `ITEMFILEnn` (`$9900`). The
pictures, monsters and items are buffers, filled for each event.

## Steady state

In play the KERNAL and BASIC ROMs are in and the interrupt runs through
the KERNAL's vector at `$0314`, which points to `$3BEA` in `LIBRARY`
(`$EA31`, the KERNAL's own, in the party menu). The video chip uses bank
3 (`$C000`-`$FFFF`): in play a multicolour text screen at `$CC00` with
its character set at `$D000`, in the RAM under the I/O chips; the title
is a hires bitmap at `$E000` with its colours at `$DC00`, unpacked there from `TITLEPG`.

## The loader, in a paragraph

`BOOT` is a BASIC program: it seeds a random byte at `$03C9`, asks
whether to use the fast loader (the answer goes to `$6DE5`), loads
`FAST1.O` to `$B700`, `LINKER` to `$2B80` and `LIBRARY` to `$2C48`
through the KERNAL, sets the next module to 3 (`INIT`, at `$6E11`) and
the disk side to 1 (`$6E12`), clears the party's records, and calls the
linker with `SYS 11136`. Its lines 20000 and 21000 are the developers'
own load and save subroutines, and line 60000 saves `BOOT` itself.
