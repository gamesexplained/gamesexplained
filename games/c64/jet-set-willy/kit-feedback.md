# Jet Set Willy — kit feedback

The original publishing pass imported annotations directly into a listing without a boot. Review identified that as an incomplete kit run. This correction boots the CMM disk from a hard reset, disables trainers, saves title and play, and compares them. Play retains every imported code byte and installs the gameplay handler, so it is the listing image.

The names/comments are loaded into regenerator2000 on that snapshot, exported with `symbols_export.py`, and Source is generated only by `listing.py` (10,278 records after the checked phase and mechanic annotations). The external text export stays private; `game.json.imported` records its hash and unknown models. The whole-RAM coverage extra is removed. The article includes only checked visuals and mechanics until verification is complete.

Shared tooling is separate in [PR #125](https://github.com/gamesexplained/gamesexplained/pull/125). VICE MCP 3.13.1 passed 55/57 checks; the pause and pacing workarounds apply. It now runs silently on a virtual display at the contributor’s request.

`timings.json` records actual article/retrospective work from the publishing pass and the fresh orientation step; none is represented as the original external analysis time. Imported games stay out of the runs table. `TODO.md` records the remaining coverage and verification work.

The one-load scope agrees with the interim rule in [RFC #124](https://github.com/gamesexplained/gamesexplained/issues/124). No new state/listing format is introduced here. Silver needs a maintainer check after completing the work.

A retained bootstrap under I/O copies into the upper room bank when executed in isolation; it was not the observed CMM boot path. Its controlled execution copied 8,192 matching bytes and established the purpose of the hidden room templates. Native room transfer passed 60 ids; terrain expansion passed every cell, and rope graphics staging passed 34 positions. These checks support the restored room/rope browsers and full-frame sprite toggle. They do not make the remaining mechanics or untracked loader-phase data verified.

The final hand-over is now a real stop at $3C23, after the CMM trainer and RLE decoder. Independent decoding matched all 63,511 emitted bytes. That showed why a retained copy helper cannot be assumed to be the executed boot path. The preserved lower-memory fragment is a truncated text-buffer editor: controlled literal and hex insertions passed, and its callbacks overlap later gameplay. These predecessor routines are marked by phase in Source. Pickup comments incorrectly called a screen-address temporary a coordinate; native checks of every item corrected that contract. A reset acknowledgment while paused required a separate run, which is recorded as a generic workaround in the skill. Remaining loaded gaps are still open and are not excluded as guessed padding.

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 9 | gpt-6.1-sol | 1 | Booted the CMM disk with trainers disabled, compared title and play, seeded regenerator2000 and generated the listing from play. |
| 50-coverage | 3 | gpt-6.1-sol | 1 | One agent; room/sprite record descriptions, offcut correction and post-row comment placement; hidden RAM and loader entry remain open |
| 60-verify | 112 | gpt-6.1-sol | 4 | Retained high-RAM bootstrap traced and controlled copy verified; 60 room-copy and 34 rope-staging cases passed. Cold trainer attempts and bank-watch setup consumed investigation time.; Native map expansion matched screen and color for 30,720 cells; glyph transfer and complete title playback boundaries checked.; Retained copyright checker and header patch checked; RESTORE/reset banking difference confirmed with positive reset-entry control. Trainer-gap producer observed; unknown surrounding data retained as open.; Decoded the RLE image and predecessor editor; native copy clones, all 80 pickups plus boundaries, input/control jump, checkpoint death and Maria enable behavior checked. Remaining loaded gaps kept open. |
| 70-minisite | 17 | gpt-6.1-sol | 2 | Built and pixel-checked all 60 terrain and 34 rope browser views; captured frame matched 104448 pixels and sprite toggle changed 225 pixels. |
| 80-retro | 4 | gpt-6.1-sol | 2 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run.; Recorded the queued-reset execution control in the VICE workaround and kit changelog; documented predecessor phases and remaining data gaps. |
| total | 144 | gpt-6.1-sol | | 2.4 h of work, over 28.0 h |

The imported annotations make the short coverage step unsuitable as a fresh-disassembly benchmark. Verification time is recorded separately; these times do not measure the original analysis.
