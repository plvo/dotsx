import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { log } from '@clack/prompts';
import type { OsInfo } from './system';

export namespace FileLib {
  export const isExists = (p: string) => fs.existsSync(expand(p)) || false;
  export const isFile = (p: string) => isExists(p) && fs.statSync(expand(p)).isFile();
  export const isDirectory = (p: string) => isExists(p) && fs.statSync(expand(p)).isDirectory();
  export const isSymLink = (p: string) => isExists(p) && fs.lstatSync(expand(p)).isSymbolicLink();

  export const expand = (inputPath: string): string => {
    if (inputPath.startsWith('~/')) return path.resolve(os.homedir(), inputPath.slice(2));
    if (inputPath.startsWith('__home__/')) return path.resolve(os.homedir(), inputPath.slice(9));
    if (inputPath === '__home__') return os.homedir();
    return inputPath;
  };

  export const display = (inputPath: string): string => inputPath.split('__home__/')[1] ?? inputPath;

  /**
   * @example toDotsxPath('/home/user/.zshrc', '/home/user/.dotsx/symlinks') // '/home/user/.dotsx/symlinks/__home__/.zshrc'
   * toDotsxPath('/home/user/projects', '/home/user/.dotsx/symlinks') // '/home/user/.dotsx/symlinks/home/user/projects'
   */
  export const toDotsxPath = (systemPath: string, symlinkBase: string): string => {
    const home = os.homedir();
    if (systemPath.startsWith(home)) {
      const relativePath = systemPath.slice(home.length);
      return path.resolve(symlinkBase, '__home__', relativePath.startsWith('/') ? relativePath.slice(1) : relativePath);
    }
    return path.resolve(symlinkBase, systemPath.startsWith('/') ? systemPath.slice(1) : systemPath);
  };

  export namespace File {
    export const isExecutable = (p: string) => isFile(p) && (fs.statSync(expand(p)).mode & 0o100) !== 0;

    export const create = (filePath: string, content = '') => {
      if (!isExists(filePath)) {
        Directory.create(path.dirname(filePath));
        fs.writeFileSync(filePath, content);
      }
    };

    export const deleteFile = (p: string) => {
      if (isFile(p)) fs.rmSync(expand(p));
    };

    export const read = (p: string): string => fs.readFileSync(p, 'utf8');

    export const readAsArray = (p: string): string[] => {
      try {
        return read(p)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
      } catch (error) {
        log.error(`Error reading ${p}: ${error}`);
        return [];
      }
    };

    export const write = (p: string, content: string) => {
      if (isFile(p)) fs.writeFileSync(expand(p), content);
    };

    export const writeAppend = (p: string, content: string) => {
      if (isFile(p)) fs.appendFileSync(expand(p), `${content}\n`);
    };

    export const writeReplacing = (p: string, newContent: string, contentToReplace: string) => {
      if (!isFile(expand(p))) return;
      try {
        const fileContent = read(expand(p));
        const updatedContent = fileContent.replace(contentToReplace, newContent);
        write(expand(p), updatedContent);
      } catch (error) {
        log.error(`Error writing to file ${p}: ${error}`);
      }
    };

    export const makeExecutable = (p: string) => {
      if (isFile(p)) fs.chmodSync(expand(p), 0o755);
    };

    /**
     * @example deleteExtension('script.sh.txt') // 'script.sh'
     */
    export const deleteExtension = (filename: string): string => {
      const idx = filename.split('').reverse().join('').indexOf('.');
      return idx !== -1 ? filename.substring(0, filename.length - idx - 1) : filename;
    };

    export const copy = (src: string, dest: string) => {
      try {
        if (!isFile(expand(src))) create(src);
        fs.copyFileSync(src, dest);
      } catch (error) {
        log.error(`Error copying file: ${error}`);
      }
    };
  }

  export namespace Directory {
    export const create = (dirPath: string) => {
      if (!isExists(expand(dirPath))) fs.mkdirSync(expand(dirPath), { recursive: true });
    };

    export const deleteDirectory = (p: string) => {
      if (isDirectory(expand(p))) fs.rmdirSync(expand(p), { recursive: true });
    };

    export const read = (p: string): string[] => {
      if (!isDirectory(expand(p))) return [];
      return fs.readdirSync(expand(p));
    };

    export const copy = (src: string, dest: string) => {
      if (!isExists(expand(dest))) create(expand(dest));

      for (const item of fs.readdirSync(src)) {
        const srcPath = path.resolve(src, item);
        const destPath = path.resolve(dest, item);

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
          copy(expand(srcPath), expand(destPath));
        } else {
          try {
            File.copy(expand(srcPath), expand(destPath));
          } catch (err) {
            log.error(`Error copying file ${item}: ${err}`);
          }
        }
      }
    };

    // export const protectDir = (path: string, osInfo: OsInfo) => {
    //   let command = '';
    //   switch (osInfo.family) {
    //     case 'linux':
    //       command = `chmod +t "${path}"`;
    //       break;
    //     case 'macos':
    //     case 'bsd':
    //       command = `chmod +a "user:$(whoami) deny delete" "${path}"`;
    //       break;
    //     case 'windows':
    //       command = `icacls "${path}" /deny %USERNAME%:(DE)`;
    //       break;

    //     default:
    //       throw new Error(`Unsupported OS family: ${osInfo.family}`);
    //   }

    //   execSync(command, { stdio: 'inherit' });
    // };

    // export const unprotectDir = (path: string, osInfo: OsInfo) => {
    //   let command = '';
    //   switch (osInfo.family) {
    //     case 'linux':
    //       command = `chmod -t "${path}"`;
    //       break;
    //     case 'macos':
    //     case 'bsd':
    //       command = `chmod -a "user:$(whoami) deny delete" "${path}" || true`;
    //       break;

    //     case 'windows':
    //       command = `icacls "${path}" /remove:d %USERNAME%`;
    //       break;

    //     default:
    //       throw new Error(`Unsupported OS family: ${osInfo.family}`);
    //   }

    //   execSync(command, { stdio: 'inherit' });
    // };
  }
}
