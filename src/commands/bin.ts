import { resolve } from 'node:path';
import { confirm } from '@clack/prompts';
import { DOTX_DIR, DOTX_FILE } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';

export const BinCommand = {
  async execute() {
    if (!FileLib.isDirectory(DOTX_DIR.BIN)) {
      console.log(`❌ Directory ${DOTX_DIR.BIN} does not exist`);
      return;
    }

    if (!FileLib.isFile(DOTX_FILE.BIN_ALIAS)) {
      FileLib.createFile(DOTX_FILE.BIN_ALIAS);
      console.log(`✅ File ${DOTX_FILE.BIN_ALIAS} created`);
      return;
    }

    this.checkOrWriteSourceInRcFile();

    const scriptFiles = this.readBinDirectory();

    if (scriptFiles.length === 0) {
      console.log('ℹ️ No shell scripts found');
      return;
    }

    const scriptsData = scriptFiles.map((script) => {
      const scriptName = FileLib.deleteFilenameExtension(script);
      const scriptPath = resolve(DOTX_DIR.BIN, script);

      const isExecutable = FileLib.isExecutable(scriptPath);
      const hasAlias = this.checkAliasInFile(scriptName);

      console.log(`- ${scriptName} \t ${isExecutable ? '✅' : '❌'} Executable \t ${hasAlias ? '✅' : '❌'} Alias`);

      return { scriptName, scriptPath, isExecutable, hasAlias };
    });

    if (scriptsData.every((script) => script.isExecutable && script.hasAlias)) {
      console.log('\n✅ All scripts are already configured');
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
        console.log(`✅ ${script.scriptName} is now aliased`);
      }

      if (!script.isExecutable) {
        FileLib.makeExecutable(script.scriptPath);
        console.log(`✅ ${script.scriptName} is now executable`);
      }
    });
  },

  readBinDirectory(): string[] {
    if (!FileLib.isDirectory(DOTX_DIR.BIN)) {
      return [];
    }

    return FileLib.readDirectory(DOTX_DIR.BIN)
      .filter((file) => {
        if (file.startsWith('_')) return false;
        const filePath = resolve(DOTX_DIR.BIN, file);
        if (!FileLib.isFile(filePath)) return false;
        return true;
      })
      .sort();
  },

  /**
   * Check if the rc file contains `source ~/.dotsx/bin/_dotsx-bin.aliases`
   */
  checkOrWriteSourceInRcFile(): boolean {
    const rcFile = SystemLib.getRcFilePath();
    const content = FileLib.readFile(rcFile);
    const sourcePattern = new RegExp(`source\\s+${DOTX_FILE.BIN_ALIAS}`, 'm');

    if (sourcePattern.test(content)) {
      console.log(`✅ Source exists in ${rcFile}`);
      return true;
    } else {
      FileLib.writeToEndOfFile(rcFile, `source ${DOTX_FILE.BIN_ALIAS}`);
      console.log(`✅ Source added to ${rcFile}`);
      return false;
    }
  },

  checkAliasInFile(scriptName: string): boolean {
    try {
      const content = FileLib.readFile(DOTX_FILE.BIN_ALIAS);
      const aliasPattern = new RegExp(`alias\\s+${scriptName}=`, 'm');
      return aliasPattern.test(content);
    } catch {
      return false;
    }
  },

  addAlias(scriptName: string, scriptPath: string): void {
    const aliasLine = `alias ${scriptName}="${scriptPath}"`;

    try {
      if (!FileLib.isFile(DOTX_FILE.BIN_ALIAS)) {
        FileLib.createFile(DOTX_FILE.BIN_ALIAS);
      }

      FileLib.writeToEndOfFile(DOTX_FILE.BIN_ALIAS, aliasLine);
    } catch (error) {
      throw new Error(`Failed to add alias to ${DOTX_FILE.BIN_ALIAS}: ${error}`);
    }
  },
};
