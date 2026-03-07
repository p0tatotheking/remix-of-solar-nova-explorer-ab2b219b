

# Add Git to SolarnovaOS Terminal

## Overview
Add a simulated `git` command to the SolarnovaOS desktop terminal that works with the virtual file system. This will simulate core Git workflows (init, add, commit, log, status, branch, checkout, diff, remote) using in-memory state stored alongside the file system.

## How It Works
Git state will be stored as a hidden `.git` object within each directory where `git init` is run. It will track:
- **Staged files** (the index/staging area)
- **Commits** (array of commit objects with message, timestamp, author, snapshot of staged files)
- **Branches** (map of branch name to commit index)
- **Current branch** name
- **Remote** (simulated remote name/URL)

All state lives in the virtual file system (persisted via the existing cross-device sync).

## Supported Commands

| Command | Behavior |
|---------|----------|
| `git init` | Creates `.git` metadata in current directory |
| `git status` | Shows staged, modified, untracked files |
| `git add <file>` / `git add .` | Stages files |
| `git commit -m "msg"` | Creates commit from staged files |
| `git log` | Shows commit history with hashes, author, date |
| `git branch` | Lists branches, highlights current |
| `git branch <name>` | Creates new branch |
| `git checkout <branch>` | Switches branch |
| `git diff` | Shows diff between working dir and last commit |
| `git remote add <name> <url>` | Simulates adding remote |
| `git remote -v` | Shows remotes |
| `git push` | Simulates push output |
| `git pull` | Simulates pull output |
| `git clone <url>` | Creates a directory with sample files |

## Technical Changes

**`src/components/desktop/DesktopTerminal.tsx`**:
- Add a `git` case to the command switch statement
- Implement a `handleGitCommand(args)` function that parses git subcommands
- Store git metadata as a `.git` entry (type `file`, content is JSON-stringified git state) in the file system via the existing `updateFs` helper
- Add git commands to the `HELP_TEXT` constant
- Generate short commit hashes (first 7 chars of a simple hash)

No database changes or new files needed -- this is purely a terminal command addition using the existing file system infrastructure.

