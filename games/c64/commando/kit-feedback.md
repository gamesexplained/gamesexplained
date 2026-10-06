# Commando — kit feedback

## Skill text that changed what I did

None.

## What was changed in the kit

`kit/c64/tools.py` and `kit/scripts/launcher.py`: propagate a child-only `LD_LIBRARY_PATH` into both `ldd` probing and VICE launch, so a locally extracted FLAC compatibility library can satisfy VICE without changing the host.

`kit/c64/test_vice_environment.py`: regression coverage for the environment propagation.

`kit/scripts/listing.py`, `kit/scripts/symbols_export.py`, `kit/scripts/ledger.py`, `kit/scripts/coverage.py`, and `kit/scripts/test_listing_undocumented.py`: count explicitly declared `coverage.extra` data as explained, including data under the I/O overlay, and keep coverage accounting consistent between exported symbols, listings, and the ledger. Added regression coverage for authored data ranges while executable bytes remain unexplained.

`kit/c64/INSTALL.md` and `site/status.json`: record the Ubuntu 26.04.1 x86_64 VICE 3.13.2 run and its emulator and footprint results.

## Candidates

The listing treated bytes declared in `coverage.extra` as unexplained, even though the game metadata explicitly named that range as data under the I/O overlay. Comparing the coverage ledger with `game.json` exposed the mismatch. The listing now counts those declarations as explained, with a regression case in `test_listing_undocumented.py`.

## Maintainer asks

None.

## What cost the most time

The largest time saver would be a documented, repeatable way for VICE's `ldd` checks and launch to use a locally extracted compatibility library on Linux hosts whose system ABI is newer.
