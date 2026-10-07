# The hourly routine

A Routine fires every hour into the gamesexplained project thread that
set it up, "Automatic new-game PR review". Each firing finds the game
pull requests that need a review and asks the project's channel session
to start a thread for each; that thread runs `SKILL.md`. The routine
itself reviews nothing, and posts nothing unless something is broken.

Each firing:

1. `git fetch -q origin main`, and read this file as it is on
   `origin/main`: it may have changed since the last firing.
2. List the open pull requests on `gamesexplained/gamesexplained`
   (`list_pull_requests`, state open). Leave out drafts, and branches
   named `claude/...` in this repository: a project thread opened those
   and is already on them.
3. Read the ledger, `/mnt/project-files/pr-reviews/ledger.json`: for
   each pull request seen, `{"kind", "head", "state", "at"}`. The
   routine is its only writer, so no other session's write is lost.
4. For each pull request:
   - **Not in the ledger.** `git fetch -q origin
     +pull/<n>/head:refs/remotes/pr/<n>` and `pr_shape.py pr/<n>
     --json`. Kind `other`: record it as `skipped`. Otherwise ask for a
     review (step 5) and record it as `requested`.
   - **In the ledger as a game, with a new head.** Fetch it. If any
     commit since the recorded head was written by someone other than
     the maintainer (`git log <old>..<new> --format=%ae`; his addresses
     end in `air@users.noreply.github.com`), ask for a later round
     (step 5). Either way, record the new head.
   - **Requested more than three hours ago, and no
     `/mnt/project-files/pr-reviews/pr-<n>.md` yet.** Ask once more,
     then say so in this thread in one line if it still has not
     started.
   - Otherwise, nothing.
5. Ask the channel session (`get_channel_session_id`, then
   `send_message`). A first review: the number, title, author and kind,
   with this brief: "Start a thread to review PR #<n> following
   `admin/review-game-pr/SKILL.md` on main, replying there with the
   recommendation and the draft comment." A later round: the same, and
   the thread named in `pr-<n>.md` (its `Thread:` line), so the channel
   session forwards it there instead of starting another.
6. Write the ledger and end the turn without a reply. Reply in this
   thread, in one line, only when the maintainer has to fix something:
   GitHub access refused, the ledger unreadable, the channel session
   missing.
