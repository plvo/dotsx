import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { log } from '@clack/prompts';
import { BACKUP_PATH, DOTSX_PATH, MAX_BACKUPS_PER_FILE } from './constants';

export const FileLib = {
  isPathExists(path: string) {
    return fs.existsSync(path) || false;
  },

  isFile(path: string) {
    if (!this.isPathExists(path)) return false;
    return fs.statSync(path).isFile() || false;
  },

  isDirectory(path: string) {
    if (!this.isPathExists(path)) return false;
    return fs.statSync(path).isDirectory() || false;
  },

  isSymLink(path: string) {
    try {
      return fs.lstatSync(path).isSymbolicLink() || false;
    } catch {
      return false;
    }
  },

  isExecutable(path: string) {
    if (!this.isFile(path)) return false;
    return (fs.statSync(path).mode & 0o100) !== 0 || false;
  },

  isSymLinkContentCorrect(src: string, dest: string) {
    if (!this.isPathExists(dest)) return false;
    if (!this.isSymLink(dest)) return false;

    const actualTarget = this.getFileSymlinkPath(dest);
    return path.resolve(path.dirname(dest), actualTarget) === src;
  },

  createFile(filePath: string, content: string = '') {
    if (!this.isPathExists(filePath)) {
      // Ensure parent directory exists
      const parentDir = path.dirname(filePath);
      this.createDirectory(parentDir);
      fs.writeFileSync(filePath, content);
    }
  },

  createDirectory(dirPath: string) {
    if (!this.isPathExists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  copyFile(src: string, dest: string) {
    try {
      if (!this.isFile(src)) {
        this.createFile(src);
      }
      fs.copyFileSync(src, dest);
    } catch (error) {
      log.error(` Error copying file: ${error}`);
    }
  },

  copyDirectory(src: string, dest: string) {
    if (!this.isPathExists(dest)) {
      this.createDirectory(dest);
    }

    for (const item of fs.readdirSync(src)) {
      const srcPath = path.resolve(src, item);
      const destPath = path.resolve(dest, item);

      const stat = fs.statSync(srcPath);

      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        try {
          this.copyFile(srcPath, destPath);
        } catch (err) {
          log.error(` Error copying file ${item}: ${err}`);
        }
      }
    }
  },

  deleteFile(path: string) {
    if (this.isFile(path)) {
      fs.rmSync(path);
    }
  },

  deleteDirectory(path: string) {
    if (this.isDirectory(path)) {
      fs.rmdirSync(path, { recursive: true });
    }
  },

  readFile(path: string): string {
    return fs.readFileSync(path, 'utf8');
  },

  readFileAsArray(path: string): string[] {
    try {
      const content = this.readFile(path);
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
    } catch (error) {
      log.error(` Error reading ${path}: ${error}`);
      return [];
    }
  },

  readDirectory(path: string): string[] {
    if (!this.isDirectory(path)) return [];
    return fs.readdirSync(path);
  },

  writeToFile(path: string, content: string) {
    if (!this.isFile(path)) return;
    fs.writeFileSync(path, content);
  },

  writeToEndOfFile(path: string, content: string) {
    if (!this.isFile(path)) return;
    fs.appendFileSync(path, `${content}\n`);
  },

  writeToFileReplacingContent(path: string, newContent: string, contentToReplace: string) {
    if (!this.isFile(path)) return;
    try {
      const fileContent = this.readFile(path);
      const updatedContent = fileContent.replace(contentToReplace, newContent);
      this.writeToFile(path, updatedContent);
    } catch (error) {
      log.error(`Error writing to file ${path}: ${error}`);
    }
  },

  makeExecutable(path: string) {
    if (!this.isFile(path)) return;
    fs.chmodSync(path, 0o755);
  },

  deleteFilenameExtension(filename: string): string {
    const index = filename.split('').reverse().join('').indexOf('.');
    return index !== -1 ? filename.substring(0, filename.length - index - 1) : filename;
  },

  /**
   * Expand a path to an absolute path
   * Supports both ~ and __home__ notation
   * @example ~/workspace -> /home/user/workspaces
   * @example __home__/workspace -> /home/user/workspaces
   * @example /home/user/workspace -> /home/user/workspace
   */
  expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.resolve(homedir(), inputPath.slice(2));
    }
    if (inputPath.startsWith('__home__/')) {
      return path.resolve(homedir(), inputPath.slice(9));
    }
    if (inputPath === '__home__') {
      return homedir();
    }
    return inputPath;
  },

  getFileSymlinkPath(inputPath: string): string {
    return fs.readlinkSync(path.resolve(inputPath));
  },

  /**
   * Convert absolute path to __home__ notation for storage
   * @example /home/user/workspace -> __home__/workspace
   * @example /etc/config -> /etc/config
   */
  getDisplayPath(inputPath: string): string {
    return inputPath.replace(homedir(), '__home__');
  },

  /**
   * Cleanup old backups for a given dotsxRelativePath,
   * it will delete backups beyond the limit
   */
  cleanupOldBackups(dotsxRelativePath: string, maxBackups: number = MAX_BACKUPS_PER_FILE): void {
    try {
      const backupDir = path.dirname(path.join(BACKUP_PATH, dotsxRelativePath));
      const fileName = path.basename(dotsxRelativePath);

      if (!this.isDirectory(backupDir)) {
        return;
      }

      const allFiles = this.readDirectory(backupDir);
      const backupFiles = allFiles
        .filter((file) => {
          const pattern = new RegExp(`^${fileName}\\.\\d{14}\\.dotsx\\.backup$`);
          return pattern.test(file);
        })
        .map((file) => ({
          name: file,
          fullPath: path.join(backupDir, file),
          // Extract timestamp for sorting
          timestamp: file.match(/\.(\d{14})\.dotsx\.backup$/)?.[1] || '',
        }));

      // Sort by timestamp (newest first)
      backupFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // Delete backups beyond the limit
      const backupsToDelete = backupFiles.slice(maxBackups);

      for (const backup of backupsToDelete) {
        if (this.isFile(backup.fullPath)) {
          this.deleteFile(backup.fullPath);
        } else if (this.isDirectory(backup.fullPath)) {
          this.deleteDirectory(backup.fullPath);
        }
      }

      if (backupsToDelete.length > 0) {
        log.info(`Cleaned up ${backupsToDelete.length} old backup(s) for ${dotsxRelativePath}`);
      }
    } catch (error) {
      log.warning(`Failed to cleanup old backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  createBackup(dotsxRelativePath: string, systemPath: string) {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

    // Mirror dotsx structure in backup
    const backupPath = path.join(BACKUP_PATH, `${dotsxRelativePath}.${timestamp}.dotsx.backup`);

    this.createDirectory(path.dirname(backupPath));

    if (this.isFile(systemPath)) {
      this.copyFile(systemPath, backupPath);
    } else if (this.isDirectory(systemPath)) {
      this.copyDirectory(systemPath, backupPath);
    }

    // Cleanup old backups after creating a new one
    this.cleanupOldBackups(dotsxRelativePath);
  },

  /**
   * Creates a safe symlink with backup.
   * @param systemPath - System file path (e.g., /home/user/.zshrc)
   * @param dotsxPath - DotsX content path (e.g., /home/user/.dotsx/symlinks/__home__/.zshrc)
   */
  safeSymlink(systemPath: string, dotsxPath: string) {
    if (!this.isPathExists(systemPath)) {
      throw new Error(`Source path does not exist: ${systemPath}`);
    }

    // Early return: If systemPath is already a correct symlink to dotsxPath, nothing to do
    if (this.isSymLinkContentCorrect(dotsxPath, systemPath)) {
      log.info(`Symlink already correct: ${this.getDisplayPath(systemPath)}`);
      return;
    }

    const dotsxRelativePath = path.relative(DOTSX_PATH, dotsxPath);

    let sourceToBackup = systemPath;
    let sourceToMove = systemPath;

    if (this.isSymLink(systemPath)) {
      try {
        const symlinkTarget = fs.readlinkSync(systemPath);
        const resolvedPath = path.resolve(path.dirname(systemPath), symlinkTarget);

        if (this.isPathExists(resolvedPath)) {
          sourceToBackup = resolvedPath;
          sourceToMove = resolvedPath;
          log.info(`Following symlink to actual content: ${this.getDisplayPath(resolvedPath)}`);
        }

        fs.unlinkSync(systemPath);
      } catch (error) {
        log.warning(`Could not resolve symlink ${this.getDisplayPath(systemPath)}: ${error}`);
        // If we can't resolve it, just delete the broken symlink
        fs.unlinkSync(systemPath);
      }
    }

    // Create backup in ~/.backup.dotsx (mirrors dotsx structure)
    this.createBackup(dotsxRelativePath, sourceToBackup);

    // Create parent directory for dotsx path
    this.createDirectory(path.dirname(dotsxPath));

    // Move content to dotsx (only if source is not already the dotsx path)
    if (sourceToMove !== dotsxPath && this.isPathExists(sourceToMove)) {
      if (this.isFile(sourceToMove)) {
        this.copyFile(sourceToMove, dotsxPath);
        this.deleteFile(sourceToMove);
      } else if (this.isDirectory(sourceToMove)) {
        this.copyDirectory(sourceToMove, dotsxPath);
        this.deleteDirectory(sourceToMove);
      }
    }

    // Ensure systemPath doesn't exist before creating symlink
    // (in case it's still there after processing)
    if (this.isPathExists(systemPath)) {
      if (this.isFile(systemPath)) {
        this.deleteFile(systemPath);
      } else if (this.isDirectory(systemPath)) {
        this.deleteDirectory(systemPath);
      } else if (this.isSymLink(systemPath)) {
        fs.unlinkSync(systemPath);
      }
    }

    // Create symlink: system → dotsx
    fs.symlinkSync(dotsxPath, systemPath);
  },
};
