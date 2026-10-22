# Resident engine: what the scenes called it

When the engine became a part of its own, each address kept the opening's label and comment. The scenes had described the same code in their own words, and their wording is kept here for the next pass over `symbols.json`.

## Labels the scenes gave the same address

| Address | Resident label | Scene | Scene's label |
|---|---|---|---|
| `$0818` | `brick_query_cell_api` | scene-06 | `stone_cell_query_api` |
| `$081B` | `brick_mutate_cell_api` | scene-06 | `stone_cell_mutation_api` |
| `$0998` | `classify_player_map_cell` | scene-03 | `brick_query_player_cell` |
| `$0998` | `classify_player_map_cell` | scene-06 | `stone_query_current_cell` |
| `$09A5` | `replace_map_cell_and_mirror_pair` | scene-03 | `brick_mutate_and_request_redraw` |
| `$09A5` | `replace_map_cell_and_mirror_pair` | scene-06 | `stone_mutation_call_prefix` |
| `$09D0` | `brick_request_zero_after_mutation` | scene-06 | `stone_request_refresh` |
| `$09D6` | `request_scene_with_entry` | scene-06 | `stone_after_refresh_unanalysed` |
| `$09DD` | `print_indented_text_five` | scene-03 | `brick_send_door_response` |
| `$0A61` | `wait_seconds_from_y` | scene-01 | `gate_wait_sixty_tick_intervals` |
| `$0A6D` | `wait_irq_downcounter` | scene-01 | `gate_wait_one_irq_downcounter` |
| `$0AA8` | `read_inventory_count` | scene-05 | `wall_read_inventory_slot` |
| `$0AAC` | `install_scene_command_availability` | scene-05 | `wall_after_inventory_reader_unanalysed` |
| `$0C61` | `apply_one_hour_sleep_penalty` | scene-05 | `wall_one_hour_penalty` |
| `$0C71` | `read_rule_book_time_penalty` | scene-05 | `wall_after_hour_penalty_unanalysed` |
| `$0D49` | `str_headered_0D49` | scene-03 | `brick_no_door_message` |
| `$19AE` | `sample_joystick_port1` | scene-01 | `gate_sample_joystick_port_one` |
| `$3420` | `resident_state_3420` | scene-06 | `stone_ladder_state` |
| `$3772` | `handle_player_depth_boundary` | scene-02 | `corridor_at_depth_limit` |
| `$37B4` | `check_grid_motion_and_triggers` | scene-06 | `stone_after_ladder_alignment` |
| `$3DF1` | `advance_player_offset_sequence` | scene-06 | `stone_ladder_animation` |
| `$3E69` | `advance_object_component_phase` | scene-06 | `stone_after_ladder_animation` |
| `$4115` | `request_scene_from_horizontal_exit` | scene-02 | `corridor_request_exit` |
| `$4115` | `request_scene_from_horizontal_exit` | scene-03 | `brick_choose_exit_request` |
| `$4115` | `request_scene_from_horizontal_exit` | scene-06 | `stone_generic_exit` |
| `$4163` | `request_saved_return_scene` | scene-06 | `stone_other_mode_exit` |
| `$4170` | `resident_field_4170` | scene-02 | `corridor_exit_index_workspace` |
| `$4170` | `resident_field_4170` | scene-03 | `brick_selected_exit_region` |
| `$4171` | `classify_player_block_and_limits` | scene-01 | `gate_classify_player_column` |
| `$4171` | `classify_player_block_and_limits` | scene-02 | `corridor_classify_player_column` |
| `$4171` | `classify_player_block_and_limits` | scene-03 | `brick_classify_player` |
| `$4171` | `classify_player_block_and_limits` | scene-06 | `stone_classify_current_column` |
| `$4173` | `select_ground_response` | scene-01 | `gate_classify_column_and_depth_limit` |
| `$4173` | `select_ground_response` | scene-02 | `corridor_classify_world_position` |
| `$41F0` | `block_type_depth_limits` | scene-01 | `gate_depth_limit_by_type` |
| `$41F0` | `block_type_depth_limits` | scene-02 | `corridor_depth_limits` |
| `$41F0` | `block_type_depth_limits` | scene-03 | `brick_depth_bounds` |
| `$41F0` | `block_type_depth_limits` | scene-06 | `stone_classifier_auxiliary_tables` |
| `$4200` | `block_type_depth_flags` | scene-01 | `gate_auxiliary_limit_by_type` |
| `$4200` | `block_type_depth_flags` | scene-02 | `corridor_depth_boundary_flags` |
| `$4200` | `block_type_depth_flags` | scene-03 | `brick_boundary_flags` |
| `$4210` | `advance_random_seed` | scene-02 | `corridor_next_random` |
| `$4210` | `advance_random_seed` | scene-06 | `stone_after_auxiliary_tables_unanalysed` |
| `$543A` | `place_loaded_scene_objects` | scene-02 | `corridor_place_loaded_objects` |
| `$543A` | `place_loaded_scene_objects` | scene-03 | `brick_place_scene_entries` |
| `$543A` | `place_loaded_scene_objects` | scene-06 | `stone_place_entry_prefix` |
| `$54CC` | `place_object_at_graph_node` | scene-06 | `stone_after_entry_placement` |
| `$58C8` | `record_map_cell_change` | scene-03 | `brick_store_map_mutation` |
| `$58C8` | `record_map_cell_change` | scene-06 | `stone_mutate_cell_prefix` |
| `$58DE` | `remember_scene_map_mutation` | scene-06 | `stone_mutation_records_unanalysed` |
| `$5928` | `resident_field_5928` | scene-03 | `brick_mutation_workspace` |
| `$59AF` | `service_scene_request_and_costumes` | scene-01 | `gate_consume_deferred_scene_request` |
| `$59AF` | `service_scene_request_and_costumes` | scene-04 | `guard_scene_request_service` |
| `$730A` | `str_headered_730A` | scene-05 | `wall_one_hour_event` |
| `$7320` | `str_headered_7320` | scene-05 | `wall_after_one_hour_event_unanalysed` |

## Scene comments that differ from the resident's

- `$0818` (scene-06, line): JMP$0998 returns the classified world-column cell, low-nibble map value in A and classified type in X. The OPEN DOOR path uses this with negative$0343 in the checked scene6 arrival and approach.
- `$081B` (scene-06, line): JMP$09A5 applies a replacement cell and schedules a refresh. The checked OPEN DOOR passes A7,Y2 and changes$0602 from1 to7. Record updates and scene alias handling run in the resident body; persistence across loads is not established here.
- `$0998` (scene-03, line): Call classifier $4171, load its column $AF into Y, read $0600,Y and mask to its low nibble in A; return translated type $B0 in X. This query contains no approach-depth threshold.
- `$0998` (scene-06, line): Call$4171 with its Y0 entry, then return column$AF in Y, low nibble of$0600,Y in A and classified type$B0 in X. The classifier's nonnegative mode branches remain outside the door example.
- `$09A5` (scene-03, line): Call $58C8. For current scene3, skip the scene-eleven/twenty-three special cases and enter $09D0, requesting zero through $0530. This is consumed as the resident redraw/reload path; live OPEN DOOR retained current scene3 and its player position while updating the door picture. Other scenes' special cases remain outside this check.
- `$09A5` (scene-06, line): Call resident mutation$58C8 using A as replacement and Y as column. The following wrapper has other-scene alias branches; the checked current scene6 eventually requests refresh0 at$09D0.
- `$09D0` (scene-06, line): Store0 at pending request$0530 and return. The checked scene6 mutation wrapper reaches this after changing the map; the visible door then redraws within scene6.
- `$09DD` (scene-03, line): Set response mode5, then $09DF stores Y/X as the low/high pointer at $10/$11 and tail-calls message queue $674C. The failed door prerequisite enters here with pointer $0D49.
- `$0A61` (scene-01, line): For each Y count, load A sixty, store/reset IRQ downcounter $030E and call $0A6D until it becomes zero. Decrement Y and repeat until zero. The gate uses Y four, giving four sixty-tick waits. This annotation does not equate an interval to a wall-clock second.
- `$0A6D` (scene-01, line): Store A in $030E and busy-wait until the IRQ-maintained downcounter becomes zero, then return. The counted wrapper supplies sixty each time.
- `$0AA8` (scene-05, line): Return $6729,Y in A. The manicure's Y21 selects $673E; negative means absent and nonnegative passes that command's sign test. This reader itself does not change the item count.
- `$0C61` (scene-05, line): Load event request57 ($39), call $0928, then decrement remaining hours at $0376. After the event returns, a nonnegative result preserves $0580; a negative result stores0 there. The arithmetic is modulo256, with the signed branch tested over every input byte. $0375 minutes is untouched by this bounded helper. Live eighth command:12 hours51 minutes becomes11 hours51 minutes at the decrement; the shears unit remains0.
- `$0D49` (scene-03, line): Headered message whose original-parser expansion is There's no door here. The failed $09E9 prerequisite uses this message. It includes a dictionary reference for door.
- `$19AE` (scene-01, line): Set CIA1 port A direction/output to $FF and port B direction to zero, read $DC01, invert it and retain the low five bits in $030C. OR the sample into accumulated input $194E. C64 port-one bits are up/down/left/right/fire, with the hardware active low; $030C is active high. This is the sample consumed by $1993.
- `$3420` (scene-06, line): Negative is inactive at3C83. The type4 alignment gate stores0; player animation3DF1 advances it, finishing withFF before exit4115.
- `$3772` (scene-02, line): When $0385 is negative, consult $B3: negative blocks the exit call and nonnegative calls $4115. When $0385 is nonnegative, world X at least 80 bypasses that flag check. The captured ordinary approach uses $0385=$FF. Continuation at $378F handles standing/wall behavior; type-specific effects following $3796 are only partly traced.
- `$3DF1` (scene-06, line): Checked player path Y0 increments state3420. New state1 initializes pose5 and clears drawing offsets. Other states add6 modulo256 to drawing vertical0218; a result at least128 resets offsets/state, sets depth12 and calls4115. Negative room mode eases low worldX toward column center; AE becomes1. This is per routine call, not a measured frame rate.
- `$4115` (scene-02, line): In negative $0343 map mode, choose the first $074E threshold at least as large as column $AF, scanning indices zero through fourteen and falling back to fifteen. Read its selector at $076E: zero selects bank zero; one/two use $0500/$0501; at least three calls PRNG $4210. Mask the result with $60, OR the threshold index, then read entry at $078E and scene at $077E into $0532/$0530. The first corridor's reachable opening columns use selectors three and scene three in every bank. Nonnegative mode instead copies fixed $0345/$0346. This dispatcher selects a target; it does not load it or prove a wall opening is reachable.
- `$4115` (scene-03, line): Negative $0343 mode scans inclusive column thresholds at $074E through indices0..14, falling back to15. Selector $076E chooses zero, state $0500, state $0501, or PRNG for values at least3. Mask with $60 to form a four-bank offset, combine the region index and write entry from $078E to $0532 and scene request from $077E to $0530. At opened column36, region11/selector1 uses $0500; all banks request0, with entry12 in banks0/1 and44 in banks2/3. Request0 with current scene3 is repositioning in that room, confirmed live to entry12.
- `$4115` (scene-06, line): Negative room mode selects first boundary074E at least current columnAF, or slot15. Selector076E chooses stored0500/0501 or random bank bits60, then writes entry and scene request. Live column2 uses slot1 and stored0501 to request0/30. Nonnegative mode4163 is outside this annotation.
- `$4170` (scene-02, line): Temporary index selected by $4115; runtime value rather than a route-table entry.
- `$4170` (scene-03, line): Mutable region index cached by $4115 while choosing a banked route.
- `$4171` (scene-01, line): Set Y zero and enter $4173. In the negative $0343 map mode, use the player world X pair $0538/$053C to choose a map cell. The gate approach test exercises this entry against all 256 low-coordinate values.
- `$4171` (scene-02, line): Set Y zero and enter $4173. The natural corridor has $0343=$FF and $5E=$3F, so the resulting column repeats every 4096 world-coordinate units.
- `$4171` (scene-03, line): Set Y zero and enter $4173. In the captured negative $0343 mode, derive column (world X shifted right six) masked by $5E, retain the map cell at $B7, translate its low nibble through $073E into $B0 and obtain the depth bound/flag. Other map modes remain partial.
- `$4171` (scene-06, line): Entry sets Y0. For negative$0343, shift the actor's16-bit X at$0538/$053C left twice and use its resulting high byte AND$5E as column$AF. Read map$0600,column into$B7; translate its low nibble through$073E into type$B0. A negative type uses lookup index0; otherwise that type indexes$41F0/$4200, returned in$B2/$B3. Nonnegative mode jumps to$41A7 and is not described here. Live positions480 and147 classify columns7/type0 and2/type2.
- `$4173` (scene-01, line): For negative $0343, shift world X left twice and mask its resulting high byte with $5E to select column $AF. Read $0600,X into $B7, translate its low nibble through $073E to type $B0, and use nonnegative type or fallback zero to load depth bound $B2 and auxiliary byte $B3 from $41F0/$4200. Other modes call room hooks and use $0344; those branches are outside the gate approach example.
- `$4173` (scene-02, line): In negative $0343 mode, shift the X-coordinate pair at $0538,Y/$053C,Y left twice and mask its high byte with $5E into $AF. Read map cell $0600,X, retain it at $B7, translate its low nibble through $073E into $B0, and use type zero for a negative translated type when selecting depth limit $B2 from $41F0 and auxiliary bound flag $B3 from $4200. Other modes use scene callbacks and update $341A; the page covers the captured negative map mode.
- `$41F0` (scene-01, line): Sixteen maximum-depth values used by the shared classifier. Type zero has bound $18 (24); type fourteen has bound $FF (255). At the closed gate, ordinary cells have low nibble one, mapped to type zero; column one has low nibble three, mapped to type fourteen.
- `$41F0` (scene-02, line): Sixteen depth bounds indexed by the translated map type, with negative types falling back to entry zero. In the captured corridor, ordinary wall cells resolve to bound 24 and opening type ten resolves to bound 32.
- `$41F0` (scene-03, line): Sixteen bounds indexed by classified type, with negative types using zero. Captured ordinary wall type zero and closed-door type two have limit24; open-door type three has limit40.
- `$41F0` (scene-06, line): Two16-byte tables read by$4171 after classifying a cell, at$41F0 and$4200. Negative types use index0. OPEN DOOR uses the returned cell/type/column rather than assigning these lookup bytes an elapsed-time meaning.
- `$4200` (scene-01, line): Sixteen auxiliary signed bytes paired with $41F0 for the shared movement code. Type zero has $FF and type fourteen has zero in this image. A depth bound alone does not describe all movement and exit logic.
- `$4200` (scene-02, line): Sixteen auxiliary bytes selected alongside $41F0. The captured corridor's ordinary wall type zero is $FF and opening type ten is zero. At $3772, when $0385 is negative, a negative flag blocks the exit call and a nonnegative flag permits it.
- `$4200` (scene-03, line): Sixteen flags paired with $41F0. Captured type zero/two have negative flags, while open-door type three has zero, allowing the captured negative-$0385 depth-bound path to request an exit. Complete traversal through the opened door remains unverified.
- `$4210` (scene-02, line): Update the 16-bit seed at $0502/$0503 to (37*seed+17) modulo 65536 and return its high byte in A. Exit selector values at least three use returned bits five/six to choose one of four route banks. Other callers can advance this shared sequence, so a player route alone does not fix the variant.
- `$543A` (scene-02, line): For slots two down to zero, skip entry $FF at $5080,X. With nonnegative mode $26, split the entry into coordinate high/low by two LSR/ROR pairs, giving world X = 64*entry+32; set depth six for player slot zero and 24 for other slots. Clear fractional/depth-high fields, set origin/projected coordinates and active flags, then clear entry request $0532. Negative-mode grid/graph placement branches are retained here but not covered by the corridor widget. A natural scene-three load reached this routine with entries [35,255,26] and mode zero, then placed the player at X 2272/depth six. Bytes $543A-$54CB match between the corridor image and natural Brick Hallway image.
- `$543A` (scene-03, line): For slots2..0, skip $FF entries at $5080. In nonnegative mode, compute X=64*entry+32 and depth6 for player slot0 or24 for other slots; initialize origins, fractional fields and active flags. Clear request entry $0532 after all slots. Negative-mode branches remain outside the corridor widget. Live door traversal selected entry12 and placed the player at X800/depth6.
- `$543A` (scene-06, line): Iterate slots2 to0, skipping FF entries. With nonnegative26, set worldX=64*entry+32 and depth6 for player slot0, depth24 for companions; continue at5496. Negative-mode branch546A is outside this explanation. Bytes543A-54CB match the checked corridor image.
- `$58C8` (scene-03, line): Mask A to low nibble, cache value/column at $5928/$5929 and write $0600,Y. Scenes below2 or equal4 return. Otherwise search 84 entries at $0400 for matching scene and column $0455; update value $04AA on a match. If none matches, use a zero scene slot, or repeatedly sample PRNG bits below84 until finding a record from another scene; store current scene, column and replacement value. This describes the mutation record write, not a full save/load proof.
- `$58C8` (scene-06, line): Mask replacement A with15, cache it at$5928 and column Y at$5929, then write$0600,Y. Current scenes below2 or equal4 branch to the earlier return at$58C7; other scenes continue into the record-update code at$58DE, outside this prefix annotation. The checked scene6 call changes cell2 from1 to7 and continues through that original record path.
- `$5928` (scene-03, line): Two mutable bytes: replacement map nibble and column cached by $58C8 for the scene/column/value record update.
- `$59AF` (scene-01, line): If $02C3 is nonnegative and $0530 remains negative, copy the deferred byte into $0530. For a nonzero scene with unspecified $0532=$FF, supply entry one. Clear $02C3 to $FF. When $0530 is nonnegative, call $60E6 and loader $5098. A stopping live store watch observed the corridor-two request at the store ending $59BC.
- `$59AF` (scene-04, line): Resident scene-request prefix, retained byte-for-byte from the opening snapshot across $59AF-$59DB. Read queued cell request $02C3. A negative byte skips conversion. For a nonnegative queued byte, if pending scene $0530 is negative, copy the queued byte there; a copied nonzero scene with entry $0532=$FF receives default entry1. Clear any consumed nonnegative queued request to $FF, including one displaced by an existing pending request. Then $59D1 tests the pending request. Live controlled phase4 guard departures have queued5/pendingFF/entryFF before this service and reach loader $5098 with pending5/entry1/queuedFF. This bounds the request hand-off, not the full loader or destination mechanics.
- `$730A` (scene-05, line): Headered event record selected by positive request57 through the split resident pointers at $6C3A/$6C77. Header09/02/FF/FF precedes ASCII text One hour later... and terminating zero. The live eighth manicure displays this completed event panel.
