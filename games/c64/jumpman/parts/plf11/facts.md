# 11 — Runaway

## Loaded program

`PLF11` is a 2,048-byte level file. The native loader reads it into $3800–$3FFF and copies it to $3000–$37FF. This part owns both regions; only the active 2,048 bytes are counted and listed. The cached copy is excluded. The shared program is the `resident` part beneath it.

The private `work/entry.vsf` is the captured stop at $7514 before drawing or initialization; every active byte matches this disk file. `work/play.vsf` is the initialized stop at $759C used for the level screenshot. The controlled loader route is recorded in the game's orientation; these captures do not establish ordinary campaign reachability.

## Mechanics

Initialization [$3161](source-plf11.html#3161) randomly occupies 12 of 18 bomb locations; [$323D](source-plf11.html#323D) turns static bombs into moving sprites, and [$32E5](source-plf11.html#32E5) returns them to empty static locations. Collection [$3388](source-plf11.html#3388) awards 100 and decrements bombs even during dying state1. [$3462/$348B](source-plf11.html#3462) push and pop six-byte drawing records, last in first out.

## Checks and remaining limits

Five controlled native initializations place12 distinct bombs among18 locations. A neutral native replay collects a flying bomb during death, score0→100 and bombs12→11. Forced drawing backlogs preserve43 records; record44 overlaps old records, and128 enqueues wrap the offset to apparent empty. Native controls match. A conservative original-scheduler model bounds the backlog at eight for normal speeds2–8. A bounded512-scenario speed1 test reaches at most four pending records; exhaustive speed1 reachability and simultaneous multi-bomb collision cases remain open.


## Collection during death and drawing backlog

**Live input:** from native initialized PLF11, 220 neutral spawn frames followed by continued neutral input reaches accepted flying-bomb collection at [$33A5](source-plf11.html#33A5). Life state remains1 (dying), sprite7 and the player have collision mask `$81`, and the completed callback changes score0→100 and bombs12→11. Collection starts at [$3388](source-plf11.html#3388); [$3385](source-plf11.html#3385) is the no-match jump to landing logic. Controlled CPU/native tests confirm acceptance for life0 and1, rejection for life2, and the hazard-pulse gate. These routes start from selected-level snapshots; they do not establish campaign routes or complete level playthroughs.

**Forced backlog:** Runaway's deferred drawing uses a stack of six-byte records, popped last in first out. The offset at [$348A](source-plf11.html#348A) adds/subtracts6 modulo256; zero means empty. Original-code tests enqueue and consume depths1…44. The first43 records remain intact; enqueue44 starts at offset2 and overwrites early fields. In the supplied repeated-location placement sequence, pop43 reads a corrupted drawing pointer `$079A` instead of [$319A](source-plf11.html#319A); tests stop before rendering through that pointer. After128 uninterrupted enqueues, the offset is zero and the service returns as though empty. Reachable field stores span [$34DA](source-plf11.html#34DA)-[$35DD](source-plf11.html#35DD). Native comparisons match selected boundary cases. A separate600-frame neutral replay records17 enqueues and600 pop-service entries, with at most one pending record at sampled frame boundaries. That sampled replay does not bound transient values. A separate conservative state-space check below bounds the backlog for normal speeds2–8; speed1 remains open. Evidence and scope: private comparison records.

**Speed1 stress:** original initialization for128 seeds and four supplied collision policies produces512 scenarios, each stopping at zero sampled targets or1000 pulses. Original collector/landing, spawn/movement and one drawing pop run in their actual order. The largest observed backlog is four. Player movement, static pickups and actual interrupt interleavings are omitted, so this is not a proof for every game state. Two native cases match the sampled peak and a forced zero-target collection. In the latter, the unchanged collector decrements0→255; no ordinary route to that supplied state is established. The collector itself therefore cannot justify a universal twelve-pickup cap. Reproduce with the private `work/checks/` helper `runaway-speed1.js`; results and scope.

## Bounded drawing backlog

Runaway's collection path accepts at most one flying bomb per pulse and skips landing that pulse. Otherwise up to four actors can land, and inactive slots can then spawn. Executing all18 launch locations in each of four directions through a repeated movement state gives no arrival at any landing location before13 movement updates. The original divider's steady period equals the selected speed, including speed1. The collision tail services one drawing record every game service, even without a hazard pulse. A conservative model allowing arbitrary spawns, eligible landings and unlimited one-at-a-time collections exhausts3,128 states and36,138 transitions: **at most eight pending records at normal speeds2–8**, from an empty queue and four idle actors. This remains below the44-record overlap boundary even though the model omits geometry, occupancy and random-choice restrictions. A controlled original/native four-landing/four-spawn case reaches eight. At speed1 there is only one service per pulse and this bound does not apply; ordinary overload remains unverified. Method and results.
