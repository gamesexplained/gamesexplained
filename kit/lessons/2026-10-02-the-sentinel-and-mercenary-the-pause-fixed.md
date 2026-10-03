## 0.0.57 · 2 October 2026 · The Sentinel and Mercenary, the pause fixed in the emulator · air with Claude

**On a build that passes every check, read no workaround.** The pause
that stopped part way through an instruction, found in these two games on
26 September, is fixed in vice-mcp v3.13.2. Its GUI releases passed all
57 emulator checks in five runs each, on Linux x86_64 and on macOS arm64,
and `pause-at-instruction` held in all thirty pauses of every run, so its
section has left `workarounds.md`. What a pause inside the vertical sync
does to registers and snapshots is in the comment on `pause()` in
`kit/c64/vice.py`, which is still the stop to use on any build, and the
place to look when `check-emulator` reports that check failed on an
older one.
