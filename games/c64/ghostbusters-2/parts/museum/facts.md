# Museum facts

The entry state is `work/entry.vsf`, and `work/play.vsf` shows the opening rope scene. The route uses forced success paths in the first two episodes and switches to the Jondi/Censor disk; see the game's `orientation.md`.

The play snapshot has `$01 = $35`, hardware IRQ vector `$FFFE = $0851`, and RAM IRQ vector `$0314 = $094E`. At `$0851` the program saves A, X and Y, tests the stacked status and dispatches BRK through `$0316` or IRQ through `$0314`.

An executed-address capture of the opening rope state recorded 342 instruction starts. A controlled route to the museum floor and the remaining code and data are open; the disassembler's wider control-flow walk needs checking against both.
