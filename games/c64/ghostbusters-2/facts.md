# Ghostbusters II — shared facts

The opening story and each gameplay episode have separate captured states and listings under `parts/`; the exact route and the two disk releases are in `orientation.md`.

- In the four captured states, all 4,096 bytes of RAM under `$D000–$DFFF` are identical. The airshaft transition at `$02A7` copies them back into `$1000–$1BFF` and `$0400–$07FF` before jumping to `$1000`. The ownership of that preserved code and data is open.
- All four captured states contain identical bytes at `$E464–$E5C1` and `$E000–$E0C1`. The three-voice update at `$E141–$E225` differs between them only in the immediate operands at `$E147` and `$E14A`, which its initialization and update modify. It writes all three SID voices at `$E176–$E218` and volume at `$E222`; the airshaft calls it through `$E13A`. The full extent and tune data of the shared sound code require further tracing.
- The sound initializer at `$E000` selects a seven-byte record at `$EB5C`: one accumulator increment and three little-endian pointers. With A set to 1 from the airshaft snapshot, VICE stopped at its return with `$E147 = $24` and channel pointers `$EF44`, `$EF42`, `$EF46`; the kit's 6502 simulator produced the same values. The tune or effect selected by that record is unidentified.
- The capture of a PAL airshaft frame was reconstructed with zero differing pixels by the kit's frame renderer. The page uses its trimmed visual data; `parts/airshaft/facts.md` records the capture and the interrupt chain.

The listing comments require an independent sample. The media ledger and the unclassified-memory reports are open work items.

- In the airshaft, the success path at `$0897` initializes sound selection 1; failure paths at `$08BB` and `$08CD` initialize selection 2. Their records are at `$EB63` and `$EB6A`. VICE and the kit processor agreed on channel state and all three voice frequencies for initialization and the first 30 calls to `$E13A` for each selection; `sound-vice.json` holds those observations. In the forced-success state, an execution checkpoint counted 30 calls to `$E13A` over 30 PAL frames. The page player and listing agree on every SID write for 500 updates per selection (`test_sound.js`).
