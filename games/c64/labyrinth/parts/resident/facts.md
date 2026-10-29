# The resident engine: verified facts

The engine is the code and data that stay in memory while the text adventure and each scene load over the rest. It is a part of its own so that its bytes are counted once.

## What it owns

- `$0000-$05FF`: the processor's work area and the game's saved state (names, map changes, inventory, clock). The ledger leaves these out as runtime state.
- `$0800-$78FF`: the engine's code and tables.
- `$D000-$DFFF`: the text font, the dictionary, the keyboard translation tables, the note-frequency table and one window routine, in RAM beneath the I/O area.

Every load lies over this part (`over`) and owns `$0600-$07FF` (its map header), `$7900-$CFFF` and `$E000-$FFFF`.

## How this was checked

On 22 October 2026 the two supplied disk images were played again in VICE 3.13.2 and 22 states were saved, one for each load: the opening, the entrance gate, the first corridor and the Brick Hallway (reached by ordinary play), and scenes 4 to 26 (each a load requested by setting the pending-scene byte `$0530` from the corridor, so the game's own loader ran; scenes 4 to 7 came from side one and scenes 8 to 26 from side two). Their memory was compared byte for byte.

| Range | Bytes the same in all 22 | Of |
|---|---:|---:|
| `$0800-$78FF` | 28,632 | 28,928 |
| `$D000-$DFFF` | 4,096 | 4,096 |
| `$0000-$05FF` | 1,077 | 1,536 |

Above `$7900`, outside `$D000-$DFFF`, no stretch of 64 bytes or more that holds authored data is the same in all 22 states; the only run that agrees is the interrupt vectors and blank sprites at `$FF00-$FFFF`, which the engine regenerates.

The 296 engine bytes that differ are variables and self-written operands, for example the sound sequencer's positions around `$1B9A-$1BA8` and the operands at `$0AE6`, `$0D3B`, `$1A41` and `$1AD6`. The listing holds the opening's values for them.

## Not yet checked

Each load was compared once, in the state the loader left it after the scene's first frames. A load that writes into the engine's range later in play would not show here.

The labels and comments the scenes gave the engine before the split are in `merge-notes.md`.
