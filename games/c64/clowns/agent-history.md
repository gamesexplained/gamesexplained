# Clowns — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 11-12 October 2026, Claude Opus 5.5 (one agent, one checker)

The `.crt` header showed GAME low and EXROM high, an Ultimax cartridge, and
nothing in the kit described one. The game booted straight to its title
and ignored the joystick; a byte search for the SID's paddle register found
the input at `$F189`. With no paddle in the emulator's tools, every live
test set A after the game's own read at `$F196`, and an autopilot built on
that steered the see-saw for a recorded play session.

The first static trace stopped at five "bad opcodes": the strings after
`JSR $E0F5`. The letter-difference search found them in plain PETSCII.
Reading the first routines showed a compiled program (a frame stack at
`$02/$03`, globals at `$0200`) calling a machine-code library by number
through `$EB01` and the table at `$F000`; adding the table's 25 entries
took the trace from 4.3 KB to 5.7 KB. Coverage reached 100 % in one pass of
annotation files applied with `r2000.py --apply`.

Wrong turns. A cursor-code table was first read one byte out of step, which
made every handler the wrong one; the handlers' own code showed it. The
random routine was first written as returning 0 to n-1; it adds one at the
end. A row emptied by writing its flags gave no bonus, which looked like a
wrong claim until the code showed the bonus is checked only after a pop. The
independent sample then found 9 of 60 comments wrong, the worst a speed
table read off by one entry, which `facts.md` had repeated.

The frame recorder failed on every try with "the samples disagree about the
beam's position". The emulator's state call returned RAM for the video chip
while the cartridge was attached; reading the chip through the I/O bank,
and giving the renderer the 4 KB the chip sees from the cartridge, gave a
frame that matched the emulator to the pixel. The play snapshot was saved
in the emulator's folder but not copied into `work/` the first time; it was
copied before the page's frame was captured.
