import type { FileSystemNode } from './types';
import { supabase } from '@/integrations/supabase/client';

interface GitState {
  initialized: boolean;
  staged: Record<string, string>; // filename -> content snapshot
  commits: GitCommit[];
  branches: Record<string, number>; // branch name -> commit index
  currentBranch: string;
  remotes: Record<string, string>; // name -> url
  remoteShas?: Record<string, string>; // path -> sha (for push updates)
}

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  files: Record<string, string>; // snapshot of staged files
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'ascii';
  text: string;
}

function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

function shortHash(hash: string): string {
  return hash.substring(0, 7);
}

function getGitState(dir: Record<string, FileSystemNode> | null): GitState | null {
  if (!dir?.['.git']) return null;
  try {
    return JSON.parse(dir['.git'].content || '{}');
  } catch {
    return null;
  }
}

function createGitState(): GitState {
  return {
    initialized: true,
    staged: {},
    commits: [],
    branches: { main: -1 },
    currentBranch: 'main',
    remotes: {},
    remoteShas: {},
  };
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle https://github.com/owner/repo.git or github.com/owner/repo
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

function buildFileSystem(files: Record<string, string>, gitState: GitState): Record<string, FileSystemNode> {
  const root: Record<string, FileSystemNode> = {};
  const now = new Date().toISOString();

  for (const [filePath, content] of Object.entries(files)) {
    const parts = filePath.split('/');
    const fileName = parts.pop()!;

    let current = root;
    for (const part of parts) {
      if (!current[part]) {
        current[part] = { name: part, type: 'directory', createdAt: now, children: {} };
      }
      current = current[part].children!;
    }
    current[fileName] = { name: fileName, type: 'file', content, createdAt: now };
  }

  // Add .git metadata
  root['.git'] = { name: '.git', type: 'file', content: JSON.stringify(gitState), createdAt: now };
  return root;
}

async function callGitHubApi(body: Record<string, unknown>, userId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('github-api', { body: { ...body, user_id: userId } });
  if (error) throw new Error(error.message || 'Edge function error');
  if (data?.error) throw new Error(data.error);
  return data;
}

// Async git commands that need network
export async function handleAsyncGitCommand(
  args: string[],
  currentPath: string[],
  fileSystem: Record<string, FileSystemNode>,
  username: string,
  userId: string,
  updateFs: (path: string[], name: string, node: FileSystemNode | null) => void,
  getDir: (path: string[]) => Record<string, FileSystemNode> | null,
  addLines: (lines: TerminalLine[]) => void,
): Promise<void> {
  const subcommand = args[0]?.toLowerCase();
  const subArgs = args.slice(1);
  const dir = getDir(currentPath);

  if (subcommand === 'clone') {
    if (!subArgs[0]) {
      addLines([{ type: 'error', text: 'fatal: You must specify a repository to clone.' }]);
      return;
    }

    const url = subArgs[0];
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      addLines([{ type: 'error', text: 'fatal: Only GitHub URLs are supported (https://github.com/owner/repo)' }]);
      return;
    }

    const dirName = subArgs[1] || parsed.repo;
    addLines([
      { type: 'output', text: `Cloning into '${dirName}'...` },
      { type: 'output', text: `remote: Connecting to github.com...` },
    ]);

    try {
      const data = await callGitHubApi({
        action: 'clone',
        owner: parsed.owner,
        repo: parsed.repo,
      }, userId);

      const gitState = createGitState();
      gitState.remotes['origin'] = url;
      gitState.currentBranch = data.branch || 'main';

      const hash = generateHash();
      gitState.commits.push({
        hash,
        message: 'Initial clone',
        author: 'remote',
        timestamp: new Date().toISOString(),
        files: { ...data.files },
      });
      gitState.branches[gitState.currentBranch] = 0;

      const children = buildFileSystem(data.files, gitState);

      updateFs(currentPath, dirName, {
        name: dirName, type: 'directory', createdAt: new Date().toISOString(), children,
      });

      const lines: TerminalLine[] = [
        { type: 'output', text: `remote: Enumerating objects: done.` },
        { type: 'output', text: `remote: Counting objects: 100%, done.` },
        { type: 'output', text: `Receiving objects: 100% (${data.fetchedFiles}/${data.totalFiles}), done.` },
      ];
      if (data.truncated) {
        lines.push({ type: 'system', text: `Note: Large repo — fetched ${data.fetchedFiles} of ${data.totalFiles} files (skipped large/binary files).` });
      }
      addLines(lines);
    } catch (err: any) {
      addLines([{ type: 'error', text: `fatal: ${err.message}` }]);
    }
    return;
  }

  if (subcommand === 'pull') {
    const git = getGitState(dir);
    if (!git) { addLines([{ type: 'error', text: 'fatal: not a git repository' }]); return; }

    const remoteUrl = Object.values(git.remotes)[0];
    if (!remoteUrl) { addLines([{ type: 'error', text: 'fatal: No remote configured. Use "git remote add origin <url>"' }]); return; }

    const parsed = parseGitHubUrl(remoteUrl);
    if (!parsed) { addLines([{ type: 'error', text: 'fatal: Remote is not a GitHub URL' }]); return; }

    addLines([{ type: 'output', text: `remote: Fetching from ${parsed.owner}/${parsed.repo}...` }]);

    try {
      const data = await callGitHubApi({
        action: 'pull',
        owner: parsed.owner,
        repo: parsed.repo,
        branch: git.currentBranch,
      }, userId);

      // Update files in current directory
      let updated = 0;
      let added = 0;
      for (const [filePath, content] of Object.entries(data.files as Record<string, string>)) {
        // Only handle top-level files for simplicity in current dir
        if (!filePath.includes('/')) {
          const existing = dir?.[filePath];
          if (existing) { updated++; } else { added++; }
          updateFs(currentPath, filePath, {
            name: filePath, type: 'file', content, createdAt: new Date().toISOString(),
          });
        }
      }

      // Update git state
      const hash = generateHash();
      git.commits.push({
        hash,
        message: `Pull from ${parsed.owner}/${parsed.repo}`,
        author: 'remote',
        timestamp: new Date().toISOString(),
        files: { ...(git.commits.length > 0 ? git.commits[git.commits.length - 1].files : {}), ...data.files },
      });
      git.branches[git.currentBranch] = git.commits.length - 1;
      updateFs(currentPath, '.git', {
        name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt,
      });

      addLines([
        { type: 'output', text: `From github.com:${parsed.owner}/${parsed.repo}` },
        { type: 'output', text: `   ${shortHash(hash)}  ${git.currentBranch} -> origin/${git.currentBranch}` },
        { type: 'output', text: `${added} files added, ${updated} files updated.` },
      ]);
    } catch (err: any) {
      addLines([{ type: 'error', text: `fatal: ${err.message}` }]);
    }
    return;
  }

  if (subcommand === 'push') {
    const git = getGitState(dir);
    if (!git) { addLines([{ type: 'error', text: 'fatal: not a git repository' }]); return; }
    if (git.commits.length === 0) { addLines([{ type: 'error', text: 'error: src refspec main does not match any' }]); return; }

    const remoteUrl = Object.values(git.remotes)[0];
    if (!remoteUrl) { addLines([{ type: 'error', text: 'fatal: No remote configured.' }]); return; }

    const parsed = parseGitHubUrl(remoteUrl);
    if (!parsed) { addLines([{ type: 'error', text: 'fatal: Remote is not a GitHub URL' }]); return; }

    const lastCommit = git.commits[git.commits.length - 1];
    const filesToPush = Object.entries(lastCommit.files);

    if (filesToPush.length === 0) {
      addLines([{ type: 'output', text: 'Everything up-to-date' }]);
      return;
    }

    addLines([
      { type: 'output', text: `Pushing to github.com:${parsed.owner}/${parsed.repo}...` },
      { type: 'output', text: `Enumerating objects: ${filesToPush.length}, done.` },
    ]);

    try {
      let pushed = 0;
      for (const [filePath, content] of filesToPush) {
        // Try to get existing SHA for updates
        let sha: string | undefined;
        try {
          const shaData = await callGitHubApi({
            action: 'get_sha',
            owner: parsed.owner,
            repo: parsed.repo,
            path: filePath,
            branch: git.currentBranch,
          }, userId);
          sha = shaData.sha;
        } catch {
          // File doesn't exist yet, that's fine
        }

        await callGitHubApi({
          action: 'push',
          owner: parsed.owner,
          repo: parsed.repo,
          path: filePath,
          content,
          message: lastCommit.message,
          branch: git.currentBranch,
          sha,
        }, userId);
        pushed++;
      }

      addLines([
        { type: 'output', text: `Writing objects: 100% (${pushed}/${filesToPush.length}), done.` },
        { type: 'output', text: `To github.com:${parsed.owner}/${parsed.repo}.git` },
        { type: 'output', text: `   ${shortHash(lastCommit.hash)}  ${git.currentBranch} -> ${git.currentBranch}` },
      ]);
    } catch (err: any) {
      addLines([{ type: 'error', text: `fatal: ${err.message}` }]);
    }
    return;
  }
}

// Returns true if the command is async (clone/pull/push with GitHub remote)
export function isAsyncGitCommand(args: string[]): boolean {
  const sub = args[0]?.toLowerCase();
  return sub === 'clone' || sub === 'pull' || sub === 'push';
}

// Synchronous git commands (local simulation)
export function handleGitCommand(
  args: string[],
  currentPath: string[],
  fileSystem: Record<string, FileSystemNode>,
  username: string,
  updateFs: (path: string[], name: string, node: FileSystemNode | null) => void,
  getDir: (path: string[]) => Record<string, FileSystemNode> | null,
): TerminalLine[] {
  const subcommand = args[0]?.toLowerCase();
  const subArgs = args.slice(1);
  const dir = getDir(currentPath);

  if (!subcommand) {
    return [{ type: 'output', text: 'usage: git <command> [<args>]' },
      { type: 'output', text: 'Try "help" to see git commands.' }];
  }

  switch (subcommand) {
    case 'init': {
      if (dir?.['.git']) {
        return [{ type: 'output', text: `Reinitialized existing Git repository in /${currentPath.join('/')}/.git/` }];
      }
      const state = createGitState();
      updateFs(currentPath, '.git', {
        name: '.git', type: 'file', content: JSON.stringify(state), createdAt: new Date().toISOString(),
      });
      return [{ type: 'output', text: `Initialized empty Git repository in /${currentPath.join('/')}/.git/` }];
    }

    case 'status': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository (or any of the parent directories): .git' }];

      const lines: TerminalLine[] = [{ type: 'output', text: `On branch ${git.currentBranch}` }];

      if (git.commits.length === 0) lines.push({ type: 'output', text: '\nNo commits yet\n' });

      const stagedFiles = Object.keys(git.staged);
      if (stagedFiles.length > 0) {
        lines.push({ type: 'output', text: 'Changes to be committed:' });
        lines.push({ type: 'output', text: '  (use "git restore --staged <file>..." to unstage)' });
        stagedFiles.forEach(f => lines.push({ type: 'ascii', text: `\tnew file:   ${f}` }));
        lines.push({ type: 'output', text: '' });
      }

      if (dir) {
        const untracked = Object.keys(dir).filter(k => k !== '.git' && !git.staged[k]);
        const lastCommit = git.commits.length > 0 ? git.commits[git.commits.length - 1] : null;
        const modified: string[] = [];
        const untrackedList: string[] = [];

        untracked.forEach(f => {
          if (dir[f].type === 'file') {
            if (lastCommit?.files[f] !== undefined) {
              if (lastCommit.files[f] !== (dir[f].content || '')) modified.push(f);
            } else {
              untrackedList.push(f);
            }
          }
        });

        if (modified.length > 0) {
          lines.push({ type: 'output', text: 'Changes not staged for commit:' });
          modified.forEach(f => lines.push({ type: 'error', text: `\tmodified:   ${f}` }));
          lines.push({ type: 'output', text: '' });
        }

        if (untrackedList.length > 0) {
          lines.push({ type: 'output', text: 'Untracked files:' });
          lines.push({ type: 'output', text: '  (use "git add <file>..." to include in what will be committed)' });
          untrackedList.forEach(f => lines.push({ type: 'error', text: `\t${f}` }));
        }

        if (stagedFiles.length === 0 && untrackedList.length === 0 && modified.length === 0) {
          lines.push({ type: 'output', text: 'nothing to commit, working tree clean' });
        }
      }

      return lines;
    }

    case 'add': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      if (!subArgs[0]) return [{ type: 'error', text: 'Nothing specified, nothing added.' }];

      const newStaged = { ...git.staged };
      if (subArgs[0] === '.') {
        if (dir) {
          Object.entries(dir).forEach(([name, node]) => {
            if (name !== '.git' && node.type === 'file') newStaged[name] = node.content || '';
          });
        }
      } else {
        const file = dir?.[subArgs[0]];
        if (!file || file.type !== 'file') return [{ type: 'error', text: `fatal: pathspec '${subArgs[0]}' did not match any files` }];
        newStaged[subArgs[0]] = file.content || '';
      }

      git.staged = newStaged;
      updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
      return [];
    }

    case 'commit': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];

      const mIdx = subArgs.indexOf('-m');
      if (mIdx === -1 || !subArgs[mIdx + 1]) return [{ type: 'error', text: 'error: switch `m\' requires a value' }];
      const message = subArgs.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '');

      if (Object.keys(git.staged).length === 0) return [{ type: 'output', text: 'nothing to commit (create/copy files and use "git add" to track)' }];

      const hash = generateHash();
      const commit: GitCommit = {
        hash, message, author: username, timestamp: new Date().toISOString(),
        files: { ...(git.commits.length > 0 ? git.commits[git.commits.length - 1].files : {}), ...git.staged },
      };

      git.commits.push(commit);
      git.branches[git.currentBranch] = git.commits.length - 1;
      const fileCount = Object.keys(git.staged).length;
      git.staged = {};

      updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });

      return [
        { type: 'output', text: `[${git.currentBranch} ${shortHash(hash)}] ${message}` },
        { type: 'output', text: ` ${fileCount} file${fileCount !== 1 ? 's' : ''} changed` },
      ];
    }

    case 'log': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      if (git.commits.length === 0) return [{ type: 'error', text: `fatal: your current branch '${git.currentBranch}' does not have any commits yet` }];

      const lines: TerminalLine[] = [];
      for (let i = git.commits.length - 1; i >= 0; i--) {
        const c = git.commits[i];
        const branchLabels = Object.entries(git.branches).filter(([, idx]) => idx === i).map(([name]) => name);
        const headLabel = branchLabels.includes(git.currentBranch)
          ? ` (HEAD -> ${git.currentBranch}${branchLabels.filter(b => b !== git.currentBranch).map(b => `, ${b}`).join('')})`
          : branchLabels.length > 0 ? ` (${branchLabels.join(', ')})` : '';

        lines.push({ type: 'ascii', text: `commit ${c.hash}${headLabel}` });
        lines.push({ type: 'output', text: `Author: ${c.author}` });
        lines.push({ type: 'output', text: `Date:   ${new Date(c.timestamp).toLocaleString()}` });
        lines.push({ type: 'output', text: '' });
        lines.push({ type: 'output', text: `    ${c.message}` });
        lines.push({ type: 'output', text: '' });
      }
      return lines;
    }

    case 'branch': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];

      if (!subArgs[0]) {
        return Object.keys(git.branches).map(b => ({
          type: 'output' as const, text: `${b === git.currentBranch ? '* ' : '  '}${b}`,
        }));
      }

      if (subArgs[0] === '-d' || subArgs[0] === '-D') {
        const name = subArgs[1];
        if (!name) return [{ type: 'error', text: 'fatal: branch name required' }];
        if (name === git.currentBranch) return [{ type: 'error', text: `error: Cannot delete branch '${name}' checked out` }];
        if (!git.branches[name]) return [{ type: 'error', text: `error: branch '${name}' not found.` }];
        delete git.branches[name];
        updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
        return [{ type: 'output', text: `Deleted branch ${name}.` }];
      }

      const name = subArgs[0];
      if (git.branches[name] !== undefined) return [{ type: 'error', text: `fatal: A branch named '${name}' already exists.` }];
      git.branches[name] = git.commits.length - 1;
      updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
      return [{ type: 'output', text: `Created branch '${name}'` }];
    }

    case 'checkout': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];

      if (subArgs[0] === '-b') {
        const name = subArgs[1];
        if (!name) return [{ type: 'error', text: 'fatal: branch name required' }];
        if (git.branches[name] !== undefined) return [{ type: 'error', text: `fatal: A branch named '${name}' already exists.` }];
        git.branches[name] = git.branches[git.currentBranch];
        git.currentBranch = name;
        updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
        return [{ type: 'output', text: `Switched to a new branch '${name}'` }];
      }

      const target = subArgs[0];
      if (!target) return [{ type: 'error', text: 'error: please specify a branch' }];
      if (git.branches[target] === undefined) return [{ type: 'error', text: `error: pathspec '${target}' did not match any known branch` }];
      git.currentBranch = target;
      updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
      return [{ type: 'output', text: `Switched to branch '${target}'` }];
    }

    case 'diff': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      if (git.commits.length === 0) return [{ type: 'output', text: 'No commits to diff against.' }];

      const lastCommit = git.commits[git.commits.length - 1];
      const lines: TerminalLine[] = [];

      if (dir) {
        Object.entries(dir).forEach(([name, node]) => {
          if (name === '.git' || node.type !== 'file') return;
          const committed = lastCommit.files[name];
          const current = node.content || '';

          if (committed === undefined) {
            lines.push({ type: 'ascii', text: `diff --git a/${name} b/${name}` });
            lines.push({ type: 'ascii', text: `new file mode 100644` });
            current.split('\n').forEach(l => lines.push({ type: 'ascii', text: `+ ${l}` }));
            lines.push({ type: 'output', text: '' });
          } else if (committed !== current) {
            lines.push({ type: 'ascii', text: `diff --git a/${name} b/${name}` });
            committed.split('\n').forEach(l => lines.push({ type: 'error', text: `- ${l}` }));
            current.split('\n').forEach(l => lines.push({ type: 'ascii', text: `+ ${l}` }));
            lines.push({ type: 'output', text: '' });
          }
        });

        Object.keys(lastCommit.files).forEach(name => {
          if (!dir[name]) {
            lines.push({ type: 'ascii', text: `diff --git a/${name} b/${name}` });
            lines.push({ type: 'error', text: `deleted file mode 100644` });
            lastCommit.files[name].split('\n').forEach(l => lines.push({ type: 'error', text: `- ${l}` }));
            lines.push({ type: 'output', text: '' });
          }
        });
      }

      if (lines.length === 0) lines.push({ type: 'output', text: 'No changes.' });
      return lines;
    }

    case 'remote': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];

      if (!subArgs[0] || subArgs[0] === '-v') {
        const remotes = Object.entries(git.remotes);
        if (remotes.length === 0) return [];
        return remotes.flatMap(([name, url]) => [
          { type: 'output' as const, text: `${name}\t${url} (fetch)` },
          { type: 'output' as const, text: `${name}\t${url} (push)` },
        ]);
      }

      if (subArgs[0] === 'add') {
        const name = subArgs[1];
        const url = subArgs[2];
        if (!name || !url) return [{ type: 'error', text: 'usage: git remote add <name> <url>' }];
        if (git.remotes[name]) return [{ type: 'error', text: `error: remote ${name} already exists.` }];
        git.remotes[name] = url;
        updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
        return [];
      }

      if (subArgs[0] === 'remove' || subArgs[0] === 'rm') {
        const name = subArgs[1];
        if (!name || !git.remotes[name]) return [{ type: 'error', text: `error: No such remote: '${subArgs[1]}'` }];
        delete git.remotes[name];
        updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
        return [];
      }

      return [{ type: 'error', text: `error: Unknown subcommand: ${subArgs[0]}` }];
    }

    default:
      return [{ type: 'error', text: `git: '${subcommand}' is not a git command. See 'help'.` }];
  }
}
