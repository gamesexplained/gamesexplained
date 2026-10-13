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
