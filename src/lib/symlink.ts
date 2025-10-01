import fs from 'node:fs';
import path from 'node:path';
import { log } from '@clack/prompts';
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
   * @param systemPath - System file path (e.g., /home/user/.zshrc)
   * @param dotsxPath - DotsX content path (e.g., /home/user/.dotsx/symlinks/__home__/.zshrc)
   */
  export function safeSymlink(systemPath: string, dotsxPath: string) {
    if (!FileLib.isExists(systemPath)) {
      throw new Error(`Source path does not exist: ${systemPath}`);
    }

    // Early return: If systemPath is already a correct symlink to dotsxPath, nothing to do
    if (isSymLinkContentCorrect(dotsxPath, systemPath)) {
      log.info(`Symlink already correct: ${FileLib.display(systemPath)}`);
      return;
    }

    const dotsxRelativePath = path.relative(DOTSX_PATH, dotsxPath);

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

    // Create parent directory for dotsx path
    FileLib.Directory.create(path.dirname(dotsxPath));

    // Move content to dotsx (only if source is not already the dotsx path)
    if (sourceToMove !== dotsxPath && FileLib.isExists(sourceToMove)) {
      if (FileLib.isFile(sourceToMove)) {
        FileLib.File.copy(sourceToMove, dotsxPath);
        FileLib.File.deleteFile(sourceToMove);
      } else if (FileLib.isDirectory(sourceToMove)) {
        FileLib.Directory.copy(sourceToMove, dotsxPath);
        FileLib.Directory.deleteDirectory(sourceToMove);
      }
    }

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
