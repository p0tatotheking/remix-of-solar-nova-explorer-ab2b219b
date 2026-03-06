import { useState, useRef, useCallback } from 'react';
import {
  FolderOpen, FileText, ChevronRight, ArrowLeft, Plus, FolderPlus,
  Download, Upload, Trash2, Edit3, Eye, Save, X, File, Search,
  Copy, Clipboard, MoreVertical, FileCode, FileImage
} from 'lucide-react';
import { toast } from 'sonner';
import type { FileSystemNode } from './types';

interface FileManagerProps {
  fileSystem: Record<string, FileSystemNode>;
  onFileSystemChange: (fs: Record<string, FileSystemNode>) => void;
}

type ViewMode = 'browse' | 'view' | 'edit' | 'create';

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'css', 'html', 'json', 'xml', 'yaml', 'sh'].includes(ext || ''))
    return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || ''))
    return <FileImage className="w-4 h-4 text-green-400 shrink-0" />;
  return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
}

function countChildren(node: FileSystemNode): number {
  if (node.type === 'file') return 0;
  return Object.keys(node.children || {}).length;
}

export function FileManager({ fileSystem, onFileSystemChange }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [editContent, setEditContent] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [createType, setCreateType] = useState<'file' | 'directory'>('file');
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; name: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deep clone helper
  const cloneFS = useCallback(() => JSON.parse(JSON.stringify(fileSystem)) as Record<string, FileSystemNode>, [fileSystem]);

  // Navigate to a directory within the FS
  const getNodeAtPath = useCallback((fs: Record<string, FileSystemNode>, path: string[]): Record<string, FileSystemNode> => {
    let current = fs;
    for (const seg of path) {
      const node = current[seg];
      if (node?.type === 'directory' && node.children) {
        current = node.children;
      } else break;
    }
    return current;
  }, []);

  const getCurrentDir = useCallback(() => getNodeAtPath(fileSystem, currentPath), [fileSystem, currentPath, getNodeAtPath]);

  const entries = getCurrentDir();
  const selectedNode = selectedFile ? entries[selectedFile] : null;

  // ---- CREATE ----
  const handleCreate = () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    const dir = getCurrentDir();
    if (dir[newName.trim()]) { toast.error('Already exists'); return; }

    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    const now = new Date().toISOString();

    if (createType === 'directory') {
      target[newName.trim()] = { name: newName.trim(), type: 'directory', createdAt: now, modifiedAt: now, children: {} };
    } else {
      target[newName.trim()] = { name: newName.trim(), type: 'file', createdAt: now, modifiedAt: now, content: '', size: 0 };
    }

    onFileSystemChange(fs);
    setNewName('');
    setViewMode('browse');
    toast.success(`${createType === 'directory' ? 'Folder' : 'File'} created`);
  };

  // ---- DELETE ----
  const handleDelete = (name: string) => {
    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    delete target[name];
    onFileSystemChange(fs);
    if (selectedFile === name) setSelectedFile(null);
    setShowContextMenu(null);
    toast.success(`Deleted "${name}"`);
  };

  // ---- RENAME ----
  const handleRename = (oldName: string) => {
    if (!renameValue.trim() || renameValue === oldName) { setRenaming(null); return; }
    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    if (target[renameValue.trim()]) { toast.error('Name already exists'); return; }
    target[renameValue.trim()] = { ...target[oldName], name: renameValue.trim(), modifiedAt: new Date().toISOString() };
    delete target[oldName];
    onFileSystemChange(fs);
    if (selectedFile === oldName) setSelectedFile(renameValue.trim());
    setRenaming(null);
    toast.success('Renamed');
  };

  // ---- SAVE EDIT ----
  const handleSaveEdit = () => {
    if (!editFileName) return;
    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    if (target[editFileName]) {
      target[editFileName].content = editContent;
      target[editFileName].modifiedAt = new Date().toISOString();
      target[editFileName].size = new Blob([editContent]).size;
    }
    onFileSystemChange(fs);
    setViewMode('browse');
    toast.success('File saved');
  };

  // ---- EXPORT / DOWNLOAD ----
  const handleExport = (name: string) => {
    const node = entries[name];
    if (!node) return;

    if (node.type === 'directory') {
      // Export directory as JSON
      const blob = new Blob([JSON.stringify(node, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported folder "${name}" as JSON`);
    } else {
      const content = node.content || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded "${name}"`);
    }
    setShowContextMenu(null);
  };

  // ---- IMPORT / UPLOAD ----
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    const now = new Date().toISOString();

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        target[file.name] = {
          name: file.name,
          type: 'file',
          content,
          createdAt: now,
          modifiedAt: now,
          size: file.size,
        };
      } catch {
        // Binary file - store metadata only
        target[file.name] = {
          name: file.name,
          type: 'file',
          content: `[Binary file: ${formatSize(file.size)}]`,
          createdAt: now,
          modifiedAt: now,
          size: file.size,
        };
      }
    }

    onFileSystemChange(fs);
    toast.success(`Imported ${files.length} file(s)`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- DUPLICATE ----
  const handleDuplicate = (name: string) => {
    const node = entries[name];
    if (!node) return;
    const fs = cloneFS();
    const target = getNodeAtPath(fs, currentPath);
    let copyName = `${name} (copy)`;
    let i = 2;
    while (target[copyName]) { copyName = `${name} (copy ${i++})`; }
    target[copyName] = JSON.parse(JSON.stringify({ ...node, name: copyName, modifiedAt: new Date().toISOString() }));
    onFileSystemChange(fs);
    setShowContextMenu(null);
    toast.success(`Duplicated "${name}"`);
  };

  // Filter entries by search
  const filteredEntries = Object.entries(entries)
    .filter(([name]) => !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(([, a], [, b]) => (a.type === b.type ? 0 : a.type === 'directory' ? -1 : 1));

  // ---- VIEW MODE: EDIT ----
  if (viewMode === 'edit' && editFileName) {
    return (
      <div className="h-full flex flex-col text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/30">
          <Edit3 className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground flex-1 truncate">Editing: {editFileName}</span>
          <button onClick={handleSaveEdit} className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/80">
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={() => setViewMode('browse')} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="flex-1 bg-background text-foreground font-mono text-xs p-4 resize-none focus:outline-none"
          spellCheck={false}
          autoFocus
        />
        <div className="px-3 py-1.5 bg-muted/20 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between">
          <span>{editContent.length} chars • {new Blob([editContent]).size} bytes</span>
          <span>Line {editContent.substring(0, editContent.length).split('\n').length}</span>
        </div>
      </div>
    );
  }

  // ---- VIEW MODE: VIEW ----
  if (viewMode === 'view' && selectedNode?.type === 'file') {
    return (
      <div className="h-full flex flex-col text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/30">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground flex-1 truncate">{selectedFile}</span>
          <button
            onClick={() => { setEditContent(selectedNode.content || ''); setEditFileName(selectedFile!); setViewMode('edit'); }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-foreground text-xs hover:bg-muted/80"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => handleExport(selectedFile!)} className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-foreground text-xs hover:bg-muted/80">
            <Download className="w-3 h-3" /> Download
          </button>
          <button onClick={() => setViewMode('browse')} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <pre className="flex-1 bg-background text-foreground font-mono text-xs p-4 overflow-auto whitespace-pre-wrap">
          {selectedNode.content || '(empty file)'}
        </pre>
        <div className="px-3 py-1.5 bg-muted/20 border-t border-border/30 text-[10px] text-muted-foreground flex justify-between">
          <span>{formatSize(selectedNode.size || selectedNode.content?.length || 0)}</span>
          <span>Modified: {formatDate(selectedNode.modifiedAt || selectedNode.createdAt)}</span>
        </div>
      </div>
    );
  }

  // ---- VIEW MODE: CREATE ----
  if (viewMode === 'create') {
    return (
      <div className="h-full flex flex-col text-sm">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/30">
          <Plus className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Create New</span>
          <button onClick={() => setViewMode('browse')} className="ml-auto p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCreateType('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                createType === 'file' ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              <File className="w-5 h-5" />
              <span className="text-sm font-medium">File</span>
            </button>
            <button
              onClick={() => setCreateType('directory')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                createType === 'directory' ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              <FolderPlus className="w-5 h-5" />
              <span className="text-sm font-medium">Folder</span>
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={createType === 'file' ? 'example.txt' : 'new-folder'}
              className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="text-[10px] text-muted-foreground">
            Creating in: /{currentPath.join('/')}
          </div>

          <button onClick={handleCreate} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
            Create {createType === 'file' ? 'File' : 'Folder'}
          </button>
        </div>
      </div>
    );
  }

  // ---- BROWSE MODE ----
  return (
    <div className="h-full flex flex-col text-sm" onClick={() => setShowContextMenu(null)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/20 border-b border-border/30">
        <button
          onClick={() => { setCurrentPath(prev => prev.slice(0, -1)); setSelectedFile(null); }}
          disabled={currentPath.length === 0}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden">
          <button onClick={() => { setCurrentPath([]); setSelectedFile(null); }} className="hover:text-foreground shrink-0">/</button>
          {currentPath.map((seg, i) => (
            <span key={i} className="flex items-center gap-0.5 shrink-0">
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => { setCurrentPath(currentPath.slice(0, i + 1)); setSelectedFile(null); }} className="hover:text-foreground truncate max-w-[80px]">
                {seg}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setViewMode('create')} className="p-1.5 rounded hover:bg-muted transition-colors" title="New file/folder">
            <Plus className="w-4 h-4 text-primary" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-muted transition-colors" title="Import files">
            <Upload className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-muted/30 border border-border/20 rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" multiple onChange={handleImport} className="hidden" />

      <div className="flex-1 flex min-h-0">
        {/* File list */}
        <div className="flex-1 overflow-auto p-1.5">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-8">
              <FolderOpen className="w-10 h-10 opacity-30" />
              <p className="text-xs">{searchQuery ? 'No matches found' : 'Empty directory'}</p>
              {!searchQuery && (
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('create')} className="text-xs text-primary hover:underline">Create new</button>
                  <span className="text-xs">or</span>
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">Import files</button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-px">
              {/* Column headers */}
              <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                <span className="flex-1">Name</span>
                <span className="w-16 text-right">Size</span>
                <span className="w-28 text-right hidden sm:block">Modified</span>
              </div>
              {filteredEntries.map(([name, node]) => (
                <div key={name} className="relative">
                  {renaming === name ? (
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      {node.type === 'directory'
                        ? <FolderOpen className="w-4 h-4 text-yellow-400 shrink-0" />
                        : getFileIcon(name)}
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(name); if (e.key === 'Escape') setRenaming(null); }}
                        onBlur={() => handleRename(name)}
                        className="flex-1 bg-muted border border-primary rounded px-2 py-0.5 text-xs text-foreground focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (node.type === 'directory') {
                          setCurrentPath(prev => [...prev, name]);
                          setSelectedFile(null);
                        } else {
                          setSelectedFile(name);
                        }
                      }}
                      onDoubleClick={() => {
                        if (node.type === 'file') {
                          setSelectedFile(name);
                          setViewMode('view');
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowContextMenu({ x: e.clientX, y: e.clientY, name });
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-left hover:bg-muted/40 transition-colors ${
                        selectedFile === name ? 'bg-primary/15 ring-1 ring-primary/30' : ''
                      }`}
                    >
                      {node.type === 'directory'
                        ? <FolderOpen className="w-4 h-4 text-yellow-400 shrink-0" />
                        : getFileIcon(name)}
                      <span className="text-xs text-foreground truncate flex-1">{name}</span>
                      <span className="text-[10px] text-muted-foreground/60 w-16 text-right shrink-0">
                        {node.type === 'directory' ? `${countChildren(node)} items` : formatSize(node.size || node.content?.length || 0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 w-28 text-right shrink-0 hidden sm:block">
                        {formatDate(node.modifiedAt || node.createdAt)}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side panel - selected file info */}
        {selectedNode && selectedNode.type === 'file' && (
          <div className="w-56 border-l border-border/20 p-3 overflow-auto bg-muted/10 shrink-0">
            <div className="text-xs font-medium text-foreground mb-0.5 truncate">{selectedFile}</div>
            <div className="text-[10px] text-muted-foreground mb-3">
              {formatSize(selectedNode.size || selectedNode.content?.length || 0)}
            </div>

            <div className="space-y-1.5 mb-4">
              <button
                onClick={() => setViewMode('view')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/40 hover:bg-muted text-xs text-foreground transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button
                onClick={() => { setEditContent(selectedNode.content || ''); setEditFileName(selectedFile!); setViewMode('edit'); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/40 hover:bg-muted text-xs text-foreground transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleExport(selectedFile!)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/40 hover:bg-muted text-xs text-foreground transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={() => { setRenaming(selectedFile!); setRenameValue(selectedFile!); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/40 hover:bg-muted text-xs text-foreground transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                onClick={() => handleDelete(selectedFile!)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded bg-destructive/10 hover:bg-destructive/20 text-xs text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>

            {/* Preview */}
            <div className="text-[10px] text-muted-foreground mb-1">Preview</div>
            <pre className="text-[10px] text-muted-foreground/80 whitespace-pre-wrap font-mono bg-background/50 p-2 rounded max-h-32 overflow-auto">
              {(selectedNode.content || '(empty)').slice(0, 500)}
              {(selectedNode.content?.length || 0) > 500 && '...'}
            </pre>

            <div className="mt-3 space-y-1 text-[10px] text-muted-foreground/60">
              <div>Created: {formatDate(selectedNode.createdAt)}</div>
              {selectedNode.modifiedAt && <div>Modified: {formatDate(selectedNode.modifiedAt)}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 bg-muted/10 border-t border-border/20 text-[10px] text-muted-foreground flex justify-between">
        <span>{filteredEntries.length} item{filteredEntries.length !== 1 ? 's' : ''}</span>
        <span>/{currentPath.join('/')}</span>
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed bg-card border border-border rounded-lg shadow-2xl py-1 z-[999] min-w-[160px]"
          style={{ left: showContextMenu.x, top: showContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {entries[showContextMenu.name]?.type === 'file' && (
            <>
              <button onClick={() => { setSelectedFile(showContextMenu.name); setViewMode('view'); setShowContextMenu(null); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button onClick={() => {
                const node = entries[showContextMenu.name];
                setEditContent(node?.content || ''); setEditFileName(showContextMenu.name); setViewMode('edit'); setShowContextMenu(null);
              }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </>
          )}
          <button onClick={() => handleExport(showContextMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button onClick={() => handleDuplicate(showContextMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button onClick={() => { setRenaming(showContextMenu.name); setRenameValue(showContextMenu.name); setShowContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left">
            <Edit3 className="w-3.5 h-3.5" /> Rename
          </button>
          <div className="border-t border-border/30 my-1" />
          <button onClick={() => handleDelete(showContextMenu.name)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-destructive transition-colors text-left">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
