# Third load: checked facts

## Entry and owned memory

This part enters through `$3200`, whose jump targets `$61B7`. `part.json` gives the payload ranges and runtime exclusions. `../../orientation.md` gives the native load route and snapshot paths. It replaces the first-load higher engine and character data while retaining the low resident routines.

## Rooms and characters

The map allocation at `$3C27` holds 8 sixty-byte backgrounds. The route table selects room numbers 0–7. The tile writer at `$BE8E` expands each tile to sixteen glyphs and packed colours. Per-room character banks are exchanged through `$BC09`; the destination starts at `$0800`. The tile-animation directory at `$5E77` holds 49 variable records; its negative final length byte marks the final valid record, rather than an extra sentinel.

## Objects and state

There are 6 eight-byte state descriptors at `$67C7`, 9 seventeen-byte platform records at `$683B`, and 62 ordinary component-shape records. Source objects occupy `$732D` through `$77BE` in thirty-byte records. They hold spawn/update callbacks, collision shape, reset/current position, movement limits, script/animation pointer, health, pickup type, and scheduling fields.

The component stager is `$A8AE`. Its animation updater is `$AA09`; frames contain a shape word and tick delay, with the delay's high bit looping the cursor. Progress events at `$7972` have 3 seven-byte records. The wave coordinate tables retain 0 entries.

## Graphics

The sprite directory at `$C2CA` has 271 entries. Its original unpacker is `$BA4F`. Directory bit fifteen selects the reflection lookup's pixel width. It does not itself request reflection. Every bitmap and both reflection modes match the original decoder; every component/player assembly and stored actor animation is checked by `../../test_graphics.js`.

## Sound and checks

The music bytes `$EEAE-$FB9B` are identical to Complex 7. The local platform setup at `$79F3` uses eight five-byte overrides; nine moving-platform records cover rooms 6 and 7. `$88A8` changes an actor phase when its local trigger condition holds. The horizontal movement entry `$AA69` takes displacement in A and derives its sign with `CMP #$80`.

The root `../../facts.md` records all native checks, the single independent comment sample, and exact page-test counts. `../../features.md` identifies the documented features that remain visually unidentified or untested as input sequences.
