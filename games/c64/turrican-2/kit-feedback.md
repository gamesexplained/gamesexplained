# Turrican II — kit feedback

## Skill text that changed what I did

- `12-media`: "A loader takes its one line": kept loader mechanics out of the article while recovering its story pictures, loading sprites, and music for the required viewers.
- `60-verify`: "An `unused` answer in `media.json` is a negative result": enumerated fixed and constructed file names before answering the three retained files.
- `70-minisite`: "A shape the game paints into the screen itself": ran the scene-frame producers and the intro picture decoder rather than treating their pre-initialization buffers as art.

## What was changed in the kit

- `kit/c64/project.py`: preserve exported block boundaries with splitters when rebuilding a regenerator2000 project, so adjacent code/data allocations retain the symbol map's types.
- `kit/c64/test_project_splitters.py`: exercise adjacent code/data boundaries through the project round trip. The native disassembler can otherwise merge them and reinterpret data as code.

## Candidates

An independent intro image can inherit misleading names when it is initially created as an overlay of the later resident engine. The sample found a later panel description on a boot-time space character. The intro is an independent part and its map now contains only its own program. The existing ownership rule covers this; no new skill text is needed.

The animation and beam workspaces can also occupy nominal glyph or sprite slots. The independent sample found a beam described as environment animation. The corrected viewer separates source art, generated frames, and executable/control allocations. The existing Graphics and coverage rules cover this distinction.

## Maintainer asks

- #902: Preserve traced raw sectors in the media inventory, including saved sectors marked free in the disk allocation map.

## What cost the most time

Preserving block boundaries during project reconstruction would have saved the most repeated type repair and comparison work.

## Host and tool behaviour

The run used macOS on ARM64, VICE MCP v3.14.0's official headless build with dummy audio, and regenerator2000 0.9.18. VICE's host-key check failed, while matrix input, exact instruction stops, watchpoints, and deterministic snapshots passed. The application stayed headless throughout the analysis. The page review used an already installed Playwright Firefox with a fresh profile under `tools/`; sound checks ran the site's AudioWorklet source and SID model without a browser audio device.

The native disassembler's split low/high address type can misidentify unrelated targets. The run kept such directories as bytes and decoded the paired operands explicitly. The failure was visible during export, and the tool notes already cover it.
