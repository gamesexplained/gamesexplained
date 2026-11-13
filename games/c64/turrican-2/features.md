# Turrican 2 — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- [Turrican II – C64-Wiki](https://www.c64-wiki.com/wiki/Turrican_II), read 13 November 2026. Documentation leads pending verification.
- [C64Games archive](https://www.c64games.de/phpseiten/spieledetail.php?filnummer=282), read 13 November 2026. The archive supplies the Triangle disk pair selected for orientation.

## Features

| Feature | Status | Where |
|---|---|---|
| Eleven levels across five worlds | live | All eleven named level files loaded; headers identify 1-1 through 5-2. |
| Three flying shoot-em-up levels | open | Identify their engine and controls. |
| Joystick port 2 | confirmed | Stopping `$DC00` read watchpoint at `$2DE0`; fire activation at `$2DBE`. |
| Scatter, laser and bounce weapons and upgrades | traced | `$3182/$3281`, `$35CD/$3623`, `$4471/$44A2`; reward handlers `$5A38-$5A78`. |
| Hidden bonus blocks and rooms | open | Bonus-block replacement/reward code traced at `$3827`; hidden-room boundaries still need mapping. |
| Hold fire for surround flash; collect range upgrades | traced | `$3931` charges to `$13`; `$3A37` updates twenty records; range reward `$5A79`. |
| Space activates limited power lines | confirmed | Seventy-one-instruction live trace at `$2F95`: ammunition three to two, active flag `$D3`. |
| Down and Space activate wheel form | traced | Player controller `$1063`, including transformation at `$119D`. |
| Fire drops bombs in wheel form | traced | `$2DBE` selects `$2E05`; bomb character `$DD` has damage 100, verified at the live damage-table read. |
| Surround flash and Space activate special weapon | traced | `$42B1` consumes availability `$0739`; player reset `$5206` restores it. |
| Control pauses | open | Find key and resume tests. |
| Energy, lives, time and score | traced | Panel routines `$4AF9-$4C45`; time digits `$080F-$0811` and reload-fifty prescaler. |
| High scores saved on disk | open | Identify reads and writes. |
| Title, intro, ending and music | open | Inventory loads and tunes. |

## Beyond the documentation

- The flash reuses eighteen projectile-damage entries and 144 bitmap
  bytes, then restores both allocations when its records end.
- Level 1-1's boss reuses three sprite columns over five raster bands.
  Its thirteen-row projectile scan damages selected rows on one side.
- The actor directory's two seventeen-entry tables overlap in one byte;
  live instruction tracing confirmed its final projectile handler.

Here, traced rows identify source paths. Their remaining live checks
are assessed in the verification step; they do not imply a playthrough.

## Open questions
