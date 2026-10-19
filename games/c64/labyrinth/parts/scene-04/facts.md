# Alph and Ralph — established facts

Partial controlled-room analysis: 858/48,705 tracked bytes described (1.8%). `work/play.vsf` is a name-only anonymized copy of the female-avatar reference capture, loaded originally by forcing scene request 4. It is not evidence of the crossing from the Brick Hallway. The earlier male entry/play snapshots are preserved as `entry-forced-male.vsf` and `play-forced-male.vsf`. Shared resident ownership remains unresolved; this independent scope overlaps earlier parts.

## Calling Alph beside the left door

From the controlled room state, ordinary left movement reached X105/depth6, coasting to X99 during the subsequent command. CALL ALPH displayed “I'm here! You don't have to shout!” and made Alph visible. Three ASK ALPH commands displayed, in order:

1. “One door leads to the center of the Labyrinth, the other leads to... CERTAIN DEATH!”
2. “I won't say more until you open every door in the Brick Hallway.”
3. “We're not saying another word.”

The command fields were [31,44] for CALL and [30,44] for ASK. Non-stopping checkpoints recorded one $90C3 call-handler hit and three $8FA8 ask-handler hits. Shared conversation index $8F04 changed 0→1→2→2; progress $0569 stayed3. Current scene remained4, pending request $FF, X99/depth6. The original emulator snapshot, input and normal speed were restored. Raw observations and snapshots remain private in `work/alph-left-dialogue/`; published screenshots are `reference/alph-0-call.png` through `reference/alph-3-ask.png`. They contain no entered player name.

## Opening conversation decision

Pair $8B0C [30,44] selects $8FA8 through $8BCC. The handler calls presence prerequisite $939A before joining $8FB1. Negative $8F0C selects $9B1D directly. Otherwise progress $0569 below15 enters the opening-reply path. The old index $8F04 chooses a split pointer from highs $8FFE and lows $9001. For indices0,1,2, these are $9A11,$9ADC,$9B1D. The index increments, with old index at least2 forcing the stored index back to2. The lookup still uses old Y: arbitrary seeded indices above2 are outside the bounded widget, rather than assumed to clamp before reading.

Progress at least15 enters later branches. The three texts above establish what Alph says, not a verified solution or a claim that each door must be opened exactly once. The producer/meaning of the progress byte across the complete puzzle remains open.

CALL ALPH $90C3 uses $93D1/$93EA and jumps to $90D4, bypassing the Ralph path's CMP #1. Alph's branch therefore uses the zero flag restored by PLA in $93EA: returned A zero selects $97B1, nonzero selects $97D7. $9419 loads the speaker/mode argument from $0342 before tail-calling queue API $0827. The left-door live call confirms presentation; the full animation consumer remains unannotated.

`test_alph.js` takes the bounded conversation function from Explore the game and compares it with original $8FA8 for every opening index0..2 and every progress byte0..14: 45 cases. It seeds nonnegative $8F0C=0 as captured, intercepts presence prerequisite $939A and intercepts the selected reply at $9419. The three ASK replies and the CALL reply at $97B1 are expanded by original parser $6782, with drawing/formatting intercepted and whitespace normalized. Thus the test checks the conversation choice and counter, not presence, animation, or rendering; the separate live command sequence supplies the presentation evidence. A further256 cases execute CALL ALPH with its query intercepted, checking the zero-flag branch for every returned byte while retaining the real $93EA helper. The repeat test confirms index2 repeats in the bounded code path; the live run included three asks.

## Scope

M4/P4/C4 unpack to510/1536/1344 bytes. U4 contains5267 payload bytes, $8B00-$9F92; AL contains2655 payload bytes, provisionally scoped at $A000-$AA5E. The independent snapshot scope also retains the resident image and AV costume. The listing's $07FE-$07FF gap and resident/overlay ownership remain open. Ralph's later dialogue, the progress branches, door outcomes, and ordinary room entry remain unverified. These new comments have no independent sample or audit.

## Ralph shares the opening conversation

The fresh Ralph trial restored the same controlled female-avatar scene-four reference. Ordinary right movement reached X215/depth6, coasting to220 while entering CALL RALPH. CALL fields were[31,53]; ASK fields were[30,53]. CALL RALPH displayed “I'm here! You don't have to shout!” Three ASK RALPH commands displayed the same warning, door-opening request and refusal as the Alph trial. Index $8F04 changed0→1→2→2; progress stayed3. Checkpoints $90CC/$8FAE recorded1/3 hits.

A second trial restored the naturally executed first ASK ALPH within that controlled room, at X99/depth6 with shared index1. Ordinary right movement and coasting reached X225/depth6. CALL RALPH preserved index1 and displayed the call response. ASK RALPH then selected the second reply, “I won't say more until you open every door in the Brick Hallway,” and advanced the index to2. Each handler had one positive hit. Current scene remained4, pending request $FF, and progress3. This establishes a speaker switch within the controlled room, not ordinary entry from the Brick Hallway. Original emulator state, inputs and normal speed were restored. Private captures/observations are in `work/ralph-dialogue/`.

ASK RALPH pair $8B14 [30,53] selects $8FAE through $8BD4. Its prerequisite $93B7 differs from Alph's $939A, but both accepted paths join $8FB1 and use the same $8F04. CALL RALPH pair $8B28 [31,53] selects $90CC through $8BE8. It executes CMP #1 after $9407: query result1 selects $97B1, all other byte values select $97D7. This call preserves the conversation index. The full distance producer and other prerequisite outcomes remain outside this check.

`test_ralph.js` compares the page's shared reply function with both original ASK callers and their real prerequisite/helper branches for all valid opening indices0..2 and progress0..14:90 cases. API $0812 is intercepted to return zero distance; captured accepted actor-state $053E values0/1 are seeded for Alph/Ralph, with columns1/3. It checks speaker selection as well as reply/index. Another768 cases execute the real CALL RALPH path and helper for all256 query-result bytes at each opening index; only query $93D1 and the output queue are intercepted. The page's actual switch inputs use CALL RALPH with accepted query result1, then ASK RALPH, producing shared indices1→1→2 and second-reply pointer $9ADC. This comparison checks the bounded conversation and call branch, not approach, animation or later dialogue. Live input supplies the separate approach/presentation evidence.

Published images `reference/ralph-0-call.png` and `ralph-1-ask.png` show the fresh Ralph start. `reference/shared-0-call.png` and `shared-1-ask.png` show the speaker-switch trial. All were visually checked and contain no entered player name. New annotations have no independent sample or audit.
