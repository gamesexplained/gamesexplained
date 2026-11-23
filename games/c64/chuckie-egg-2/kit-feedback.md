# Chuckie Egg 2 — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": for each of the 18 wrong comments in the sample I searched the listing for the same belief, and five more comments outside the sample were corrected with them.
- `50-coverage`: "Inline parameters: the reason a flow disassembler stalls": the flow disassembly stopped at the text after `JSR $ED40`; I found print_inline and traced past the text after every call to it, rather than typing the strings by hand.
- `70-minisite`: "Pair the visible check with the rule's expected result": the browser check compares the jump widget's step count with the jump table, which showed that the listing's "22 steps" was one too many.

## What was changed in the kit

None. The run changed no file under `kit/` or `site/`.

## Candidates

A table whose index counter is incremented before the end test is read one entry short of its length. Here a jump table of 22 entries is read for counter values 1 to 21, because the code adds 1 and leaves the jump when the counter reaches 22; the listing said the jump lasted 22 steps, and nothing flagged it until a widget drawn from the table counted 21. A rule for `60-verify` could say: when a comment gives a count of steps or entries, count them from the loop's end test, not from the table's length. No other game folder showed the same mistake, so it waits here.

## Maintainer asks

- **Let browser checks ignore console errors from other sites.** In a cloud session the web fonts and the analytics script cannot load, and Chromium logs "Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED" for each. A check that collects console errors, as `kit/skills/core/70-minisite` asks, then fails for a reason that has nothing to do with the page. This run's check (`games/c64/chuckie-egg-2/pages-browser.js`) keeps only errors whose location starts with the site's own address. The same filter could live in `kit/scripts/play_browser.js` as a helper every check uses, so each check need not find this out again.

## Operating system and tools

Linux (x86-64) in a cloud container. VICE release v4.0.0 (`v4.0.0-linux-x86_64-gui.zip`) through the kit's vice-mcp, regenerator2000 0.9.20. The browser checks ran on the Chromium the container carries for Playwright (`/opt/pw-browsers`), so `tools.py get-chromium` was not needed.

The checker the contributor asked for needed usage credits the account did not have, so the 60-verify sample ran on claude-opus-5-5 in a fresh context, as `game.json` records.

## What cost the most time

Getting strings typed: seeding the disassembler from the code map turned typed strings back into code, and the fix was a tracer of my own that steps over print_inline's text and types each string exactly; a seed option that keeps existing data types would have saved the most.
