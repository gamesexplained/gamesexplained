# Opening story facts

The snapshot `work/story.vsf` shows the first story at its fire prompt. Its route from power-on is in the game's `orientation.md`.

The hardware IRQ vector in the saved RAM points to `$17D7`. That handler calls `$1916`, sets the border and background to black, configures VIC memory and display registers, increments `$0E`, and passes `$05`, `$18` and `$7A` in X, Y and A to `$1907` before jumping to `$191D`. `$1916` saves A, X and Y in `$02–$04`; `$191D` restores them and returns from the interrupt.

A captured PAL frame at the story prompt writes the hardware IRQ vector to select `$1805`, `$1858`, `$188C`, `$18B4` and `$17D7` in that order. Those writes select the next handler; their raster positions do not by themselves say where the next handler runs. The frame capture is `work/frame.json`.

`$1907` writes the next hardware IRQ vector from X and Y, writes A to the raster compare register and acknowledges the interrupt. `$188C` can select `$18B4` or `$18DC` according to `$1903`; both paths optionally call the shared sound update at `$E13A` and schedule `$17D7`. The captured frame used `$18B4`.

An executed-address capture at the fire prompt recorded 547 instruction starts. It covers the waiting state, not the complete story sequence.

The snapshot contains space-padded story text at `$C200–$C4CF`, `$C4D1–$C660` and `$C662–$C819`, each followed by a zero byte. Read as 40-byte rows, the blocks have 18, 10 and 11 rows and describe the baby carriage incident, the investigation and the roadworks respectively. The text renderer and the function of the zero bytes are open; their presence in RAM alone does not establish the reads that display them.

## Register census

The partial code map names these groups; it cannot establish that other registers are unused.

| Registers | Observed access | Evidence |
|---|---|---|
| `$D011`, `$D012`, `$D016`, `$D018`, `$D019` | Display controls, raster scheduling and interrupt acknowledgement | `$17D7`, `$1858`, `$1907` |
| `$D015`, `$D01C` | Sprite enable and multicolour settings in a conditional display path | `$183C`, `$1841` |
| `$D020–$D023` | Border and background colours | `$17DC`, `$17DF`, `$182C`, `$1831` |
| `$D400–$D414`, `$D418` | Writes to the three SID voices and volume | shared update at `$E141–$E225` |
| `$DC00`, `$DC01` | Port reads and writes | `$16F2–$1701`; purpose open |
| `$DD00` | Video bank selection | `$17E4`, `$181D`, `$1873` |

The captured opening-story picture uses multicolour bitmap mode in VIC bank 1. In that frame, `$4000–$52BF` supplies 15 rows of bitmap cells and `$6000–$6257` supplies their screen-matrix colours; colour RAM and `$D021` supply the other colours. A frame reconstructed from the capture differs from VICE in two of 104,448 pixels, at raster lines 32 and 122. The state before the story load has not been captured, so the hand-over audit remains open.
