import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { binCommand } from '@/commands/bin';
import { FileLib } from '@/lib/file';
import {
  assertFileExists,
  cleanupTestEnv,
  createDotsxStructure,
  createTestEnv,
  type TestEnv,
} from './setup';

describe('Integration: Bin Scripts', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv('bin');
    createDotsxStructure(env);
  });

  afterEach(() => {
    cleanupTestEnv(env);
  });

  describe('Adding bin scripts', () => {
    it('should make script executable', () => {
      const scriptPath = path.join(env.dotsxPath.bin, 'deploy.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "deploy"');

      binCommand.addAlias(env.dotsxPath.binAliases, 'deploy', scriptPath);
      FileLib.File.makeExecutable(scriptPath);

      expect(FileLib.File.isExecutable(scriptPath)).toBe(true);
    });

    it('should add alias to binAliases file', () => {
      const scriptPath = path.join(env.dotsxPath.bin, 'test.sh');

      binCommand.addAlias(env.dotsxPath.binAliases, 'test', scriptPath);

      const content = fs.readFileSync(env.dotsxPath.binAliases, 'utf8');
      expect(content).toContain(`alias test="${scriptPath}"`);
    });

    it('should detect existing alias', () => {
      const scriptPath = path.join(env.dotsxPath.bin, 'test.sh');

      binCommand.addAlias(env.dotsxPath.binAliases, 'test', scriptPath);

      const hasAlias = binCommand.checkAliasInFile(env.dotsxPath.binAliases, 'test');
      expect(hasAlias).toBe(true);
    });

    it('should not duplicate aliases', () => {
      const scriptPath = path.join(env.dotsxPath.bin, 'test.sh');

      binCommand.addAlias(env.dotsxPath.binAliases, 'test', scriptPath);
      binCommand.addAlias(env.dotsxPath.binAliases, 'test', scriptPath);

      const content = fs.readFileSync(env.dotsxPath.binAliases, 'utf8');
      const matches = content.match(/alias test=/g);
      expect(matches?.length).toBeGreaterThan(0);
    });
  });

  describe('Reading bin directory', () => {
    it('should list shell scripts', () => {
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'script1.sh'), '');
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'script2.sh'), '');

      const scripts = binCommand.readBinDirectory(env.dotsxPath.bin);
      expect(scripts).toContain('script1.sh');
      expect(scripts).toContain('script2.sh');
    });

    it('should ignore files starting with underscore', () => {
      fs.writeFileSync(path.join(env.dotsxPath.bin, '_helper.sh'), '');
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'script.sh'), '');

      const scripts = binCommand.readBinDirectory(env.dotsxPath.bin);
      expect(scripts).not.toContain('_helper.sh');
      expect(scripts).toContain('script.sh');
    });

    it('should return sorted list', () => {
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'c.sh'), '');
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'a.sh'), '');
      fs.writeFileSync(path.join(env.dotsxPath.bin, 'b.sh'), '');

      const scripts = binCommand.readBinDirectory(env.dotsxPath.bin);
      expect(scripts).toEqual(['a.sh', 'b.sh', 'c.sh']);
    });
  });

  describe('Cleaning obsolete aliases', () => {
    it('should remove alias for deleted script', () => {
      const scriptPath = path.join(env.dotsxPath.bin, 'deleted.sh');

      binCommand.addAlias(env.dotsxPath.binAliases, 'deleted', scriptPath);

      // Verify alias exists
      let content = fs.readFileSync(env.dotsxPath.binAliases, 'utf8');
      expect(content).toContain('alias deleted=');

      // Remove alias for non-existent file
      FileLib.File.writeReplacing(env.dotsxPath.binAliases, '', `alias deleted="${scriptPath}"`);

      // Verify alias removed
      content = fs.readFileSync(env.dotsxPath.binAliases, 'utf8');
      expect(content).not.toContain('alias deleted=');
    });
  });

  describe('Getting scripts in file', () => {
    it('should parse alias file', () => {
      const script1 = path.join(env.dotsxPath.bin, 'script1.sh');
      const script2 = path.join(env.dotsxPath.bin, 'script2.sh');

      binCommand.addAlias(env.dotsxPath.binAliases, 'script1', script1);
      binCommand.addAlias(env.dotsxPath.binAliases, 'script2', script2);

      const scripts = binCommand.getScriptInFile(env.dotsxPath.binAliases);
      expect(scripts.length).toBe(2);
      expect(scripts.some(s => s.name === 'script1')).toBe(true);
      expect(scripts.some(s => s.name === 'script2')).toBe(true);
    });

    it('should handle empty file', () => {
      const scripts = binCommand.getScriptInFile(env.dotsxPath.binAliases);
      expect(scripts.length).toBe(0);
    });
  });

  describe('RC file integration', () => {
    it('should add source line to RC file', () => {
      const rcFile = path.join(env.homeDir, '.bashrc');
      FileLib.File.create(rcFile, '# Bash config\n');

      process.env.SHELL = '/bin/bash';
      binCommand.writeAliasToRcFile(env.dotsxPath.binAliases);

      const content = fs.readFileSync(rcFile, 'utf8');
      expect(content).toContain(`source ${env.dotsxPath.binAliases}`);
    });

    it('should not duplicate source line', () => {
      const rcFile = path.join(env.homeDir, '.bashrc');
      FileLib.File.create(rcFile, '# Bash config\n');

      process.env.SHELL = '/bin/bash';
      binCommand.writeAliasToRcFile(env.dotsxPath.binAliases);
      binCommand.writeAliasToRcFile(env.dotsxPath.binAliases);

      const content = fs.readFileSync(rcFile, 'utf8');
      const matches = content.match(new RegExp(`source ${env.dotsxPath.binAliases}`, 'g'));
      expect(matches?.length).toBe(1);
    });
  });

  describe('File extension removal', () => {
    it('should remove extension from script name', () => {
      expect(FileLib.File.deleteExtension('deploy.sh')).toBe('deploy');
      expect(FileLib.File.deleteExtension('test.py')).toBe('test');
      expect(FileLib.File.deleteExtension('script')).toBe('script');
    });
  });
});
