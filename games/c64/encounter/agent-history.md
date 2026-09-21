# Encounter — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-09-20, session 1 (Claude Fable 5.1), Silver run

- Installed vice-mcp v3.11.0 (GUI) and regenerator2000 0.9.20 under
  tools/. The MCP server was not registered in the agent session because
  it started after the session, so everything went through
  `kit/c64/vice.py` and `kit/c64/r2000.py`.
- Orientation: autostart, F7 held 2.5 s, play snapshot. Reloading the
  play snapshot through `vice_snapshot_load` came back corrupt ($01=$37,
  CPU in the KERNAL scroll routine); re-autostarting was the fix.
- The first screenshot's enemy counter was read as E11; decoding the
  wide font showed it was E15. Screenshots of a stylised font are not
  evidence; the alphabet table is.
- The prior-art repository (air/encounter-eng) was consulted for hints
  only. Its packer identification (CardCruncher) was not re-verified;
  its +$3000 relocation and $9C00 init were confirmed with checkpoints.
- The $7000 block was first labelled a second character set; the sprite
  pointers showed it also stores sprite images, and the view rows only
  use codes $00 and $FF from it.
- Coverage burn-down split across six sub-agents on disjoint ranges
  (code $9C00-$AA6F, $AA70-$B0FF, $B100-$B4FF, $B500-$B8E0, $B8E1-$BFFF;
  data $1400-$17FF, $4000-$9BFF), each with its own annotations log.
- Agent 3 corrected my reading of `$D018` = $8E: it selects the charset
  at $7800, not $7000. The "second character set" at $7000 became sprite
  storage, and the view turned out to use dynamically built characters
  at $4000-$5FFF, which I had taken for runtime scratch.
- I first excluded $1800-$3FFF from coverage as an unused copy; the
  shape-pointer tables at $9600/$9700 pointed straight into it. The 224
  shape scripts live at $1E00-$3EEB and were labelled per script.
- The emulator's keyboard-matrix tool reports SPACE as row 7 column 4
  but the game never saw it; the key-press tool did. Two rounds of
  "the pause does not work" were the tool, not the game.
- A stopping checkpoint reported registers that did not belong to the
  checkpoint (A = 0 at the pause check); hit counts were the instrument
  that worked, as the kit says.
- Verify: the demo played for four minutes with hit counters on every
  mechanic routine and the raster stage as control. Poking the enemy
  count to 1 made it open the gate and fly the warp, which settled the
  shield award and the warp path live. The NTSC test hung the machine at
  $DBE8 as the code predicted.
- Minisite: the frame was rendered in Python first and compared with the
  screenshot before the JavaScript was written. The fire-script widget
  showed garbage until the stepper at $A97A was read again: the script
  starts one byte after the offset.
- Retro: four kit edits, changelog 0.0.7.
