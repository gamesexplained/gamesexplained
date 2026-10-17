# Labyrinth — agent history

## 17 October 2026 — Bronze, unorig and gpt-6.1-sol

The contributor chose Bronze, allowed web research, confirmed the unorig noreply identity, and reserved opening the pull request. One agent did the work. The branch began at origin/main 60752da; the existing skate-or-die branch was left alone.

VICE 3.13.2 passed 57/57 checks. The first disassembler smoke-test command named the temporary emulator-test snapshot after the check had removed it; the resulting missing-file error was fixed by using an existing smoke-test snapshot. The actual opening snapshot subsequently loaded and answered correctly. No software was downloaded or installed.

The original G64 loader reached the logo, save-slot selector, and text adventure. Character answers were EUAN, M, BLUE. A snapshot was saved before the first command. GO HOME proved the state was interactive. A frame capture took several minutes through the local transport, so it was allowed to finish before sending further input. It exposed the full vector chain and the font in RAM under I/O. An initial font render at $C000 showed shapes rather than the letters; checking $D018 correctly placed the font at $D000. The incorrect image was replaced in place. The sweep was extended to lowercase ASCII after the first PETSCII/screen-code pass found only fragments.

The disassembler was seeded from the IRQ vector. Two decimal entry arguments were corrected against the byte dump; $1131-$1139 was restored to undefined, and $113A was decoded from the live frame’s vector. The high-memory $DE12 target was checked against its caller before being counted as executable RAM. Its caller explicitly banks I/O out. The mechanical census was corrected to count absolute/indexed memory operands only, excluding a relative branch within that high-memory routine.

A documented normal-command route reached the cinema and the graphical gate image. Fire, Space, and Return led through further black/loading intervals, but the interactive maze was not established. The Bronze contribution retains the reproducible text-opening snapshot and lists the graphical continuation as unanalysed. No loader patch, memory POKE, or alternate game image was used.

The run stopped at the requested Bronze boundary: initial sweeps and a partial listing, with no full coverage loop or independent verification sample. The page copy was written after the facts and then revised for the house style. No kit change or lesson file was needed; the relevant rules already covered the mistakes encountered.

## 17 October 2026 — Bronze continuation

The contributor asked to continue. Web, commit identity, one-agent operation, and leaving the pull request for them remain unchanged. The saved opening reproduced the committed listing byte for byte; tools were rebuilt from symbols.json and VICE passed 57/57 checks.

Tracing corrected the interpretation of $0F10: it waits for ten IRQ-counter increments at $0353, rather than waiting for a disk transfer. The movie-start card was reproduced from a stop at $8D50, dismissed with joystick fire, and the resulting gate state responded to a controlled movement test. Walking up through the arch led to a second title card and the first brick corridor. The earlier failure to establish graphical play was an observation gap. File matches and the costume loader identify av as male avatar artwork and af as its female counterpart; u1/u2 are distinct gate/corridor code overlays. The room unpacker reproduces the live map, picture and character bytes of the first corridor exactly.

The continuation expanded the partial trace and decoded the hidden-RAM word dictionary. A probe started at $08E5 inside the immediate instruction at $08E4; the affected bytes were restored to undefined and traced from the correct $08D4 entry. The split dictionary pointer table initially lost bytes at automatic colour-RAM aliases; removing those aliases restored the complete high/low halves and the listing checker passed. The generated dictionary comments have no independent sample.

Forced scene requests captured the distinct graphical resources through the final confrontation, including both disk sides. Early side-2 attachment interrupted the old-side autosave; following the game's requested side byte and using Space resolved it. The request captures are preserved separately from the normal gate/corridor route. The continuation is delivered at the contributor's requested Bronze tier, with the unexplained captured loads represented by part placeholders and Silver work retained in TODO.md.

The final Bronze page was built and checked in the browser: the scene selector changed the picture and caption, and the Source tab loaded the expanded opening listing. The full-site build succeeded; repository-wide unresolved source-address links are reported by the build and were not changed in this game contribution.

## 17 October 2026 — small dialogue addition

The contributor requested a little more. Added a dictionary-word explorer within Bronze, using the established hidden-RAM word table. Before writing the copy, checked the page’s extracted function against the original parser in the kit’s 6502 simulator for all 256 indices and four substitution tokens. The 1,024 cases match. The browser controls expose lowercase-initial entries; the test also covers the original arithmetic on capitalized words and empty entries. Copy was written after this check and revised against the house style. No new software, binary uploads, or independent accuracy sample was involved.

Browser verification exercised word selection and all four formatting combinations. The displayed token bytes, capitalization, and space marker changed correctly; the console reported no warnings or errors.

## 17 October 2026 — opening-passage stepper

The contributor requested another small addition. Added a stepper for two actual opening text records: the sidewalk description and the rain/store/owl description. The page groups consecutive literal bytes so a step advances a readable piece rather than a single letter. The test checks every embedded byte against the committed listing and compares all 19 display prefixes against the original parser, preserving stored line breaks. The original 1,024 dictionary cases still pass. The copy explains only these stored passages and was revised after the tests. This remains a Bronze contribution.

## 17 October 2026 — character viewer

The contributor requested a further small addition. Added a viewer for the opening font, with previous/next controls, a numeric selector, a pixel grid, and row bytes. The complete glyph sheet remains available beneath the viewer. The font excerpt matches the listing byte for byte and every monochrome glyph matches the shared C64 renderer. The test initially treated port_check.lib’s return as the renderer; its implementation loads the renderer onto globalThis instead, and the test was corrected before reporting a pass. Copy was reviewed after the checks. The page remains Bronze.

The browser check showed that direct numeric entry could leave the picture unchanged until another control was pressed. Added an input-event update alongside the change handler so the preview follows typing immediately. Previous/next and the grid switch were checked visually.

## 17 October 2026 — word-wheel exploration

The contributor requested more exploration, then repeated the request while the prefix work was active. Continued that investigation rather than starting an unrelated task. Confirmed the live disassembler’s 155 comments exactly matched the exported map before editing. Added ten routine descriptions covering key dispatch, prefix matching, command dispatch, wheel drawing, and prefix highlighting. Exported symbols and rebuilt the listing. Opening coverage rose from 14.5% to 15.9% (5,891 / 37,055 tracked bytes); the graphical loads remain unanalysed.

The simulator confirmed that G selects give, Z is dropped while G remains accepted, O selects go, and clear-prefix preserves go. A VICE probe reproduced those states through ordinary matrix input, including Delete, and restored the prior emulator state afterwards. The committed test also exercises uppercase/lowercase prefixes for every available entry in three saved wheels and verifies every state displayed by the page’s recorded replay.

Reading the quantity path caught two description errors before completion: the highlight ADC includes the incoming carry, and the count formatter adds $31 to a single byte, so value nine yields a colon rather than the digits 10. Corrected those comments in the disassembler and added simulator boundary cases for the suffix. Player reachability of the colon case is an open question. No independent accuracy sample was performed.

Copy was written after the code and live checks, then revised for the house style. The page keeps its Bronze tier.

## 17 October 2026 — opening command responses

The contributor asked for another small exploration. Followed the existing action dispatcher into the opening’s movement handlers and found mixed destination/message tables: high-byte zero means a location number, while another high byte makes the pair a reply pointer. Added nine routine/table descriptions, exported the symbols, and rebuilt the listing. The new GO HOME widget checks all fourteen table decisions against the original handler, and its three reply strings against the original parser.

The first committed-listing comparison reported missing table bytes. Typing and naming both halves in the disassembler brought the complete mixed table into the listing, and the test then passed. It was kept as bytes rather than an address table because a zero-high-byte record is a destination number. An intermediate export reported 6,336 / 37,397 tracked bytes (16.9%). The table’s reply decisions are checked separately from arrival processing and are not presented as a complete city simulation.

Copy was written after the tests and reviewed for the house style. Bronze remains the contribution’s tier; no independent listing sample was performed.

The dictionary regression test then found that the new typing operation had regenerated three automatic colour-RAM aliases inside the hidden-RAM pointer table ($D8A0/$D8F0/$D9B8). Removed those aliases after typing and rebuilt the listing, restoring the complete table. All existing examples passed again. Final opening coverage is 6,504 / 37,421 bytes (17.4%). The exported symbol map remains partial and the hidden-RAM and small code gaps reported by listing.py remain open.
