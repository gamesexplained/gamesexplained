# Flowers of Crystal — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`Flowers of Crystal (1984)(4Mat).ssd` from the TOSEC Acorn BBC set on
archive.org (`Acorn BBC - Games - [SSD].rar` in
`acorn-bbc-micro-complete-set-tosec`, the zip of the same name inside it),
101,632 bytes, SHA-256
`0f591a690ad0d2d2b404a65f28cea63c7f74fa1703f4a514c2dbc1314dfe57d0`. It
is the set's only copy of the game, with no `[a]` or `[h]` flag; the
set's other formats and its Educational archives have none, and
bbc.xania.org's flux archive has none either. An `.ssd` has no header:
it is the disc's sectors in logical order, here the first 397 of the 800
the catalogue declares (a 40-track side has 400), the rest empty and left
out.

The DFS catalogue (sectors 0 and 1): title `FLOWERSOFCRY`, cycle number
18, boot option 3 (SHIFT-BREAK `*EXEC`s `!BOOT`), 17 files, none locked.
In the order of their sectors:

| File | Load | Execute | Length | Sectors | What it is |
|---|---|---|---|---|---|
| `$.UNEM` | &31900 | &38023 | 655 | 2-4 | the menu, BASIC |
| `$.!` | &31900 | &3801F | 33,280 | 5-134 | a title program nothing runs (below) |
| `$.!BOOT` | 0 | 0 | 23 | 135 | `VDU12,21` / `MODE0` / `CH."GO"`, three lines of text |
| `$.` (no name) | 0 | 0 | 1,709 | 136-142 | machine code assembled for &2454 that nothing loads (below) |
| `$.AD1` | &31900 | &38023 | 22,456 | 143-230 | the adventure, part 1, BASIC |
| `$.AD2` | &31900 | &38023 | 22,255 | 231-317 | the adventure, part 2, BASIC |
| `$.DUMMY`, `$.DUMMY2` | &31900 | &38023 | 2 each | 318, 319 | empty BASIC programs (`&0D &FF`); no program names them |
| `$.GO` | &31900 | &38023 | 1,869 | 320-327 | the 4Mation logo, BASIC |
| `$.K` | &31900 | &38023 | 1,872 | 328-335 | the worksheet printer ("Utility"), BASIC |
| `$.N1`, `$.N2` | &31900 | &38023 | 631, 740 | 336-338, 339-341 | each part's title and sound level, BASIC |
| `$.STORY` | &31900 | &38023 | 12,532 | 342-390 | the story, BASIC |
| `$.CODE1/1`, `$.CODE1/2` | &0900, &0C00 | the same | 512, 239 | 391-393 | part 1's machine code |
| `$.CODE2/1`, `$.CODE2/2` | &0900, &0C00 | the same | 511, 255 | 394-396 | part 2's machine code |

Every BASIC file loads at &1900 with BASIC's entry point (&8023 in the
language ROM) as its execution address, as `SAVE` writes them on a disc
machine whose PAGE is &1900. The adventure programs end `&0D &DD` where
BASIC II's own end mark is `&0D &FF`; the others end `&0D &FF`, and BASIC
runs both.

**STORY is one byte short.** Its catalogue length, 12,532, stops after
the `&0D` of its end mark; the `&FF` that should follow is the next byte
on the disc, in the same sector, outside the file. `CHAIN"STORY"` loads
12,532 bytes, and whether the program runs depends on what the byte after
them held before. On the kit's machine (Model B, MOS 1.20, DFS 1.20 on
the 8271, PAGE &1900) it is &01, left at &49F4 by the logo's Mode 1
picture, and BASIC stops with `Bad program` straight after menu choice 1.
The same happened with DFS 0.90 on the 8271. With the 1770 DFS, whose
PAGE is &1F00, the byte after the file, at &4FF4, was &80 or more by
chance, BASIC took it for the end mark, and the story ran. No disc of
4Mation's has been compared, so whether their own disc has the fault is
not known.

## From power-on to play

The route is `work/scripts/snapshots.py`, with the helpers in
`work/scripts/foc.py`. Every part is reached the game's own way, from
power-on.

1. Start the server (`tools.py --platform bbc jsbeeb`), `boot` (a hard
   reset to the BASIC prompt) and put the image in drive 0 (`disc`).
2. Hold SHIFT through a reset: the DFS `*EXEC`s `!BOOT`, which clears the
   screen, selects Mode 0 and `CHAIN`s `GO`.
3. **The hand-over** of each part is the machine once `CHAIN` has written
   the file's last byte (a write checkpoint on it, with that byte's value,
   so that the clearing of memory at power-on does not stop it) and BASIC
   first reads the program's first statement (a read checkpoint on
   &1904): `parts/<part>/work/entry.json.gz`. `foc.hand_over` also checks
   that memory then holds the whole file.
4. **The play snapshot** of each part is its first wait for a key:
   the MOS's OSRDCH loop at &E581, with BASIC's text pointer (&0B-&0C)
   unchanged ten frames later, so that a key already in the buffer or a
   function key's expansion is not taken for a wait (`foc.wait`). The line
   waiting is the last line that starts at or before the text pointer.
   `parts/<part>/work/play.json.gz`.

| Part | Route | Waits at |
|---|---|---|
| `logo` | power-on, SHIFT-BREAK; `GO` runs | not a wait: line 100's delay loop, `FOR d=1 TO 5000`, before `CHAIN"UNEM"` |
| `menu` | `GO` chains `UNEM` | line 205, `Please choose (1-4)` |
| `story` | menu, `1` RETURN | `Bad program` (above). To read on: write &FF at &49F4, type `OLD` and `RUN`; line 45 waits for the space bar |
| `sound-1` | menu, `2` RETURN; `N1` | line 200, the sound level (0-5) |
| `adventure-1` | `sound-1`, `3`, then the space bar; `N1` loads `CODE1/1` and `CODE1/2` and chains `AD1` | line 29022 (PROCs), `< S >` under the Centre |
| `sound-2` | menu, `3` RETURN; `N2` | line 200 |
| `adventure-2` | `sound-2`, `3`, the space bar; `CODE2/1`, `CODE2/2`, `AD2` | line 29025 (PROCS) |
| `worksheets` | menu, `4` RETURN; `K` | line 115, `Do you have a printer attached?` |

| Snapshot | SHA-256 |
|---|---|
| `parts/logo/work/entry.json.gz` | `a58d88387c470dc7a2adcbcd75aa68f4025c377bf5c6f14e5e70016e40081dc9` |
| `parts/menu/work/entry.json.gz` | `e3c909967862bf78c024d09c083e8cb4dcc0a60ef92cf5f0013614a867bf3a95` |
| `parts/story/work/entry.json.gz` | `eaa148c3aba3b732649bb965e9251da550803ed77630cf5a96419d761e64f407` |
| `parts/sound-1/work/entry.json.gz` | `06ce9d6c40bf5100d261fde6b784f5f4daddf7d6bb6b6b7a95da2c87155af1dc` |
| `parts/adventure-1/work/entry.json.gz` | `f0e31dac4a792b0dcc7c7513fde80907c406383f0bee70e4730aee87d121f298` |
| `parts/sound-2/work/entry.json.gz` | `1f13757b8f08f33dcd3d3a7572f8fad1714bacd99388733fde559f6caefbad6b` |
| `parts/adventure-2/work/entry.json.gz` | `02a58d00e6fd71b659f75486d6215fe1781b192fc2a51c9b7704144a215b0447` |
| `parts/worksheets/work/entry.json.gz` | `1c02fe01e51a97c5ebcf39bc6e9c01c8fcbb8449118ba6927ff0ec2a50ba9106` |

## The parts

Eight parts, each a BASIC program that replaces the one before at PAGE,
in the order the menu offers them: `logo` (`GO`), `menu` (`UNEM`),
`story` (`STORY`), `sound-1` (`N1`), `adventure-1` (`AD1`), `sound-2`
(`N2`), `adventure-2` (`AD2`) and `worksheets` (`K`). `RUN` and `CHAIN`
clear BASIC's variables, so what passes from one program to the next is
only what lies outside them:

- **`A%` to `Z%`**, which `RUN` and `CLEAR` leave (`bbc-reference`, "A
  game written in BASIC"): `N1` sets `S%` and `N2` sets `K%` to the sound
  level the player picks, 0 to 5, as 0 to -15, which `AD1` and `AD2` use
  for the loudness of their `SOUND`s and envelopes. `A%` is 0 when a
  program starts afresh: `N1` and `N2` set it so before they chain the
  adventure, and each adventure part makes it non-zero once play is under
  way, so that its own `RUN`s keep the progress it holds in other integer
  variables.
- **The function key f0**, defined by line 3 of `N1` and `N2` (below).
- **The machine code** `N1` and `N2` load at &0900 and &0C00 before they
  chain the adventure, which `CALL`s it.
- **The MOS's settings**: `*FX` calls made by one program hold in the
  next. `GO`, `UNEM`, `N1`, `N2` and `K` set `*FX200,2`, which makes
  BREAK clear memory (&0258 = 2; `STORY`'s `*FX200,3` disables ESCAPE as
  well); `UNEM` sets the escape character to &90 (`*FX220,144`, &026C),
  so the ESCAPE key no longer stops a program and SHIFT-f0 does (live,
  at the menu: ESCAPE raised no error, SHIFT-f0 one, at line 205); `N1`
  and `N2` turn the sound off (`*FX210,1`) when the player picks level 0.

The two adventure parts share nothing else: part 1's congratulation
screen gives the answer to a question part 2 asks (`When you are asked
your age you must say 197`), and the player loads part 2 from the menu.

## Steady state

- **Vectors**: every vector in page 2 at the MOS's own values in every
  snapshot (IRQ1V &DC93, BRKV &B402, WRCHV &E0A4), except that in the
  adventure parts' play the filing system vectors are the cassette
  system's (FILEV &F27D) after line 32220's `*TAPE`. The machine code is
  called by BASIC's `CALL` and returns.
- **Memory in the adventure parts, in play**: the machine code at
  &0900-&0AFF and &0C00-&0CFE (CODE1/1 ends &0AFF, CODE1/2 &0CEE, CODE2/1
  &0AFE, CODE2/2 &0CFE); the program at &0E00 to TOP (&64EA in part 1,
  &6421 in part 2); BASIC's variables above it; the Mode 7 screen at
  &7C00-&7FE7.
- **Memory in the other parts**: the program at &1900, PAGE on the kit's
  machine, and its variables above it. `GO` draws in Mode 1, whose screen
  is &3000-&7FFF; `K` prints in Mode 0 while it sends a worksheet to the
  printer; everything else is Mode 7.
- **Nothing is reloaded within a part.** Each part ends by chaining the
  next or by `RUN`ning itself again.

## Files to memory

Read from the snapshots with `kit/bbc/snapshot.py`:

| File | Part | Lands at | Equal |
|---|---|---|---|
| `GO` | logo | &1900 | all 1,869 bytes at the hand-over; in play, all up to TOP (&2047), the variables above |
| `UNEM` | menu | &1900 | all 655 bytes |
| `STORY` | story | &1900 | all 12,532 bytes; &49F4, the byte after them, holds &01 |
| `N1`, `N2` | sound-1, sound-2 | &1900 | all 631 and 740 bytes at the hand-over |
| `AD1` | adventure-1 | &1900 at the hand-over; &0E00 in play | all 22,456 bytes at &1900; in play, the 22,250 bytes at &0E00-&64E9 are the file without lines 1-6, 32220 and 32225, byte for byte |
| `AD2` | adventure-2 | the same | all 22,255 bytes; in play &0E00-&6420, the file without the same lines |
| `CODE1/1`, `CODE1/2` | adventure-1 | &0900, &0C00 | whole at the hand-over and in play |
| `CODE2/1`, `CODE2/2` | adventure-2 | &0900, &0C00 | whole at the hand-over and in play |
| `K` | worksheets | &1900 | all 1,872 bytes |
| `!`, the unnamed file, `DUMMY`, `DUMMY2` | none | | loaded by nothing |

The listings are built from the hand-overs, which hold every line of
each program. In the adventure parts lines 1-6, 32220 and 32225 run once
and are then deleted (below), so the play snapshot has fewer lines at
other addresses; the listing gives each line its address at &1900.

## The loader, in a paragraph

`!BOOT` chains `GO`, which draws the 4Mation logo in Mode 1, waits and
chains `UNEM`, the menu. The menu chains `STORY`, `N1`, `N2` or `K`. `N1`
and `N2` show the part's title, ask for the sound level, define f0 as
`DELETE1,6|M32220|M32225|MMODE7|MRUN|M`, load the part's two pieces of
machine code and chain `AD1` or `AD2`. The adventure moves itself: line 1,
`IF PAGE<>&E00 GOTO 32220`, sends a program loaded at a higher PAGE to
lines 32220-32225, which select the cassette filing system (`*TAPE`),
copy the program four bytes at a time to &0E00, lower TOP's high byte by
the distance moved, set PAGE to &0E00 and `RUN`. Run at &0E00, line 2
writes the `REM` token over line 1's first statement (`?&E04=244`), line
5 shrinks the text window to one character in the top left corner
(`VDU28,0,0,0,0`) and puts the f0 key's code in the keyboard buffer
(`*FX138,0,128`), and line 6 `STOP`s. Back at BASIC's prompt the MOS
types f0's definition, unseen in that one-character window: `DELETE1,6`
and the two line numbers alone remove the relocation lines from the
program, and `MODE7` and `RUN` start the adventure, 2,816 bytes lower
than the DFS put it. A machine whose PAGE is already &0E00, one with no
disc interface, skips the move.

The file `!` is a BASIC program of 584 bytes followed by 32,696 bytes
with no pattern in them, to the file's length of &8200. It selects Mode 1,
sets f10 (the BREAK key) to `OLD|MRUN|M`, and at line 8 runs `*2454`,
which the DFS takes as the name of a file to load and run. There is no
such file: the command fails at line 8, `ON ERROR RUN` starts the
program again, and it never gets further (live, `CHAIN"!"`). Its next lines would print `F L O W E R S   O F   C R
Y S T A L` at four times the height of a Mode 1 letter, built from each
letter's shape (OSWORD 10, read through `CALL &FFF1`) into four
characters, and chain `UNEM`. The file with no name holds code whose
calls go to &24D9 and &24F2, addresses inside itself if it is loaded at
&2454: probably the `2454` that `!` looks for, saved without its name.
Nothing on the disc runs either.
