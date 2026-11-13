# Level 2-1 — technical facts

Source traces use the `$551B` handover snapshot, before level initialization. The listing accounts for 29362 authored bytes after excluding the workspace cleared by initialization and generated edge-colour buffers. It contains 6737 code bytes, including the player routine reached through a patched water-entry hook.

## Layout

The nominal map is seventy by 114 blocks at `$9000-$AF2B`; the load supplies 196 sixteen-byte terrain definitions, character slots zero through $C7 and sprite slots $96 through $FD. Character slots $C8 through $FF and earlier sprite slots remain inherited. Several nominal map cells hold action pointers, boss matrices, water controls and motion curves. Their addresses and consumers are named in the listing. The actor directory reaches 105 distinct record streams, beginning at `$87C5`.

## Swimming

`$77EE` matches sampled terrain characters against water characters `$11-$14`, `$6A` and `$6B`, and switches the player hook to `$7AD6`. That routine scans eight joystick masks and patches its movement call from `$9B26/$9B2E`. The targets implement up, down, left, right and four diagonals. Vertical helpers test three adjacent characters and horizontal helpers test four stacked characters through the shared terrain-property table. With no directional match, the routine saves the checkpoint and applies an eight-step idle bob on alternate updates. Leaving the matching characters restores the saved normal player hook.

## Actors and terrain effects

Type three is a player-attached rising water effect. Type four builds six linked sprites with 64 shared health, then scatters them into six individually damageable fragments. Type five walks and jumps near the player. Type six flies and emits a projectile on a surviving character hit. Type seven builds a four-part body with forty health. Type eight selects one of three swimming animation variants and reverses motion at terrain; the third variant emits shots. Type ten is the reward platform, type eleven is the attached surface effect, type twelve controls a rising surface and type fifteen is the large enemy. Types nine, thirteen and fourteen use the resident no-op hook.

The four-part creature release path at `$7301` writes the default Y byte into X after clearing X. Both stores target `$7A,X`; no claim about a visible defect follows from this source observation. The launched reward side test similarly reads `$BC6C` without X, while its movement step reads `$BC6C,X`.

## Six-band enemy

`$7C4E` initializes health to `$0290`, or 656 damage units. Its body consists of four columns and six raster bands. A thirty-entry sequence at `$A09A` selects thirteen action-directory entries, which resolve to rising, descending, waiting and flashing routines. Character-damage sampling uses pose-selected spans across seven rows. Health transitions install component explosions and a free-moving phase. Final death restores ordinary hooks, creates eleven actor explosions and awards 10000 points.

The raster handler at `$84A6` reuses hardware sprites three through six for the body bands. `$8563` saves twelve bitmap bytes, substitutes four three-byte rows from the next band, and marks the exchange active. `$85ED` restores those bytes. The source listing describes the patched operands and the separate shape, colour and bitmap-pointer matrices.

## Instruction evidence

The private trace `work/trace_level21_dispatch.json` at the game root steps seven original CPU instructions beginning at `$7DC6`. With sequence index zero, it reads action ID zero, reads the split target bytes from `$96C4/$9704` and patches the JSR operand to `$7E1F`. This resolves the apparent invalid map values at those addresses as executable dispatch data.

## Open questions

The retained twenty-one-byte table at `$9C80` has no established direct reader or meaning. It is explicitly open, rather than assigned a terrain or enemy identity. No combined-mechanics playthrough was recorded.
