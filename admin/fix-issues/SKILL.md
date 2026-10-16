---
name: fix-issues
description: Burn down the open issues in gamesexplained/gamesexplained, oldest first, closing what is already done and fixing the rest in pull requests. Run by hand, e.g. /fix-issues.
disable-model-invocation: true
---

# Fixing open issues

This lives in `admin/` because `.claude/skills` is the contributor kit.

1. **Oldest first.** List the open issues oldest first
   (`gh issue list --state open --search "sort:created-asc"`) and take
   them in that order. Skip one only when it is blocked, and say what
   blocks it.
2. **Close what is already done.** Check each issue against `main`
   before fixing it. If a merged change already did it, close it with a
   comment naming that commit or pull request.
3. **One pull request per issue.** Closely related issues share one.
   Put `Closes #<n>` in the description for each.
4. **Fix the shared cause.** When other games or pages share the cause,
   fix it in `kit/` or `site/lib` and move them all onto it.

## Report

One line per issue: closed as done (and what did it), the pull request
that fixes it, or left open (what blocks it, or the call only the
maintainer can make).
