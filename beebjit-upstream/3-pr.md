Fixes #ISSUE.

`savecounts <file>` writes every address that `stats` has counted, one per line in address order, as `ADDR: count`: four hex digits, then the count in decimal. Its help line sits next to `savemem`'s.

```
(6502db) stats
(6502db) breakat 2000000
(6502db) c
(6502db) savecounts counts.txt
```

After a boot to the BASIC prompt, `counts.txt` has 1,904 lines, where `ds` shows 256.

**Test:** "Checking savecounts." saves the counts from a boot to BASIC. It checks that there are more than 256 lines, and that `D9CF`, which runs once early in RESET, has a count of 1. `./build.sh` passes.
