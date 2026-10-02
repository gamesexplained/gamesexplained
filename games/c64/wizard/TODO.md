# Wizard — further work

Silver curation claimed by jankfoundry. The canonical resident-image ledger explains all 45,560 tracked bytes; the article, forty-level atlas and source companions are built and checked. Copy remains `agent-draft`.

The human curation pass began with the request to illustrate and tidy the monster behavior section. That section now has original sprite previews, frame selection and level appearance examples. A second requested pass verified projectile hits, Freeze timing and Simon Says, and added an illustrated puzzle rule explorer. The remaining sections still need the human review required for Gold; copy remains `agent-draft` until that review establishes its provenance.

Research opportunities, explicitly open:

- Locate and test the manual's Commodore-key startup score-clear path in the disk loader.
- Replay the level-specific puzzles and provide input routes, particularly Simon Says and the moving key in Friend or Foe?. Simon Says acceptance, next-instruction tables and automatic starting pickup are verified; a full completion route is still needed. The atlas describes callbacks, not solved routes.
- Establish whether the dormant instruction-shaped fragment in L35T is ever activated. Its callback begins with RTS and its following bytes overlap patch storage.
- Test the editor's elevator-parameter/save interaction live. The save preparation overwrites those fields; no save was issued during this run.
- Identify the historical provenance of retained alignment bytes after resident demo records. Their boundaries and absence from the demo copies are documented; no gameplay role has been established.
- A full Play tab would need a behavioral port checked against the recorded demonstrations. It is not required for Silver or Gold.

The disassembler and snapshot remain under ignored `work/`; rebuild from `symbols.json` when resuming in another checkout. The listing snapshot is `work/entry.vsf`, compared with `work/play-round1.vsf`. Construction uses a separate overlay, documented in `reference/editor-source.txt`.
