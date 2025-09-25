import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Integration Test Environment Setup
 * Provides isolated temporary directories for testing with real file operations
 */
export class IntegrationTestEnvironment {
  private testDir: string | null = null;
  private originalDotsxPath: string | undefined;
  private originalHome: string | undefined;

  /**
   * Setup isolated test environment
   * - Creates temporary directory
   * - Overrides DOTSX_PATH to point to temp directory
   * - Returns paths for testing
   */
  async setup(): Promise<{
    testDir: string;
    dotsxPath: string;
    systemConfigDir: string;
    homedir: string;
  }> {
    // Create isolated temp directory
    this.testDir = await mkdtemp(join(tmpdir(), 'dotsx-integration-test-'));

    // Create fake home directory structure
    const homedir = join(this.testDir, 'home');
    const dotsxPath = join(homedir, '.dotsx');
    const systemConfigDir = join(homedir, '.config');

    // Override DOTSX_PATH environment variable for testing
    this.originalDotsxPath = process.env.DOTSX_PATH;
    process.env.DOTSX_PATH = dotsxPath;

    // Also override HOME for path expansion
    this.originalHome = process.env.HOME;
    process.env.HOME = homedir;

    // Create the basic directory structure
    await mkdir(homedir, { recursive: true });
    await mkdir(systemConfigDir, { recursive: true });

    // Clear module cache for constants to force re-evaluation
    // This ensures constants use the overridden environment variables
    const constantsModulePath = require.resolve('../../../src/lib/constants');
    delete require.cache[constantsModulePath];

    return {
      testDir: this.testDir,
      dotsxPath,
      systemConfigDir,
      homedir
    };
  }

  /**
   * Clean up test environment
   * - Removes temporary directory
   * - Restores original environment variables
   */
  async cleanup(): Promise<void> {
    if (this.testDir) {
      await rm(this.testDir, { recursive: true, force: true });
      this.testDir = null;
    }

    // Restore original environment
    if (this.originalDotsxPath !== undefined) {
      process.env.DOTSX_PATH = this.originalDotsxPath;
    } else {
      delete process.env.DOTSX_PATH;
    }

    if (this.originalHome !== undefined) {
      process.env.HOME = this.originalHome;
    } else {
      delete process.env.HOME;
    }

    // Clear module cache for all modules that might use constants
    const modulePaths = [
      '../../../src/lib/constants',
      '../../../src/domains/os/debian',
      '../../../src/domains/ide/vscode',
      '../../../src/domains/ide/cursor',
      '../../../src/domains/terminal/zsh',
      '../../../src/domains/terminal/bash',
      '../../../src/domains/terminal/tmux',
      '../../../src/domains/index',
      '../../../src/commands/init',
    ];

    for (const modulePath of modulePaths) {
      try {
        const resolvedPath = require.resolve(modulePath);
        delete require.cache[resolvedPath];
      } catch {
        // Module might not exist or be resolvable, ignore
      }
    }
  }

  /**
   * Get current test paths (must call setup() first)
   */
  getTestPaths() {
    if (!this.testDir) {
      throw new Error('Test environment not setup. Call setup() first.');
    }

    const homedir = join(this.testDir, 'home');
    return {
      testDir: this.testDir,
      dotsxPath: join(homedir, '.dotsx'),
      systemConfigDir: join(homedir, '.config'),
      homedir
    };
  }
}

/**
 * Utility function for integration test setup
 */
export async function withIntegrationEnvironment<T>(
  testFn: (env: {
    testDir: string;
    dotsxPath: string;
    systemConfigDir: string;
    homedir: string;
  }) => Promise<T>
): Promise<T> {
  const testEnv = new IntegrationTestEnvironment();

  try {
    const paths = await testEnv.setup();
    return await testFn(paths);
  } finally {
    await testEnv.cleanup();
  }
}