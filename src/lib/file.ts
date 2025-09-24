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
    if (!this.isPathExists(path)) return false;
    return fs.lstatSync(path).isSymbolicLink() || false;
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
      console.log(`✅ Directory created: ${path}`);
    }
  },

  copyFile(src: string, dest: string) {
    try {
      if (!this.isFile(src)) {
        this.createFile(src);
      }
      fs.copyFileSync(src, dest);
      console.log(`✅ File copied: ${dest}`);
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
   * Sync a file from src to dest
   * If dest is a symlink or a file, it will be backed up and replaced by a new symlink or file
   */
  safeSymlink(src: string, dest: string) {
    if (this.isPathExists(dest)) {
      const backupPath = `${dest}.dotsx.backup`;

      if (fs.lstatSync(dest).isSymbolicLink()) {
        // if it's a symlink → read the real path
        const realPath = fs.readlinkSync(dest);
        const content = fs.readFileSync(realPath);
        fs.writeFileSync(backupPath, content);
      } else {
        // if it's a normal file → read directly
        const content = fs.readFileSync(dest);
        fs.writeFileSync(backupPath, content);
      }

      fs.unlinkSync(dest); // delete the old one

      console.log(`✅ Backup file created: ${backupPath}`);
      console.log(`✅ Deleted old file: ${dest}`);
    }

    fs.symlinkSync(src, dest);
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

  /**
   * Expand a path to an absolute path
   * @example ~/workspace -> /home/user/workspaces
   * @example /home/user/workspace -> /home/user/workspace
   * @example workspace -> workspace
   * @example ../workspace -> ../workspace
   */
  expandPath(inputPath: string): string {
    return inputPath.startsWith('~/') ? path.resolve(homedir(), inputPath.slice(2)) : inputPath;
  },

  getFileSymlinkPath(inputPath: string): string | null {
   const isSymlink = this.isSymLink(path.resolve(inputPath));
   if (isSymlink) {
    return fs.readlinkSync(path.resolve(inputPath));
   }
   return null
  },

  getDisplayPath(inputPath: string): string {
    return inputPath.replace(homedir(), '~');
  },

  deleteDirectory(path: string) {
    if (this.isDirectory(path)) {
      fs.rmdirSync(path, { recursive: true });
      console.log(`✅ Directory deleted: ${path}`);
    }
  },
};
