# Fourth load: checked facts

## Entry and owned memory

This part enters through `$3200`, whose jump targets `$6671`. `part.json` gives the payload ranges and runtime exclusions. `../../orientation.md` gives the native load route and snapshot paths. It replaces the first-load higher engine and character data while retaining the low resident routines.

## Rooms and characters

The map allocation at `$3B2F` holds 8 sixty-byte backgrounds. The route table selects room numbers 0–7. The tile writer at `$C1E5` expands each tile to sixteen glyphs and packed colours. Per-room character banks are exchanged through `$BF60`; the destination starts at `$0810`. The tile-animation directory at `$6367` holds 65 variable records; its negative final length byte marks the final valid record, rather than an extra sentinel.

## Objects and state

There are 8 eight-byte state descriptors at `$6C75`, 1 seventeen-byte platform records at `$6CB5`, and 50 ordinary component-shape records. Source objects occupy `$77BD` through `$7B5E` in thirty-byte records. They hold spawn/update callbacks, collision shape, reset/current position, movement limits, script/animation pointer, health, pickup type, and scheduling fields.

The component stager is `$AC57`. Its animation updater is `$ADB2`; frames contain a shape word and tick delay, with the delay's high bit looping the cursor. Progress events at `$7D8F` have 8 seven-byte records. The wave coordinate tables retain 45 entries.

## Graphics

The sprite directory at `$C621` has 259 entries. Its original unpacker is `$BDA6`. Directory bit fifteen selects the reflection lookup's pixel width. It does not itself request reflection. Every bitmap and both reflection modes match the original decoder; every component/player assembly and stored actor animation is checked by `../../test_graphics.js`.

## Sound and checks

The relocated music player `$F16A-$FB92` has two selections. Room 7 recharging at `$9162` caps energy at 224 and switches bodies; ordinary rooms explode and empty the body on overflow. `$7D3F` handles final progress prerequisites and the `$13DD` freeze flag. `$A0DD` runs the final animation countdown before accepting fire.

The root `../../facts.md` records all native checks, the single independent comment sample, and exact page-test counts. `../../features.md` identifies the documented features that remain visually unidentified or untested as input sequences.
