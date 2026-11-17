# Features

This experimental rerun starts from the contributor's TZX. No earlier game's folder, commented listing, disassembly or run report is used. Existing game folders are excluded from the working checkout. One initial search returned a summary of a modern explanatory article; it was not opened or used as evidence. Subsequent research uses the manual, original review and catalogue only.

## Sources

Read 16 November 2026:
- [Ant Attack instructions](https://worldofspectrum.net/pub/sinclair/games-info/a/AntAttack.txt), Quicksilva's control legend and setting, transcribed by World of Spectrum.
- [Ant Attack — World of Spectrum Classic](https://worldofspectrum.net/item/0000210/), credits and independent play screenshot (`reference/catalogue-play.png`). Its joystick metadata conflicts with the original review; keep that open.
- [Soft Solid 3D Ant Attack — CRASH issue 1](https://www.crashonline.org.uk/01/antattack.htm), February 1984 review.
- [Ant Attack — Wikipedia](https://en.wikipedia.org/wiki/Ant_Attack), consulted for the objective and credits before code inspection.

## Checklist

| Feature | Status | Evidence / question |
|---|---|---|
| Boy/girl selection and rescue of the other character | confirmed | Role graphic bases DC/6C and panel labels in BASIC600; B selected live. |
| Find the captive, lead them to safety, start another rescue | confirmed | 8F80 and 8EA0; forced escape and final-rescue branch exercised. |
| V moves forward, M and Symbol Shift turn | confirmed | Matching snapshot comparisons at 82C0; coordinate/facing changes recorded in facts.md. |
| C jumps; C+V climbs blocks | confirmed | C raised height zero to one in matching comparison; terrain-climb paths at 8800/88D0. |
| O or 0, P, Enter and Space choose four viewpoints | differs | 8400 and matched tests: digit 0 works; O leaves view unchanged. |
| S/D/F/G throw grenades at increasing distances | confirmed | 8D00 matched tests give fuse2/4/8/16 and ammo20→19. |
| 1 returns to city gate as a last resort | confirmed | 800C returns from the engine; BASIC70 resets the attempt while preserving run score. |
| City of blocks with scroll and occlusion | confirmed | 84A0 traced through its samplers, sort, masks and screen copy; all ten first-choice areas run with input. |
| Ants pursue and bite; jumping on ants can paralyse them | confirmed | Five records B4B0-B4F0; 8A00 pursuit, 8BD1 paralysis. Ant scheduler and all byte combinations tested. |
| Grenades stun/kill ants and can hurt humans | confirmed | 87A0 distance bands and 8D00 exact human collision; forced-state tests. Normal grenade launch tested through legal keys. |
| 20 grenades and 20 bites per human | confirmed | BASIC DATA220 initializes counters; 8F00 updates health; reset path traced. |
| Time limit, score and rescue counter | confirmed | BASIC90 scores; 8DD0 time countdown; timeout reached by setting time tozero. |
| SCAN indicates direction of the other human | confirmed | 87D0 and 8F80; exact colour cells traced. |
| Sound and music | confirmed | Title/timeout/final-event sound recorded from the emulator; embedded beeper player. |
| High scores and game-over/restart | traced | BASIC has rescued/remaining-time/total-score cards and RUN restart. A persistent named high-score table is not identified in its source. |
| Joystick support | differs | Full decoded IN census reads keyboard rows and ROM KEY-SCAN; catalogue joystick metadata conflicts with original engine. |
