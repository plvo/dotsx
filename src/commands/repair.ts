import { log } from '@clack/prompts';
import { BACKUP_PATH, DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { DotsxInfoLib } from '@/lib/system';

export const repairCommand = {
  async execute() {
    const {
      isInitialized,
      isAllInitialized,
      hasBackups,
      isOsInitialized,
      isBinInitialized,
      isIdeInitialized,
      isTerminalInitialized,
    } = DotsxInfoLib.getDotsxState();

    if (!isInitialized) {
      log.error('DotsX is not initialized');
      return;
    }

    if (isAllInitialized) {
      log.success('DotsX is already fully initialized');
      return;
    }

    if (!hasBackups) {
      FileLib.createDirectory(BACKUP_PATH);
      FileLib.createDirectory(DOTSX.OS.BACKUP);
      FileLib.createDirectory(DOTSX.BIN.BACKUP);
      FileLib.createDirectory(DOTSX.IDE.BACKUP);
      FileLib.createDirectory(DOTSX.TERMINAL.BACKUP);

      log.step(`Backup directory created (${BACKUP_PATH})`);
    }

    if (!isOsInitialized) {
      FileLib.createDirectory(DOTSX.OS.PATH);
      log.step(`OS directory created (${DOTSX.OS.PATH})`);
    }

    if (!isBinInitialized) {
      FileLib.createDirectory(DOTSX.BIN.PATH);
      log.step(`Bin directory created (${DOTSX.BIN.PATH})`);
    }

    if (!isIdeInitialized) {
      FileLib.createDirectory(DOTSX.IDE.PATH);
      log.step(`IDE directory created (${DOTSX.IDE.PATH})`);
    }

    if (!isTerminalInitialized) {
      FileLib.createDirectory(DOTSX.TERMINAL.PATH);
      log.step(`Terminal directory created (${DOTSX.TERMINAL.PATH})`);
    }
  },
};
