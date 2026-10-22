# The NeverEnding Story — orientation

How to get from a copy of the disk to the analysed state. Someone else
must be able to follow this exactly.

## The image

The copy cracked by MrL and Dr Bakterius, from the Internet Archive item
`Neverending_Story_The_1985_Ocean_cr_MrL_Dr_Bakterius`: a .d64 of
174,848 bytes, MD5 `1938dd66ac2dcf1f9067532f41c0b3e8`. Its directory
holds four program files: `THE NEVER. STORY` (132 blocks), `PART 1`,
`PART 2` and `PART 3` (104 blocks each). It is not the original disk:
the crack adds its own intro and replaces the loader, and the game it
wraps keeps signs of a cassette original (`facts.md`, "Build"). Kept
privately as `work/neverending-story-mrl.d64`.

## From power-on to play

All of it in VICE MCP v3.13.2 (Linux x86_64), started through
`kit/scripts/tools.py vice`, which passed all 54 of the kit's emulator
checks on 17 October 2026.

1. Hard reset, then autostart the image's first file: VICE types
   `LOAD"THE NEVER. STORY",8,1` and runs it. The file loads, the screen
   goes blank while it unpacks itself, and the crack's intro scrolls
   "THE MR.L & DR.BAKTERIUS CRACKING TEAM PROUDLY PRESENTS".
2. Press any key. The intro gives way to Ocean's loading picture: the
   title, Auryn's two snakes and the Ocean logo.
3. Press any key again. The game proper starts at $0400:
   `parts/engine/work/entry.vsf` was taken there, with a checkpoint at
   $0400.
4. The opening: the title in large letters, the credits and Martin
   Galway's tune. `parts/engine/work/opening.vsf` was taken a few
   seconds after the opening's texts appeared, while the game waited for
   a key ($0552); the engine's listing is built from it.
5. Press any key. The tune stops, the play screen appears, and the game
   prints "Hit space to load part one!" Press Space. The screen blanks
   while `PART 1` loads, and the load returns at $0456:
   `parts/part-1/work/entry.vsf`.
6. The part's introduction follows: Cairon's message with the picture
   of the gathering at the Ivory Tower, and "Paused - hit space to
   continue!" Press Space for the first room (Rockbiter is in the
   clearing). `parts/part-1/work/part1-command.vsf` was taken at the line
   editor's entry ($0806), at the first prompt; Part 1's listing is built
   from it.

A snapshot loaded later comes back with no disk in the drive: attach the
image again before anything loads (`kit/skills/c64/tool-vice-mcp`).

## The parts

The game is four parts (`kit/scripts/parts.py`): the engine, loaded once
from `THE NEVER. STORY` and in memory to the end, and the three story
parts, each a file that loads over $2F00-$95FF.

| Part | File | Snapshots | Reached |
|---|---|---|---|
| engine | `THE NEVER. STORY` | `parts/engine/work/entry.vsf`, `opening.vsf` | steps 1-4 above |
| part-1 | `PART 1` | `parts/part-1/work/entry.vsf`, `part1-command.vsf` | steps 5-6 above |
| part-2 | `PART 2` | `parts/part-2/work/entry.vsf`, `part2-command.vsf` | from Part 1's first prompt, the route in `parts/part-1/facts.md`; at the sphinxes WAIT until the eyes blink (flag 5, $2914, set), then S. "Hit space to load part two!", Space; the load returns at $0456 with room $34; three introductory pictures follow, each ending with a pause for Space, then the room and prompt |
| part-3 | `PART 3` | `parts/part-3/work/entry.vsf`, `part3-command.vsf` | from Part 2's first prompt, the route in `parts/part-2/facts.md`, ending GET AURYN, GET FALKOR; Space at the load screen; the load returns at $0456 with room $4D; one introductory picture and a pause for Space |

Part 3's listing is built from `parts/part-3/work/part3-shortcut.vsf`,
taken on 22 October 2026 without playing Parts 1 and 2. At the engine's
load call ($0453, after Space at "Hit space to load part one!"), the
loader's name digit $9708 was set to `2`, `CURRENT_PART_NO` ($2940) to 2
and `CURRENT_ROOM` ($293F) to $4D; the loader then took `PART 3`, the
hand-over at $0456 is `parts/part-3/work/entry.vsf`, and Space after the
introductory picture reached the first prompt ($0806). Every byte of
Part 3's load matched the snapshot taken by the routes.

Each part's `entry.vsf` was taken with a checkpoint at $0456, and its
command snapshot with one at $0806. The routes were typed into the
KERNAL keyboard buffer ($0277, count at $C6) a command at a time, each
waiting for the editor's next entry at $0806.

Part 3's route, in `parts/part-3/facts.md`, ends at the Empress (room
$7C): the win restarts the game, and in this copy the restart cannot
load Part 1 again (`facts.md`, "Mechanics", Restart).

## Steady state

During play the processor port holds $06 (BASIC out, KERNAL and I/O
in), VIC bank 3 ($DD00 = $C4 at the opening), and the IRQ vector at
$0314 points to $A7E0, the raster split that switches between the
multicolour picture band and the text below it three times a frame
(`facts.md`, "Timing"). The text screen is at $CC00 and the game's own
character set at $F800; the picture band's bitmap is at $E000. The engine
works in the real zero page and keeps the KERNAL's at $A002-$A0FF,
swapping the two only while a part loads ($053C). Nothing is reloaded within a part; the only
loads are the next part's file over $2F00-$95FF.

## The loader, in a paragraph

`THE NEVER. STORY` loads at $0801 and unpacks itself: a run-length
depacker left in the stack page ($0100-$01D7, escape byte $D3) ends with
$01 = $37 and a jump to $3300, which decrypts $2F00-$32FF (each page
XORed with $AA, $BB, $CC and $DD) and jumps to $2F00: the crack's intro,
a raster-split scroller dated "CRACKED AT 11/23/85". A key there resets
the KERNAL's vectors, I/O and screen and jumps to $CA00, which copies
$C200-$C5FF to $0400-$07FF (the game's first kilobyte, kept out of the
way of the intro's screen) and $C600-$C9FF to colour RAM, shows the
multicolour bitmap at $4000 with its screen bytes at $6000 (VIC bank 1),
waits for a key and jumps to $0400. `PART 1` overwrites the intro and
the picture. The
loader the game calls for each part is the crackers' replacement,
copied from $C000 to $9700 when the opening ends: it adds one to the
digit in the name "PART 0" and loads that file from device 8 with the
KERNAL's LOAD (`facts.md`, "How the parts follow one another"). Not
annotated beyond that, by policy.
