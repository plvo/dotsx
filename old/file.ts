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
    if (!this.isPathExists(path)) return false;
    return fs.lstatSync(path).isSymbolicLink() || false;
  },

  isExecutable(path: string) {
    if (!this.isFile(path)) return false;
    return (fs.statSync(path).mode & 0o100) !== 0 || false;
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

  /**
   * Convert absolute path to __home__ notation for storage
   * @example /home/user/workspace -> __home__/workspace
   * @example /etc/config -> /etc/config
   */
  getDisplayPath(inputPath: string): string {
    return inputPath.replace(homedir(), '__home__');
  },
};
