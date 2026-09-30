# Ghostbusters — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29 September 2026

**Orient.** The one-load conversion starts with a loader that overwrites the vector at `$0314`
while the drive is still loading; the game's own cold start is `$6000`. The video bank's
contents in the file are leftovers: the start-up clears `$4000`-`$5FFF` and rebuilds it, so the
coverage excludes that range.

**Coverage.** Five annotators took disjoint ranges. The game states are a table of 64 handlers at
`$381A`; naming them `stNN_...` by state number made every later cross-reference readable.

**Verify.** Twenty scripted runs in the kit's simulator (`work/verify/t1`-`t20`). The manual's
"the game ends at 9,999 PK energy" turned out to be the meter's cap: the end is the Keymaster and
the Gatekeeper meeting, which in eight runs from 5,000 happened between 8,495 and 9,999. GOOD
TRY, described online as the ending for having money but missing Zuul, is two men caught by the
Marshmallow Man on Zuul's street.

**The account-number port.** Its first test passed 20,000 cases while the decoder was wrong: the
parser returned its four bytes in reverse, the test wrote them to `$EAC7` in the same reversed
order, the game's decoder then failed the check exactly as the port did, and both agreed on
"invalid". The page's widget showed the printed number as INVALID. The fix put the bytes in the
order `$7505` stores them (`$23` first) and made the test demand a round trip: the number the
encoder prints must decode to the balance it came from, for 10,000 names. A test that compares
the port with the game proves nothing on inputs where both fail; it needs cases that must
succeed.

**Frames.** Four screens were recorded in VICE and match the renderer to the pixel; five more
come from the kit's simulator, recorded with `work/port/game/simframe.js`.

**Time.** The container stopped for about four hours during verify (16:13-20:20 UTC); the
60-verify time includes it.

**Editorial structure, 30 September 2026.** At the steward's request the How it works page
was split, on the model of Chiller's editorial draft, into Overview (the game, its makers, the
six weeks, reception, versions), The city, How it works, Music and speech, and Discoveries
(claims the code contradicts, bugs, what was left in, open questions). Findings were moved,
not rewritten; each lives on one tab and the others link to it. What belongs to the one-file
conversion moved to About, so the tabs describe the game and not one copy of it.

**A second copy.** The steward sent a cracked disk. Run in VICE to `$6000` and compared with
the image: the game's code is the same at the same addresses. The crack lost the compact's and
the hearse's pictures (`$0400`-`$07FF`) and 32 bytes of phrase 3 (`$FD30`, the KERNAL's
vector table written over it), which the two shop screenshots and the speech port showed. Two
VICE scripts run at once against the one emulator drew the same screen into both files; the
pictures were taken again one at a time.
