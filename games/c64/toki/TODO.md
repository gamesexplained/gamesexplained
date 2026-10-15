# Toki — TODO

Tier: Bronze (2026-10-08). Coverage 3.0 % of the play snapshot's ledger.

For Silver:

- 50-coverage: the burn-down from 3 %. The directory in bank 0 is
  decoded in `facts.md` (2026-10-15, static); `facts.md`, "Loading a
  stage", names `stage_load`, `stage_sets`, and `unpack` statically:
  (confirmed in VICE): add them to `symbols.json` with a fresh
  play snapshot, find which object property each pointer table in the
  stage block holds (`facts.md`, "Packed entries"), and find who copies
  entry 11. Then the main loop at `wait_frame`, the
  two raster handlers and `nmi_frame`.
- Treat the cartridge's banks as `kit/skills/c64/c64-reference`,
  "Bank-switched cartridges", says: make the play snapshot's analysis a
  part (`parts.py add ... --adopt`), then a part for each of the 16 banks
  over it (`kit/c64/crt.py parts`), and exclude from each bank what is
  copied into RAM. Each stage is likely copied in from the cartridge
  (`stage_load`), which would make each stage a part as well
  (`10-orient`, "A game of several parts").
- Text: the game reads its strings from bank 0 in place. They go in
  bank 0's listing, and the code that prints them takes their names
  through a `"banks"` row in its part's `part.json` (the same section).
- 20-features: every page fetch was refused in this session; read the
  manual and C64 reviews (Zzap!64 issue 80) when a session can.
- Explain the data the ledger does not see ($D000-$DFFF RAM and seven
  stretches `listing.py` names).
- 60-verify, 70-minisite (the full page), 80-retro.
