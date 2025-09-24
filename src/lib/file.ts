import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

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

    const actualTarget = fs.readlinkSync(dest);
    return path.resolve(path.dirname(dest), actualTarget) === src;
  },

  createFile(path: string, content: string = '') {
    if (!this.isPathExists(path)) {
      fs.writeFileSync(path, content);
    }
  },

  createDirectory(path: string) {
    if (!this.isPathExists(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  },

  copyFile(src: string, dest: string) {
    try {
      if (!this.isFile(src)) {
        this.createFile(src);
      }
      fs.copyFileSync(src, dest);
    } catch (error) {
      console.error(`❌ Error copying file: ${error}`);
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
          console.error(`❌ Error copying file ${item}: ${err}`);
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
      console.error(`❌ Error reading ${path}: ${error}`);
      return [];
    }
  },

  readDirectory(path: string): string[] {
    if (!this.isDirectory(path)) return [];
    return fs.readdirSync(path);
  },

  writeToEndOfFile(path: string, content: string) {
    fs.appendFileSync(path, `${content}\n`);
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
    const dest = `${src}.dotsx.backup-${Date.now()}`;

    if (this.isSymLink(src)) {
      // If it's a symlink, backup the target content
      const realPath = this.getFileSymlinkPath(src);
      const resolvedPath = path.resolve(path.dirname(src), realPath);

      if (this.isDirectory(resolvedPath)) {
        this.copyDirectory(resolvedPath, dest);
      } else {
        this.copyFile(resolvedPath, dest);
      }
      fs.unlinkSync(src); // Remove the symlink
    } else if (this.isDirectory(src)) {
      this.copyDirectory(src, dest);
      this.deleteDirectory(src);
    } else if (this.isFile(src)) {
      this.copyFile(src, dest);
      this.deleteFile(src);
    }

    console.log(`💾 Backup created: ${this.getDisplayPath(dest)}`);
  },

  /**
   * Sync a file from src to dest
   * If dest exists, it will be backed up and replaced by a new symlink
   */
  safeSymlink(src: string, dest: string) {
    if (this.isPathExists(dest)) {
      this.backupPath(dest);
    }

    fs.symlinkSync(src, dest);
    console.log(`🔗 Symlink created: ${this.getDisplayPath(src)} <-> ${this.getDisplayPath(dest)}`);
  },
};
