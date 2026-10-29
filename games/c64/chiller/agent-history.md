# Chiller — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Silver, 28 September 2026 (claude-opus-5-5)

- **50-coverage.** The tracer's snapshot showed one screen. Running the
  game in the kit's simulator from each of the ten records (poking the
  start level at `$C661`) reached the code and data the others use; the
  seeded disassembly and 30-odd annotation batches took the ledger to
  100 %. `listing.py` then reported 57 loaded stretches the ledger does
  not count; each was described or excluded. Wrong turn: the stores at
  `$E000` were first described as holding a screen as loaded; starting on
  a way-back screen showed garbage, and the comment was corrected.
- **60-verify.** Every claim that could be poked was: crosses, mushroom,
  toadstool, jump, switching. The keys looked dead until the host-key
  path was tried. Playing through (crosses poked beside the boy, the
  energy bar refilled) was the only way to see the way-back screens as
  the game draws them. A ladder claim written from memory was checked
  against the level settings and withdrawn: up is off on every screen.
  The Bronze note that the bar drains with no input was an enemy on him.
- **70-minisite.** The screen builder reuses `setup_screen`'s steps and
  the kit's frame renderer; against the emulator's screenshots 98.6 to
  99.7 % of pixels match, the rest being enemies and the bar. The music
  port matched the driver in `cpu6502.js` on the first full run once the
  60 Hz timer was separated from the player's PAL frame.

## Toward Gold, 28-29 September 2026 (claude-opus-5-5)

Continuing from Silver on the same branch, `work/` still in place from
the earlier session. Closed every TODO item that did not need a human's
own hand on the prose.

- **Reachability.** `try_move`'s exact rules were already in the code
  (`tile_touch_a`, `tile_touch_b`, the `$5B89`/`$7673` continuation);
  `work/reach.py` turned them into a pixel-by-pixel breadth-first search
  from each record's start position. First pass found almost every cross
  unreachable, which was a modelling bug, not a finding: `try_move`'s row
  is the *screen* row, matching `cross_map.py`'s and `verify.py`'s own
  `boy_cell()` convention, and treating a space (`$A0`) or an
  out-of-bounds probe as anything but open broke the search entirely.
  Once fixed, nine of the ten screens came back fully reachable and three
  crosses did not, all in the bottom two rows of their screens. Rather
  than trust the model, `work/verify_reach4.py` cleared a column to open
  space live and watched the boy fall: he stopped at Y `$E3`, row 22,
  never reaching the rows those three crosses sit in, confirming
  `move_sprite`'s Y clamp is what puts them out of reach. The Maps /
  levels tab's own reachability overlay, a JS port of the same rules,
  flags the same three crosses when clicked through headless Chrome
  (`work/check_reach_widget.js`) — the two implementations agree.
- **Enemy paths.** Already named and commented in `symbols.json` from
  the coverage pass (`path_scripts`, `path_step`) but not yet written up
  in `facts.md` or shown on a page. `work/scripts.py` (from 50-coverage)
  had already found the nine scripts; this pass wrote up the format and
  built a stepper for the Maps / levels tab.
- **SHIFT.** The host-key path still has no name for it. Holding the
  KERNAL's own shift flag `$028D` at 1 with a single poke did nothing:
  `SCNKEY` overwrites it from the real (unpressed) hardware 60 times a
  second, faster than a one-shot poke survives. Re-poking it every frame
  with `vice_frame_advance` held it long enough for `player_input` to see
  it, and the boy jumped.
- **The three unread blocks.** `$1000`-`$1FFF` rendered as 64-byte
  multicolour sprites is visual noise, ruling out the obvious guess.
  `$4A90`-`$4AFF`, read the same way `path_scripts` is, turned out to be
  shaped exactly like more path scripts (direction bytes ended by
  `$FF`) — likely cut content, though no record points at it to prove
  it. `$4B00` on, and the block after the jingle, gave up nothing as
  clear.
- **The release.** Games That Weren't's page on Chiller V1 names one
  physical marker, cover text ("Burner Loading System"), that a PRG has
  no way to carry. The tune's opening riff was written down for whoever
  next has both this page's playback and a recording of V1 to hand.
- Did not change: `tier` stays `silver`, `copy` stays `agent-draft`.
  Every fact above is agent work, unread by a human; that is the one
  remaining gate to Gold, and it is not this agent's to open.


## The cross that could be reached, 29 September 2026

The Gold draft led How it works with a bug: three blue crosses on the
way back, in the play area's bottom two rows, could never be taken, so
nobody got home. `work/reach.py` and the levels tab's overlay both looked
for a cross in the cell the boy's own position maps to, and his own Y
stops at row 22. Neither modelled `probe_offset` (`$5145`), which makes
`try_move` read the cell two rows down, or one row down and to the side.
With the port playable, the steward asked for the claim to be tested. On
the game's own code the boy took each of the three crosses by walking
left along the ground, and the steward then played all ten levels,
taking every cross. The section, the hero line, `facts.md`,
`features.md`, `TODO.md` and the levels tab's rings were corrected. What
the playthrough showed in their place is that the game has no ending:
after the last level it loads the forest again. The lesson for the kit
is that a reachability search should call the game's own movement code,
not a model of it; a model that leaves out one table reads as proof.

## 2026-10-03: the Fist II layout, and the shape-shifting enemy

The steward asked for Chiller to match the layout of Fist II and Doctor
Who. How it works was split into Gameplay (the ten screens and their
cards, the crosses, energy, and the enemies, now animated), Controls (the
keys and the jump, with the disabled fall damage moved there from
Discoveries) and Graphics (the players' frames and a gallery of every
enemy animation). The Overview and Discoveries lost their inline source
notes and process notes, and sources became footnotes listed on About.

Building the gallery turned up an animation of 107 frames. The way-home
forest's slot 1 ends at `$F2` (`$7523`), the byte `title_flicker` writes
to by mistake. The symbol map had called it record 9's unused tail; it is
the slot's last frame (`+$23`). The enemy was watched in the port over
3,000 frames and took every pointer from `$88` to `$F2`. The earlier
pages had drawn four frames for every enemy, which hid both this and the
cinema's one-frame enemies.

## 17 October 2026: the kit's sprite collisions

The port's own model of `$D01E` and `$D01F` (`collideLine` in
`port/src/kernal.js`, a raster line at a time) gave way to the kit's,
`site/lib/collide.js`, which follows the beam cycle by cycle and was held
against VICE in 144 scenes (#406). The page's runtime gives it the clock
at each read and write of the video chip, and the game's machine in the
tests runs it with `machine.js`'s `collide: true`. With states made again
from seed 1, the lockstep over nine seeds of 2,000 passes left a few
states out of step at a raster wait, as before (3 of 693 runs, against 2
of 675 on the old model). The passes `scripts/pace.js` counts
in 400 frames, level by level, moved by at most 3.3 % on the game's
machine and 1.1 % on the page.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data, and bytes under a line comment,
that no label reaches, and the listing then left out 81 bytes (#469).
`sprites_low_2` sat at `$0F01` and `charset_graveyard_2` at `$A010`, one
byte and sixteen bytes past where the labels before them stop, so
`$0F00` (the first byte of sprite `$3C`) and `$A000`-`$A00F` belonged to
nothing; both labels now start where their data does. The 64 bytes
under the comment at `$BBBB` are RAM the game never reads or writes,
and they were not the power-on pattern the comment said in the copy
used here (the loader had written to them), so they are excluded with
the comment's reason instead.

The contributor's program file was not available to this session. The
C64 Preservation Project has no copy of it; archive.org's Antisoft crack
(`Chiller_1985_Mastertronic_cr_Antisoft.d64`, a 50,689-byte `CHILLER`)
was booted to play, and every byte of code in the listing matched; the
3,904 bytes that differed were runtime state and the level store at
`$E000`, which hold another moment of play. Those were written back
from the earlier listing into `work/play-idle.vsf`, so the rebuilt
listing keeps every byte it had and takes only the 17 new ones from
that copy; the unpatched snapshot is `work/play-antisoft-archive.vsf`.


## 28 October 2026: forest parallax concept

Added an optional Parallax view alongside Flat, Layers and Torchlight. New
procedural woodland planes, a dithered moon, stepped mist and edge shrubs
sit around the original forest picture on both journeys. Camera movement
follows the boy; reduced-motion preferences stop the movement. Other rooms
use the original picture. No game memory or collision rules are changed.

The renderer supplies a background mask so black character and sprite pixels
stay opaque. A regression check covers those cases and an unchanged flat
frame. The gameplay comparison passed 30,000 main-loop passes across all
ten levels. Browser inspection covered both forest records.

### Concept artwork in the player

The steward asked for the approved concept's artwork rather than a
procedural approximation, with full RGB colours and individual pixels freed
from the C64's multicolour restrictions. The Parallax view now loads
`reference/parallax-forest-art.png`, an imagegen background plate derived
from that concept with the static gameplay objects removed. The image is
sampled onto the game's logical pixel grid before compositing. The painted
woodland, an added fog veil and isolated edge ferns move at different rates.
The original gameplay art and live sprites remain in front of the new scene.

### A complete foreground frame

The steward spotted dark fragments on the lower trees. They came from
colour-keying the painted background and clipping the resulting fern pixels
into two narrow strips. Replaced that extraction with a dedicated transparent
foreground artwork: coherent overhanging branches and corner ferns, drawn
in front of the game and moving more strongly than the distant woodland.
Only the playfield boundary clips this plane; the HUD remains clear.

### Painted playable scenery

Added a separate Painted scenery toggle under Parallax. A generated terrain
plate supplies full-colour leaves, bark, roots and ropes at the game's logical
pixel size. This is a concept rendition, with the collision map unchanged;
its painted silhouettes are not a measured replacement for the original
character tiles. The renderer now optionally reports visible sprite pixels,
so the reskin preserves the live characters and enemies, including black
sprite pixels. Cross locations are read from the screen record, and mushrooms,
toadstools and bonuses remain the game's live tiles. The original artwork
returns for the game-over text. Turning the toggle off restores the original
scenery over the same Parallax background without restarting play.

### Pickup contrast and live bridge erosion

The steward reported that the painted scenery hid the small food and poison
tiles and left the bridge intact after it eroded. The Parallax view now draws
outlined pixel icons from live tile codes: amber food, red-and-white poison,
a gold bonus and cyan crosses. Items render above the foreground ferns but
exclude visible sprite pixels. A consumed tile immediately loses its icon.

The painted bridge regions are cleared from the static terrain plate. Their
railings and fourteen ledge cells use the live character pixels, recoloured
in ivory, including every erosion stage and the final empty tile. The ledge
cells were read from a fresh forest on the original code; test_play.js checks
that list and checks item removal and sprite priority.

### Separate visual and gameplay tweaks

Grouped the player controls into Visual tweaks (views, painted scenery, CRT
and overlays) and Gameplay tweaks (jump presets, cheats and level starts).
Moved the existing jump presets out of the byte editor and added Original
jump, which restores only the 24 jump timing bytes. Preset selection is
computed from the live timing table, so a rewind or manual edit cannot leave
a misleading selection. The byte editor and its full Undo my edits remain
available below the grouped controls.

### Tweak tabs

Replaced the stacked Visual tweaks and Gameplay tweaks sections with a shared
tab bar and one visible panel. The panels retain their control state when
hidden. The tab bar supports arrow keys, Home and End, with labelled panels
and a single tab stop. A minimum panel height reduces movement below the
controls when switching between the two.

### Anchored items, sparkling crosses, coins and a clearer deck

The steward found that the painted branches did not meet the live item
positions. Food and poison now have small bark ledges at their real tile
baselines wherever the original map provides support. Collectible positions
and hit tests are unchanged. Crosses pulse white and have a small travelling
sparkle, and the game's 100-point bonus tile is a rotating gold coin. Both
animations follow game time, freeze on pause and stay still with reduced
motion enabled. The live bridge deck gains a dark underside, a gold edge and
an ivory top, drawn only from the remaining pixels of its erosion glyph.
Regression checks cover animation, reduced motion and an erased deck.

Removed the static cup-like decorations from a revised terrain plate,
`reference/parallax-terrain-clean.png`, so they cannot be mistaken for live
bonus items. Only the game's real bonus tiles receive rotating coins.

### VCR playback buttons

Replaced the rewind slider and Play from here button with Rewind, Pause,
Play and Fast forward, alongside a position/recorded-length display. The seek
buttons move five seconds through the saved recording and pause there; they
stop at its ends. Play resumes from the selected moment using the existing
branching replay behaviour, so it replaces the old future. Button availability
and pressed states follow the shared pause and recording state.

### Collapsible jump duration slider

Added Fine-tune jump beneath the jump presets in Gameplay tweaks. Its
50–200% duration slider scales the original 24 timing bytes using the same
rounding and limits as the Snappy and Floaty presets, with 100% restoring the
original. It changes the live game and is recorded for rewind. Presets,
rewinds and manual edits update the slider's displayed state; the slider is
disabled when reviewing the old future until Play resumes. The general byte
editor remains available in a collapsed Advanced memory editor section.

### Reworked collectible animation after the recording review

The steward's short recording showed that the four-frame coin read as
uneven stripes and the cross's orbiting sparkle looked detached. Replaced
the coin with sixteen shaded turn frames on a centred 10-pixel grid, with
a fixed top and bottom and a consistent light source. The cross now has a
bevelled shape, a blue aura and a diagonal specular sweep across its own
surface, replacing the external sparkle and whole-icon flash. Both still
use game time, preserve sprite priority and honour reduced motion. Added
a check that every coin frame keeps its centre, top and bottom fixed.

### Playback controls beside Start again

Moved the VCR controls and time display into the toolbar directly beneath
the game, beside Start again and Sound. Removed the duplicate Pause button
and its old state updates. The transport's own buttons now provide the
single pause/play state, and starting a game refreshes them immediately.
The lower lab retains the paused routine list and advanced memory editor.
