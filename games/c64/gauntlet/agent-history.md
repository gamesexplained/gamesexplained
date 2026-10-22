# Gauntlet — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 11 October 2026, orient

The contributor uploaded `gauntletus_gold_1986cyan1.g64`. The release
v3.13.2 emulator passed 57 of 57; the frame renderer test passed. The
image booted through VICE's defaults, no `vicerc`, in about 75 seconds
to the credits.

The selection screen cost the first wrong turns. Fire on joystick 1 did
nothing, and neither did the `1` key. Reading the loop at `$3390` showed
why: fire is read only once `$FD` is no longer `$FF`, and `$FD` is set by
`$36E1` only while the glove's position (`$38A2`/`$38A3`) is inside the
box around ONE or TWO. Steering the glove there by reading its position
back, then pressing fire, worked; `work/route.py` does it.

A first scripted route lost the second SPACE (the controls screen stayed
up); the script now presses again until the loader is seen running in the
KERNAL's `$EExx`.

The hand-over (`JMP $8000` at `$34E2`) holds only the main program and
the font: the game loads its graphics, music player and object code
after the jump, so the play snapshot is the image to analyse.

## 11 October 2026, features, sweep and coverage

The wiki and the Mindscape manual gave the feature list before any code
was read. The manual covers three machines in one booklet, so only its
C64 lines were used, and it is Mindscape's while the disk is U.S. Gold's.

Coverage went from the traced code outwards. Three things cost time:

- `JSR $B008` (print_centred) takes the string's address from the two
  bytes after the call. Re-tracing from a call site decoded those bytes
  as instructions, twice, so the 21 inline words were kept in their own
  annotation batch and re-applied after every seeding.
- A single-address type line in the disassembler's apply format makes a
  label called "byte"; every type line needs the range form.
- A routine first labelled as unused (`$8EB4`) turned out to be called
  from the message screens (power_message, poison_eaten); it is
  maze_restore.

PINN232, loaded with the game and never called, called two BASIC ROM
routines. A first comment named what they do from memory; it was cut
back to the addresses, since the snapshot holds RAM beneath the ROM.

## 11-12 October 2026, verify

Live tests in the emulator settled what reading alone could not. Four
of them found the game doing something other than its manual says: the
armour values are never read, the fight-power potion's hand-to-hand
value is never read, poison's 100 health is subtracted in binary from a
decimal number, and the hidden potion's message is printed for a kind
that is never placed. The idle timer's second stage is 150 game seconds,
not the manual's 30.

The two music players were checked by their note tables against both
clocks: the level jingle's is PAL-tuned, the treasure tune's NTSC-tuned.

The first independent checker stopped at the contributor's session
limit before it wrote anything; it was run again after the limit reset.

## 16 October 2026, how the monsters move

Asked for a closer look at the monster updates. Reading monster_aim, the
sign handling after wrap_delta looked as if every distance came out
negative, which would have sent every monster after the farther player.
A live stop at the end of monster_target showed positive distances:
wrap_delta's CMP leaves the flags inverted and monster_aim's BMI reads
them that way on purpose. The same live run then showed the real slip:
13 of 60 aims went to the farther player, all of them by monsters across
the map's edge, where wrap_delta's EOR leaves the value's own sign. The
listing's comment on monster_step said it stepped by one; the trace
showed two, and the comment was corrected with monsters_run's.

## 17 October 2026, the simulation's stray outlines

The contributor saw monsters off screen marked as moved on level 1
(passes 7, 13, 15, 18 and 22). The page had recorded slot numbers and
drawn whatever monster held the slot after the pass. In each of those
passes a ghost attacked the hero and vanished, and monster_remove moved
the last monster in the table, far off screen, into its slot. The game
was right; the page now records each turn where it ends ($BDB3), and no
turn in 2,800 passes ends outside the window.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data, and bytes under a line comment,
that no label reaches, and the listing then left out 21 bytes in eight
stretches (#477). Five are bytes between labelled variables that no
instruction refers to (`$8835`, `$910A`, `$910E`, `$9BA9`, `$A43B`);
two are calls in `unused_side2` typed as data (`$A69D`, `$A6A5`); and
`$B65E` is the third idle count, `$FF`, which a shot puts back once the
walls have become exits. Each has a line comment.

Reading the idle counts showed that fight_back puts the timer back with
the player's number as the index, where shot_fire uses the stage
(`$C54E`). Running both tails from the play snapshot for each player
and stage confirmed it; it is in `facts.md` and on Discoveries.

The disk from the C64 Preservation Project has the same SHA-256 as the
contributor's. The snapshots were made again from it by the route in
`orientation.md`, the glove steered by reading `$38A2`/`$38A3` between
short pushes. Play differed from the listing in 717 bytes, nearly all
player two's sprite buffers and shot shapes, which were written back
from the earlier listing into `work/play-level1.vsf`; the unpatched
snapshot is `work/play-level1-raw.vsf`.
