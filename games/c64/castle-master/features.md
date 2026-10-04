# Castle Master — features

Sources: [game documentation](https://mocagh.org/miscgame/castlemaster-alt 3-manual.pdf) and the contributor’s annotated listing, consulted 30 September 2026. The documentation supplies the feature inventory; the imported annotations supply verification leads.

| Feature | Status | Evidence or open work |
|---|---|---|
| First-person movement and stone throwing | open | $47C5 main loop; gameplay reached live, individual action paths not replayed |
| Area and object database | confirmed | All 34 headers and 546 objects independently parsed; native area-loader calls match every header |
| 3D transforms and renderer | open | Fourteen projected vertices checked natively; complete transforms, clipping and painter output remain open |
| Script record structure and event selectors | confirmed | All 193 streams/809 tokens parse; six controlled event-selector fixtures pass |
| Ordinary object and room interactions | open | Script consumers traced; ordinary interaction routes remain to be exercised |
| Language and character selection | live | Hard-reset disk boot through to WILDERNESS |
| Disk saving and loading | live | Native device 8 SAVE/LOAD restores the entire 652-byte payload |
| Tape saving and loading | open | Tape transfer has not been exercised |
| Strength, keys and spirits | open | Initial strength 16 from $9D05; runtime keys $245A, spirits $2454, target 21 at $9D49; progression needs emulator input tests |
| Riddle panels, messages and font expansion | confirmed | Nine panels independently parsed; 61 fixed 16-byte messages; six native font expansions match |
| Run/walk/crawl and view controls | open | Raw distances 30/60/240 at $9D46-$9D48; input and signed movement routines traced, complete input replay remains open |
| Instrument decoding and music requests | confirmed | Eight instrument windows checked natively; 17 request groups run for 25 ticks each |
| Sustained music and effects | open | Exact sustained audio/waveforms and ordinary effect routes remain open |
| Information display and sound selection | open | $77FE menu and $123A/$123B sound flags traced; individual controls need ordinary input replay |
| Lightning and hazards | open | $483E scheduler and $4FA3 collision paths traced; boundary/ordinary-route tests remain open |
| Full rescue route | open | Database and scripts are preserved; no end-to-end input replay |

Imported annotations seed the listing; the checked contracts are recorded in facts.md. Scope and the disk boot are described in `orientation.md`.

Packed text and loaded HUD graphics are traced and checked independently. Six native glyph fixtures and all eight default instrument windows pass; the initialized HUD frame reconstruction matches every emulator pixel.
