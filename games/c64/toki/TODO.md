# Toki — TODO

Tier: Bronze (2026-10-08). Coverage 3.0 % of the play snapshot's ledger.

For Silver:

- 50-coverage: the burn-down from 3 %. Start with the cartridge copy
  routines and their directory in bank 0 ($8009), which say what each
  bank holds and where it lands, then the main loop at `wait_frame`, the
  two raster handlers and `nmi_frame`.
- Treat the cartridge's banks as `kit/skills/c64/c64-reference`,
  "Bank-switched cartridges", says: each stage is likely copied in from
  the cartridge (`stage_load`), which would make each stage a part
  (`10-orient`, "A game of several parts").
- Text: the game reads its strings from bank 0 in place, outside the RAM
  image, so the listing cannot show them; give them in the comments of
  the code that prints them and in `facts.md`, by bank and address (the
  same section).
- 20-features: every page fetch was refused in this session; read the
  manual and C64 reviews (Zzap!64 issue 80) when a session can.
- Explain the data the ledger does not see ($D000-$DFFF RAM and seven
  stretches `listing.py` names).
- 60-verify, 70-minisite (the full page), 80-retro.
