# Museum facts

The entry state is `work/entry.vsf`, and `work/play.vsf` shows the opening rope scene. The route uses forced success paths in the first two episodes and switches to the Jondi/Censor disk; see the game's `orientation.md`.

The play snapshot has `$01 = $35`, hardware IRQ vector `$FFFE = $0851`, and RAM IRQ vector `$0314 = $094E`. At `$0851` the program saves A, X and Y, tests the stacked status and dispatches BRK through `$0316` or IRQ through `$0314`.

An executed-address capture of the opening rope state recorded 342 instruction starts. The disassembler's wider control-flow walk and the remaining code and data need checking against it.

At `$C74C`, the game advances the rope descent and reads joystick port 2. Up decreases the descent value at `$8058` unless it is zero; down increases it while it is below 7. If both directions are pressed, up takes precedence. `$C77B` adds that value to two positions for the selected player, increases a nonzero value every fourth update unless it is 8, and sets `$805B` when the first position reaches `$B0`.

Starting from `work/play.vsf`, 30 VICE frames with down held changed `$8058` from 0 to 8 and `$FC15` from 42 to 129. In two VICE trials, repeating two frames down and five frames up 110 times moved `$FC15` from 42 to 176 and set `$805B` to 1; the player appeared on the floor. Recording that segment at the `$C74F` joystick read produced 377 inputs. The kit's C64 machine replayed them from the same snapshot and reached the same landing values; `test_rope.js` checks the recorded intermediate positions against the game's routine. This verifies the descent segment, not a route from power-on (`65-inputs`).

After the first landing and 120 neutral frames, `$C672` changed from 0 to 2 and another Ghostbuster appeared on a rope. The same 110-pair sequence brought the indexed position `$FC17` to 176 and set `$805B`; after 120 more neutral frames the museum showed characters on the floor. That state is saved as `work/floor-two.vsf`. The floor controls and the meaning of every character in the scene remain open.
