export type DesktopTheme = 'windows' | 'macos';

export interface DesktopApp {
  id: string;
  name: string;
  icon: string; // emoji or lucide icon name
  type: 'game' | 'terminal' | 'settings' | 'filemanager' | 'browser' | 'custom';
  url?: string;
  embed?: boolean;
}

export interface DesktopWindow {
  id: string;
  appId: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: Record<string, FileSystemNode>;
  createdAt: string;
}

export const DEFAULT_FILE_SYSTEM: Record<string, FileSystemNode> = {
  home: {
    name: 'home',
    type: 'directory',
    createdAt: new Date().toISOString(),
    children: {
      user: {
        name: 'user',
        type: 'directory',
        createdAt: new Date().toISOString(),
        children: {
          'readme.txt': {
            name: 'readme.txt',
            type: 'file',
            content: 'Welcome to SolarnovaOS!\nThis is your home directory.\nUse "help" to see available commands.',
            createdAt: new Date().toISOString(),
          },
          documents: {
            name: 'documents',
            type: 'directory',
            createdAt: new Date().toISOString(),
            children: {
              'notes.txt': {
                name: 'notes.txt',
                type: 'file',
                content: 'My Notes:\n- Check out the games section\n- Try the terminal commands\n- Customize your theme in settings',
                createdAt: new Date().toISOString(),
              },
            },
          },
          downloads: {
            name: 'downloads',
            type: 'directory',
            createdAt: new Date().toISOString(),
            children: {},
          },
        },
      },
    },
  },
  etc: {
    name: 'etc',
    type: 'directory',
    createdAt: new Date().toISOString(),
    children: {
      'hostname': {
        name: 'hostname',
        type: 'file',
        content: 'solarnova',
        createdAt: new Date().toISOString(),
      },
      'os-release': {
        name: 'os-release',
        type: 'file',
        content: 'NAME="SolarnovaOS"\nVERSION="2.0"\nID=solarnova\nPRETTY_NAME="SolarnovaOS 2.0"',
        createdAt: new Date().toISOString(),
      },
    },
  },
  var: {
    name: 'var',
    type: 'directory',
    createdAt: new Date().toISOString(),
    children: {
      log: {
        name: 'log',
        type: 'directory',
        createdAt: new Date().toISOString(),
        children: {
          'system.log': {
            name: 'system.log',
            type: 'file',
            content: '[INFO] SolarnovaOS booted successfully\n[INFO] All services running\n[INFO] Network connected',
            createdAt: new Date().toISOString(),
          },
        },
      },
    },
  },
  tmp: {
    name: 'tmp',
    type: 'directory',
    createdAt: new Date().toISOString(),
    children: {},
  },
};
