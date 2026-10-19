# Alph and Ralph — established facts

Partial controlled-room analysis: 854/48,705 tracked bytes described (1.8%). `work/play.vsf` is a name-only anonymized copy of the female-avatar reference capture, loaded originally by forcing scene request 4. It is not evidence of the crossing from the Brick Hallway. The earlier male entry/play snapshots are preserved as `entry-forced-male.vsf` and `play-forced-male.vsf`. Shared resident ownership remains unresolved; this independent scope overlaps earlier parts.

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

M4/P4/C4 unpack to510/1536/1344 bytes. U4 contains5267 payload bytes, $8B00-$9F92; AL contains2655 payload bytes, provisionally scoped at $A000-$AA5E. The independent snapshot scope also retains the resident image and AV costume. The listing's $07FE-$07FF gap and resident/overlay ownership remain open. Ralph's dialogue, later progress branches, door outcomes, and ordinary room entry remain unverified. These new comments have no independent sample or audit.
