import { resolve } from 'node:path';
import { confirm } from '@clack/prompts';
import { DOTFILE_PATH_DIRS } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';

const BIN_ALIAS_FILE = resolve(DOTFILE_PATH_DIRS.BIN, '_dotsx-bin.aliases');

export const BinCommand = {
  async execute() {
    if (!FileLib.isDirectory(DOTFILE_PATH_DIRS.BIN)) {
      console.log(`❌ Directory ${DOTFILE_PATH_DIRS.BIN} does not exist`);
      return;
    }

    if (!FileLib.isFile(BIN_ALIAS_FILE)) {
      console.log(`❌ File ${BIN_ALIAS_FILE} does not exist`);
      FileLib.createFile(BIN_ALIAS_FILE);
      console.log(`✅ File ${BIN_ALIAS_FILE} created, relaunch the command to continue`);
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
      const scriptPath = resolve(DOTFILE_PATH_DIRS.BIN, script);

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
        this.addAlias(script.scriptName);
        console.log(`✅ ${script.scriptName} is now aliased`);
      }

      if (!script.isExecutable) {
        FileLib.makeExecutable(script.scriptPath);
        console.log(`✅ ${script.scriptName} is now executable`);
      }
    });
  },

  readBinDirectory(): string[] {
    if (!FileLib.isDirectory(DOTFILE_PATH_DIRS.BIN)) {
      return [];
    }

    return FileLib.readDirectory(DOTFILE_PATH_DIRS.BIN)
      .filter((file) => {
        const filePath = resolve(DOTFILE_PATH_DIRS.BIN, file);
        if (!FileLib.isFile(filePath)) return false;
        return FileLib.isExecutable(filePath);
      })
      .sort();
  },

  /**
   * Check if the rc file contains `source ~/.dotsx/bin/_dotsx-bin.aliases`
   */
  checkOrWriteSourceInRcFile(): boolean {
    const rcFile = SystemLib.getRcFilePath();
    const content = FileLib.readFile(rcFile);
    const sourcePattern = new RegExp(`source\\s+${DOTFILE_PATH_DIRS.BIN}/_dotsx-bin.aliases`, 'm');
    if (sourcePattern.test(content)) {
      console.log(`✅ Source exists in ${rcFile}`);
      return true;
    } else {
      FileLib.writeToEndOfFile(rcFile, `source ${DOTFILE_PATH_DIRS.BIN}/_dotsx-bin.aliases`);
      console.log(`✅ Source added to ${rcFile}`);
      return false;
    }
  },

  checkAliasInFile(scriptName: string): boolean {
    try {
      const content = FileLib.readFile(BIN_ALIAS_FILE);
      const aliasPattern = new RegExp(`alias\\s+${scriptName}=`, 'm');
      return aliasPattern.test(content);
    } catch {
      return false;
    }
  },

  addAlias(scriptName: string): void {
    const aliasLine = `alias ${scriptName}="${DOTFILE_PATH_DIRS.BIN}/${scriptName}"`;

    try {
      if (!FileLib.isFile(BIN_ALIAS_FILE)) {
        FileLib.createFile(BIN_ALIAS_FILE);
      }

      FileLib.writeToEndOfFile(BIN_ALIAS_FILE, aliasLine);
    } catch (error) {
      throw new Error(`Failed to add alias to ${BIN_ALIAS_FILE}: ${error}`);
    }
  },
};
