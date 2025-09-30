import { log } from '@clack/prompts';
import { BACKUP_PATH, DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { DotsxInfoLib, SystemLib } from '@/lib/system';
import { initCommand } from './init';

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

      log.step(`Backup directory configured (${BACKUP_PATH})`);
    }

    if (!isOsInitialized) {
      initCommand.initOs(SystemLib.getOsInfo());
    }

    if (!isBinInitialized) {
      initCommand.initBin();
    }

    if (!isIdeInitialized) {
      FileLib.createDirectory(DOTSX.IDE.PATH);
      log.step(`IDE directory configured (${DOTSX.IDE.PATH})`);
    }

    if (!isTerminalInitialized) {
      FileLib.createDirectory(DOTSX.TERMINAL.PATH);
      log.step(`Terminal directory configured (${DOTSX.TERMINAL.PATH})`);
    }
  },
};
