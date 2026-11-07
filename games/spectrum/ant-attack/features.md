# Ant Attack — features

Sources read 6 November 2026, with online research authorized:

- [Original instructions](https://worldofspectrum.net/pub/sinclair/games-info/a/AntAttack.txt): primary source for controls.
- [CRASH issue 1 review](https://crashonline.org.uk/01/antattack.htm): independent screenshots and contemporary descriptions. It prints O for the first camera key; the instructions and program use 0.
- [Wikipedia](https://en.wikipedia.org/wiki/Ant_Attack): background and rescue progression.
- [World of Spectrum catalogue](https://worldofspectrum.net/item/0000210/): credits and release identification. Its joystick list conflicts with the original review. The supplied engine's decoded input instructions read keyboard rows on the ULA; no joystick-port read was found in that census.
- Spectrum Computing's entry returned HTTP 502 through web fetch; the catalogue and original instructions above were accessible.

## Features

| Feature | Status | Evidence |
|---|---|---|
| Choose boy or girl and rescue the other character | confirmed | BASIC lines 610/620 swap labels and shape bases; B reaches the welcome and play screens; `$8F80` recognizes the partner |
| Four camera viewpoints | confirmed | `$8400`; live 0/P/Enter/Space checks select 3/2/1/0; 0+Space selects 0 |
| V forward, M/Symbol Shift rotate | confirmed | `$8060`, `$8900`; individual-key and no-input controls; both turn keys together preserve facing |
| C jumps; forward+jump climbs | traced | Input flags at `$8060`, occupied-cell paths at `$8800`/`$88D0`; C flag tested live, but a complete legal climb route through the city was not recorded |
| Four grenade distances | confirmed | `$8D00` gives fuse values 2/4/8/16; live launch checks and 36-pass keyboard routes. Collisions can shorten travel |
| 1 returns to the gate | confirmed | Engine `$8009` returns to BASIC; line 70 runs retry initialization. It is a retry sequence rather than an instantaneous coordinate change |
| Scanner guides the rescue | confirmed | `$8F80`/`$87D0`; initial panel observed; distance and same-height recognition tested by controlled live calls |
| Ants chase and bite | traced | Five records updated by `$80D3`, pursuit `$8A00`, actor collision and bite event `$88A0`, health handling `$8F00`; a naturally reached bite was not recorded |
| Jumping on an ant paralyses it | traced | `$8BD1` writes delay `$FF`; `$8A5D` skips that ant. A keyboard-only landing route onto an ant was not recorded |
| Twenty grenades, limited human health, dangerous explosions | confirmed | BASIC DATA initialization; ammunition 20 to 19 on every tested launch; `$8D00`, `$87A0`, `$8F00` establish human/ant blast and health paths |
| Ten rescues and changing target positions | traced | BASIC lines 90/95/800 and all 37 DATA triples; controlled escape transition observed, but the ten rescues were not played end-to-end |
| Score adds remaining time times rescued count | traced | BASIC line 90 at `$5E49`, decoded directly; score widget tested against that expression. No full ten-rescue scoring run was recorded |
| Scrolling block city and occlusion | confirmed | `$83B0`, `$84A0`, `$8500`; play and camera changes observed; 512 compositor indices and full render checked independently |
| Title, timeout, rescue, medal, and effect sounds | confirmed | All 17 audible recordings regenerate from the listing; title/timeout checked against emulator port writes; all recordings render through the sound player |
| High-score registration mentioned by Wikipedia | open | Every BASIC line and the engine/message allocation were read. This image has a cumulative score display and restart, but no registration path was identified. The general background claim may describe another build; no missing feature is asserted |

## Beyond the documentation

- **confirmed:** simultaneous grenade keys combine into fifteen even fuse values from 2 through 30. S and all four keys were replayed for 36 engine passes on two machines with matching results.
- **confirmed:** simultaneous camera keys resolve in the program's fixed scan order; Space wins over 0.
- **traced:** the BASIC difficulty setting changes ants 2–5 while ant 1 retains its own divider. The divide/skip logic is described in `facts.md`.

## Open questions

The gameplay consumer of the retained shape group `$BC00–$BCFF` is unestablished. The listing keeps and the Graphics tab displays those records. High-score registration remains a source discrepancy, with the search scope recorded above.
