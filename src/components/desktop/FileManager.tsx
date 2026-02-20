import { useState } from 'react';
import { FolderOpen, FileText, ChevronRight, ArrowLeft } from 'lucide-react';
import type { FileSystemNode } from './types';

interface FileManagerProps {
  fileSystem: Record<string, FileSystemNode>;
}

export function FileManager({ fileSystem }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileSystemNode | null>(null);

  const getCurrentDir = (): Record<string, FileSystemNode> => {
    let current = fileSystem;
    for (const segment of currentPath) {
      const node = current[segment];
      if (node?.type === 'directory' && node.children) {
        current = node.children;
      } else break;
    }
    return current;
  };

  const entries = getCurrentDir();
  const pathString = '/' + currentPath.join('/');

  return (
    <div className="h-full flex flex-col text-sm">
      {/* Path bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
        <button
          onClick={() => {
            setCurrentPath(prev => prev.slice(0, -1));
            setSelectedFile(null);
          }}
          disabled={currentPath.length === 0}
          className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button onClick={() => { setCurrentPath([]); setSelectedFile(null); }} className="hover:text-foreground">/</button>
          {currentPath.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <button
                onClick={() => { setCurrentPath(currentPath.slice(0, i + 1)); setSelectedFile(null); }}
                className="hover:text-foreground"
              >
                {seg}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* File list */}
        <div className="flex-1 p-2 overflow-auto">
          {Object.entries(entries).length === 0 ? (
            <div className="text-muted-foreground text-xs p-4 text-center">Empty directory</div>
          ) : (
            <div className="space-y-0.5">
              {Object.entries(entries)
                .sort(([, a], [, b]) => (a.type === b.type ? 0 : a.type === 'directory' ? -1 : 1))
                .map(([name, node]) => (
                  <button
                    key={name}
                    onClick={() => {
                      if (node.type === 'directory') {
                        setCurrentPath(prev => [...prev, name]);
                        setSelectedFile(null);
                      } else {
                        setSelectedFile(node);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-left hover:bg-white/5 transition-colors ${
                      selectedFile?.name === name ? 'bg-primary/20' : ''
                    }`}
                  >
                    {node.type === 'directory' ? (
                      <FolderOpen className="w-4 h-4 text-yellow-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs text-foreground truncate">{name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/50">
                      {node.type === 'directory' ? 'DIR' : `${(node.content?.length || 0)} B`}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* File preview panel */}
        {selectedFile && (
          <div className="w-64 border-l border-white/10 p-3 overflow-auto">
            <div className="text-xs font-medium text-foreground mb-1">{selectedFile.name}</div>
            <div className="text-[10px] text-muted-foreground mb-3">
              {selectedFile.content?.length || 0} bytes
            </div>
            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono bg-white/5 p-2 rounded">
              {selectedFile.content || '(empty)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
