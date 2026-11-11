# Stop the Express — features

This is Csabo's 2021 64 KB Plus/4 conversion, grouped under the repository's
C16/Plus/4 platform. It is not an unexpanded C16 game.

## Sources

- [Plus/4 World](https://plus4world.powweb.com/software/Stop_The_Express),
  including the converter's own comments and train identifications, read
  11 November 2026. The gallery images returned HTTP 465; reference images
  here were captured from the supplied program instead.
- The supplied title picture and control scroller at $4F29-$509B.
- [Original Spectrum instructions](https://www.gamesdatabase.org/Media/SYSTEM/Sinclair_ZX_Spectrum/Manual/formated/Stop_the_Express_-_1984_-_Sinclair_Research_Ltd..htm),
  read 11 November 2026, for the premise only. The Plus/4 scroller and
  keyboard scan determine this version's controls.

## Features

| Feature | Status | Where |
|---|---|---|
| Cross carriage roofs toward the engine | confirmed | Native roof play; $26B6, $4396/$442B |
| Second stage inside the train | confirmed | Native setup into $2860; $2844/$5279; reference/play-interior.png |
| Move, jump, duck, and hang from ceiling holds | traced | $36D6-$391B; native directional-input trials; ceiling tests $3894 |
| Catch and release birds against pursuers | traced | $391C/$3A16/$3B74/$4B51; independent collision probes |
| Time, score, lives, and high score | confirmed | Native HUD; $498A/$4DB1/$51C6; three initial lives |
| Remaining-time bonus | traced | $3497 transfers one internal score unit per time unit, ten displayed points; native bonus probes |
| Repeating train designs and increasing difficulty | traced | $2573/$268B/$5339; all rounds 1–255 checked against page tables |
| Title picture and music | confirmed | Native title capture; full 3,072-frame TED loop |
| M fades/stops title music | traced | $1ED0; title IRQ switches to short handler after fading |
| C starts practice with damage feedback | traced | $2155/$498A/$4999/$4DB1; native contact/timer/HUD probes |
| Pause banner and fire to resume/shorten waits | traced | $5104/$214D and ready/bonus controllers; native banner and ready probes |
| Optional SID and DigiMuz writes | traced | Eight-channel music driver $9D32-$A520; all channels dispatched; individual frequency/control stores have conditions |
| Optional sound hardware calibration/detection | open | Startup is outside the gameplay payload; physical playback is unverified; $FC00/$FC60 hold alternating bytes at entry and music does not prepare them |
| Continued high-score rounds | traced | $2AA0 increments an uncapped round byte; no final-ending branch in the round transition |
| Natural completion of extreme late rounds | open | Forced arithmetic/setup tests establish wrap behaviour, not a played route to rounds 252–255 |

## Beyond the documentation

- Ordinary non-practice input overwrites the attract command list
  ($36FD/$3733); active jumps and falls do not poll another command.
- The ground's forty-cell window copies from a shorter repeated pattern
  ($18E2/$18E3/$4960), rather than rotating the last physical cells.
- Forced round zero initializes 256 enemy records over live code
  ($51F5/$524E). Interior setup at rounds 0/255 has the same count failure ($5279). Live emulator probes reproduced the corrupted entry; the final record write is $24FD.
- The engine approach leaves enemy and knife state present, although the
  engine-room flag stops their usual drawing/collision path ($5344/$3C27).

## Remaining questions searched online

The converter's comments, original instructions, and searches for the
Plus/4 ceiling creature, DigiMuz support, and rounds 252/255 did not
establish the ceiling creature's intended name or a route to extreme
rounds. The pages use descriptive names and identify forced tests.
