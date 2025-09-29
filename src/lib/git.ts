import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { GitInfo, GitValidationResult } from '@/types';
import { DOTSX, DOTSX_PATH } from './constants';
import { FileLib } from './file';

const execAsync = promisify(exec);

export const GitLib = {
  async isGitInstalled(): Promise<boolean> {
    try {
      await execAsync('git --version');
      return true;
    } catch {
      return false;
    }
  },

  async isGitRepository(dirPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: dirPath });
      return true;
    } catch {
      return false;
    }
  },

  async cloneRepository(url: string, targetPath: string): Promise<void> {
    try {
      await execAsync(`git clone "${url}" "${targetPath}"`);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getRepositoryInfo(dirPath: string): Promise<GitInfo> {
    const isRepo = await this.isGitRepository(dirPath);

    if (!isRepo) {
      return { isRepository: false };
    }

    try {
      const [remoteInfo, branchInfo, commitInfo, statusInfo] = await Promise.all([
        this.getRemoteInfo(dirPath),
        this.getCurrentBranch(dirPath),
        this.getLastCommit(dirPath),
        this.getStatus(dirPath),
      ]);

      return {
        isRepository: true,
        ...remoteInfo,
        currentBranch: branchInfo,
        lastCommit: commitInfo,
        status: statusInfo,
      };
    } catch (_error) {
      return {
        isRepository: true,
        repoName: 'Unknown',
        currentBranch: 'Unknown',
      };
    }
  },

  async getRemoteInfo(dirPath: string): Promise<{ repoName?: string; remoteName?: string; remoteUrl?: string }> {
    try {
      const { stdout: remoteOutput } = await execAsync('git remote -v', { cwd: dirPath });
      const remoteLines = remoteOutput.trim().split('\n');

      if (remoteLines.length === 0 || remoteLines[0] === '') {
        return {};
      }

      const firstRemote = remoteLines[0];
      if (!firstRemote) {
        return {};
      }

      const [remoteName, remoteUrl] =
        firstRemote.split('\t')[0]?.split(' ')[0] === firstRemote.split('\t')[0]
          ? [firstRemote.split('\t')[0], firstRemote.split('\t')[1]?.split(' ')[0]]
          : ['origin', ''];

      if (!remoteUrl) {
        return {};
      }

      const repoName = this.extractRepoName(remoteUrl);

      return { repoName, remoteName, remoteUrl };
    } catch {
      return {};
    }
  },

  async getCurrentBranch(dirPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  },

  async getLastCommit(
    dirPath: string,
  ): Promise<{ hash: string; message: string; author: string; date: string } | undefined> {
    try {
      const { stdout } = await execAsync('git log -1 --pretty=format:"%H|%s|%an|%ar"', { cwd: dirPath });
      const [hash, message, author, date] = stdout.trim().split('|');
      if (!hash || !message || !author || !date) {
        return undefined;
      }

      return { hash: hash.substring(0, 8), message, author, date };
    } catch {
      return undefined;
    }
  },

  async getStatus(dirPath: string): Promise<{ ahead: number; behind: number; hasUncommittedChanges: boolean }> {
    try {
      const [aheadBehind, uncommitted] = await Promise.all([
        this.getAheadBehindCount(dirPath),
        this.hasUncommittedChanges(dirPath),
      ]);

      return {
        ...aheadBehind,
        hasUncommittedChanges: uncommitted,
      };
    } catch {
      return { ahead: 0, behind: 0, hasUncommittedChanges: false };
    }
  },

  async getAheadBehindCount(dirPath: string): Promise<{ ahead: number; behind: number }> {
    try {
      await execAsync('git fetch --dry-run', { cwd: dirPath });
      const { stdout } = await execAsync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: dirPath });
      const [ahead, behind] = stdout.trim().split('\t').map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  },

  async hasUncommittedChanges(dirPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: dirPath });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  },

  async initRepository(dirPath: string): Promise<void> {
    try {
      await execAsync('git init', { cwd: dirPath });
    } catch (error) {
      throw new Error(
        `Failed to initialize Git repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async addRemote(dirPath: string, remoteName: string, url: string): Promise<void> {
    try {
      await execAsync(`git remote add ${remoteName} "${url}"`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to add remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async pushToRemote(dirPath: string, branch = 'main'): Promise<void> {
    try {
      await execAsync(`git push -u origin ${branch}`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to push to remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async addAndCommit(dirPath: string, message: string): Promise<void> {
    try {
      await execAsync('git add .', { cwd: dirPath });
      await execAsync(`git commit -m "${message}"`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async pullFromRemote(dirPath: string): Promise<void> {
    try {
      await execAsync('git pull', { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to pull from remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  validateDotsxStructure(dirPath: string): GitValidationResult {
    const requiredDirectories = [
      DOTSX.BIN.PATH.replace(DOTSX_PATH, '').substring(1),
      DOTSX.IDE.PATH.replace(DOTSX_PATH, '').substring(1),
      DOTSX.OS.PATH.replace(DOTSX_PATH, '').substring(1),
      DOTSX.TERMINAL.PATH.replace(DOTSX_PATH, '').substring(1),
      DOTSX.SYMLINKS.replace(DOTSX_PATH, '').substring(1),
    ];

    const missingDirectories: string[] = [];

    for (const dir of requiredDirectories) {
      const fullPath = path.resolve(dirPath, dir);
      if (!FileLib.isPathExists(fullPath)) {
        missingDirectories.push(dir);
      }
    }

    if (missingDirectories.length === 0) {
      return {
        isValid: true,
        missingDirectories: [],
        message: 'Repository structure is complete',
      };
    }

    return {
      isValid: false,
      missingDirectories,
      message: `Missing directories: ${missingDirectories.join(', ')}`,
    };
  },

  extractRepoName(url: string): string {
    try {
      const match = url.match(/\/([^/]+?)(?:\.git)?(?:\/)?$/);
      return match?.[1] || 'unknown';
    } catch {
      return 'unknown';
    }
  },

  validateGitUrl(url: string): boolean {
    const gitUrlPattern = /^(https?:\/\/|git@)[\w.-]+[/:][\w.-]+\/[\w.-]+(?:\.git)?$/;
    return gitUrlPattern.test(url);
  },

  isGitHubUrl(url: string): boolean {
    return url.includes('github.com');
  },

  async isGhInstalled(): Promise<boolean> {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  },

  async isGhAuthenticated(): Promise<boolean> {
    try {
      await execAsync('gh auth status');
      return true;
    } catch {
      return false;
    }
  },

  async createGitHubRepo(repoName: string, isPrivate = true): Promise<string> {
    try {
      const visibility = isPrivate ? '--private' : '--public';
      const { stdout } = await execAsync(
        `gh repo create ${repoName} ${visibility} --description "DotsX configuration" --clone=false`,
      );

      const match = stdout.match(/https:\/\/github\.com\/[^/]+\/[^\s]+/);
      return match ? match[0] : `https://github.com/${await this.getGitHubUsername()}/${repoName}`;
    } catch (error) {
      throw new Error(
        `Failed to create GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async getGitHubUsername(): Promise<string> {
    try {
      const { stdout } = await execAsync('gh api user --jq .login');
      return stdout.trim();
    } catch {
      return 'username';
    }
  },
};
