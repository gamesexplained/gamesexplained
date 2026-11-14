# Shared routines and first-load initialization

## Memory and timing

The first payload enters `$2800`. Its initialization ends at `$296B` with a jump to first-load `$64FE`. `$196A` is the hardware IRQ entry: it preserves A and the processor port, banks I/O in, and jumps through `$28/$29`. `$1975` installs the next handler body and raster line. The NMI target `$339E` is `RTI`. CPU port `$35` exposes I/O while `$34` exposes hidden RAM.

## Graphics and text

`$1000-$10FF` reverses four two-bit pixel groups. `$1100-$11FF` reverses individual bits. All 512 entries match those formulas. `$199C-$1C47` holds the shared player descriptors; `$1C48-$1CEF` contains 84 pointer words. `$2000-$27FF` is the status/title font.

The printer at `$1CF0-$1D54` maps space to glyph zero, digits to 1–10, letters to 11–36, and stored `$5B/$5C/$5D/$5E` to period/exclamation/plus/minus. Calls take a little-endian screen offset and a zero-terminated string inline after the call. The printer advances the stacked return address past that allocation.

## Retained source and runtime reuse

`$1200-$13DD` contains ASCII assembler text at hand-over, beginning `MULTISETUP LDX #$07`. It is authored data in this entry listing. Runtime persistent state and actor arrays later overwrite it. The initializer's `$2800` allocation is later used by the sprite cache and zero-page save.

## Sound

The effect allocator `$32DA` uses priorities `$331A`. The common effect player enters at `$FC2F`, ticks at `$FC32`, and stops at `$FC35`. Its eighteen sixteen-byte definitions are `$FEDA-$FFF9`. `$FE1C` uses `STA $D406,X` where the companion stores use voice-register offset Y; native instruction tracing establishes the wrong destinations for X=1 and X=2.

## Verification

The root `../../facts.md` records the independent listing sample and native checks. The shared reflection data, descriptors, effect player, and initialization are included in the page tests' composed listing memory.
