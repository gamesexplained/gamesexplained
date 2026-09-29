# Mercenary — TODO

Tier: Silver (claimed by air; 100 % of 50,703 tracked bytes explained; facts, features,
listing and minisite built; copy `human-edited`, the steward's pass under way).

## For Gold

A human pass over the How it works page and the Maps page, section by
section: cut what is dull, expand what is interesting, rewrite the
clichés, add what the agent missed. The pass is under way (`steward`: air,
`tier: silver-claimed`); record the outcome in `copy`. Three parts arrived
after it began and are agent-written, not yet read by the steward: section
04 of the How it works page (the craft that fly without you), section 14
(the sound) and the Play tab's four sections (the mod, the port, the
speed, the differences) (#61). The Play tab's smooth motion came later and
is agent-written too: the caption's last sentence, section 03's Smooth
motion and its line in section 04.

At a phone's width (390 px) the How it works page scrolls sideways by
about 19 px: the Outside the city table and the lift section's code lines
are wider than the column (#62).

## For Platinum

Reassemble the listing byte for byte to the analysed image. The start-up
code exists only at the hand-over, and the build is a crack: a Platinum
build would reproduce the crack's image, or be made from the original
disk's memory at the same point (`work/orig-entry-5000.vsf`: five places
differ, `orientation.md`) (#64).

## Open questions

- *The Second City*: the disk's `MERC 2ND CITY` has not been unpacked. The
  code's side is traced: after a load, `JMP ($BFFD)` runs whatever the file
  put in the zero-page copy. Whether it replaces the city tables
  (`$2600`-`$2FFF`), and whether the eight unused road pieces at `$E000`
  are for it, is open (#65).
- What `$BEBD` was meant for: only the unused script operations 22 and 23
  touch it (#66).
- Why canned messages 10, 11, 13, 14, 22 and 36 exist when nothing prints
  them (#67).
- The hire path with too little money (`$0E6F`, INSUFFICIENT FUNDS) was not
  run live; a Zzap!64 15 reader reported a crash there (#68).
- Room `$51` (the prison): door 0 can never match (`$9456`); whether a
  player can leave it by another way was not tried (#69).
- After an escape and CTRL + Q, `$BEFE` stays set: boarding craft 7 again
  should launch without Y (not tried) (#70).
- Some frames drawn by the game's code in the simulator have one line of
  stray pixels just below the view, on the raster line where the panel's
  interrupt switches the screen to text (line 186); other frames of the
  same scene do not, and it came and went with the viewpoint. The
  simulator times the interrupt only to the line, so whether a real C64
  shows that line depends on timing it does not model; the emulator
  would settle it (#71).

## Carry into the disassembler project

Five comments were corrected by hand in `symbols.json`, and the listing
with `listing.py --recomment`, in a session without the snapshot or the
project (#63). The project in `work/` still holds the old text, and its
next export would put it back: copy these five line comments from
`symbols.json` into it first. `$7472` (Y's low byte is what `$8510` left in
`$07`), `$8634` (779 passes after the placing pass, 780 from the poke),
`$8B41` (op 9 branches on the carry out of `$1F` + Y + 1), `$AFA8` and
`$BB7E` (the colour is read before `$F0` counts down: 10 gives
`$BB88`-`$BB80`, black first; 31 gives 19 oranges).

## Ideas for the page

- The Second City's changes, once unpacked; the Play tab could then load
  it (#73).
- Smooth motion slides positions only. An object's own turn (its three
  64-step angles at `$800A`, `$801A` and `$802A`) and a rotor's spin (`$A2`
  a pass) could slide too, from the same two passes.
- The smooth view in the C64's pixels fills the sky and the ground by the
  horizon's half-plane, not by `$AFD5`'s row stepping, so along a banked
  horizon its edge can sit a pixel from the game's.
- The Play tab shows the port's case of the game's two interrupt races
  (the Play page, section 02). Running the interrupts inside a step, at the
  cycle the cost model puts them, would show the white band too (#74).
