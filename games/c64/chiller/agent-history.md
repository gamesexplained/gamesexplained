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
