import fs from 'node:fs';
import path from 'node:path';
import { log, spinner } from '@clack/prompts';
import { BACKUP_METADATA_PATH, BACKUP_PATH, DOTSX, DOTSX_PATH, MAX_BACKUPS_PER_FILE } from './constants';
import { FileLib } from './file';

/**
 * Backup metadata structure
 */
interface BackupMetadata {
  [dotsxRelativePath: string]: string;
}

/**
 * Backup file information
 */
interface BackupFileInfo {
  name: string;
  fullPath: string;
  timestamp: string;
}

export const BackupLib = {
  /**
   * Get last backup timestamp for a given dotsx relative path
   * @param dotsxRelativePath - Relative path from DOTSX_PATH (e.g., "symlinks/__home__/.zshrc")
   * @returns ISO timestamp string or null if never backed up
   */
  getLastBackupDate(dotsxRelativePath: string): string | null {
    try {
      if (!FileLib.isFile(BACKUP_METADATA_PATH)) {
        return null;
      }

      const content = fs.readFileSync(BACKUP_METADATA_PATH, 'utf8');
      const metadata: BackupMetadata = JSON.parse(content);

      return metadata[dotsxRelativePath] || null;
    } catch (error) {
      log.warning(`Failed to read backup metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  },

  /**
   * Save last backup timestamp for a given dotsx relative path
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @param timestamp - ISO timestamp string
   */
  saveLastBackupDate(dotsxRelativePath: string, timestamp: string): void {
    try {
      // Ensure backup directory exists
      FileLib.createDirectory(BACKUP_PATH);

      let metadata: BackupMetadata = {};

      if (FileLib.isFile(BACKUP_METADATA_PATH)) {
        const content = fs.readFileSync(BACKUP_METADATA_PATH, 'utf8');
        metadata = JSON.parse(content);
      }

      metadata[dotsxRelativePath] = timestamp;

      fs.writeFileSync(BACKUP_METADATA_PATH, JSON.stringify(metadata, null, 2));
    } catch (error) {
      log.error(`Failed to save backup metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Check if a backup should be created today for the given path
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @returns true if backup should be created, false otherwise
   */
  shouldCreateBackup(dotsxRelativePath: string): boolean {
    const lastBackupTimestamp = this.getLastBackupDate(dotsxRelativePath);

    if (!lastBackupTimestamp) {
      return true; // Never backed up before
    }

    // Compare dates only (ignore time)
    const lastBackupDate = new Date(lastBackupTimestamp).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    return lastBackupDate !== today;
  },

  /**
   * Get list of existing backups for a given dotsx relative path
   * Sorted by timestamp (newest first)
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @returns Array of backup file information
   */
  getExistingBackups(dotsxRelativePath: string): BackupFileInfo[] {
    try {
      const backupDir = path.dirname(path.join(BACKUP_PATH, dotsxRelativePath));
      const fileName = path.basename(dotsxRelativePath);

      if (!FileLib.isDirectory(backupDir)) {
        return [];
      }

      const allFiles = FileLib.readDirectory(backupDir);
      const backupFiles = allFiles
        .filter((file) => {
          const pattern = new RegExp(`^${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d{14}\\.dotsx\\.backup$`);
          return pattern.test(file);
        })
        .map((file) => ({
          name: file,
          fullPath: path.join(backupDir, file),
          timestamp: file.match(/\.(\d{14})\.dotsx\.backup$/)?.[1] || '',
        }));

      // Sort by timestamp (newest first)
      backupFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return backupFiles;
    } catch (error) {
      log.warning(`Failed to get existing backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  },

  /**
   * Cleanup old backups for a given dotsxRelativePath
   * Deletes backups beyond the limit
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @param maxBackups - Maximum number of backups to keep (default: MAX_BACKUPS_PER_FILE)
   */
  cleanupOldBackups(dotsxRelativePath: string, maxBackups: number = MAX_BACKUPS_PER_FILE): void {
    try {
      const backupFiles = this.getExistingBackups(dotsxRelativePath);

      // Delete backups beyond the limit
      const backupsToDelete = backupFiles.slice(maxBackups);

      for (const backup of backupsToDelete) {
        if (FileLib.isFile(backup.fullPath)) {
          FileLib.deleteFile(backup.fullPath);
        } else if (FileLib.isDirectory(backup.fullPath)) {
          FileLib.deleteDirectory(backup.fullPath);
        }
      }

      if (backupsToDelete.length > 0) {
        log.info(`Cleaned up ${backupsToDelete.length} old backup(s) for ${dotsxRelativePath}`);
      }
    } catch (error) {
      log.warning(`Failed to cleanup old backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Create a backup of a file or directory
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @param systemPath - Absolute system path to backup
   */
  createBackup(dotsxRelativePath: string, systemPath: string): void {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

    // Mirror dotsx structure in backup
    const backupPath = path.join(BACKUP_PATH, `${dotsxRelativePath}.${timestamp}.dotsx.backup`);

    FileLib.createDirectory(path.dirname(backupPath));

    if (FileLib.isFile(systemPath)) {
      FileLib.copyFile(systemPath, backupPath);
    } else if (FileLib.isDirectory(systemPath)) {
      FileLib.copyDirectory(systemPath, backupPath);
    }

    // Cleanup old backups after creating a new one
    this.cleanupOldBackups(dotsxRelativePath);
  },

  /**
   * Create a daily backup with rotation
   * Only creates backup if none exists for today
   * Automatically removes oldest backup if limit exceeded
   * @param dotsxRelativePath - Relative path from DOTSX_PATH
   * @param systemPath - Absolute system path to backup
   */
  createDailyBackup(dotsxRelativePath: string, systemPath: string): void {
    const now = new Date();
    const isoTimestamp = now.toISOString();

    // 1. Check if we already have 7 backups
    const existingBackups = this.getExistingBackups(dotsxRelativePath);

    // 2. If we have MAX_BACKUPS_PER_FILE, delete the oldest one before creating new backup
    if (existingBackups.length >= MAX_BACKUPS_PER_FILE) {
      const oldestBackup = existingBackups[existingBackups.length - 1];
      if (oldestBackup) {
        if (FileLib.isFile(oldestBackup.fullPath)) {
          FileLib.deleteFile(oldestBackup.fullPath);
          log.info(`Deleted oldest backup: ${oldestBackup.name}`);
        } else if (FileLib.isDirectory(oldestBackup.fullPath)) {
          FileLib.deleteDirectory(oldestBackup.fullPath);
          log.info(`Deleted oldest backup: ${oldestBackup.name}`);
        }
      }
    }

    // 3. Create the new backup
    this.createBackup(dotsxRelativePath, systemPath);

    // 4. Save timestamp in metadata
    this.saveLastBackupDate(dotsxRelativePath, isoTimestamp);
  },

  /**
   * Scan directory recursively to find ONLY files (not directories)
   * @param dir - Directory to scan
   * @returns Array of absolute file paths (directories excluded)
   */
  scanFilesOnly(dir: string): string[] {
    if (!FileLib.isDirectory(dir)) return [];

    const results: string[] = [];
    const items = FileLib.readDirectory(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      if (FileLib.isSymLink(fullPath)) {
        // Skip symlinks themselves (we backup their targets)
        continue;
      }

      if (FileLib.isFile(fullPath)) {
        // ✅ Add only FILES
        results.push(fullPath);
      } else if (FileLib.isDirectory(fullPath)) {
        // ✅ Recurse into directories WITHOUT adding the directory itself
        results.push(...this.scanFilesOnly(fullPath));
      }
    }

    return results;
  },

  /**
   * Load all available domains (IDE, Terminal)
   * @returns Array of Domain objects
   */
  loadAllDomains(): any[] {
    try {
      const { cursorDomain, vscodeDomain } = require('../domains/ide');
      const { zshDomain, bashDomain, tmuxDomain } = require('../domains/terminal');

      return [cursorDomain, vscodeDomain, zshDomain, bashDomain, tmuxDomain].filter(Boolean);
    } catch (error) {
      return [];
    }
  },

  /**
   * Resolve system path from dotsx path
   * Handles both __home__ notation and domain-based symlinks
   *
   * Examples:
   *   ~/.dotsx/symlinks/__home__/.zshrc → /home/plv/.zshrc
   *   ~/.dotsx/ide/cursor/settings.json → ~/.config/Cursor/User/settings.json (via domain)
   *   ~/.dotsx/terminal/zsh/.zshrc → ~/.zshrc (via domain)
   *
   * @param dotsxPath - Path in dotsx
   * @returns Corresponding system path or null
   */
  resolveSystemPath(dotsxPath: string): string | null {
    try {
      const { DOTSX_PATH } = require('./constants');

      // Case 1: symlinks/__home__/... → expand __home__ to actual home
      const symlinkDir = path.join(DOTSX_PATH, 'symlinks');

      if (dotsxPath.startsWith(symlinkDir)) {
        const relativePath = path.relative(symlinkDir, dotsxPath);
        // Convert __home__ to actual home directory
        return FileLib.expandPath(relativePath);
      }

      // Case 2: IDE/Terminal → find corresponding system symlink via domains
      const allDomains = this.loadAllDomains();
      const { SystemLib } = require('./system');
      const family = SystemLib.getOsInfo().family;

      for (const domain of allDomains) {
        if (!domain.symlinkPaths) continue;

        const symlinkPaths = domain.symlinkPaths[family] || [];

        for (const declaredPath of symlinkPaths) {
          const systemPath = FileLib.expandPath(declaredPath);

          // Check if this systemPath is a symlink pointing to dotsx
          if (FileLib.isSymLink(systemPath)) {
            try {
              const target = fs.readlinkSync(systemPath);
              const resolvedTarget = path.resolve(path.dirname(systemPath), target);

              // If symlink points to a parent directory of dotsxPath
              if (dotsxPath.startsWith(resolvedTarget)) {
                // Calculate relative path and resolve to system path
                const relativeToTarget = path.relative(resolvedTarget, dotsxPath);
                return path.join(systemPath, relativeToTarget);
              }

              // If symlink points exactly to dotsxPath
              if (resolvedTarget === dotsxPath) {
                return systemPath;
              }
            } catch {
              continue;
            }
          }
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  },

  /**
   * Perform daily backup check for all files in ~/.dotsx
   * Only creates backups if needed (once per day per file)
   * Silent if no backups are created
   */
  async performDailyBackupCheck(): Promise<void> {
    try {
      // Skip if disabled
      if (process.env.DOTSX_NO_AUTO_BACKUP === '1') {
        return;
      }

      const { DOTSX_PATH } = require('./constants');

      // ✅ Scan ALL files in ~/.dotsx recursively (files only, no directories)
      const allFiles = this.scanFilesOnly(DOTSX_PATH);

      let backupsCreated = 0;

      for (const dotsxFilePath of allFiles) {
        const dotsxRelativePath = path.relative(DOTSX_PATH, dotsxFilePath);

        // Check if backup is needed today
        if (this.shouldCreateBackup(dotsxRelativePath)) {
          // Resolve corresponding system path
          const systemPath = this.resolveSystemPath(dotsxFilePath);

          // Only backup if system path exists
          if (systemPath && FileLib.isPathExists(systemPath)) {
            this.createDailyBackup(dotsxRelativePath, systemPath);
            backupsCreated++;
          }
        }
      }

      // Only log if backups were actually created
      if (backupsCreated > 0) {
        log.success(`✅ Created ${backupsCreated} daily backup(s)`);
      }
    } catch (error) {
      // Silent failure - don't block startup
      if (process.env.DOTSX_DEBUG === '1') {
        log.warning(`Daily backup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },
};
