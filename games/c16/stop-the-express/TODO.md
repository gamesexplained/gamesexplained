# Stop the Express — next steps

Silver claimed by jankfoundry; copy is agent-draft. All 42,263 bytes in the declared gameplay
payload are covered. This is a 64 KB Plus/4 conversion.

## Before Gold

- Human curation has begun with the moving-figure viewer's framing.
  Every authored section still needs a complete pass, including the visual names.
  The intended name of the floating ceiling figure remains uncertain;
  the pages call it the ceiling obstacle. The converter's notes and
  online searches on 11 November 2026 did not settle the name.
- The full audit checked all 439 annotations and corrected 38 detail
  errors. A fresh independent sample found 0 errors in 80 comments
  (seed 2026111101; Wilson 95% interval 0%-4.6%). The annotation audit
  requirement is complete; human curation remains for Gold.
- Verify optional SID and DigiMuz playback/calibration on appropriate
  hardware. The TED player covers the complete stored tune's TED parts;
  the optional board outputs are traced but not presented as verified audio.
  The DigiMuz table addresses $FC00/$FC60 contain alternating $00/$FF
  bytes at entry and are not filled by music initialization or playback;
  verify their preparation before adding a pitched DigiMuz player.

## Possible follow-ups

- Record a complete input-driven route through both stages, with the
  brake and return to the left edge. Current stage-two pictures use the
  game's setup code with progress/round values set for inspection.
- Investigate whether a legal play route reaches rounds 252–255 before
  other failures. The page proves carriage-count overflow and a forced
  round-zero code overwrite; the web search found no played route.
- Extend the music player to SID and DigiMuz, including calibrated period
  tables and every optional voice.
- Build a JavaScript Play tab and test it in lockstep with the original.
  A full game port is beyond this Silver run's interactive explanations.
