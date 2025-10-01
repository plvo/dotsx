import fs from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { log } from '@clack/prompts';

export namespace FileLib {
  export const isExists = (p: string) => fs.existsSync(p) || false;
  export const isFile = (p: string) => isExists(p) && fs.statSync(p).isFile();
  export const isDirectory = (p: string) => isExists(p) && fs.statSync(p).isDirectory();
  export const isSymLink = (p: string) => isExists(p) && fs.lstatSync(p).isSymbolicLink();

  export const expand = (inputPath: string): string => {
    if (inputPath.startsWith('~/')) return path.resolve(homedir(), inputPath.slice(2));
    if (inputPath.startsWith('__home__/')) return path.resolve(homedir(), inputPath.slice(9));
    if (inputPath === '__home__') return homedir();
    return inputPath;
  };

  export const display = (inputPath: string): string => inputPath.replace(homedir(), '__home__');

  export namespace File {
    export const isExecutable = (p: string) => isFile(p) && (fs.statSync(p).mode & 0o100) !== 0;

    export const create = (filePath: string, content = '') => {
      if (!isExists(filePath)) {
        Directory.create(path.dirname(filePath));
        fs.writeFileSync(filePath, content);
      }
    };

    export const deleteFile = (p: string) => {
      if (isFile(p)) fs.rmSync(p);
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
      if (isFile(p)) fs.writeFileSync(p, content);
    };

    export const append = (p: string, content: string) => {
      if (isFile(p)) fs.appendFileSync(p, `${content}\n`);
    };

    export const writeReplacing = (p: string, newContent: string, contentToReplace: string) => {
      if (!isFile(p)) return;
      try {
        const fileContent = read(p);
        const updatedContent = fileContent.replace(contentToReplace, newContent);
        write(p, updatedContent);
      } catch (error) {
        log.error(`Error writing to file ${p}: ${error}`);
      }
    };

    export const makeExecutable = (p: string) => {
      if (isFile(p)) fs.chmodSync(p, 0o755);
    };

    export const deleteExtension = (filename: string): string => {
      const idx = filename.split('').reverse().join('').indexOf('.');
      return idx !== -1 ? filename.substring(0, filename.length - idx - 1) : filename;
    };

    export const copy = (src: string, dest: string) => {
      try {
        if (!isFile(src)) create(src);
        fs.copyFileSync(src, dest);
      } catch (error) {
        log.error(`Error copying file: ${error}`);
      }
    };
  }

  export namespace Directory {
    export const create = (dirPath: string) => {
      if (!isExists(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    };

    export const deleteDirectory = (p: string) => {
      if (isDirectory(p)) fs.rmdirSync(p, { recursive: true });
    };

    export const read = (p: string): string[] => {
      if (!isDirectory(p)) return [];
      return fs.readdirSync(p);
    };

    export const copy = (src: string, dest: string) => {
      if (!isExists(dest)) create(dest);

      for (const item of fs.readdirSync(src)) {
        const srcPath = path.resolve(src, item);
        const destPath = path.resolve(dest, item);

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
          copy(srcPath, destPath);
        } else {
          try {
            File.copy(srcPath, destPath);
          } catch (err) {
            log.error(`Error copying file ${item}: ${err}`);
          }
        }
      }
    };
  }
}
