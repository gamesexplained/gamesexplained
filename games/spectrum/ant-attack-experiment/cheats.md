# Controls and inspection setups

## In-game controls

The original engine's key 1 returns to the BASIC retry path. It preserves rescued count and total score while the attempt reset restores health and ammunition. It is documented in the manual as the last resort. There is no code patch in this analysis's play snapshots.

## Desert route

The committed desert-route.json records 133 groups at engine input checkpoint 8009: one Symbol Shift update, 71 V updates, one Symbol Shift update, and 60 V updates. From player (185,4,0) facing two, the route reaches the AMMO picture at (0,64,0). All coordinate milestones matched a second independently started emulator process. The route uses ordinary keyboard input.

## Forced inspection states

These establish code behaviour, not legal player routes:

- Set the companion and player near each first-choice rescue coordinate to inspect all ten areas while V+C is held. The Map tab labels these views as positioned inspection captures.
- Set time B436/B437 to zero to inspect timeout handling.
- Set both humans outside the city to exercise escape; change the BASIC rescued scalar only to reach later interludes. For the final scene, first advance through the tenth interlude so BASIC installs the shorter final-stage story. A shortcut directly from the first-stage story retains a longer string and can exhaust BASIC workspace during the medal's CIRCLE calls.
- Call 87A0 with an ant's movement timer FF and a matching-height nearby grenade to show that blast recovery clears paralysis. A legal-input reproduction remains open.

All private snapshots and setup scripts stay in work/.
