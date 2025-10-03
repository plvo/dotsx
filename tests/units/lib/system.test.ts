import { describe, expect, it } from 'bun:test';
import os from 'node:os';
import path from 'node:path';
import { SystemLib } from '@/lib/system';

describe('SystemLib', () => {
  describe('detectShell', () => {
    it('should return shell from SHELL env var', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/zsh';
      expect(SystemLib.detectShell()).toBe('zsh');
      process.env.SHELL = originalShell;
    });

    it('should return unknown when SHELL is not set', () => {
      const originalShell = process.env.SHELL;
      delete process.env.SHELL;
      expect(SystemLib.detectShell()).toBe('unknown');
      process.env.SHELL = originalShell;
    });

    it('should handle different shell paths', () => {
      const originalShell = process.env.SHELL;
      const shells = [
        ['/usr/bin/bash', 'bash'],
        ['/bin/fish', 'fish'],
        ['/usr/local/bin/ksh', 'ksh'],
      ];

      shells.forEach(([shellPath, expected]) => {
        process.env.SHELL = shellPath;
        expect(SystemLib.detectShell()).toBe(expected as any);
      });

      process.env.SHELL = originalShell;
    });
  });

  describe('getRcFilePath', () => {
    const home = os.homedir();

    it('should return .zshrc for zsh', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/zsh';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.zshrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .bashrc for bash', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/bash';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.bashrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .config/fish/config.fish for fish', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/fish';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.config', 'fish', 'config.fish'));
      process.env.SHELL = originalShell;
    });

    it('should return .kshrc for ksh', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/ksh';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.kshrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .cshrc for csh/tcsh', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/csh';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.cshrc'));
      process.env.SHELL = '/bin/tcsh';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.cshrc'));
      process.env.SHELL = originalShell;
    });

    it('should return .profile for sh', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/sh';
      expect(SystemLib.getRcFilePath()).toBe(path.join(home, '.profile'));
      process.env.SHELL = originalShell;
    });

    it('should return null for unknown shell', () => {
      const originalShell = process.env.SHELL;
      delete process.env.SHELL;
      expect(SystemLib.getRcFilePath()).toBe(null);
      process.env.SHELL = originalShell;
    });
  });

  describe('getLinuxDistro', () => {
    it('should return distro or null on linux', () => {
      if (os.platform() === 'linux') {
        const result = SystemLib.getLinuxDistro();
        expect(typeof result === 'string' || result === null).toBe(true);
      }
    });
  });

  describe('getOsInfo', () => {
    it('should return linux info with distro', () => {
      if (os.platform() === 'linux') {
        const info = SystemLib.getOsInfo();
        expect(info.platform).toBe('linux');
        expect(info.family).toBe('linux');
        expect(info.release).toBeDefined();
      }
    });

    it('should return macos info', () => {
      if (os.platform() === 'darwin') {
        const info = SystemLib.getOsInfo();
        expect(info.platform).toBe('darwin');
        expect(info.family).toBe('macos');
        expect(info.distro).toBe(null);
      }
    });

    it('should return current platform info', () => {
      const info = SystemLib.getOsInfo();
      expect(info.platform).toBe(os.platform());
      expect(info.family).toBeDefined();
      expect(info.release).toBeDefined();
    });
  });

  describe('getSystemInfo', () => {
    it('should return complete system info', () => {
      const info = SystemLib.getSystemInfo();

      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('family');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('hostname');
      expect(info).toHaveProperty('shell');
      expect(info).toHaveProperty('rcFile');
    });

    it('should include OS info', () => {
      const info = SystemLib.getSystemInfo();
      const osInfo = SystemLib.getOsInfo();

      expect(info.platform).toBe(osInfo.platform);
      expect(info.family).toBe(osInfo.family);
    });

    it('should include architecture', () => {
      const info = SystemLib.getSystemInfo();
      expect(info.arch).toBe(os.arch());
    });

    it('should include hostname', () => {
      const info = SystemLib.getSystemInfo();
      expect(info.hostname).toBe(os.hostname());
    });

    it('should set rcFile to unknown when shell is unknown', () => {
      const originalShell = process.env.SHELL;
      delete process.env.SHELL;

      const info = SystemLib.getSystemInfo();
      expect(info.rcFile).toBe('unknown');

      process.env.SHELL = originalShell;
    });
  });
});
