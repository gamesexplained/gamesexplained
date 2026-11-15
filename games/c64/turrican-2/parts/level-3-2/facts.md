# Level 3-2 — technical facts

The listing uses the pre-initialization `$551B` handover image and describes all 32190 tracked bytes, including 12122 code bytes. It excludes cleared workspace, generated colours, the generated beam sprite, the scene rotation workspace and the sixteen generated scene frames, with their producers named.

## Map and camera

The header describes 125 columns and 64 rows, 8000 nominal map bytes at `$9000-$AF3F`. Its retained count field instead contains 7750; the rectangular renderer uses the header extents rather than that retained count. Data and executable helpers share the nominal map area. Outside the separately identified tables/code, all stored indices fit the 130 terrain definitions at `$B000-$B81F`. The five beam templates follow at `$B820-$B95F`; glyph/raster code occupies `$B960-$BB8B`. The actor directory reaches 44 distinct terminated streams.

A twenty-nine-entry script drives camera direction and countdown values. `$EA8C` reads two-byte records plus the following direction for transition smoothing. It invokes the shared row/column drawing hooks through dedicated edge helpers, compensates player and weapon coordinates and swaps screens at character boundaries. At segment index twenty-nine it initializes local song one, switches to scene mode and creates the fixed slot-zero boss controller.

## Player and weapons

The dedicated callback at `$E580` updates player state, then selects ordinary scripted scrolling or the boss-scene screen shift. It removes its caller return address and exits the interrupt directly. Vertical player steps are two pixels; horizontal steps are two half-pixels. Both differ from ordinary platform movement, and the vertical step differs from level 3-1.

Scatter has ten character-shot records. Its upgraded allocator searches three groups of three. Laser has nine records and can allocate three pairs of secondary split records. Their restore paths compensate the other screen for camera movement. The enlarged beam uses the generated sprite at `$C700`, one/three/five vertical segments and five source templates. It records ordinary actor damage index sixteen at `$BC10,X`. In scene mode it sets separate side/central target flags through the rectangle helpers at `$A5A9/$A626`.

## Actors and boss

Types three through six implement ten flight variants, a two-part pursuer, a splitting actor and a two-part fixed emitter. Positive actor hooks seven through thirteen select the resident no-op. Type fourteen controls an expanded transition scene; type fifteen selects the fixed slot-zero boss controller.

The boss initially has two side counters at $0128 and a central counter at $0100. Both side states must become negative before the centre accepts damage. Counter destruction is tested on high-byte underflow, rather than equality with zero. Each side destruction awards 1000 points; central destruction awards 20000. After the first central destruction, the code reloads both side counters to $0100, restores the centre to $0100, patches movement/contact parameters and enters a second stage. The final stage restores ordinary scene hooks and selects automatic player exit.

The body uses four columns of four stored bands and a separate shot column. A raster handler reuses five hardware sprites and temporarily exchanges fifteen bitmap bytes, with I/O banked out during the exchange. Side targets also manage the fifth-column shots and local explosion states.

## Generated scene frames

The auxiliary copy initially carries prior-load bytes into `$FB71-$FF7F`, because its packed file ends before the fixed-size copy ends. Those handover bytes are not the scene pictures. Initialization calls `$A720`: for each of sixteen frames it copies the original eight-glyph bitmap at `$C488` into `$A6A3`, rotates it by a selected count and writes a sixty-four-byte frame to `$FB71-$FF70`. The environment later selects one of these generated frames and copies it into the character set. The fifteen trailing bytes after $FF70 have no established direct consumer.

A store watchpoint on `$FB71` stopped after `$A76B STA ($D5),Y`. Continuing to the generator's return changed 1002 of the 1024 handover bytes. An instruction step at the scene reader then read the generated frame. Evidence is `work/trace_level32_generated_frames.json` at the game root. The earlier loader-copy trace explains the handover contents, not the later display contents.

A separate stopping store watchpoint on `$A4B5` caught `$896B` resetting the first side counter's low byte from $28 to zero while its high byte remained one. Evidence is `work/trace_level32_boss_stage.json`.

## Music

The instruction-identical driver core is carried from level 3-1 with relocated data references reviewed. This load has two song headers, twenty instruments, twenty-five pattern pointers and twenty-seven nonzero arpeggio selectors. The initialization and boss-mode transition select local songs zero and one respectively. Its voice loop emits voices one and zero, preserving the third for resident effects.

## Open questions

Sixty-six retained bytes after the active camera-route window and forty bytes after the consumed speed sequence have no established separate consumer. The visible identities of several flight variants remain open. No optional playthrough or combined-mechanics replay was recorded.
