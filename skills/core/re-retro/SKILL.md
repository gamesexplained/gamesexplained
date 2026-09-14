---
name: re-retro
description: The last step of every run. Record where the skills and kit fell short and fix them in the same branch, so the next contributor starts from a better kit. Complete game.json.
---

# Retrospective: improve the kit

You have just used the kit on a real game. Nobody knows better than you,
right now, where it was wrong, missing or unclear. This step turns that
into the diff that saves the next contributor the trouble.

## Do

1. **List every point where a skill misled you, was silent, or you had to
   work something out yourself.** Include platform facts you needed and
   had to derive, tool behaviour that surprised you, and steps in the
   workflow that were in the wrong order.
2. **Make the edits** to `skills/` and `kit/` on the same branch. Keep
   them general: a skill describes the method for every game, a platform
   skill describes the machine, never this one game. If a fact is about
   this game, it belongs in the game's `facts.md`, not in a skill.
   `check_docs.py` enforces the separation.
3. **Write `kit-feedback.md`** in the game folder: what you changed and
   why, what you would change but did not (needs a maintainer's call),
   what took longest, and anything about your operating system or tool
   versions that the install notes should say.
4. **Complete `game.json`**: tier reached (only if every requirement is
   met), tools and versions, model, copy provenance, kit version,
   coverage figure.
5. **Update `TODO.md`** with what is missing for the next tier.

## Do not

- Put game-specific facts in a skill.
- Loosen a rule because it was inconvenient. Say in `kit-feedback.md` why
  it was inconvenient and let a maintainer decide.
- Bump skill versions silently: note each change in `kit-feedback.md`.

## Outputs

Skill and kit edits committed on the branch; `kit-feedback.md`; `game.json`
complete; `TODO.md` current.
