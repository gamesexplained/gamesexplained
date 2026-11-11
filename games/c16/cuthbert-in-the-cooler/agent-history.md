# Cuthbert in the Cooler — agent history

## 11 November 2026 — setup and documentation

The contributor supplied `cuthbert_in_the_cooler.prg`, selected a Silver run, permitted web research and reference images, and authorised opening the pull request and filing retrospective kit issues. GitHub login and commit author are `jankfoundry`; an empty detached commit verified `jankfoundry@users.noreply.github.com`. The contributor identified the model as GPT-6.1 Sol with Extra High reasoning; the recorded model is `gpt-6.1-sol`, which the kit's model check accepts as proven.

Cloned upstream main with kit 0.0.323 and created `game/c16/cuthbert-in-the-cooler`. Upstream refused the dry-run push; the contributor's existing fork, `jankfoundry/loderunner-ge`, accepted it. No game file was downloaded. The supplied PRG is in ignored `work/`.

Reused local plus4emu source and its library at the kit's pinned commit, with the matching code-map patch, and regenerator2000 0.9.20. Only these tool files were copied under ignored `tools/`; no Rust installation was needed. The emulator uses a separate local port so the neighbouring game's server is untouched. All 46 emulator checks passed in 193 seconds on Python 3.12.3. A separate launch/use/exit footprint check found no unexpected files outside the repository. Repository binary, documentation and listing checks passed before the identity check.

Read the C16 cassette cover before code. It describes remote-detonated bombs that can kill the player, and says three starting Cuthberts; the catalogue says four. Those are explicit checks in `features.md`. Search results about the Dragon/CoCo game and Game Boy remake describe a different game and do not establish C16 behaviour.


## Analysis, independent sample and verification

The unpacker reached $1100; the first visible maze was still inside the colour fade. An initial unasserted control probe timed out in the fade and was discarded. A new baseline requires the PC to equal $1172 before saving, and `play-round1.p4emu` is that state. Inline arguments to $125F initially looked like code, so they were typed as data and tracing resumed after each zero terminator. Source graphics, every maze record and all seven spawn positions were decoded before closing coverage at 6,059 bytes.

The independent checker, gpt-6-astra, received seed 20261111, all 20 generated maze/spawn comments and 60 of 229 written comments. The parent did no other work while it checked. Sixteen detail findings held. Ten were a single template mistake, nominal pickup totals described as guaranteed gains. The original digit adder sets an overflowing digit to zero, losing remainder. The other findings involved directional half-step tests, that adder, BONUS parameter/glyph numbering, an enemy kill escaping the entire scan, and dormant slot-six arithmetic. An additional sound-byte purpose was unverifiable and is unknown. All sixteen wrong comments and that unsupported purpose were changed. The plain sample rate was 20.0% (Wilson 12.7%–30.0%); population-weighted rate 13.2%. The frozen listing hash matched the sample, and every drawn comment was unchanged until the verdicts. This is one sample, not a full audit.

Original-code comparisons cover all 256 level values, all original pickup records, the life-character wrap, every collision glyph, 30,000 score/pickup states, and the sampled boundary findings. The score adder's 800+300→1000 case and the life wrap to the C16 monitor were also verified in plus4emu. A legal held-SPACE route from first play produced deaths at polls 8–12; the kit's independent C16 model repeated those milestones from engine initialisation. Its original-code sound logs provide three audible page excerpts.

The frozen reconstructed frame matches plus4emu at every one of 64,000 display pixels. The source listing contains no game executable on the authored pages: the published widgets are small ports and data viewers; original engine execution stays in the tests. A full JavaScript Play port is a follow-up rather than an unverified approximation of this game's loop.

## Minisite and delivery

The authored pages were committed as a draft before the separate rewrite and ELI15 pass. That pass defined bytes, hexadecimal addresses, character pictures, and the monitor where each tab needs them; it moved the bonus clock into its own section and preserved the numerical evidence. The final word diff was checked against the draft and facts. Copy remains agent-draft.

The expanded direction-selector comparison passed 458,752 cases, bringing test_cooler.js to 489,540 cases. The four authored tabs passed Chromium checks for all 256 level choices, all fifteen shape choices, interactive controls, sound buttons, nonblank canvases, and layouts at 375 and 768 pixels. The whole-site build completed with 112 games and 1,258 pages. Shared build warnings about existing source links and another game's tab name are outside this contribution.

The retrospective found no additional kit issue to file. Web searches left the exact PRG provenance, individual C16 programmer, and intended retained-image meanings unresolved; TODO.md records them.
