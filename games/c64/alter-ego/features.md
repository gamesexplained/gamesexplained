# Alter Ego — features

Inventory: the [game's documentation](https://www.lemon64.com/doc/alter-ego-male/47), read on 30 September 2026, and the game's own menus and code. The disks are the male edition's (`orientation.md`). *Live* below means seen on the kit's C64 running the game, in the sixteen recorded sessions `port/test/lockstep.js` plays (named in brackets), with the port beside it agreeing on every call of GETIN and on memory.

| Feature | Status | Evidence or open work |
|---|---|---|
| Boot, the title and its menu: begin a new life or resume a saved one | live | `run_new_or_resume_personality_setup` (start object, `$8D5E`) [new-random, resume] |
| The player's name: letters, DEL, at most 16 characters, RETURN | live | `EditMenuTextOrSelectEntry` (`$511C`), given 16 bytes at `$82CB` (`parts/main/facts.md`) [new-random] |
| The personality questionnaire: answered by hand, left to chance, or left to chance and then gone over | live | the menu's three lines; `present_and_edit_questionnaire_page` (`$9078`) [answers, new-random, answers-edited] |
| The questionnaire's scoring into twelve traits | confirmed | `$8E29` and the two tables at `$94AE` and `$971F`, sixty native runs against an independent calculation (`parts/start/facts.md`), and the port's scoring in every session |
| Choosing the phase of life to begin in, from Infancy to Old Age | live | the phase menu, each of the seven chosen [stage2 to stage7, and Infancy in the others] |
| The life map: pictures joined by lines, the arrow moved by the cursor keys or sent by the function keys | live | `play_life_stage` (`$84DC`), `collect_scene_choice`; the keys marked with arrows read as no move [arrow-keys, bot]; the Stages tab's test draws every map as the game's code does |
| The arrow gliding to where it is sent | confirmed | `sprite0_motion_irq_hook` (`$4229`); the Graphics tab's test against the game's handler, 480 interrupts |
| Scenes: pages of text, questions answered with the arrow, the answer picking the next scene | live | `execute_scene_chunk_chain`, `interpret_interaction_descriptor` [infancy, bot, stage3 to stage7] |
| Scene text packed with a growing dictionary (LZW) | confirmed | the decoder `$A457-$AA8F` (life object) ported and run in every session; scene 26 of MAP1 decoded independently (`parts/main/facts.md`) |
| Scenes changing the traits, the years and the money | live | the scene descriptors' changes to the 64 shared words at `$7F40`; `advance_age_and_finances` (`$91CD`) [every stage session] |
| The choices beside the map: the age, the whole status, and experiences asked for | live | the eleven choice pictures; types 1 (age) and 5 (status) and the experiences (`run_stage_choice_experience`, `$8DD0`) [bot, stage sessions] |
| The status pages: traits, acquisitions, money | live | `render_complete_life_status` [bot, save] |
| A stage ending when its pictures are all played or the years pass its last age, and the next one beginning | live | `finish_life_stage` [bot, stage sessions] |
| The end of a life, and a new one begun after Old Age | live | the scene code 253 sets the stage to 7 and ends it; `finish_life_stage` (`$8CFF`) turns a stage past 7 into Infancy, the twelve traits and the name kept and the shared words 12 to 55 cleared (`parts/life/facts.md`) [old-age; the game alone in `reference/new-life-womb.png`] |
| Pages brought on behind a bar of sprites | confirmed | `animate_screen_region_transition` (`$44C5`); the Graphics tab's test against the game's routine |
| Chance in scenes | traced | `read_sid_voice3_noise` (`$4697`), the SID's third voice running noise; the kit's C64 reads the SID as 0, so the sessions hand both sides the same bytes from a seed |
| Saving a life, in one of five places on the disk, and resuming it | live | the RUN/STOP menu; the files AES0 to AES4 and AESD (`parts/main/facts.md`) [save, resume]; both disks compared file by file at the end |
| A saved life's months since its last birthday | live | a bug: `transfer_save_slot_state` (`$4E0F`) leaves out the fraction of the year at `$7FC4`, so a life saved at 0 years 3 months resumes at 0 months after a fresh start (the game alone, `reference/months-before-saving.png`, `months-after-resuming.png`) |
| Quitting from the RUN/STOP menu | live | the KERNAL's reset through `$7FC8` [save] |
| Clicks on the SID when fire chooses a menu's line or a picture on the map | traced | `play_sid_click` (`$554D`), a note gated on and at once off; the sessions compare the SID's registers |
| The female edition | open | a separate release, on disks of its own; none was examined |
