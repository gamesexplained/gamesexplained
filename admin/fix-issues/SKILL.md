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
2. **Question the issue first.** Is it clear what done looks like, and
   is the fix worth the code it adds? If not, put it to the maintainer,
   or close it with the reason, before writing anything.
3. **Close what is already done.** Check each issue against `main`
   before fixing it. If a merged change already did it, close it with a
   comment naming that commit or pull request.
4. **One pull request per issue.** Closely related issues share one.
   Put `Closes #<n>` in the description for each.
5. **Fix the shared cause.** When other games or pages share the cause,
   fix it in `kit/` or `site/lib` and move them all onto it.

## Report

One line per issue: closed as done (and what did it), the pull request
that fixes it, closed as not worth fixing (and why), or left open
(what blocks it, or the call only the maintainer can make).
