## 0.0.63 · 1 October 2026 · Jet Set Willy · 64kramsystem with Codex

Jet Set Willy, contributed by Saverio Miroddi: a reset acknowledgment in a
paused emulator did not execute the queued reset until a separate run.
The VICE workaround now requires a positive reset-entry control before
using checkpoint counts or bank-register reads to compare restart paths.
