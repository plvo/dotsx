import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function copyDirectory(src: string, dest: string) {
  // Create destination directory if it doesn't exist
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const item of readdirSync(src)) {
    const srcPath = resolve(src, item);
    const destPath = resolve(dest, item);

    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      // Create destination directory and copy recursively
      copyDirectory(srcPath, destPath);
    } else {
      // Copy the file
      try {
        copyFileSync(srcPath, destPath);
        console.log(`✅ File copied: ${item}`);
      } catch (err) {
        console.error(`❌ Error copying file ${item}: ${err}`);
      }
    }
  }
}
