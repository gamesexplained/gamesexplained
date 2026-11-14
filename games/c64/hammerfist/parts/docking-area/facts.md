# Docking area: checked facts

## Entry and owned memory

This part enters through `$3200`, whose jump targets `$5F15`. `part.json` gives the payload ranges and runtime exclusions. `../../orientation.md` gives the native load route and snapshot paths. It replaces the first-load higher engine and character data while retaining the low resident routines.

## Rooms and characters

The map allocation at `$3C37` holds 10 sixty-byte backgrounds. The route table selects room numbers 0–7. The tile writer at `$B96B` expands each tile to sixteen glyphs and packed colours. Per-room character banks are exchanged through `$B6E6`; the destination starts at `$0800`. The tile-animation directory at `$5B57` holds 68 variable records; its negative final length byte marks the final valid record, rather than an extra sentinel.

## Objects and state

There are 3 eight-byte state descriptors at `$64DF`, 1 seventeen-byte platform records at `$652A`, and 80 ordinary component-shape records. Source objects occupy `$6DDD` through `$71F6` in thirty-byte records. They hold spawn/update callbacks, collision shape, reset/current position, movement limits, script/animation pointer, health, pickup type, and scheduling fields.

The component stager is `$A3DD`. Its animation updater is `$A538`; frames contain a shape word and tick delay, with the delay's high bit looping the cursor. Progress events at `$73FB` have 1 seven-byte records. The wave coordinate tables retain 25 entries.

## Graphics

The sprite directory at `$BDA7` has 279 entries. Its original unpacker is `$B52C`. Directory bit fifteen selects the reflection lookup's pixel width. It does not itself request reflection. Every bitmap and both reflection modes match the original decoder; every component/player assembly and stored actor animation is checked by `../../test_graphics.js`.

## Sound and checks

The music bytes `$EEAE-$FB9B` are identical to Complex 7. `$99E2` controls the rising/lowering object through runtime bytes `$B2EB-$B2EE`. The base map has two extra stored records after its eight route-selected rooms. The retained platform has room byte `$FF`.

The root `../../facts.md` records all native checks, the single independent comment sample, and exact page-test counts. `../../features.md` identifies the documented features that remain visually unidentified or untested as input sequences.
