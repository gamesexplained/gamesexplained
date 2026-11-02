# Gunship — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 31 October 2026: the Silver run

**Images and loads.** The disk came from the C64 Preservation Project's
tenth anniversary collection on archive.org, both sides as G64, Rapidlok
V6. VICE's defaults loaded it with no `vicerc`. `disk.py` could not list
the files: Rapidlok's directory entries point at decoy sectors, and only
32 sectors of either side decode. Every load was found by stopping at the
KERNAL's LOAD (`$FFD5`), reading the name through `$BB`-`$BC`, and
comparing memory between one stop and the next. A checkpoint on the load's
return address did not fire reliably under Rapidlok; the diffs did.
`kit-feedback.md` asks for a script that does this.

**Getting through the front end.** The identity check picks one of twenty
pictures at random and wants the vehicle's name from the manual. The first
answer missed because the pointer's sprite position was misjudged; steering
with the game's own pointer variables (`$7732`/`$7733`) worked. A wrong
answer sends the pilot on a training flight, which is how the training
theatre's snapshots were taken. On the duty screen, Western Europe is row
21 and training row 5.

**Parts.** Eight parts, in the order played. The loader at first did not
own its own BASIC, because the flight was laid over it; a separate
`helpers` part for the machine code `6` brings to `$8000` fixed that, with
the loader, the flight and the debriefing over it. The front end's
pictures at `$A000`-`$BFFF` collided with the library's sprites until the
library's sprite labels moved to their copy at `$E000`. The debriefing at
first counted the flight's leftovers until its ranges were cut to its
BASIC.

**Tools.** A worker restart killed VICE and the disassembler more than
once: restart VICE with `tools.py vice` and reattach the disks after
loading a snapshot (snapshots do not carry them); restart regenerator2000
on the part's snapshot, which rebuilds from `symbols.json`. Loading a
snapshot under a name VICE has already used fails; copy it to a new name in
`/tmp` first. `tools.py stop r2000 <part>` refused without `--force` while
an annotation log was newer than the export. `symbols_export.py` refused an
export that only changed comments ("holds less") and needed `--force` after
the diff was checked.

**Annotation.** Each part was annotated to 100 % by one agent, in the
order title, library, front end, base, flight. Code maps from `codemap.py`
found the flight's code; pressing C= or left SHIFT during a mapping run
loads the stores and damage pictures from disk and crashed the run, so
those keys were left out. Draft comments were wrong in many details caught
before export, most often which axis a variable is (sideways, ahead, up),
which needle a routine draws, and a table misread by one byte. The style
variable `zpa_4C` was first called the realism.

**Verification.** A fresh checker on the run's model checked a sample of
80 comments: 60 written by hand, 20 written by scripts. It found 14 wrong
in a detail and one it could not check, the C128 interrupt's line, which a
memory dump taken just after the engine loaded settled as right. One
comment it passed was wrong too, because its brief carried the same wrong
unit for a unit's position that the comment had (`facts.md` had it
before the big map widget showed the units sit at sixteenths of a square).
Searching every part for each wrong belief found 38 more comments.

**The pages.** Every widget runs the game's own code or bytes: the shape
viewer reads the terrain file's records, the map runs `draw_map`, the hit
test was swept against `hit_helicopter`, and the music and effects run the
game's players. Writing them caught the map's size (12 by 12, not 14 by
14), what makes training safe (`zpa_4C` is 0 there, not the style), and the
Hind's exception in the missile check. The shape viewer's first screenshot
showed a lone dot labelled "M1 ABRAMS" and names such as "T-J2": the dot is
a shape no object uses, and the map font draws J, X and O as 7, 8 and 0.
The copy pass found that one of the six BASIC programs, the debriefing,
has no LIST guard, which the listing and `features.md` had said all of
them have.

**Cheats.** The C64-Wiki's fuel POKE, tested live, makes the tanks drain
faster on this disk; a POKE on the subtraction's operand instead stops
the burn. The ammunition POKE could not be tested live, since the cannon
fires only at a target, so it was run in the kit's 6502 on `use_store`.

**Flying over the theatres.** The How it works page runs `view_frame` on
the listing with each theatre's terrain file, so the eye can go anywhere.
Its first view, redrawn where a recorded cockpit frame had the
helicopter, differed from the frame by 28 bytes: `view_frame` works out
the shapes' points only when the pitch or heading has changed since the
last view (`zpa_F3`, `zpa_F4`), and the listing's zero page said nothing
had. With `zpa_F3` set to a pitch the view never has, the redraw is the
frame byte for byte (`test_fly.js`). Turning the view through the eight
eighths of the compass then showed the view facing north-west drawing one
square eight times: the two 72-byte tables of nine squares for each
eighth ($8281, $82D9) were described by symbols whose spans stop at 64
bytes, so the listing had left out their last 8 bytes and the page read
zeros there. Both tails, and the 65th entry of the quarter circle at
$BF03, now have comments of their own, and the listing carries them.
