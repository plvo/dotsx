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
   * @param dotsxOsPath - dotsx OS path (e.g., /home/user/.dotsx/ubuntu/symlinks)
   * @param systemPath - System file path (e.g., /home/user/.zshrc)
   * @param dotsxPath - dotsx content path (e.g., /home/user/.dotsx/ubuntu/symlinks/__home__/.zshrc)
   */
  export function safeSymlink(systemPath: string, dotsxPath: string) {
    const systemExists = FileLib.isExists(systemPath);
    const dotsxExists = FileLib.isExists(dotsxPath);

    if (!systemExists && !dotsxExists) {
      throw new Error(`Neither system path nor dotsx path exists: ${systemPath}`);
    }

    if (isSymLinkContentCorrect(dotsxPath, systemPath)) {
      log.info(`Symlink already correct: ${FileLib.display(systemPath)}`);
      return;
    }

    if (systemExists) {
      let sourceToMove = systemPath;

      if (FileLib.isSymLink(systemPath)) {
        try {
          const symlinkTarget = fs.readlinkSync(systemPath);
          const resolvedPath = path.resolve(path.dirname(systemPath), symlinkTarget);

          if (FileLib.isExists(resolvedPath)) {
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
    // Check for broken symlinks first (lstatSync works even on broken symlinks)
    try {
      const stats = fs.lstatSync(systemPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(systemPath);
      } else if (stats.isFile()) {
        FileLib.File.deleteFile(systemPath);
      } else if (stats.isDirectory()) {
        FileLib.Directory.deleteDirectory(systemPath);
      }
    } catch {
      // Path doesn't exist, which is fine
    }

    fs.symlinkSync(dotsxPath, systemPath);
  }
}
