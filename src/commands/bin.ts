import path from 'node:path';
import { confirm, log } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';

export const binCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    if (!FileLib.isDirectory(dotsxPath.bin) || !FileLib.isFile(dotsxPath.binAliases)) {
      FileLib.File.create(dotsxPath.binAliases);
      log.info(`The bin config directory and alias file were created, relaunch the cli`);
      return;
    }

    this.writeAliasToRcFile(dotsxPath.binAliases);

    const scriptInAliasFile = this.getScriptInFile(dotsxPath.binAliases);

    for (const script of scriptInAliasFile) {
      let count = 0;
      if (!FileLib.isFile(script.path)) {
        FileLib.File.writeReplacing(dotsxPath.binAliases, '', `alias ${script.name}="${script.path}"`);
        log.step(`${script.path} is not a file, cleaned from alias file`);
        count++;
      }

      if (count > 0) {
        log.info(`${count} scripts cleaned from alias file`);
      }
    }

    const scriptFiles = this.readBinDirectory(dotsxPath.bin);

    if (scriptFiles.length === 0) {
      log.warn(`No shell scripts found, add some shell scripts to ${dotsxPath.bin}`);
      return;
    }

    const scriptsData = scriptFiles.map((script) => {
      const scriptName = FileLib.File.deleteExtension(script);
      const scriptPath = path.resolve(dotsxPath.bin, script);

      const isExecutable = FileLib.File.isExecutable(scriptPath);
      const hasAlias = this.checkAliasInFile(dotsxPath.binAliases, scriptName);

      log.message(`- ${scriptPath} \t ${isExecutable ? '✅' : '❌'} Executable \t ${hasAlias ? '✅' : '❌'} Alias`);

      return { scriptName, scriptPath, isExecutable, hasAlias };
    });

    if (scriptsData.every((script) => script.isExecutable && script.hasAlias)) {
      log.success('All scripts are already configured');
      return;
    }

    const shouldSetup = await confirm({
      message: 'Are you sure you want to setup not configured bin scripts?',
      initialValue: true,
    });

    if (!shouldSetup) return;

    scriptsData.forEach((script) => {
      if (!script.hasAlias) {
        this.addAlias(dotsxPath.binAliases, script.scriptName, script.scriptPath);
        log.success(`${script.scriptName} is now aliased`);
      }

      if (!script.isExecutable) {
        FileLib.File.makeExecutable(script.scriptPath);
        log.success(`${script.scriptName} is now executable`);
      }
    });
  },

  writeAliasToRcFile(binAliases: string): void {
    const rcFile = SystemLib.getRcFilePath();
    if (!rcFile) {
      log.error(`No terminal RC file found to write alias`);
      return;
    }

    const content = FileLib.File.read(rcFile);
    const sourcePattern = new RegExp(`source\\s+${binAliases}`, 'm');

    if (!sourcePattern.test(content)) {
      FileLib.File.writeAppend(rcFile, `source ${binAliases}`);
      log.info(`Source added to ${rcFile}`);
    }
  },

  readBinDirectory(bin: string): string[] {
    if (!FileLib.isDirectory(bin)) {
      return [];
    }

    return FileLib.Directory.read(bin)
      .filter((file) => {
        if (file.startsWith('_')) return false;
        const filePath = path.resolve(bin, file);
        if (!FileLib.isFile(filePath)) return false;
        return true;
      })
      .sort();
  },

  getScriptInFile(binAliases: string): { name: string; path: string }[] {
    const content = FileLib.File.read(binAliases);
    const matches = content.matchAll(/^alias\s+([a-zA-Z0-9_-]+)=["']([^"']*)["']/gm);

    const scripts: { name: string; path: string }[] = [];
    for (const match of matches) {
      if (match[1] && match[2]) {
        scripts.push({ name: match[1], path: match[2] });
      }
    }
    return scripts;
  },

  checkAliasInFile(binAliases: string, scriptName: string): boolean {
    try {
      const content = FileLib.File.read(binAliases);
      const aliasPattern = new RegExp(`alias\\s+${scriptName}=`, 'm');
      return aliasPattern.test(content);
    } catch {
      return false;
    }
  },

  addAlias(binAliases: string, scriptName: string, scriptPath: string): void {
    const aliasLine = `alias ${scriptName}="${scriptPath}"`;

    try {
      if (!FileLib.isFile(binAliases)) {
        FileLib.File.create(binAliases);
      }

      FileLib.File.writeAppend(binAliases, aliasLine);
    } catch (error) {
      throw new Error(`Failed to add alias to ${binAliases}: ${error}`);
    }
  },
};
