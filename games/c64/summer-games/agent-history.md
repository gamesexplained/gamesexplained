# Summer Games — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The run, 17 November 2026

One agent did the whole run, apart from web-fetch helpers for the
research, the checker for the sample and the reader for the review, in a
Claude cloud container on Linux x86_64. The contributor supplied three
G64 images: two PAL images that agree on every file and an NTSC image
with its own boot path. The PAL image `(pal)(!)` is the one analysed.

**Tools.** VICE's v4.0.0 build saves snapshots with a `C64MEMHACKS`
module before the RAM, so RAM sits 23 bytes later than the kit assumed
(232, not 209) and `check-emulator` failed `snapshot-ram-offset`. The
kit's `snapshot.py` now walks the modules to find `C64MEM`, and
`check_emulator.py` reads through it. The same fix was made on the
Galactic Games branch, and whichever merges first carries it.
`r2000.py --game` with a part id from the wrong directory used to fall
back to whichever disassembler answered; it now refuses.

**Orient, media and parts.** The boot file loads SGLOAD, which shows the
title screen while it loads the engine (file B, unpacked to
`$0C00`-`$3EFF`) and the ceremony (file A). The engine loads every other
part by a letter from `module_letters` (`$0AF3`) and unpacks it in
`load_module` (`$0934`). That made eight parts: the resident engine, the
ceremony and menus' pictures, and the six event files. Swimming unpacks
over the engine (`$1000`-`$BEFF`), copies its code to `$E000` under the
KERNAL and saves the engine's state at `$C000`; its listing was built
from a snapshot taken during the relay, after the copy, so the code sits
at the addresses it runs at, and the unpacked copy at `$6000`-`$7E9A` is
described as the source of that copy. The media scan answered every
file and stray sector; L and M are never loaded, and the bytes of file I
that the event overwrites at start hold the format command
"N:SUMMER GAMES,SL".

**Annotation.** Each part was taken to 100 % from a code map recorded
while the part ran, then table by table. The engine's resident area kept
graphics SGLOAD left at `$CB00`-`$CDF6`; they are excluded in
`parts/resident/part.json` with the reason.

Wrong turns worth knowing:

- The pole vault grip was first described from the manual (forward high,
  sideways medium, back low). `pv_state3` (`$C157`) steps it one place
  from medium, so the manual's directions only hold from medium.
- The gymnastics landing penalties were first written as "a point" and
  "two points". The score is in tenths: a lean costs 0.1, a fall 3.0, and
  a lean not recovered gives 1.5 back before the fall's 3.0.
- The flare shapes `$BC`-`$C1` in the ceremony were first called the
  bowl catching light; `cer_flare_tab` (`$7F0F`) puts them on the
  torch-bearer's three sprites, so they are the runner lifting the torch.
- `flash_band` (`$13A3`) and the world-records loop (`$0E67`) were first
  described as one music step a frame and as double speed. Every place
  the engine plays music steps it twice a frame; `test_music.js` now
  reads the call sites from the listing.

**Verify.** `sample.py` drew 60 comments (seed 2618) and one checker
agent on the same model read them cold. It marked 10 wrong; each was
read against the code and held. The same mistakes were corrected where
they recurred (gymnastics `$46D4`, `$46DE`, `$4BB2`, `$4231`). 10 of 60
is over the mark, so `TODO.md` recommends an audit.

**Pages.** The pages follow the contributor's story-first layout: an
Overview with the story, the people, the C64 reception and what is
hidden, then Gameplay, Controls, Venues, Graphics, Discoveries and
About. The two music players run the game's own players (the engine's
and the ceremony's) on the site's 6502; `test_music.js` holds them to
the listings, 22 tunes for 3,000 frames each. The Venues tab draws the
five multicolour bitmaps from the listings; the Graphics tab draws every
sprite shape, including the gymnast's 206 packed shapes unpacked as the event
unpacks them. `copy_lint.py` found ten "nothing"/"nobody" sentences,
all rewritten.

**Reader review.** One reader on the same model, which wrote none of the
pages, read every tab at desktop and phone widths
(`work/reports/reader-review.md`). What it found and what was done:

- Clay shatter frames counted as five on Gameplay and four on Graphics:
  both now say four, after the whole clay.
- Gymnastics scoring had no worked case: Gameplay now works one vault
  (8.1) and links the lean quirk.
- Diving's "0.3 or 0.4" a half-turn: reading `half_turn_bonus` again
  showed the carry is always set at the `ADC`, so every half-turn adds
  0.4; the comment, `facts.md` and Gameplay were corrected.
- The relay's recovery "at a different rate" now gives each leg's figures
  (`regain_amount`, `regain_time`).
- Controls' grip paragraph was rewritten to say plainly where the manual
  and the code agree.
- The judges and the race clocks, a paragraph each on Gameplay, became
  Discoveries sections of their own, linked from the Overview.
- Left, each in `TODO.md`: whole figures assembled and animated on
  Graphics, file L's screen drawn from its bytes, the track ring and the
  pool map drawn whole, and what a higher grip gains (the speed table is
  known; its effect on the flight was not traced). The sprite collision
  for the bar and the clays stays a sentence on Gameplay, which says what
  a player needs. "Bummer Games II" stays open: the boot loader is no
  part of this run.

The `codemap.json` of swimming held the engine's own code, which ran
before the swimming file loaded over it; those addresses were dropped
from that map, and the swimming entry stub at `$17D0`-`$182E`, which
patches its own `JMP`, was typed as code. Swimming lies over all of the
engine, so its `part.json` has no ranges, as a program that replaces the
whole of memory.
