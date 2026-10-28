# Target Renegade — features

## Sources

- [Target Renegade — C64-Wiki](https://www.c64-wiki.de/wiki/Target_Renegade), read 25 October 2026. Its animated reference is saved as `reference/wiki-stages.gif`. Claims about other conversions have not been imported.
- The supplied EasyFlash edition, observed in VICE v3.13.2 on 25 October 2026. The title names Commodore as pause and Space as music on/off.
- [Target Renegade manual](https://www.lemon64.com/doc/target-renegade/594) could not be read: the web reader and a direct fetch returned HTTP 403. The Spanish manual below supplies the controls as well.

- [Total compilation manual](https://spa2.speccy.org/Instructions/t/Total.pdf), Commodore section on printed pages 4–5, read 25 October 2026. It specifies joystick port 1, directional attacks, pause, scoring, and two loads: stages 1–3, then stages 4–5. These claims remain open unless tested below.

## Features

| Feature | Status | Evidence / remaining question |
|---|---|---|
| Title credits and joystick-port-1 start | live | Native title, source records and port comparison. |
| Single-player fighting and floor movement | live | Thirty-six neutral input/facing cases; all eight movement directions. |
| Two resource loads: stages 1–3 and 4–5 | traced/live | Native E/F/G load; exact directory/payload comparisons and stage captures. |
| Five stage settings and an ending | live, state-assisted | Native setup/load snapshots and reference images for stages 1–5 plus H/I ending. Fights were not completed. |
| Up+fire jump; diagonal-up jump movement | live | Jump state and Y change in both facings; a held diagonal jump moved raw X by 36 over its active sequence. |
| Down+fire duck and weapon pickup | traced/live dispatch | $A2D6 tests dropped state 3, Y/X windows and makes state 2 player-held. Neutral down-fire pose verified; the pickup window was traced. |
| Horizontal fire front attack, bat swing or back kick | traced/live dispatch | $A278 branches by facing and held-object state. Both facing-dependent unarmed entries were exercised; named bat animation remains a visual identification question. |
| Lower-diagonal special moves | traced, names open | $A1A4/$A21C select different poses and resolve held states. All four facing/direction dispatch cases were exercised; precise manual move-name mapping remains open. |
| Enemy holds while another attacks | traced | $9418/$94C7 set grab ownership and align actors; $99CF and $A1D4/$A1E0 resolve holds. Detailed live combat choreography remains open. |
| Motorbike rider can be kicked off | traced | $8E44 tests elevated-player overlap, $902B starts dismount and $8F8E transfers the rider to an ordinary enemy slot. |
| A bat can be acquired | traced, visual assignment open | Shared object state supports drop, pickup, ownership and player-held animation; exact weapon/pose identification remains open. |
| Armed enemy and reload interval | partly traced, interval open | Type-1 handler $9232, projectile creation $99DD and shared action state $0635. Exact documented reload pacing has not been verified live. |
| Dogs and Mr. Big | documented/traced, mapping open | Type-4 special-hit path and type-8 death/end path are traced. Exact visual type mapping remains an explicit question. |
| Endurance, lives, score, stage and timer panel | live/traced | HUD copy, live game view and state fixtures. Timer decrement interval is 51 normal-loop calls. |
| Supplied edition starts with five lives | differs/live | $8000, $020C and native HUD. Manual says three; Zzap!64 38 says five, as the cartridge does. Why the manual differs is open. |
| Extra life at 50,000 then 100,000 intervals | differs/traced/live | $FC00 requires strictly greater. Equal, greater and nine-life native cases agree; threshold advances by 100,000. |
| Attack scores from 200 to 2,000 in manual | partly traced, full schedule open | $A0AD stores per-type awards and $A0F9 applies pending BCD score. Documented event-by-event schedule remains open. |
| Commodore pause/resume | live | Two key presses toggled $0689 from 0 to 1 to 0. |
| Space music switch | phase-specific live | Title selection changed on release. Normal-play passes tested did not change $0200; no whole-game absence claim is made. |
| Music and effects | traced/verified | All nine cues and thirteen requests have page players and native ordered-write comparisons. |

## Open questions

The remaining open items concern exact visual move/type names, the documented reload/event-score schedule and the supplied edition's provenance. They are explicit gaps, rather than inferred absences. Listing coverage describes the scoped bytes; it does not resolve these historical or observational questions.
