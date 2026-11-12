# Ghostbusters II — shared facts

The opening story and each gameplay episode have separate captured states and listings under `parts/`; the exact route and the two disk releases are in `orientation.md`.

- In the four captured states, all 4,096 bytes of RAM under `$D000–$DFFF` are identical. The airshaft transition at `$02A7` copies them back into `$1000–$1BFF` and `$0400–$07FF` before jumping to `$1000`. The ownership of that preserved code and data is open.
- All four captured states contain identical bytes at `$E464–$E5C1`. The airshaft listing has SID register writes in the same `$E000`-area code, including stores to all three voices at `$E176–$E218` and volume at `$E222`. The extent, entry points and tune data of the shared sound code require further tracing.
- The capture of a PAL airshaft frame was reconstructed with zero differing pixels by the kit's frame renderer. The page uses its trimmed visual data; `parts/airshaft/facts.md` records the capture and the interrupt chain.

The listing comments require an independent sample. The media ledger and the unclassified-memory reports are open work items.
