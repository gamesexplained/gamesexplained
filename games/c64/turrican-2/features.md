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
| Three flying shoot-em-up levels | traced | Levels 3-1/3-2/3-3 replace the player, scrolling, weapon, and actor hooks. Controller entries are $FB80, $E580, and $A369; all three source maps are drawn. |
| Joystick port 2 | confirmed | Stopping `$DC00` read watchpoint at `$2DE0`; fire activation at `$2DBE`. |
| Scatter, laser and bounce weapons and upgrades | traced | `$3182/$3281`, `$35CD/$3623`, `$4471/$44A2`; reward handlers `$5A38-$5A78`. |
| Hidden bonus blocks and rooms | open | Shared bonus-block replacement/reward code is traced at `$3827`, and all eleven maps are decoded. Which map regions players call hidden rooms remains unclassified; no extra playthrough was used to assign those names. |
| Hold fire for surround flash; collect range upgrades | traced | `$3931` charges to `$13`; `$3A37` updates twenty records; range reward `$5A79`. |
| Space activates limited power lines | confirmed | Seventy-one-instruction live trace at `$2F95`: ammunition three to two, active flag `$D3`. |
| Down and Space activate wheel form | traced | Player controller `$1063`, including transformation at `$119D`. |
| Fire drops bombs in wheel form | traced | `$2DBE` selects `$2E05`; bomb character `$DD` has damage 100, verified at the live damage-table read. |
| Surround flash and Space activate special weapon | traced | `$42B1` consumes availability `$0739`; player reset `$5206` restores it. |
| Control pauses | traced | Resident $0BAC reads keyboard-input bit two, sets $0265, advances effects while paused, and clears the flag on joystick fire. Direct matrix-input exercise of Control remains open. |
| Energy, lives, time and score | traced | Panel routines `$4AF9-$4C45`; time digits `$080F-$0811` and reload-fifty prescaler. |
| High scores saved on disk | confirmed | Title $900C/$9013 writes one raw block at track 18/sector 18 from $67FF; intro source $90A2/$90A9 reads it. Disk bytes match the loaded ten-record table. |
| Title, intro, ending and music | confirmed | Independent intro, title and ending listings; sixteen story pictures; seventeen music selectors (nine populated, eight silent), with all music/effect players checked against original calls and rendered through the SID model. |

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

The external world-one reference image is saved as `reference/wiki-world1.gif` from C64-Wiki and shown beside the decoded maps. The title, intro, and ending alphabets were rendered and their encoded readers traced. Creature names that cannot be settled from the code are kept as actor types and sprite pieces rather than guessed.
