# Darkman — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshots named in `orientation.md`.

## Build

PAL original on two disk sides, no crack or trainer seen. Analysed with
one snapshot of each level in play (`parts/<id>/work/`), and the level 1
load for the resident loader and the sound drivers.

## Memory layout

| Thing | Where |
|---|---|
| Fast loader and level loader (resident) | $0400-$0706, file name buffer at $0707 |
| Index of the next level to load, 0 to 5 | $0435 |
| Score digits, mask-game result, cheat flag, credits (kept across loads) | $0A00-$0A06, $0A10, $0A11, $0A12 |
| Level entry, each level file's first byte | $0A20 |
| Level program and data (first file of a level) | $0A20 up to $51FF-$9DFF, by level |
| Level graphics (second file), under the I/O and ROMs | from $BF00 (from $E000 in level 3) up to $FFEF |
| Sound-effect driver and its data, copied by level 1 (13 pages from $747B) and kept by every later load | $B000-$BCFF; init $B0C8, effect $B0EE, play $B176, silence $B828 |
| Title tune driver and its tunes, copied by level 1's title code (19 pages from $80B4) | $A000-$B2FF while the title runs; init $A0C8, tune start $A164, play $A242 |
| Character sets | $C000 (text screens and level 1's play area), $D000 (play area of levels 2, 4 and 6), video bank 3 |
| Play screen matrices | $C800 and $CC00 |
| Status panel, a multicolour bitmap | $E000 |
| Sprite shapes | pointer × 64 + $C000, including RAM under the I/O area ($D000-$DFFF) |

## Loading

The loop at $0407 loads the two files of the level whose index is in
$0435 (`load_level_files` $0436, from the table of load addresses and
names at $044B: "1A" at $0A20, "1B" at $BF00, and so on), adds one to the
index and jumps to $0A20. A load error ($0624 set) repeats the prompt and
the load. Before levels 1 and 4 `load_prompt` ($0625) asks for disk side
1 or 2; before the others it prints PRESS FIRE TO LOAD NEXT LEVEL, and
both wait for fire on port 2. Levels 1 to 5 jump back to $0407 when they
are done; $0404 sets the index back to 0 first, so the next load is
level 1. Levels 2 to 6 leave through $0404 after a game over, and level 6
also after its ending. The serial routines at $0546-$05DB are the fast
loader's side of the drive protocol; `show_load_error` ($05DC) prints
DISC ERROR.

## The play screen

Level 1 has four raster interrupts per frame, chained through $FFFE:
$1E21 on line 10, $1EF4 on line 80, $1D43 on line 198 and $1DBF on line
205. The first places the sprites and runs Darkman, the enemies and the
shot; the second can move sprite 0 or 1 eight pixels sideways, plays the
sound ($B176) and reads the keys; the third reads the joystick, turns on
extended-colour mode (with multicolour on, an invalid mode that draws
black) and points $D018 at the bitmap; the fourth switches on bitmap
mode for the panel, turns extended colour off and runs the shot and
scroll steps. Level 1 has no sprite multiplexer. Its main loop
($179E) redraws the energy bar and score and runs the space-bar and pause
checks. It ends play when the energy $43E3 reaches 0 (unless $0A11 is
set) or when the NMI handler ($2030, the RESTORE key) sets $2038.

Levels 2, 4 and 6 share one engine with three raster interrupts (line 0
or 1, line 197 and line 205; $6480, $6315 and $63E8 in level 2) and a
sprite multiplexer for sprites 3 to 7 ($6604 in level 2), called twice a
frame by the first interrupt, and not at all while the banner flag is
set; in level 2 the first of the two calls is also skipped while the
wipe flag is set. Levels 3 and 5 have interrupt chains of their own.

## Controls

Joystick in port 2, copied to a variable each frame by the interrupt on
line 198 in level 1 (the third) or line 197 in levels 2, 4 and 6 (the
second), unless a countdown runs (the joystick is not read while the
stun timer runs). *Live*: left and right walk four pixels every four
frames; up jumps, rising 26 lines in 32 frames; down crouches. Fire with
down starts the low strike, fire alone the punch (`start_attack` $2979).
The keyboard is read once a frame (`read_keys` $0E30 in level 1, key
table $0EAA); key code $50, the P key, pauses (`pause_check` $1777). The
flag $0A11 is flipped by typing BABY AXE MAN on the title pages
(`cheat_check` $1385); while it is set, key code $20 (the space bar) ends
the level ($1A0C in level 1) and running out of energy does not end the
game, except in level 3, whose energy test does not look at the flag.

## Levels

What each level is comes from its briefing text.

| Level | What it is | Engine |
|---|---|---|
| 1 | Darkman sets out to take Durant's gains; then the mask game | its own scroller, one direction (`scroll_step` $2066); title and high scores are in this load |
| 2 | Cornered in his lair, he fights to escape | scrolls across and down, 84 objects |
| 3 | He leaps across the rooftops to his lab; then the mask game | own loop and scroller, `mask_main` $4286 |
| 4 | In his lab he opens the gas cylinders and escapes to the rooftop | same engine as level 2, 73 objects |
| 5 | He hangs on a rope under Durant's chopper; then the mask game | own loop, `chopper_step` $1417 follows a script, `player_swing` $126D |
| 6 | He pursues Strack to free Julie; the game's ending | same engine as level 2, 70 objects |

Levels 1, 3 and 5 end in the same mask game, laid out at different
addresses (`mask_setup` $58C8 in level 1, $4F9C in level 3, $37C9 in
level 5). Five pictures slide in and out of five places, and one of them
is the target. Each press of fire (`fire_capture`) copies the 3 by 3
characters under the cursor, and `match_check` marks the capture when
the cursor is on the target's place while that picture has moved fewer
than 5 steps. After twelve captures, or when the timer runs out, a cursor
scans the captures (SCANNING...), `scan_wait` rates them into $0A10 (0, 1
or 2), and the report prints MASK COMPLETE or INSUFFICIENT DATA TO
GENERATE MASK.

## Objects, behaviours and slots (levels 2, 4 and 6)

`scan_objects` takes the objects last to first and gives each one
inside the camera window one of 11 slots. `update_objects` runs the
behaviour for each slot's state through a table (`behave_*` in levels 4
and 6): attack and walk, left and right, vertical patrol, radial shot,
lobbed shot, the enemies' shot, flashing hazard, energy pickup, score
pickup, and in level 6 a map switch, among others.
Level 6's `area_trigger` ($1F6A) runs once, when the player passes a map
position, and writes 3 into the high Y byte of objects 41 to 44.

## Continues

Level 1's title sets the credits $0A12 to 3. In levels 2 to 6, when the
energy runs out (in level 3 also when he falls or its countdown ends),
the continue screen ($8CBC in level 2) restarts the
level if fire is pressed and takes one credit; with no credits left the
game is over. Level 1 has no continue screen.

## Music and sound

Two drivers. The title tune driver (play $A242, called by the title
interrupt) plays four tunes from its table at $AA8D; level 1's title code
starts three of them ($A164 with X = 0, 6 or $12, at $0F70, $0AC1 and
$0AC8/$1320), and nothing starts tune 2 (X = $0C). The sound-effect driver
(play $B176, called once a frame in play: PAL, 50.12 times a second)
holds eleven effects in its table at $BB48, started through `play_sound`
($B0EE) with X = 4 × the effect. The SID writes of both drivers and of
the player on the page agree register for register (539,221 writes,
`test_music.js`).

## Text

Most messages are stored as screen codes (letters 1 to 26) and get an
offset added when printed ($66 for level 1's briefing). The mask-game
texts are ASCII lower case with 6 added (level 1) or $15 added (levels 3
and 5), and the key codes and the cheat
sequence are ASCII. Strings: resident $060C "DISC ERROR", $06B1 "INSERT
DISK SIDE #1, THEN PRESS FIRE", $06DA "PRESS FIRE TO LOAD NEXT LEVEL";
level 1 $0FE6 briefing, $122E high-score entry, $1675 credits, $1A02
"GAME OVER", $1376 the cheat sequence "BABY AXE MAN".

## Hardware register census

| Register | Use |
|---|---|
| $D000-$D010 | sprite positions |
| $D011, $D016, $D018 | screen mode, fine scroll and memory base per raster band |
| $D012, $D019, $D01A | raster interrupt set-up and acknowledge |
| $D015-$D01D | sprite enable, expand, priority, multicolour |
| $D020-$D02E | border, background and sprite colours |
| $D400-$D418 | sound |
| $DC00, $DC01 | joystick and keyboard |
| $DC02 | port A direction, switched by the keyboard scan |
| $DC04, $DC05 | timer A, read for random numbers |
| $DC0D, $DC0E | CIA 1 interrupts turned off and timer A started at setup |
| $DD00, $DD02 | video bank and the fast loader's serial lines |

## Twin copies

The two sound drivers are near twins at different addresses: the title
copy at $A000 (19 pages from $80B4 in level 1's file, routines from
$A0C8) and the effect copy at $B000 (13 pages from $747B, routines from
$B0C8). They differ in places: the title copy's starter $A0EE does not
clear the filter as $B0EE does, and its init $A0C8 clears $A02F-$A045
where $B0C8 clears $B02F-$B043. The title copy also has the tune starter
$A164.

## The listing's error rate

Sample, seed 20261024: 60 of the 3,698 comments in the seven parts' `symbols.json`, drawn at random and checked by a fresh checker on Claude Opus 5.5 that wrote none of them. 8 were wrong in a detail and none in its main claim, over the mark of 2 in 60, so the rate was about one in eight (95 % interval 6.9 % to 24.2 %). The wrong ones were readers or writers missing from a list, a call said to happen every other time when it happens every time, and a flag said to be set at the wrong moment. All 8 were corrected, with the 10 comments of levels 2, 4 and 6 that repeated the every-other-time belief.

Audit (`kit/CHECKING.md`): fresh checkers on Claude Opus 5.5 went through all 3,698 comments, in 34 chunks of about 110 in address order, one part at a time, and then every claim in this file. 2,847 comments were right; 842 were wrong in a detail and 6 in the main claim, and all 848 were rewritten, with a few more that repeated the same beliefs (853 in all, about one in four); 1 was doubtful and was cut back to what could be checked; 2 could not be checked because the listing holds no bytes for the stretch they describe. 11 labels were renamed where they named the wrong thing. The commonest errors were lists of callers, readers or writers that missed some (often the mask game's setup, or the shared engine's other levels); "every frame" for calls the banner or wipe flags skip; a sound effect named by the value in X rather than its number; the status panel's screen bytes, which are colours behind a multicolour bitmap, called character codes; comments copied between the levels that share an engine and naming another level's addresses or values; and counts off by one. Of the 88 claims in this file, 11 were wrong in a detail and were corrected, and 3 could not be checked from the code.

Sample, seed 5813, after the audit: 60 of the 3,698 comments, drawn at random across all seven parts and checked by a fresh checker on Claude Opus 5.5 that took no part in writing or auditing them. 57 were right and 2 were wrong in a detail, within the mark (95 % interval 0.9 % to 11.4 %): a caller in level 1's mask setup called the end-of-level code ($1FE5), which four other comments also said and which were corrected with it, and a sprite shape described with a pointed top it does not have (level 4, $DA80). The checker marked a third (level 1, $8BAA) for calling $B0C8 the level's sound driver; the driver's code does start there, so it is counted right. A checker misses some, so the rate is a lower bound.
