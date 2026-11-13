# Level 1-2 — technical facts

These are source traces from the handover snapshot at `$551B`, before initialization. The source listing describes all 23040 bytes owned by this load; inherited block definitions, character art and earlier sprite slots belong to level 1-1.

## Map and actors

The nominal map has 100 columns and 80 rows of four-by-four-character blocks. Its 8000 bytes occupy `$9000-$AF3F`. Nine apparent invalid block numbers occur inside `$9DAC-$9DE1`: these fifty-four bytes are boss pose lookup arrays rather than terrain. Nine six-entry arrays supply shape numbers and low/high bitmap addresses for the lower three bands of each boss column. The active actor directory reaches 91 distinct terminated record streams, beginning at `$8AA7`.

Actor types 3–15 select the thirteen JMP hooks at `$8F99-$8FBF`. They implement the ground walker, rising character effects, arc bomber and drops, emerging turret, falling/transforming creature, four-part creature, bouncing spawner, reward platform, two attached splashes, exit explosions and two large enemies. Source details and state transitions are beside their entries in the listing. The ground walker's ordinary fall table has thirteen entries; its temporary flattened motion uses a separate twenty-seven-entry table.

## Terrain effects

The level callback at `$7AF0` selects water animation or collapsing strips. `$7CED` manages six strips: their counters start at sixteen and stop at twenty-one, producing five shifts. Each shift moves character rows sixteen through nineteen down one row, then blanks row sixteen. Completion also clears corresponding cells in stored map rows four and five. Widths are eight, four, four, four, four and eight characters.

## Large enemies

The overhead enemy at `$7E39` starts with 444 health. Its body uses four columns and two raster bands. Nine character spans define its damage sampling. Death awards 10000 points, creates four extra-life pickups and seven explosions, then restores normal hooks.

The seven-band enemy at `$8223` starts with 300 health at `$8A06/$8A07`. Its body uses three columns of seven bands. After emerging, two adjacent terrain cells form its character-damage weak point. Death awards 15000 points and sets the exit explosion creation counter to fifty. These counts come from the immediate stores and score requests, rather than an elapsed-time observation.

Sprite slots `$DE/$DF` contain boss control tables, not pictures. The preceding sprite `$DD` ends its visible bitmap at `$F77E`; its stride byte starts an alignment table. New bitmap slots supplied by this load are `$A6-$DD` and `$E0-$FD`.

## Live evidence

A stopping read watchpoint on `$9DD1`, starting the original pose updater at `$8512` with its phase counter selected, stopped immediately after `$8552 LDA $9DD0,Y`. The processor had Y=1 and A=$FF. Stepping the following store wrote $FF into `$F7F0`, the live bitmap-address matrix. This resolves the overlap between nominal map storage and boss pose data with an instruction-level observation. The private trace is `work/trace_boss_pose_storage.json` at the game root.

## Open questions

The transforming creature's jitter path decrements `$BC23` without indexing it. The intended per-creature lifetime and whether this produces a visible defect remain open. No defect is claimed from the source alone. No combined-mechanics playthrough was recorded.
