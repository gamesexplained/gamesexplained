#!/usr/bin/env bash
# Sends the five beebjit fixes upstream from Aaron's GitHub account (air): forks
# scarybeasts/beebjit into the gamesexplained org, pushes one branch per patch to the fork,
# and opens an issue and a pull request for each on scarybeasts/beebjit, the pull request
# saying "Fixes #<its issue>". The first issue then gets a line linking the other four.
#
#   bash post.sh              # do it
#   DRY_RUN=1 bash post.sh    # apply every patch and check it, then print what would be posted
#
# Each patch is applied to upstream master 2ff70a0, the commit it was written and tested on,
# and must give exactly the tree of the branch that was tested; anything else stops the
# script before it pushes or posts. Finished steps are written to posted.txt beside this
# file, so a second run after a failure skips them instead of posting twice: run it again
# from the same folder.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPSTREAM=scarybeasts/beebjit
FORK_ORG=gamesexplained
FORK="${FORK_ORG}/beebjit"
BASE_SHA=2ff70a06e83ca5cfb09c0cdff2f23e5f4113b633
STATE="${HERE}/posted.txt"
DRY="${DRY_RUN:-}"

# number | branch | patch | tree of the tested branch | issue title | pull request title | draft
ITEMS=(
"1|savemem-64k|1-savemem-64k.patch|588b81106d1b5e14937ac85430dfa047dafdee18|savemem can't save all 64K, and loadmem of a 64K file loads nothing|Allow savemem and loadmem to cover all 64K of memory|"
"2|debug-keys|2-debug-keys.patch|8e6ac8d1df098fc1ad95d4c45e9ea4236e7640f8|A key pressed in the debugger can arrive 40,000 cycles late|Apply debugger keydown and keyup before the next instruction|"
"3|savecounts|3-savecounts.patch|75a3b7b62c28b6c29a0343380a3f05af5eee05e8|No way to save the stats count of every executed address|Add savecounts, to save the stats count of every executed address|"
"4|debug-set-pc|4-debug-set-pc.patch|c20a639330cfa5b13d2af63bb8c2c8332f49dd02|Setting PC from the debugger runs the old opcode|Fetch the opcode again after the debugger, in case it changed PC|"
"5|state-load-exact|5-state-load-exact.patch|24d0f5d98a0a0b7f3d8506fc3555d6f4278ae365|A loaded state doesn't carry on the way the saved machine would|Make a state load carry on exactly where the save left off|draft"
)
LABELS=("" "" "keys pressed in the debugger" "savecounts" "setting PC from the debugger" "loading a state")

get_state() { if [ -f "$STATE" ]; then awk -v k="$1" '$1 == k { v = $2 } END { if (v != "") print v }' "$STATE"; fi; }
set_state() { if [ -z "$DRY" ]; then printf '%s %s\n' "$1" "$2" >> "$STATE"; fi; }

command -v git >/dev/null || { echo "git is not installed" >&2; exit 1; }
if [ -z "$DRY" ]; then
  command -v gh >/dev/null || { echo "gh is not installed" >&2; exit 1; }
  login="$(gh api user --jq .login)"
  [ "$login" = "air" ] || { echo "gh is logged in as ${login}, not air" >&2; exit 1; }
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/beebjit-upstream.XXXXXX")"
echo "working in ${WORK}"

# The fork, made once.
if [ -z "$DRY" ]; then
  if ! gh api "repos/${FORK}" >/dev/null 2>&1; then
    gh repo fork "$UPSTREAM" --org "$FORK_ORG" --clone=false --default-branch-only
    for _ in $(seq 1 30); do gh api "repos/${FORK}" >/dev/null 2>&1 && break; sleep 2; done
  fi
  parent="$(gh api "repos/${FORK}" --jq 'if .fork then .parent.full_name else "" end')"
  [ "$parent" = "$UPSTREAM" ] || { echo "${FORK} exists but is not a fork of ${UPSTREAM}" >&2; exit 1; }
  gh repo clone "$FORK" "${WORK}/beebjit" -- --quiet
  cd "${WORK}/beebjit"
  git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "https://github.com/${UPSTREAM}.git"
else
  git clone --quiet "https://github.com/${UPSTREAM}.git" "${WORK}/beebjit"
  cd "${WORK}/beebjit"
  git remote rename origin upstream
fi
git fetch --quiet upstream master
git config user.name "Aaron Bell"
git config user.email "18724+air@users.noreply.github.com"
git config commit.gpgsign false
head_sha="$(git rev-parse upstream/master)"
if [ "$head_sha" != "$BASE_SHA" ]; then
  echo "note: upstream master is ${head_sha}; the branches are based on ${BASE_SHA}, where they were tested"
fi

# Every branch is built and checked before anything is pushed.
for item in "${ITEMS[@]}"; do
  IFS='|' read -r n branch patch tree ititle ptitle draft <<<"$item"
  git checkout --quiet -B "$branch" "$BASE_SHA"
  if ! git am --quiet --3way "${HERE}/${patch}"; then
    git am --abort || true
    echo "${patch} does not apply to ${BASE_SHA}" >&2; exit 1
  fi
  got="$(git rev-parse "HEAD^{tree}")"
  [ "$got" = "$tree" ] || { echo "${patch} gave tree ${got}, not the tested ${tree}" >&2; exit 1; }
  echo "${branch}: applies, and gives the tested tree"
done

for item in "${ITEMS[@]}"; do
  IFS='|' read -r n branch patch tree ititle ptitle draft <<<"$item"
  if [ -z "$(get_state "push-${n}")" ]; then
    if [ -n "$DRY" ]; then
      echo "would push ${branch} to ${FORK}"
    else
      git push --quiet origin "$branch"
      set_state "push-${n}" "$(git rev-parse "$branch")"
    fi
  fi
done

cd "$WORK"     # gh pr create outside any clone, so that it takes --head as given and pushes nothing
NUMS=("")
for item in "${ITEMS[@]}"; do
  IFS='|' read -r n branch patch tree ititle ptitle draft <<<"$item"
  issue="$(get_state "issue-${n}")"
  if [ -z "$issue" ]; then
    if [ -n "$DRY" ]; then
      echo "would open issue: ${ititle}"
      issue="https://github.com/${UPSTREAM}/issues/${n}00"
    else
      issue="$(gh issue create --repo "$UPSTREAM" --title "$ititle" --body-file "${HERE}/${n}-issue.md")"
      set_state "issue-${n}" "$issue"
    fi
  fi
  num="${issue##*/}"
  NUMS+=("$num")
  pr="$(get_state "pr-${n}")"
  if [ -z "$pr" ]; then
    sed "s/#ISSUE/#${num}/" "${HERE}/${n}-pr.md" > "${WORK}/${n}-pr.md"
    # --no-maintainer-edit: GitHub can't give upstream push access to a fork owned by an
    # organisation, and refuses a pull request that asks for it.
    args=(--repo "$UPSTREAM" --base master --head "${FORK_ORG}:${branch}" --title "$ptitle" --body-file "${WORK}/${n}-pr.md" --no-maintainer-edit)
    if [ -n "$draft" ]; then args+=(--draft); fi
    if [ -n "$DRY" ]; then
      echo "would open pull request${draft:+ (draft)}: ${ptitle}, head ${FORK_ORG}:${branch}, body:"
      sed 's/^/    /' "${WORK}/${n}-pr.md" | head -3
      pr="(not opened)"
    else
      pr="$(gh pr create "${args[@]}")"
      set_state "pr-${n}" "$pr"
    fi
  fi
  echo "${n}: issue ${issue}  pull request ${pr}"
done

if [ -z "$(get_state links-1)" ]; then
  cp "${HERE}/1-issue.md" "${WORK}/1-issue-linked.md"
  printf '\nThe other four: #%s (%s), #%s (%s), #%s (%s) and #%s (%s).\n' \
    "${NUMS[2]}" "${LABELS[2]}" "${NUMS[3]}" "${LABELS[3]}" "${NUMS[4]}" "${LABELS[4]}" "${NUMS[5]}" "${LABELS[5]}" \
    >> "${WORK}/1-issue-linked.md"
  if [ -n "$DRY" ]; then
    echo "would add to the first issue:"; tail -n 1 "${WORK}/1-issue-linked.md"
  else
    gh issue edit "${NUMS[1]}" --repo "$UPSTREAM" --body-file "${WORK}/1-issue-linked.md" >/dev/null
    set_state links-1 done
  fi
fi
echo "done"
