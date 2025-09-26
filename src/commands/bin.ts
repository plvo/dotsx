import { resolve } from 'node:path';
import { confirm, log } from '@clack/prompts';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';

export const binCommand = {
  async execute() {
    if (!FileLib.isDirectory(DOTSX.BIN.PATH) || !FileLib.isFile(DOTSX.BIN.ALIAS)) {
      FileLib.createFile(DOTSX.BIN.ALIAS);
      log.info(`The bin config directory and alias file were created, relaunch the cli`);
      return;
    }

    const rcFile = SystemLib.getRcFilePath();
    if (!rcFile) {
      log.error(`No rc file found, relaunch the cli`);
      return;
    }
    const content = FileLib.readFile(rcFile);
    const sourcePattern = new RegExp(`source\\s+${DOTSX.BIN.ALIAS}`, 'm');

    if (!sourcePattern.test(content)) {
      FileLib.writeToEndOfFile(rcFile, `source ${DOTSX.BIN.ALIAS}`);
      log.info(`✅ Source added to ${rcFile}`);
    }

    const scriptFiles = this.readBinDirectory();

    if (scriptFiles.length === 0) {
      log.warn(`No shell scripts found, add some shell scripts to ${DOTSX.BIN.PATH}`);
      return;
    }

    const scriptInAliasFile = this.getScriptInFile();

    console.log('scriptInAliasFile', scriptInAliasFile);
    

    const scriptsData = scriptFiles.map((script) => {
      const scriptName = FileLib.deleteFilenameExtension(script);
      const scriptPath = resolve(DOTSX.BIN.PATH, script);

      const isExecutable = FileLib.isExecutable(scriptPath);
      const hasAlias = this.checkAliasInFile(scriptName);

      log.message(`- ${scriptPath} \t ${isExecutable ? '✅' : '❌'} Executable \t ${hasAlias ? '✅' : '❌'} Alias`);

      return { scriptName, scriptPath, isExecutable, hasAlias };
    });

    if (scriptsData.every((script) => script.isExecutable && script.hasAlias)) {
      log.success('All scripts are already configured');
      return;
    }

    const shouldSetup = await confirm({
      message: 'Are you sure you want to setup not configured bin scripts?',
      initialValue: false,
    });

    if (!shouldSetup) return;

    scriptsData.forEach((script) => {
      if (!script.hasAlias) {
        this.addAlias(script.scriptName, script.scriptPath);
        log.success(`${script.scriptName} is now aliased`);
      }

      if (!script.isExecutable) {
        FileLib.makeExecutable(script.scriptPath);
        log.success(`${script.scriptName} is now executable`);
      }
    });
  },

  readBinDirectory(): string[] {
    if (!FileLib.isDirectory(DOTSX.BIN.PATH)) {
      return [];
    }

    return FileLib.readDirectory(DOTSX.BIN.PATH)
      .filter((file) => {
        if (file.startsWith('_')) return false;
        const filePath = resolve(DOTSX.BIN.PATH, file);
        if (!FileLib.isFile(filePath)) return false;
        return true;
      })
      .sort();
  },

  getScriptInFile(): string[] {
    const content = FileLib.readFile(DOTSX.BIN.ALIAS);
    // Match lines like: alias name="path"
    const matches = content.matchAll(/^alias\s+([a-zA-Z0-9_-]+)=["'][^"']*["']/gm);
    const names: string[] = [];
    for (const match of matches) {
      if (match[1]) names.push(match[1]);
    }
    return names;
  },

  checkAliasInFile(scriptName: string): boolean {
    try {
      const content = FileLib.readFile(DOTSX.BIN.ALIAS);
      const aliasPattern = new RegExp(`alias\\s+${scriptName}=`, 'm');
      return aliasPattern.test(content);
    } catch {
      return false;
    }
  },

  addAlias(scriptName: string, scriptPath: string): void {
    const aliasLine = `alias ${scriptName}="${scriptPath}"`;

    try {
      if (!FileLib.isFile(DOTSX.BIN.ALIAS)) {
        FileLib.createFile(DOTSX.BIN.ALIAS);
      }

      FileLib.writeToEndOfFile(DOTSX.BIN.ALIAS, aliasLine);
    } catch (error) {
      throw new Error(`Failed to add alias to ${DOTSX.BIN.ALIAS}: ${error}`);
    }
  },
};
