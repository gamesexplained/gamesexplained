# What the port found wrong in the listing

Porting a routine means reading every instruction of it; each comment the port showed wrong is
corrected in the part's `symbols.json` and listed here (kit/skills/core/70-minisite/play.md, "What
the port finds in the listing").

| Part | Address | Was | Is |
|---|---|---|---|
| engine | $186F read_block | the block number's low byte in A | in X: the routine's first instruction is TXA (read_text_block's s_9CCE leaves it in X) |
| engine | $9977 arccos_rad | the label and its comment on $9977 | $9977 is the operand of the SBC at $9976; the arccosine in radians starts at $997B (JSR arccos_units, JMP units_to_radians) |
| engine | $1239 frame_update | "skipped when $A2C5 is negative with two ships already present"; "the clock line ($923E with $044B)" | a merchant type (faction 1, the X pick_ship returns) is skipped one time in two; $923E keeps the player's orientation square; the drop loop tests $0403 with Y, not the slot |
| engine | $13D4 key_jettison | the message at $CFCE | $CECF: X is the low byte |
| engine | $1D82 key_next_target | "slot 20's type" among the targets | slots 1-5 are ships, 6-19 bases (flag bit 0) or type $14 |
| engine | $1DDF target_status | said once ($0833) | a friend greets once; a hostile ship, or one with the player as its target, speaks once and then one time in four |
| engine | $20EC fire_beam | a miss is drawn for the player; a computer ship hits any ship slot | only a player with no target draws a miss; only the player's beam hits a ship it was not aimed at (a type that does damage, $0433 not 0) |
| engine | $2189 trace_beam | the direction at $0896 | the direction at ($74), scaled into $0896 |
| engine | $2279 draw_beam | $901D for the player's shot in another view | $901D when a computer ship's beam hits the player; the player's shot in another view is a triangle |
| engine | $23BA project_point | the point ($58) relative to ($5A) | the point at ($74), seen from the camera at ($58) with the orientation at ($5A) |
| engine | $2419 joystick_flight | the speed held at -$45 | -$46 |
| engine | $375F ai_tactic | one in ten changes from cruise or pursue to the type's tactic | cruise and pursue always take the type's tactic; one in ten of any other changes |
| engine | $37E7 ai_closing_speed | the tactic's speed far, $4B close | $4B far, the tactic's speed close |
| engine | $392A key_surrender | "every ship leaves" | that ship and the computer ships' missiles leave; print_wrapped is called again with what clear_tac leaves |
| engine | $3A2D merchant_surrender | "its escorts" leave | every computer ship's missile |
| engine | $3BA1 ask_agree | the list at $3BD3 | the pointers at $3BCF |
| engine | $3CDC random_rates, $3D61 random_rate | -31 to 32 | -32 to 32 |
| engine | $A0C1 print_char | the font address $F200 + 8 * A (also at $A130) | $F200 + 8 * (A AND $7F): the first ASL drops bit 7 |
| engine | $9E90 saved_cursors | the saved columns and rows from $9E90 | $9E90 is save_cursor's RTS; the columns start at $9E91 |
| engine | $3129 attack_lamp | lit for a ship whose type's $0AEF is zero | lit for one whose $0AEF is not zero: a missile, or a ship that is no threat |
| engine | $3240 draw_armour_bar | the hit points halved, plus one | a quarter of them (bits 2-8), plus one |
| engine | $329C draw_weapon | "-]", a reversed mark for a damaged launcher, "*" in place of "]" | " -"; $5D or $2A are the colours of the cells under the first character; the launcher's damage never shows (the test reads print_char's A) |
| engine | $33EA tac_target_of | the name of the target's own target | the target's own label (renamed tac_label) |
| engine | $33F8 tac_range | the distance plus 2 in its high byte, divided | the distance as a log plus 2: four times the distance |
| engine | $354C tac_draw_model | the slot's orientation at $044B | the camera is the player's orientation turned to the slot; the slot's own orientation takes the camera into its frame |
| engine | $2543 navigation | clears the view; counts the ship slots whose ship has no target | it never clears the view; it counts the ships in slots 1-5 whose target is the player (slot 0), and greys HELM by the count |
| engine | $2619 nav_scan | until a key ends it | until Return, Space or fire ends it |
| engine | $264D move_cursor | by X across and Y down | by X across and Y up: the chart's rows count from the bottom |
| engine | $2787 nav_chart | Return or Escape leaves; $072C is $FF while the chart is open | Return, Space or fire leaves; $072C is $FF only until the cursor first moves |
| engine | $2880 plot_course | each step one sector across and one down | one sector along each axis that still differs, diagonally until one coordinate matches |
| engine | $290F helm_step_time | the view cleared; a key ends the trip | the message line (window 1) cleared; fire or a waiting key stops it, and $AB counts on each hour |
| engine | $2728 nav_helm | stops on a key, or fire after an encounter | stops on fire or a key during the step or its encounter |
| engine | $15A0 enter_sector | "clearing $0445,y" for a ship of the encounter's type; up to three map entries of type below $64 | $0445 set to 0 makes the player that ship's target; entry 0 (the ship) and types with bit 7 set are skipped; the encounter's own types go in at $CA-$CC, and $0832-$0834 are cleared too |
| flight | $E900 init_game | asks for side 2; both redraw ($A14C) | sets the disk prompt to DATA, which shows only if a load fails; $A14C turns on text into both bitmaps; the projection is worked out first ($66CA) |
| flight | $E972 game_over | asks for side 1 | sets the disk prompt to BOOT, shown only if a load fails |
