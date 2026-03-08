

# Real GitHub Integration for SolarnovaOS Terminal

## Overview
Add real GitHub API integration so terminal `git clone`, `git pull`, and `git push` commands interact with actual GitHub repositories. The simulated git commands (branch, commit, status, etc.) will remain for local operations, but clone/pull/push will talk to the real GitHub API.

## What's Needed
A **GitHub Personal Access Token (PAT)** from the user, stored as a secret. This token allows the edge function to authenticate with GitHub's API to read/write repository contents.

## Architecture

```text
Terminal Command → Edge Function (github-api) → GitHub REST API
                        ↓
              Virtual File System (populated with real files)
```

## Changes

### 1. New Secret: `GITHUB_PAT`
- Prompt user to add their GitHub Personal Access Token via the secrets tool
- Token needs `repo` scope for private repos, or no scope for public-only

### 2. New Edge Function: `supabase/functions/github-api/index.ts`
- Proxies requests to `https://api.github.com`
- Supports actions:
  - **clone**: `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` to get file tree, then fetch each file's content via the blobs API
  - **pull**: Same as clone but merges into existing directory
  - **push**: Creates/updates files via `PUT /repos/{owner}/{repo}/contents/{path}` for each changed file
- Uses `GITHUB_PAT` secret for authentication
- Returns file tree + contents as JSON

### 3. Update `src/components/desktop/terminalGit.ts`
- Modify `clone`, `pull`, `push` cases to call the `github-api` edge function instead of simulating output
- `git clone <url>` → parse owner/repo from URL, call edge function, populate virtual FS with real files
- `git push` → collect changed files since last commit, send to edge function to push to GitHub
- `git pull` → fetch latest files from remote and update virtual FS

### 4. Update `src/components/desktop/DesktopTerminal.tsx`
- Make the git command handler async to support edge function calls
- Show loading indicators during network operations ("Cloning...", "Pushing...")

## Limitations
- Large repos will be slow (GitHub API rate limits, file-by-file fetching)
- Binary files won't render well in the virtual FS text editor
- Push requires write access on the repo

