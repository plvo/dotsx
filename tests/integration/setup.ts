import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type DotsxOsPath, resolveDotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';

export interface TestEnv {
  tmpDir: string;
  homeDir: string;
  dotsxDir: string;
  dotsxPath: DotsxOsPath;
  originalEnv: Record<string, any>;
}

// Store original os.homedir
const originalHomedir = os.homedir;

/**
 * Create isolated test environment
 */
export function createTestEnv(testName: string): TestEnv {
  const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tmpDir = path.join(os.tmpdir(), `dotsx-test-${testName}-${timestamp}`);
  const homeDir = path.join(tmpDir, 'home');
  const dotsxDir = path.join(tmpDir, 'dotsx');

  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(dotsxDir, { recursive: true });

  // Save original env
  const originalEnv = {
    HOME: process.env.HOME,
    DOTSX_PATH: process.env.DOTSX_PATH,
    SHELL: process.env.SHELL,
    homedir: os.homedir,
  };

  // Set test env
  process.env.HOME = homeDir;
  process.env.DOTSX_PATH = dotsxDir;
  process.env.SHELL = process.env.SHELL || '/bin/bash';

  // Patch os.homedir() to return test homeDir
  // @ts-ignore - Monkey patching for tests
  os.homedir = () => homeDir;

  // Resolve dotsx path with updated env
  const dotsxPath = resolveDotsxOsPath('debian');

  return {
    tmpDir,
    homeDir,
    dotsxDir,
    dotsxPath,
    originalEnv,
  };
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnv(env: TestEnv): void {
  // Restore original env
  process.env.HOME = env.originalEnv.HOME;
  process.env.DOTSX_PATH = env.originalEnv.DOTSX_PATH;
  process.env.SHELL = env.originalEnv.SHELL;

  // Restore os.homedir
  if (env.originalEnv.homedir) {
    // @ts-ignore
    os.homedir = env.originalEnv.homedir;
  }

  // Remove temp dir
  if (fs.existsSync(env.tmpDir)) {
    fs.rmSync(env.tmpDir, { recursive: true, force: true });
  }
}

/**
 * Create fake config files for testing
 */
export function createFakeFiles(homeDir: string, files: Record<string, string>): void {
  Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(homeDir, filePath);
    FileLib.Directory.create(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content);
  });
}

/**
 * Create fake git remote repository
 */
export function createFakeGitRemote(env: TestEnv): string {
  const remoteDir = path.join(env.tmpDir, 'remote.git');
  fs.mkdirSync(remoteDir, { recursive: true });

  execSync('git init --bare', { cwd: remoteDir, stdio: 'pipe' });

  return remoteDir;
}

/**
 * Initialize git repo in dotsx
 */
export function initGitRepo(env: TestEnv, remoteUrl?: string): void {
  if (!fs.existsSync(env.dotsxDir)) {
    fs.mkdirSync(env.dotsxDir, { recursive: true });
  }

  execSync('git init', { cwd: env.dotsxDir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: env.dotsxDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: env.dotsxDir, stdio: 'pipe' });

  if (remoteUrl) {
    execSync(`git remote add origin ${remoteUrl}`, { cwd: env.dotsxDir, stdio: 'pipe' });
  }
}

/**
 * Assert symlink is correct
 */
export function assertSymlink(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    throw new Error(`Symlink destination does not exist: ${dest}`);
  }

  const stats = fs.lstatSync(dest);
  if (!stats.isSymbolicLink()) {
    throw new Error(`Destination is not a symlink: ${dest}`);
  }

  const target = fs.readlinkSync(dest);
  const resolvedTarget = path.resolve(path.dirname(dest), target);

  if (resolvedTarget !== src) {
    throw new Error(`Symlink points to wrong target.\nExpected: ${src}\nActual: ${resolvedTarget}`);
  }
}

/**
 * Assert file content
 */
export function assertFileContent(filePath: string, expectedContent: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const actualContent = fs.readFileSync(filePath, 'utf8');
  if (actualContent !== expectedContent) {
    throw new Error(`File content mismatch.\nExpected: ${expectedContent}\nActual: ${actualContent}`);
  }
}

/**
 * Assert file exists
 */
export function assertFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
}

/**
 * Assert file does not exist
 */
export function assertFileNotExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    throw new Error(`File should not exist: ${filePath}`);
  }
}

/**
 * Assert directory exists
 */
export function assertDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }
}

/**
 * Get file modification time
 */
export function getFileMtime(filePath: string): number {
  return fs.statSync(filePath).mtimeMs;
}

/**
 * Create backup filename
 */
export function createBackupFilename(original: string): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
  return `${original}.${timestamp}.dotsx.backup`;
}

/**
 * Count backups for a file
 */
export function countBackups(backupDir: string, filename: string): number {
  if (!fs.existsSync(backupDir)) return 0;

  const files = fs.readdirSync(backupDir);
  return files.filter((f) => f.startsWith(path.basename(filename)) && f.endsWith('.dotsx.backup')).length;
}

/**
 * Execute shell command and return output
 */
export function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
  }
}

/**
 * Create dotsx structure manually (without running init command)
 */
export function createDotsxStructure(env: TestEnv): void {
  FileLib.Directory.create(env.dotsxPath.baseOs);
  FileLib.File.create(env.dotsxPath.config, '{}');
  FileLib.Directory.create(env.dotsxPath.bin);
  FileLib.File.create(env.dotsxPath.binAliases, '# Bin aliases\n');
  FileLib.Directory.create(env.dotsxPath.packagesManager);
  FileLib.File.create(env.dotsxPath.packagesManagerConfig, '[]');
  FileLib.Directory.create(env.dotsxPath.symlinks);
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
