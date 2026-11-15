# Level 3-3 — technical facts

The pre-initialization handover owns 25485 tracked bytes, including 11843 code bytes. Its listing describes every tracked byte. Generated mask workspace and banks at `$E740-$FF7F` and cleared state at `$BD4D-$BD90` are excluded with their producers identified.

## Terrain and scrolling

The terrain is five rows of 600 stored block numbers at `$9000-$9BB7`, selecting 130 sixteen-character definitions after nibble exchange. The retained count field contains 4200; it is not the active rectangle's 3000-byte extent. A separate twenty-by-forty character pattern and forty-character departure row follow. Seventy-five actor cells reach sixty distinct terminated record streams at `$A13C-$A368`.

The player callback `$7B91` selects ordinary variable-speed horizontal travel or signed two-axis scene scrolling. Five timed acceleration/deceleration phases use a seventy-six-entry speed ramp. At camera coordinate `$092C` it starts the intermediate pattern, clears terrain properties one through $DF and creates a particle controller. A later countdown installs scene mode and the boss controller. Eighteen helpers provide a no-op and eight wrapped directions for each screen; the scene copies twenty-one rows, while ordinary travel copies twenty.

Two patched readers traverse a 448-byte signed speed stream, initially 112 bytes apart. They decrement and wrap before reading `$B8C3`, restarting at `$BA83`. The boss can freeze their advancement.

## Player and weapons

The ship moves horizontally by two half-pixels and vertically by three pixels. Its dedicated player callback handles entry, protection, death, respawn and exit, then removes its caller return address and enters the interrupt exit. The environment callback separately runs music.

Scatter has ten records and three upgraded allocation groups. Its restore path writes characters without restoring colour RAM. Laser has seven ordinary records; negative scene mode limits allocation to the first three. The enlarged beam uses five source templates and the generated sprite `$C700`, caches the last upgrade and records ordinary actor hit index twenty, whose damage amount is seven. The boss has a separate rectangle test. Camera compensation adds eight-bit offsets; the subsequent weapon updates handle bounds.

## Actors and boss

Type three has six variants. Subtype four increments pending diamonds on contact. A targeted instruction step at the increment of `$61`, followed by a store watchpoint in the resident consumer, confirmed the diamond counter change (`work/trace_level33_collectible.json`). Subtype five can create a fixed four-slot score display. Its controller requests 1000 points on each active invocation, including invocations whose movement branch does not run; intended bonus duration remains open. Type five creates particles using a CIA timer and indexed program bytes to mix their Y positions.

The boss centre starts with counter `$01F4` (500); each wing starts with `$01B0` (432). Destruction tests high-byte underflow. The centre gates wing damage until destroyed and requests 10000 points. Each destroyed wing requests 20000 points. Four columns of four body bands are multiplexed through hardware sprites three through six, with another sprite for the central piece. This raster changes shape pointers directly rather than exchanging bitmap rows.

The boss changes the descending actor scan's saved slot to zero. An instruction trace through `$E03F`, `$06E7` and `$0EA7` confirmed that the restored index decrements to $FF and terminates the scan, skipping remaining actors (`work/trace_level33_actor_exit.json`).

## Generated graphics

Initialization translates six selected character codes across all 130 definitions. `$A850` then rotates three sixty-four-byte source patterns and expands each into sixteen 128-byte frames at `$E780`, `$EF80` and `$F780`. The environment combines these banks into animated glyphs `$C488-$C4C7`.

A store watchpoint caught `$A893 STA ($D7),Y` writing the first generated bank. At the generator's return, 5785 of the 6144 bank bytes differed from the handover (`work/trace_level33_generated_masks.json`). Loader-carried bytes at these addresses are overwritten output, rather than authored scene pictures. The 143 bytes `$E6B1-$E73F` between the boss program and generator workspace have no established separate consumer.

## Music

The driver has two local songs, nineteen patterns, twenty instruments and twenty-seven arpeggio selectors. Its driver core is instruction-identical to the level 3-1 core, with relocated data references reviewed. The payload is shared byte-for-byte with level 5-2. Its voice loop emits voices one and zero and preserves the third for resident effects.

## Open questions

Several retained short table tails and the body bitmap-address arrays have no established separate reader. Visible identities of the flight variants remain open. No optional playthrough or combined-mechanics replay was recorded.

Stored song selector one uses the three orders at `$781E/$7822/$7826`, each looping pattern zero. The original instrument-table read and note assignment select instrument zero, leaving that selector silent. The same music payload is retained in level 5-2.
