# Target Renegade — follow-ups

Silver scope: 92,945/92,945 bytes explained across the shared engine, first/second resource loads and ending. Cartridge storage copies and edition loading presentation are excluded with native directory evidence.

Next: curate the article with a human for Gold. The listing was audited on 28 October 2026 by checkers on a proven model (56 comments corrected, a sample of 60 afterwards all right; see facts.md). The 28 October pass also added the history, reception, Gameplay, Controls, Graphics, Music and Solution pages on a model the kit does not count as proven (`claude-sonnet-5-5`); an independent proven model checked their claims and the corrections are in.

- Resolve the explicit visual move/type mapping, reload timing and event-score questions in features.md with targeted native play traces. These do not represent claims that a feature is absent.
- A human curation pass is required for Gold. Copy remains agent-draft.
- A full behavioural Play port and lockstep test would be separate Platinum work. No full-game emulator is embedded in these pages.

The contributor requested a PR on 26 October 2026. Commit/push and PR preparation are authorized; no maintainer issue is needed for this game's open analysis questions.

## Open from the 28 October 2026 pass

- Commodore User says each man is "four sprites large" and Mr. Big "eleven sprites huge". The code builds a player from three components and an ordinary enemy from two. Settle it by tracing the sprite-assignment routines or the sprite-mode register per sprite.
- Match each enemy type number (0 to 8) to the picture it draws, then to the manual's opponents. The spawn selector stream at `$8743` and the stage bases at `$8738` need a run of the game to read per stage.
- Readers say the baseball bat appears only in stage 1. The stage spawn tables decide it.
- The manual says moves score 200 to 2,000 points. The hit table at `$A0AD` holds 100 to 900 per hit. The rest is not found.
- The supplied disk image is a cracked release (disk name "ASS PRESENTS:") whose intro did not pass a key press in the simulator, so it could not settle the five-versus-three lives question. Zzap!64 38 says five lives.
- The loading picture credits M.Lamb, D.Drake, and J.Dunn with G.Biasillo, where the manual credits Collier, Palmer, McDonald, and Biasillo. Biasillo's Retro Games Master interview explains Dunn (the Spectrum buzzer port). Lamb and Drake are still unexplained. Compare the cartridge loader's picture with the disk's.
- No interview with Collier, no retrospective by the graphics artists, and no count of players who finished the game was found. The T.A.C.G.R. interview with Biasillo (tacgr.emuunlim.com) did not connect and has not been read. The Zzap!64 and Commodore User reviews were read from images the contributor supplied.

- Quotes from the Zzap!64 and Commodore User reviews come from images the contributor supplied. The checkers could not see the images, so the quotes match the transcription in work/research.md and not the original scans.
