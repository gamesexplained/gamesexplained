# Time Tunnel — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 31 October 2026, the Silver run

**The image.** The C64 Preservation Project's original disk and its
alternate dump came from the collection on archive.org. The original has
four files: a one-block boot (`+`), a stub (`TT`), the fast loader `FL` and
the game `T1`, `$0900`-`$C5FD`, one load of 191 blocks. The alternate dump
is a one-file BASIC release whose bytes at `$0900`-`$C5FD` are the same,
so the listing describes both. One sector fails its checksum and loads
anyway.

**Orient.** The emulator passed all 57 of `check-emulator`'s checks. The
title prints its credits a letter at a time and play starts by itself in
the mansion's living room, so the play snapshot (`work/play-mansion.vsf`)
was taken there. The code map recorded in play plus a trace from the
snapshot separated about 12 KB of code from the rest. Another 750 bytes of
era code only became code once the gold rush's handler table
(`gold_handlers`, reached through `call_0F`) was read: no trace from the
mansion reaches them.

**Features.** Wikipedia, LaunchBox, the Zzap!64 review (issue 12, the
Internet Archive's OCR) and a full solution on textfiles.com. C64-Wiki has
no page and Lemon64 refused the fetch. No manual turned up; the review says
the game came with a poster of clues.

**Annotation.** 23 batches of `r2000.py --apply` files, engine first, then
one era at a time, then the sound driver and the tables. Two batches were
written by scripts from the tables: the sprite frames (`/tmp` script
`sprites.py`, 89 comments) and the packed screens and character sets.
Coverage reached 100 % of 48,382 counted bytes.

**A wrong turn.** A scratch disassembly of the whole program, used early
for quick reading, decoded the bytes around `$1496` as data. Reading from
it, the effects player first said effect 2 is never played. The page's own
test (`test_music.js`) scans the listing for every `ldx #n` before a call to
`sfx_start`, and it found effect 2 started by `gold_tank` (`$14BB`). The
references search on the listing agreed. The scratch file went unused after
that. The same test showed that effects 2 and 3 loop, as 4 and 6 do.

**The Maps tab.** Every room is drawn by the game's own code on the site's
6502: the start-up's object unpacking, `era_load_charset` and `room_enter`.
Three things went wrong first. Every picture was black, because the
start-up keeps the screen's `$D011` value in `$A5`, which is zero page and
not in the listing; the page sets it to `$17` as the start-up does. The
wait for the raster in `screen_off` never ended until reads of `$D012` and
`$D011` moved a fake raster line on. And the gold rush's closet (era 2,
room 9) showed room 4's objects: entered with `$29` at 0, `gold_room_entry`
reads its switch table one entry past its end and jumps into the middle of
an instruction at `$2460`. The game only ever enters the closet with `$29`
set, so the page does too. Eight rooms were then compared with the
emulator's screenshots, pixel for pixel, by `test_rooms.js`.

**Live tests.** The lid's bug was found reading `persia_lid`: it stores the
lid's new position through the sprite slot instead of the object number.
In the emulator, with the lid in slot 7 the scorpion moved, and with the
lamp in the room Salem's piece moved and showed in its new place when its
rock was lifted. The closet's rule was tried with three and four objects
and with a piece.

**Verify.** One sample of 80 (seed 20261031), 60 hand-written and 20
generated, checked by a fresh agent on the same model. It marked 14 wrong
in a detail, and every one held. The generated two were the sprite
template's "lines high", taken from `obj_height` (the size the collision
test uses) where the rows copied are `obj_size` divided by the row width;
the script was corrected and the 89 comments written again. The search for
the same beliefs found four more: two routines whose `pla` comments said
two return addresses where `gold_pass` had pushed two bytes of its own, a
third that said the same of Salem's rooms, and one more caller count that
left out a `jmp`. The counts had come from a cross-reference script of this
run that counted `jsr` only.

**Browser.** `shoot.js --click` on all three tabs logged no errors. Its
pictures showed the Maps tab drawing the controls' screenshot under every
room: the `img` had the `hidden` attribute, and the page's own CSS gave its
class `display:block`, which wins over `hidden`. The page now hides
`.tt-cv[hidden]`.
