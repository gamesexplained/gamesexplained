# Super Wonder Boy in Monster Land — verified technical facts

The contributor supplied the Nostalgia disk release. Its trainer was left at `NO` for the captures. The route and snapshot names are in [orientation.md](orientation.md).

## Input and rewards

Joystick port 2 is sampled at `$3C4C`. The code retains the preceding left and right samples and uses a reversal at an entity's creation to set up the 65–69 gold reward. The arithmetic and controlled tests are in [the resident facts](parts/resident/facts.md).

The wing-boots flag and counter are also in the resident engine. The counter starts at `$FF` and is decremented only on a qualifying visit while up is pressed. The same resident facts give the conditions and the VICE tests.

## Maps and display

The renderer at `$6D41–$6D63` expands a map byte into four character codes from the tables at `$81CF`, `$82CF`, `$83CF` and `$84CF`. A character-to-colour table begins at `$7FCF`. Each captured load supplies its own tables and map. The pointer and dimensions were checked against the entry snapshot of each part; the part's `facts.md` gives the observed row count and stride.

The [Maps](levels.html) viewer draws the 31 captured maps from their tile and character data. The numbers identify forced load captures, and do not establish the order or reachability of natural gameplay. The viewer omits sprites and later runtime changes.

The visual-resource selector at $7119 builds screens from per-load pointers to compressed metatiles, colours and character shapes. Across the 31 supplied load-entry snapshots, 99 selector entries have nonzero screen and character pointers. A listing-simulator sweep grouped their reconstructed 40-by-20-character areas into 17 distinct combinations of screen, colours, used glyphs and palette. One representative of each was reproduced by a controlled VICE call. The [Graphics](graphics.html#visual-resources) viewer shows those reconstructions; `test_visual_resources.js` checks all 99 selections and the viewer data. These forced selections do not establish which ones ordinary play reaches.

The resource tables contain seven entries apiece at $7F82–$7FCE. `test_visual_tables.js` exercises all 217 load and selector combinations through $7130 with the screen-expansion callback stubbed, and checks the pointer and colour values installed by the loader. It also checks the recorded bytes in the 319 newly described tables of the later-load listings. A nonzero pointer or a forced selector alone does not establish an ordinary-play route.

The 55 captured stage-object records in loads 2–31 have initial visual selectors from 0 through 6. If a record reaches the interaction path at $47F5 with that field unchanged, those selectors map to 16 of the reconstructed screens. The post-event tally reads a separate selector at $7F81: 20 captured loads specify the shared continue-screen reconstruction, and 11 specify the skyline reconstruction. `test_visual_record_selectors.js` runs the record copy and caller with callbacks stubbed for all 55 records and checks all 31 tally selectors. These initial values do not establish that the paths are reached or that the fields remain unchanged in play.

The symbol maps describe 4,833 eight-byte glyph instances used in the 17 controlled screen reconstructions, including byte-for-byte copies in different loads. Each description identifies its first screen cell and the nonzero pixels or multicolour pixel pairs in that cell. `test_screen_glyphs.js` runs the loader for each described load and selection and checks every description against the copied bytes, cell position and decoded row geometry. The descriptions establish those captured uses; other uses and ordinary-play reachability remain open.

The type-$27 and type-$29 spawn initializers at $0952 and $096D select sprite-pointer pairs $AD/$AE and $AF/$B0 after the frame restore at $200D. In each of the 30 later-load entry and play captures, those four 63-byte masks at $EB40, $EB80, $EBC0 and $EC00 match byte for byte. The [Graphics](graphics.html#spawn-sprites) viewer draws their two layers. `test_spawn_sprites.js` checks all 120 masks, 116 new descriptions and 60 controlled selection paths. VICE reproduced both paths in loads 2, 20 and 31 with position initialization stubbed, and a 200-frame execution probe in each later load found no instruction entry in $EB40–$EC3E. The forced tests do not establish ordinary-play reachability or exclude other uses outside those probes.

The type-$28 path at $0916 sets sprite frame $B3; the frame restore and display update can select $B3/$B4 at $ECC0/$ED00. The two masks match within loads 2–5, and a different pair matches within loads 6–31; each matches its own entry and play captures. `test_spawn_type28.js` checks all 60 masks and 30 controlled selection paths. VICE reproduced the path in loads 2, 6, 20 and 31 with position initialization stubbed and display state forced; a 200-frame execution probe in each later-load capture found no instruction entry in $ECC0–$ED3E. The Graphics viewer shows both variants with forced colours. These checks do not establish ordinary-play reachability or exclude other uses.

## Entity records

Each later load supplies an entity-record pointer at `$7F4F` and an initial slot limit at `$7F51`. `$369E` copies ten bytes from a record into the resident entity arrays. A zero first byte ends the record sequence; the slot-reuse path can select records beyond the initial limit. Controlled VICE tests checked all ten copied fields for load 2's first record and load 19's twelfth record. `test_entity_records.js` checks the copies for the later loads' 179 described records against the resident instructions. A field's later use depends on the entity's handler.

## Text

The `$C800` character set contains digits at codes `$01–$0A`, upper-case letters at `$41–$5A` and lower-case letters at `$61–$7A`. The message-copy routine converts stored spaces to the blank glyph. The punctuation and message-record format are documented in [the resident facts](parts/resident/facts.md); the first load's opening messages are in [its facts](parts/stage-01/facts.md).

Each of the 30 later-load entry snapshots supplies an update target through `$7F3F/$7F40`, and every target begins inside that load’s eight-page character-copy source. The resident indirect jump at `$0450` dispatches through it. During a 200-frame forced-play probe plus monitor collection, the entry was observed in loads 2–28 and not observed in loads 29–31. The code maps record observed instruction starts within the character source. All bytes matched the load entry except two documented patched operands in load 16. The entries in loads 25–27 also cycle a six-byte horizontal-input gate when two motion-state bytes are zero; load 26 additionally tests the map column before choosing its jump. The gate’s timing and natural reachability remain open. In load 16, the two instruction starts whose operands changed are a patched jump and a patched comparison, documented in that part’s facts. `test_stage_updates.js` exercises the 27 simpler entries at 140,616 controlled input combinations and checks the three gate entries; representative branches in loads 2, 6, 12, 16 and 24 also matched VICE. These tests do not establish natural routes to their conditions.
