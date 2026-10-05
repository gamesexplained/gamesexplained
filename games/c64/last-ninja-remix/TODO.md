# Work toward Silver

- Finish coverage: 99.6%, 52,716 of 52,905 tracked bytes. Resolve all authored-data spans and data outside the ledger; verify state-dependent code bytes `$1F5B` and `$8A0F`.
- Resolve the hand-over comparison’s untracked ranges, the remaining `$FFA9-$FFFD` upper-memory tail. Condition/collision streams, music and object records have been accounted for. The loader return at `$10F8` is captured as `work/entry.vsf`; the earlier resident bootstrap remains a separate initialization lead.
- Trace and test scenery, sprite packing, animation, combat, object records and music in `60-verify`; expand the interactive article as each claim is verified. Sprite packing, all 18 collision outputs, the enemy-meter formula and late-animation first commands have native checks. Ordinary movement/combat/object routes, complete scene presentation and track semantics remain open.
- Six parts are named and not analysed: The Street, Sewers, Basement, Office, Mansion and Final Battle (`parts/<id>/part.json`). Each needs its route in `orientation.md`, a snapshot in play and at its hand-over, and its own symbol map.
- Tell the engine from Central Park. `parts/central-park` holds both. Find the addresses the level's load writes, make the engine a part of its own and put the level over it (`kit/skills/core/10-orient`, "A game of several parts"): the engine is then counted once, and every level lies over it.
- Obtain the maintainer check required for the unproven run model and unknown imported models.

- Resolve the 124-byte residual ledger queue plus new automatic boundaries in the `$C096` code span (189 bytes bare after that code export). Do not treat the near-complete ledger as a completed verification pass.
- The four bytes at `$CCE8` resemble an extra third component after frame 87’s declared two; their original purpose remains open.
