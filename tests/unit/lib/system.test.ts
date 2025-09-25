import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os, { tmpdir } from 'node:os';
import path from 'node:path';
import { FileLib } from '../../../src/lib/file';
import { SystemLib } from '../../../src/lib/system';

describe('SystemLib', () => {
  let testDir: string;
  let originalShell: string | undefined;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'dotsx-system-test-'));
    originalShell = process.env.SHELL;
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    process.env.SHELL = originalShell;
  });

  describe('isInitialized', () => {
    test('should return true when DOTSX_PATH exists', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      
      const result = SystemLib.isInitialized();
      
      expect(result).toBe(true);
      isDirectorySpy.mockRestore();
    });

    test('should return false when DOTSX_PATH does not exist', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);
      
      const result = SystemLib.isInitialized();
      
      expect(result).toBe(false);
      isDirectorySpy.mockRestore();
    });
  });

  describe('getOs', () => {
    test('should return current platform', () => {
      const platformSpy = spyOn(os, 'platform').mockReturnValue('linux');
      
      const result = SystemLib.getOs();
      
      expect(result).toBe('linux');
      platformSpy.mockRestore();
    });
  });

  describe('getCurrentOsType', () => {
    test('should return debian for linux platform', () => {
      const platformSpy = spyOn(os, 'platform').mockReturnValue('linux');
      
      const result = SystemLib.getCurrentOsType();
      
      expect(result).toBe('debian');
      platformSpy.mockRestore();
    });

    test('should return macos for darwin platform', () => {
      const platformSpy = spyOn(os, 'platform').mockReturnValue('darwin');
      
      const result = SystemLib.getCurrentOsType();
      
      expect(result).toBe('macos');
      platformSpy.mockRestore();
    });

    test('should return debian as default for unknown platform', () => {
      const platformSpy = spyOn(os, 'platform').mockReturnValue('win32');
      
      const result = SystemLib.getCurrentOsType();
      
      expect(result).toBe('debian');
      platformSpy.mockRestore();
    });
  });

  describe('getArch', () => {
    test('should return current architecture', () => {
      const archSpy = spyOn(os, 'arch').mockReturnValue('x64');
      
      const result = SystemLib.getArch();
      
      expect(result).toBe('x64');
      archSpy.mockRestore();
    });
  });

  describe('detectShell', () => {
    test('should detect zsh from SHELL environment variable', () => {
      process.env.SHELL = '/usr/bin/zsh';
      
      const result = SystemLib.detectShell();
      
      expect(result).toBe('zsh');
    });

    test('should detect bash from SHELL environment variable', () => {
      process.env.SHELL = '/bin/bash';
      
      const result = SystemLib.detectShell();
      
      expect(result).toBe('bash');
    });

    test('should return unknown when SHELL is not set', () => {
      process.env.SHELL = undefined;
      
      const result = SystemLib.detectShell();
      
      expect(result).toBe('unknown');
    });

    test('should handle complex shell paths', () => {
      process.env.SHELL = '/usr/local/bin/fish';
      
      const result = SystemLib.detectShell();
      
      expect(result).toBe('fish');
    });
  });

  describe('getRcFilePath', () => {
    test('should return .zshrc path for zsh shell', () => {
      process.env.SHELL = '/usr/bin/zsh';
      const homedirSpy = spyOn(os, 'homedir').mockReturnValue('/home/user');
      
      const result = SystemLib.getRcFilePath();
      
      expect(result).toBe('/home/user/.zshrc');
      homedirSpy.mockRestore();
    });

    test('should return .bashrc path for bash shell', () => {
      process.env.SHELL = '/bin/bash';
      const homedirSpy = spyOn(os, 'homedir').mockReturnValue('/home/user');
      
      const result = SystemLib.getRcFilePath();
      
      expect(result).toBe('/home/user/.bashrc');
      homedirSpy.mockRestore();
    });

    test('should default to .bashrc for unknown shell', () => {
      process.env.SHELL = '/usr/bin/fish';
      const homedirSpy = spyOn(os, 'homedir').mockReturnValue('/home/user');
      
      const result = SystemLib.getRcFilePath();
      
      expect(result).toBe('/home/user/.bashrc');
      homedirSpy.mockRestore();
    });
  });

  describe('getSystemInfo', () => {
    test('should return complete system information', () => {
      const platformSpy = spyOn(os, 'platform').mockReturnValue('linux');
      const archSpy = spyOn(os, 'arch').mockReturnValue('x64');
      const hostnameSpy = spyOn(os, 'hostname').mockReturnValue('test-host');
      const homedirSpy = spyOn(os, 'homedir').mockReturnValue('/home/user');
      const totalmemSpy = spyOn(os, 'totalmem').mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      const freememSpy = spyOn(os, 'freemem').mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB
      process.env.SHELL = '/usr/bin/zsh';
      
      const result = SystemLib.getSystemInfo();
      
      expect(result.os).toBe('linux x64');
      expect(result.hostname).toBe('test-host');
      expect(result.memory).toContain('4.0/8.0 GB (50%)');
      expect(result.shell).toBe('zsh');
      expect(result.rcFile).toBe('/home/user/.zshrc');
      expect(result.dotfilesPath).toContain('.dotsx');
      
      platformSpy.mockRestore();
      archSpy.mockRestore();
      hostnameSpy.mockRestore();
      homedirSpy.mockRestore();
      totalmemSpy.mockRestore();
      freememSpy.mockRestore();
    });

    test('should calculate memory percentage correctly', () => {
      const totalmemSpy = spyOn(os, 'totalmem').mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      const freememSpy = spyOn(os, 'freemem').mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      
      const result = SystemLib.getSystemInfo();
      
      expect(result.memory).toContain('8.0/16.0 GB (50%)');
      
      totalmemSpy.mockRestore();
      freememSpy.mockRestore();
    });
  });

  describe('displayInfo', () => {
    test('should display system information to console', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const getSystemInfoSpy = spyOn(SystemLib, 'getSystemInfo').mockReturnValue({
        os: 'linux x64',
        hostname: 'test-host',
        memory: '4.0/8.0 GB (50%)',
        shell: 'zsh',
        rcFile: '/home/user/.zshrc',
        dotfilesPath: '/home/user/.dotsx',
      });
      
      SystemLib.displayInfo();
      
      expect(consoleSpy).toHaveBeenCalledWith('🖥️  OS: linux x64');
      expect(consoleSpy).toHaveBeenCalledWith('🏠 Host: test-host');
      expect(consoleSpy).toHaveBeenCalledWith('💾 RAM: 4.0/8.0 GB (50%)');
      expect(consoleSpy).toHaveBeenCalledWith('🐚 Detected shell: zsh');
      expect(consoleSpy).toHaveBeenCalledWith('📄 RC file: /home/user/.zshrc');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Path: /home/user/.dotsx');
      expect(consoleSpy).toHaveBeenCalledTimes(6);
      
      consoleSpy.mockRestore();
      getSystemInfoSpy.mockRestore();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle very large memory values', () => {
      const totalmemSpy = spyOn(os, 'totalmem').mockReturnValue(128 * 1024 * 1024 * 1024); // 128GB
      const freememSpy = spyOn(os, 'freemem').mockReturnValue(64 * 1024 * 1024 * 1024); // 64GB
      
      const result = SystemLib.getSystemInfo();
      
      expect(result.memory).toContain('64.0/128.0 GB (50%)');
      
      totalmemSpy.mockRestore();
      freememSpy.mockRestore();
    });

    test('should handle very small memory values', () => {
      const totalmemSpy = spyOn(os, 'totalmem').mockReturnValue(1024 * 1024 * 1024); // 1GB
      const freememSpy = spyOn(os, 'freemem').mockReturnValue(512 * 1024 * 1024); // 0.5GB
      
      const result = SystemLib.getSystemInfo();
      
      expect(result.memory).toContain('0.5/1.0 GB (50%)');
      
      totalmemSpy.mockRestore();
      freememSpy.mockRestore();
    });

    test('should handle empty SHELL environment variable', () => {
      process.env.SHELL = '';
      
      const result = SystemLib.detectShell();
      
      expect(result).toBe('unknown');
    });
  });
});
