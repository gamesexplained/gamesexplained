# Labyrinth — next work

The resident engine is fully described (32,781 of 32,781 bytes, 100 %) and has been checked against all 22 loads (`parts/resident/facts.md`). The text adventure's own bytes are 15,480 of 15,480 (100 %), which is the ledger result, not a claim that the purpose of its retained opaque bytes is known. Scenes 1 to 6 are partly explained (scenes 2 to 6 are above 97 %, scene 1 is 100 %); scenes 7 to 26 have a folder, a snapshot and the resident ranges, and no analysis. The game stays Bronze. Scene 2's overlay code ($8B00-$9090), 61 reply texts, tile-art pages and room font are described; the AV costume at `$7900-$8AFF` (identical in every scene) is described too: stream-offset tables, seven 32-byte frame directories, six animation-phase tables and 78 drawing streams; the JG costume at `$A000-$B1E2` has the same layout (base `$A000`, phase tables at `$A200` shared by the second and third object groups) and is described the same way, so scene 2 is 99.6 % (78 bytes remain). Scene 6 (Stone Corridor) is 97.3 %: its AF costume, tile-art pages, room font, overlay texts and all overlay code are described; 428 bytes remain (map header and a few stretches). Scene 5 (Wall of Hands) is 99.4 %: its AF and AL costumes, tile pages, room font, map header, texts, command tables and all overlay code are described. Scene 3 (Brick Hallway) is 100 %: its own AV costume, the retained costume at `$A000-$BBF2` (shared with scene 6), tile pages, room font, map header, exit banks, texts, command tables and all overlay code are described. Scene 4 (Alph and Ralph) is 100 %: its AF and AL costumes (same bytes as scene 5), tile pages, room font, map header and exit banks, command tables, texts, blocked-command list and all overlay code are described. Scene 1 (the entrance gate) is 100 %: its AV costume, the gate's own costume at `$A000-$A4DD`, tile pages, room font, header, exit tables, command tables and the last overlay stretches are described. Next: scenes 7 to 26 have no analysis; pick the next scene by the loaded-resource names, one scene per session, commit after each. Scenes 2, 5 and 6 are closed to 100 % too. Scene 7 is 100 % too: its costumes, 15 tile pages, room font, header and exit banks, 86 command pairs, 81 texts, the run-length stream and all overlay code are described. Its content is a movie-theater lobby (ticket, popcorn, goblin), so the part title "The Hedge Maze" is probably wrong and needs checking. Next: scenes 10 to 26 have no analysis; pick the next scene by the loaded-resource names, one scene per session, commit after each. Scene 8 (The Persecution of Ludo) is 100 % too, built the same way (same costumes as scene 7, 16 tile pages, 82 command pairs, 69 texts, overlay code). Scene 9 (The Wise Man's Garden) is 100 % too (own small costume at `$A000`, 16 tile pages, 91 command pairs, 79 texts, the cell-sequence puzzle code). Game coverage is 100.0 % over 11 of 23 parts. Cached snapshots and helpers: `/mnt/project-files/labyrinth/README.md`.

For the opening’s verification:

- Resolve the purpose of `$747E-$74FF`, `$8367-$8AFF` `$DEFE-$DFFF` and the extra descriptor trailer `$ACAA-$ACC9`. Known directory targets and direct decoded operands miss them; indirect consumers or an unrecognised format remain possible. Keep their bytes visible rather than excluding them on that negative result.
- Obtain a full independent audit, which remains recommended after the 19 October 2026 sample found two wrong details in 60 comments (both corrected). Take a fresh sample after further annotations.
- Establish the ordinary reachability and visual effect of the `$2984` ordering counterexample; synthetic depths [100,20,50] return a nonmonotonic order, without proving a player-visible bug.
- Test every setup mutation, disk save/load, pause and restart end to end on expendable disk copies. Extend the checked nickel-disposition offer branches through the complete later theater conversation and movie transition. Establish clock rate and loss conditions. Synthetic boundary inputs do not prove player reachability.
- Identify and audibly verify the resident/menu tunes, then provide their players. The event-format and cached-register tests do not substitute for tune playback.
- Establish whether inventory quantity-byte value 9 is reachable and sample the resident graphical helpers in their actual later loads.

For the gate:

- Resolve the new listing audit’s two-byte gap at `$07FE-$07FF`; M1 ends at `$07FD`, so do not silently extend its authored allocation.
- Capture its natural pre-initialization hand-over, resolve loaded-data warnings and partition shared resident/overlay ownership. Forced entry captures cannot establish this.
- Establish the ordinary presentation of all seven speech records, the live fire-skip during an early speech phase, and the identities of the actor poses; the stored-text viewer and isolated dispatcher tests do not prove those.
- Extend the verified approach and deferred corridor transition through the remaining movement, dialogue, graphics and scripts. Expand independent checking of the gate; the combined sample included only one gate comment.

For the minisite:

- Replace or supplement the Maps / levels reference gallery with rooms drawn from decoded scene data and verified connections. The screenshot gallery does not meet complete-map coverage.
- Verify any further secret or bug before labelling it as such. The counter sequence on Discoveries is a checked mechanic, without a demonstrated secret or bug claim.

For a full-game Silver contribution:

- Resolve every later part’s resident/overlay ownership from pre-initialization and play snapshots, export its symbols and listing, and annotate it to 100%.
- Verify the documented encounters, map changes, failure conditions and puzzles. Forced scene captures establish initial imagery rather than reachability.
- Complete feature verification and take a fresh independent sample after the remaining annotations, with tune players and a built minisite for all parts.

Possible follow-ups: a playable word wheel, a complete city map extending the cinema workflow, audible tune players and a browser for the maze’s scene data.

For the first corridor:

- Walk and complete the loads through the other seven openings and the other route variants. The first opening’s ordinary route to scene 3 / entry 35 is confirmed, including placement at X=2272/depth 6. Check reverse connections and the other entry positions in the Brick Hallway. At the checked arrival, 300-frame up/down trials remain in scene 3 and OPEN DOOR displays “Nothing happens”; the neighboring door at column 36 opens after an ordinary approach to X=2348/depth 24. Walking through that door reaches column 12 in the same Brick Hallway; the other doors still need their own approach tests.
- Trace the other movement modes, object interactions, scene callbacks, drawing and sound. Capture the natural pre-initialization hand-over and resolve `$07FE-$07FF` ownership.
- Independently sample the new corridor comments; the earlier combined sample predates them.

For the Brick Hallway:

- Establish the ordinary route to alternate entry 44 and trace the producer/meaning of state $0500. The checked column-36 route reaches entry 12 in retained scene 3. The repeated OPEN DOOR response and unchanged count4 are checked live at column36.
- Trace other door types, commands and scenes; test mutation persistence across an actual leave/return and disk save/load. Identify sound 1 audibly.
- Resolve natural hand-over ownership and the listing's untracked retained stretches; independently sample its new comments.

- Investigate other actions and routes from the column-12 spiral panel. ASK/OPEN DOOR and a 300-frame up approach have been checked there; those results do not establish a complete return route.

For Alph and Ralph:

- Complete the ordinary crossing from the Brick Hallway. Column26 selects scene4/entry2 in the checked route data, but the attempted live approach did not complete that crossing. The reference scene was selected in memory.
- Verify counter persistence through complete room crossings and disk saves, later dialogue phases, local-door state initialization/persistence, other presence outcomes, and other door/selector outcomes. CALL and the first three ASK replies for both guards, plus the shared index when switching from Alph to Ralph, are live-checked inside the controlled room.
- Resolve resident/overlay ownership, the $07FE-$07FF gap, drawing and animation consumers. Independently sample the new partial listing.

- Complete the ordinary route opening all15 Brick Hallway doors. The map census, initial count3, checked closed-door increment, repeated-open non-increment and controlled14/15 response threshold are established. The controlled post-thanks phase-one reply is checked at index2/flag$FF. The ordinary in-room left-door OPEN/ASK/CLOSE/ASK cycle establishes flag$FF→0→$FF and the unsure/figure-it-out replies. The captured selector1 left-door entry advances phase1→2 and reaches The Wall of Hands. The captured selector1 right-door entry is also checked: it gives the falling/lied messages and the loss panel. The setup prefix and two random-bit stores are traced and live-checked; check reset/persistence on complete ordinary return visits, other traversals and later phase2/3/other branches. The phase4 later-answer branch is code-checked and its fourth answer compared live with controlled second bits0/1; the phase4 CONGRATULATE prerequisite/replies and INSULT flag are also checked with controlled live Alph commands. The controlled Alph-selected departure reaction is also checked with both bits, plus an unselected control; its snapshots retain40/44 thresholds. Ordinary arrival at that phase, live Ralph congratulations/departure and other complete later destinations remain open. The unselected/Alph-lying/Alph-truth phase4 left-door continuations all reach scene5/entry1 and X84/depth6 in the controlled trials.

- Check the remaining commands and count persistence across complete room crossings and disk save/load. The ordinary column36 CLOSE,CLOSE,OPEN,OPEN sequence is established: counts4→3→3→4→4, with no change on repeats.

For the Wall of Hands:

- Trace ordinary shears acquisition/damage, other Wall of Hands interactions and routes, counter wrap/alternate entry, and Stone Corridor guarded-door clearance/traversal and other gameplay. The first-use refusals, first seven replies, eighth-command hour penalty, controlled expiry, and ninth-command local exit to scene6/entry7 are checked. Resolve the producer of the command gate$0343, movement, hand animation and exits. ASK and its five-reply cycle have live/original-code checks.
- Capture the natural pre-initialization hand-over; resolve resident ownership and the retained untracked extents named by the listing. Independently sample the new comments.

- Finish scene6 initialization provenance and seven retained uncounted regions. OPEN DOOR is checked at the arrival, nearby, and on the opened door. The first door’s CLOSE/repeat-CLOSE and local crossing to entry30/X1952 are checked. The archway at column30 continues to entry26/X1696 beside a ladder. The centred column25 ladder route returns to scene5/entry1 and the hands’ opening question. Check the return to the first door, an ordinary way to clear the guarded doorway and its resulting traversal, other doors, save/restart persistence, and other commands.
