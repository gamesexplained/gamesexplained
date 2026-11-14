# Level 5-2 — technical facts

The handover listing describes all 24064 tracked bytes, including 7761 code bytes. It uses the inherited world 5-1 terrain definitions and character set. The main load supplies music, actors, a vertical map, dedicated movement/raster code, sprite-copy sources and the final boss tables; its upper allocation supplies `$E580-$FF7F` sprite RAM.

## Map and movement mode

The active map is ten columns by 150 rows: 1500 bytes at `$9000-$95DB`. The retained count field contains 3000; the renderer uses ten stored blocks to draw each forty-character row. Thirty-eight actor cells reach thirty-seven distinct terminated streams.

Actor type three waits for a character-weapon hit and changes shape. Contact then installs dedicated player and automatic vertical-scrolling callbacks and enables the level's music flag. The player moves horizontally by two half-pixels and vertically by three pixels, with terrain checks and local protection. Scrolling advances the fine phase and copies twenty screen rows in staged callbacks before drawing a new top row from the map. It also adjusts or expires active weapon row coordinates. At map top it restores ordinary control hooks.

The initialization transforms terrain character codes $9E-$A5 according to their position within each definition. Other environment glyphs use copied bitmap sources and cyclic column shifts. Timing comments refer to callback counts and prescaler values, without inferring seconds.

## Actors and copied graphics

Type four is a walker. Type five is a projectile emitter. Type six splits moving parents into outward fragments. Type seven is a periodic side-projectile emitter and its same-type children. Type eight is a delayed diagonal hazard. Those whose type is at least five consume per-slot weapon hits and screen pointers cached by `$9A96`.

Type nine stages later sprite graphics: two discontinuous high pieces, twenty-two frames into `$FA00-$FF7F` and twelve frames into `$D000-$D2FF`. It then becomes the type-fourteen departing composite controller. Type ten performs final explosions; every active invocation requests 200 points, and each completed controller decrements the shared completion count. Zero enables the player's upward departure toward the ending transition. Types eleven through thirteen select the resident no-op; type fifteen is the final boss.

Initialization separately copies authored sprite data to RAM beneath I/O. A store watchpoint on `$D000` caught `$9B2C STA $D000,X` with CPU port $01 equal to $34. At the end of the loops, all 1024 bytes at the three destination allocations matched their source bytes exactly. This establishes copied authored graphics rather than generated frames (`work/trace_level52_initial_graphics.json`). Their authored source allocations are counted once; destination names describe their runtime use.

## Final boss

The boss uses six columns of eleven sprite bands with sixteen-bit Y coordinates. Thirty-four movement records across five parallel tables select signed-magnitude direct movement or fifty-entry cyclic X/Y curves, duration and one of two body poses. A pose change replaces sixty-six shape, bitmap-low, bitmap-high and colour entries. Additional animations replace smaller windows within those matrices.

Six pose-dependent rectangles test player contact. The character-damage scan covers up to thirteen rows and two two-cell side windows. Consumed hits reduce the initial `$0378` (888) counter only on row indices one or two and the pose-selected side. High-byte underflow starts an eighty-count flashing interval, then replaces all eleven actor slots with explosion controllers and restores the ordinary raster.

The first side window's adjacent-cell branch omits a comparison. A targeted instruction trace supplied first cell $C7 and adjacent cell $C8. After the first `CMP #$C8` left carry clear, the second `LDA` retained that carry and its `BCS` fell through, ignoring the $C8 hit. The other side explicitly compares both cells. Evidence is `work/trace_level52_missing_compare.json`; no playthrough was needed to establish the branch behavior.

A three-by-three moving terrain patch saves/restores nine background characters, moves horizontally according to pose and invokes damage within its contact rectangle. The raster reuses hardware sprites two through seven. At fine-phase collisions it banks I/O out, temporarily substitutes eighteen bitmap bytes from the following band and restores them before the next exchange.

## Music

The complete `$6C00-$794F` music payload is byte-identical to level 3-3, including two stored song headers, nineteen patterns, twenty instruments and twenty-seven arpeggio selectors. The carried driver has 816 paired instructions with no differences. The sole direct initialization call in this level selects song zero. Playback emits voices one and zero, retaining the third voice for resident effects.

## Open questions

Visible names of the movement pickup, smaller hazards and final boss components remain open. The extra sixty-four-byte environment-glyph allocation has no established separate reader. No optional playthrough or combined-mechanics replay was recorded.

The two counts at `$AB2A` are one and thirteen. The boss-position branch patches them into `$0698`, the last entry of the resident panel raster-delay table; `$0C8F` consumes that entry as a timing count.
