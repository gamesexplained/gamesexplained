# Work toward Silver

- Finish coverage: 99.6%, 52,716 of 52,905 tracked bytes. Resolve all authored-data spans and data outside the ledger; verify state-dependent code bytes `$1F5B` and `$8A0F`.
- Resolve the hand-over comparison’s untracked ranges, the remaining `$FFA9-$FFFD` upper-memory tail. Condition/collision streams, music and object records have been accounted for. The loader return at `$10F8` is captured as `work/entry.vsf`; the earlier resident bootstrap remains a separate initialization lead.
- Trace and test scenery, sprite packing, animation, combat, object records and music in `60-verify`; expand the interactive article as each claim is verified. Sprite packing, all 18 collision outputs, the enemy-meter formula and late-animation first commands have native checks. Ordinary movement/combat/object routes, complete scene presentation and track semantics remain open.
- Later loads are open: The Street, Sewers, Basement, Office, Mansion and Final Battle. This PR covers Central Park under RFC #124’s interim rule.
- Obtain the maintainer check required for the unproven run model and unknown imported models.

- Resolve the 124-byte residual ledger queue plus new automatic boundaries in the `$C096` code span (189 bytes bare after that code export). Do not treat the near-complete ledger as a completed verification pass.
- The four bytes at `$CCE8` resemble an extra third component after frame 87’s declared two; their original purpose remains open.
