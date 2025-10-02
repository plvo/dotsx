import fs from 'node:fs';
import path from 'node:path';
import { log } from '@clack/prompts';
import { BackupLib } from './backup';
import type { DotsxOsPath } from './constants';
import { FileLib } from './file';

export namespace SymlinkLib {
  export function getFileSymlinkPath(inputPath: string): string {
    return fs.readlinkSync(path.resolve(inputPath));
  }

  export function isSymLinkContentCorrect(src: string, dest: string) {
    if (!FileLib.isExists(dest)) return false;
    if (!FileLib.isSymLink(dest)) return false;

    const actualTarget = getFileSymlinkPath(dest);
    return path.resolve(path.dirname(dest), actualTarget) === src;
  }

  /**
   * Creates a safe symlink with backup.
   * @param dotsxOsPath - DotsX OS path (e.g., /home/user/.dotsx/ubuntu/symlinks)
   * @param systemPath - System file path (e.g., /home/user/.zshrc)
   * @param dotsxPath - DotsX content path (e.g., /home/user/.dotsx/ubuntu/symlinks/__home__/.zshrc)
   */
  export function safeSymlink(dotsxOsPath: DotsxOsPath, systemPath: string, dotsxPath: string) {
    const systemExists = FileLib.isExists(systemPath);
    const dotsxExists = FileLib.isExists(dotsxPath);

    // Check if at least one path exists
    if (!systemExists && !dotsxExists) {
      throw new Error(`Neither system path nor dotsx path exists: ${systemPath}`);
    }

    // Early return: If systemPath is already a correct symlink to dotsxPath, nothing to do
    if (isSymLinkContentCorrect(dotsxPath, systemPath)) {
      log.info(`Symlink already correct: ${FileLib.display(systemPath)}`);
      return;
    }

    const dotsxRelativePath = path.relative(dotsxOsPath.symlinks, dotsxPath);

    // Only backup/move if systemPath exists (first-time setup scenario)
    if (systemExists) {
      let sourceToBackup = systemPath;
      let sourceToMove = systemPath;

      if (FileLib.isSymLink(systemPath)) {
        try {
          const symlinkTarget = fs.readlinkSync(systemPath);
          const resolvedPath = path.resolve(path.dirname(systemPath), symlinkTarget);

          if (FileLib.isExists(resolvedPath)) {
            sourceToBackup = resolvedPath;
            sourceToMove = resolvedPath;
            log.info(`Following symlink to actual content: ${FileLib.display(resolvedPath)}`);
          }

          fs.unlinkSync(systemPath);
        } catch (error) {
          log.warning(`Could not resolve symlink ${FileLib.display(systemPath)}: ${error}`);
          // If we can't resolve it, just delete the broken symlink
          fs.unlinkSync(systemPath);
        }
      }

      // Create daily backup in ~/.backup.dotsx (mirrors dotsx structure)
      if (BackupLib.shouldCreateBackup(dotsxRelativePath)) {
        BackupLib.createDailyBackup(dotsxRelativePath, sourceToBackup);
      } else {
        log.info(`Backup already created today for ${FileLib.display(systemPath)}`);
      }

      // Move content to dotsx (only if source is not already the dotsx path)
      if (sourceToMove !== dotsxPath && FileLib.isExists(sourceToMove)) {
        // Create parent directory for dotsx path
        FileLib.Directory.create(path.dirname(dotsxPath));

        if (FileLib.isFile(sourceToMove)) {
          FileLib.File.copy(sourceToMove, dotsxPath);
          FileLib.File.deleteFile(sourceToMove);
        } else if (FileLib.isDirectory(sourceToMove)) {
          FileLib.Directory.copy(sourceToMove, dotsxPath);
          FileLib.Directory.deleteDirectory(sourceToMove);
        }
      }
    } else {
      // Sync scenario: systemPath missing, dotsxPath exists
      log.info(`System path missing, recreating symlink from dotsx: ${FileLib.display(systemPath)}`);
    }

    // Ensure parent directory exists for system symlink
    FileLib.Directory.create(path.dirname(systemPath));

    // Ensure systemPath doesn't exist before creating symlink
    // (in case it's still there after processing)
    if (FileLib.isExists(systemPath)) {
      if (FileLib.isFile(systemPath)) {
        FileLib.File.deleteFile(systemPath);
      } else if (FileLib.isDirectory(systemPath)) {
        FileLib.Directory.deleteDirectory(systemPath);
      } else if (FileLib.isSymLink(systemPath)) {
        fs.unlinkSync(systemPath);
      }
    }

    // Create symlink: system → dotsx
    fs.symlinkSync(dotsxPath, systemPath);
  }
}
