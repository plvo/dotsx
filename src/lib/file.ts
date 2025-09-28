import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { log } from '@clack/prompts';

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
   * @example ~/workspace -> /home/user/workspaces
   * /home/user/workspace -> /home/user/workspace
   */
  expandPath(inputPath: string): string {
    return inputPath.startsWith('~/') ? path.resolve(homedir(), inputPath.slice(2)) : inputPath;
  },

  getFileSymlinkPath(inputPath: string): string {
    return fs.readlinkSync(path.resolve(inputPath));
  },

  getDisplayPath(inputPath: string): string {
    return inputPath.replace(homedir(), '~');
  },

  backupPath(src: string) {
    // YYYYMMDDHHMMSSMMM
    const formattedTimestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17);

    const dest = `${src}.dotsx.${formattedTimestamp}.backup`;

    if (this.isSymLink(src)) {
      // If it's a symlink, backup the target content
      const realPath = this.getFileSymlinkPath(src);
      const resolvedPath = path.resolve(path.dirname(src), realPath);

      this.backupPath(resolvedPath);

      fs.unlinkSync(src); // Remove the symlink
    } else if (this.isDirectory(src)) {
      this.copyDirectory(src, dest);
    } else if (this.isFile(src)) {
      this.copyFile(src, dest);
    }
  },

  /**
   * Creates a safe symlink from src (source file) to dest (symlink path).
   * Automatically creates parent directories and backs up existing dest file.
   * @param src - Source file/directory path (user content)
   * @param dest - Destination symlink path (~/.dotsx/*)
   * @param copyFirst - If true, copies src to dest before creating symlink
   */
  safeSymlink(src: string, dest: string) {
    // Create parent directory if it doesn't exist
    this.createDirectory(path.dirname(dest));

    if (this.isFile(dest)) {
      this.backupPath(dest);
      this.deleteFile(dest);
    } else if (this.isDirectory(dest)) {
      this.backupPath(dest);
      this.deleteDirectory(dest);
    }

    fs.symlinkSync(src, dest);
  },
};
