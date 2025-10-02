import fs from 'node:fs';
import path from 'node:path';
import { log } from '@clack/prompts';
import { FileLib } from '../lib/file';
import { BACKUP_LIMIT_PER_FILE, BACKUP_METADATA_PATH, BACKUP_PATH, type DotsxOsPath } from './constants';

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
      FileLib.Directory.create(BACKUP_PATH);

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

      const allFiles = FileLib.Directory.read(backupDir);
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
   * @param maxBackups - Maximum number of backups to keep (default: BACKUP_LIMIT_PER_FILE)
   */
  cleanupOldBackups(dotsxRelativePath: string, maxBackups: number = BACKUP_LIMIT_PER_FILE): void {
    try {
      const backupFiles = this.getExistingBackups(dotsxRelativePath);

      // Delete backups beyond the limit
      const backupsToDelete = backupFiles.slice(maxBackups);

      for (const backup of backupsToDelete) {
        if (FileLib.isFile(backup.fullPath)) {
          FileLib.File.deleteFile(backup.fullPath);
        } else if (FileLib.isDirectory(backup.fullPath)) {
          FileLib.Directory.deleteDirectory(backup.fullPath);
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

    FileLib.Directory.create(path.dirname(backupPath));

    if (FileLib.isFile(systemPath)) {
      FileLib.File.copy(systemPath, backupPath);
    } else if (FileLib.isDirectory(systemPath)) {
      FileLib.Directory.copy(systemPath, backupPath);
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

    // 2. If we have BACKUP_LIMIT_PER_FILE, delete the oldest one before creating new backup
    if (existingBackups.length >= BACKUP_LIMIT_PER_FILE) {
      const oldestBackup = existingBackups[existingBackups.length - 1];
      if (oldestBackup) {
        if (FileLib.isFile(oldestBackup.fullPath)) {
          FileLib.File.deleteFile(oldestBackup.fullPath);
          log.info(`Deleted oldest backup: ${oldestBackup.name}`);
        } else if (FileLib.isDirectory(oldestBackup.fullPath)) {
          FileLib.Directory.deleteDirectory(oldestBackup.fullPath);
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
    const items = FileLib.Directory.read(dir);

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
   * Resolve system path from dotsx path
   * Converts __home__ notation to actual home directory
   *
   * Examples:
   *   ~/.dotsx/<os>/symlinks/__home__/.zshrc → /home/plv/.zshrc
   *   ~/.dotsx/<os>/symlinks/__home__/.config/Code/User/settings.json → ~/.config/Code/User/settings.json
   *
   * @param dotsxPath - Path in dotsx
   * @param dotsxOsPath - DotsX OS path structure
   * @returns Corresponding system path or null
   */
  resolveSystemPath(dotsxPath: string, dotsxOsPath: DotsxOsPath): string | null {
    try {
      // Only handle symlinks directory - bin and packages don't need system paths
      if (!dotsxPath.startsWith(dotsxOsPath.symlinks)) {
        return null;
      }

      // Get relative path from symlinks directory
      const relativePath = path.relative(dotsxOsPath.symlinks, dotsxPath);

      // Expand __home__ notation to actual home directory
      return FileLib.expand(relativePath);
    } catch (_error) {
      return null;
    }
  },

  /**
   * Perform daily backup check for all files in ~/.dotsx/<os>/symlinks
   * Only creates backups if needed (once per day per file)
   * Silent if no backups are created
   * @param dotsxOsPath - DotsX OS path structure
   */
  async performDailyBackupCheck(dotsxOsPath: DotsxOsPath): Promise<void> {
    try {
      // ✅ Scan ALL files in ~/.dotsx/<os>/symlinks recursively (files only, no directories)
      const allFiles = this.scanFilesOnly(dotsxOsPath.symlinks);

      let backupsCreated = 0;

      for (const dotsxFilePath of allFiles) {
        const dotsxRelativePath = path.relative(dotsxOsPath.baseOs, dotsxFilePath);

        // Check if backup is needed today
        if (this.shouldCreateBackup(dotsxRelativePath)) {
          // Resolve corresponding system path
          const systemPath = this.resolveSystemPath(dotsxFilePath, dotsxOsPath);

          // Only backup if system path exists
          if (systemPath && FileLib.isExists(systemPath)) {
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
      log.warning(`Daily backup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
