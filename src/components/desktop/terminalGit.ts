import type { FileSystemNode } from './types';

interface GitState {
  initialized: boolean;
  staged: Record<string, string>; // filename -> content snapshot
  commits: GitCommit[];
  branches: Record<string, number>; // branch name -> commit index
  currentBranch: string;
  remotes: Record<string, string>; // name -> url
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
  };
}

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
        name: '.git',
        type: 'file',
        content: JSON.stringify(state),
        createdAt: new Date().toISOString(),
      });
      return [{ type: 'output', text: `Initialized empty Git repository in /${currentPath.join('/')}/.git/` }];
    }

    case 'status': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository (or any of the parent directories): .git' }];

      const lines: TerminalLine[] = [
        { type: 'output', text: `On branch ${git.currentBranch}` },
      ];

      if (git.commits.length === 0) {
        lines.push({ type: 'output', text: '\nNo commits yet\n' });
      }

      // Staged files
      const stagedFiles = Object.keys(git.staged);
      if (stagedFiles.length > 0) {
        lines.push({ type: 'output', text: 'Changes to be committed:' });
        lines.push({ type: 'output', text: '  (use "git restore --staged <file>..." to unstage)' });
        stagedFiles.forEach(f => lines.push({ type: 'ascii', text: `\tnew file:   ${f}` }));
        lines.push({ type: 'output', text: '' });
      }

      // Untracked files
      if (dir) {
        const untracked = Object.keys(dir).filter(k => k !== '.git' && !git.staged[k]);
        // Check for modified (in last commit but changed)
        const lastCommit = git.commits.length > 0 ? git.commits[git.commits.length - 1] : null;
        const modified: string[] = [];
        const untrackedList: string[] = [];

        untracked.forEach(f => {
          if (dir[f].type === 'file') {
            if (lastCommit?.files[f] !== undefined) {
              if (lastCommit.files[f] !== (dir[f].content || '')) {
                modified.push(f);
              }
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
        // Add all files
        if (dir) {
          Object.entries(dir).forEach(([name, node]) => {
            if (name !== '.git' && node.type === 'file') {
              newStaged[name] = node.content || '';
            }
          });
        }
      } else {
        const file = dir?.[subArgs[0]];
        if (!file || file.type !== 'file') {
          return [{ type: 'error', text: `fatal: pathspec '${subArgs[0]}' did not match any files` }];
        }
        newStaged[subArgs[0]] = file.content || '';
      }

      git.staged = newStaged;
      updateFs(currentPath, '.git', {
        name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt,
      });
      return [];
    }

    case 'commit': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];

      // Parse -m "message"
      const mIdx = subArgs.indexOf('-m');
      if (mIdx === -1 || !subArgs[mIdx + 1]) {
        return [{ type: 'error', text: 'error: switch `m\' requires a value' }];
      }
      const message = subArgs.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '');

      if (Object.keys(git.staged).length === 0) {
        return [{ type: 'output', text: 'nothing to commit (create/copy files and use "git add" to track)' }];
      }

      const hash = generateHash();
      const commit: GitCommit = {
        hash,
        message,
        author: username,
        timestamp: new Date().toISOString(),
        files: { ...(git.commits.length > 0 ? git.commits[git.commits.length - 1].files : {}), ...git.staged },
      };

      git.commits.push(commit);
      git.branches[git.currentBranch] = git.commits.length - 1;
      const fileCount = Object.keys(git.staged).length;
      git.staged = {};

      updateFs(currentPath, '.git', {
        name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt,
      });

      return [
        { type: 'output', text: `[${git.currentBranch} ${shortHash(hash)}] ${message}` },
        { type: 'output', text: ` ${fileCount} file${fileCount !== 1 ? 's' : ''} changed` },
      ];
    }

    case 'log': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      if (git.commits.length === 0) {
        return [{ type: 'error', text: `fatal: your current branch '${git.currentBranch}' does not have any commits yet` }];
      }

      const lines: TerminalLine[] = [];
      for (let i = git.commits.length - 1; i >= 0; i--) {
        const c = git.commits[i];
        const branchLabels = Object.entries(git.branches)
          .filter(([, idx]) => idx === i)
          .map(([name]) => name);
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
        // List branches
        return Object.keys(git.branches).map(b => ({
          type: 'output' as const,
          text: `${b === git.currentBranch ? '* ' : '  '}${b}`,
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

      // Create branch
      const name = subArgs[0];
      if (git.branches[name] !== undefined) {
        return [{ type: 'error', text: `fatal: A branch named '${name}' already exists.` }];
      }
      git.branches[name] = git.commits.length - 1;
      updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
      return [{ type: 'output', text: `Created branch '${name}'` }];
    }

    case 'checkout': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      const target = subArgs[0];

      if (subArgs[0] === '-b') {
        // Create and switch
        const name = subArgs[1];
        if (!name) return [{ type: 'error', text: 'fatal: branch name required' }];
        if (git.branches[name] !== undefined) return [{ type: 'error', text: `fatal: A branch named '${name}' already exists.` }];
        git.branches[name] = git.branches[git.currentBranch];
        git.currentBranch = name;
        updateFs(currentPath, '.git', { name: '.git', type: 'file', content: JSON.stringify(git), createdAt: dir!['.git'].createdAt });
        return [{ type: 'output', text: `Switched to a new branch '${name}'` }];
      }

      if (!target) return [{ type: 'error', text: 'error: please specify a branch' }];
      if (git.branches[target] === undefined) {
        return [{ type: 'error', text: `error: pathspec '${target}' did not match any known branch` }];
      }
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
            const oldLines = committed.split('\n');
            const newLines = current.split('\n');
            oldLines.forEach(l => lines.push({ type: 'error', text: `- ${l}` }));
            newLines.forEach(l => lines.push({ type: 'ascii', text: `+ ${l}` }));
            lines.push({ type: 'output', text: '' });
          }
        });

        // Deleted files
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

    case 'push': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      const remote = Object.keys(git.remotes)[0] || 'origin';
      if (git.commits.length === 0) return [{ type: 'error', text: 'error: src refspec main does not match any' }];
      const last = git.commits[git.commits.length - 1];
      return [
        { type: 'output', text: `Enumerating objects: ${git.commits.length * 3}, done.` },
        { type: 'output', text: `Counting objects: 100% (${git.commits.length * 3}/${git.commits.length * 3}), done.` },
        { type: 'output', text: `Delta compression using up to 8 threads` },
        { type: 'output', text: `Compressing objects: 100%, done.` },
        { type: 'output', text: `Writing objects: 100%, done.` },
        { type: 'output', text: `To ${git.remotes[remote] || 'origin'}` },
        { type: 'output', text: `   ${shortHash(last.hash)}..${shortHash(last.hash)}  ${git.currentBranch} -> ${git.currentBranch}` },
      ];
    }

    case 'pull': {
      const git = getGitState(dir);
      if (!git) return [{ type: 'error', text: 'fatal: not a git repository' }];
      return [
        { type: 'output', text: `Already up to date.` },
      ];
    }

    case 'clone': {
      if (!subArgs[0]) return [{ type: 'error', text: 'fatal: You must specify a repository to clone.' }];
      const url = subArgs[0];
      const dirName = subArgs[1] || url.split('/').pop()?.replace('.git', '') || 'repo';

      // Create directory with sample files and initialized git
      const gitState = createGitState();
      gitState.remotes['origin'] = url;
      const hash = generateHash();
      gitState.commits.push({
        hash,
        message: 'Initial commit',
        author: 'remote',
        timestamp: new Date().toISOString(),
        files: { 'README.md': `# ${dirName}\n\nCloned from ${url}` },
      });
      gitState.branches['main'] = 0;

      const children: Record<string, FileSystemNode> = {
        'README.md': { name: 'README.md', type: 'file', content: `# ${dirName}\n\nCloned from ${url}`, createdAt: new Date().toISOString() },
        '.git': { name: '.git', type: 'file', content: JSON.stringify(gitState), createdAt: new Date().toISOString() },
      };

      updateFs(currentPath, dirName, {
        name: dirName, type: 'directory', createdAt: new Date().toISOString(), children,
      });

      return [
        { type: 'output', text: `Cloning into '${dirName}'...` },
        { type: 'output', text: `remote: Enumerating objects: 3, done.` },
        { type: 'output', text: `remote: Counting objects: 100% (3/3), done.` },
        { type: 'output', text: `Receiving objects: 100% (3/3), done.` },
      ];
    }

    default:
      return [{ type: 'error', text: `git: '${subcommand}' is not a git command. See 'help'.` }];
  }
}
