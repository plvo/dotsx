import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitInfo } from '@/types';

const execAsync = promisify(exec);

export namespace GitLib {
  export async function isGitInstalled(): Promise<boolean> {
    try {
      await execAsync('git --version');
      return true;
    } catch {
      return false;
    }
  }

  export async function isGitRepository(dirPath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: dirPath });
      return true;
    } catch {
      return false;
    }
  }

  export async function cloneRepository(url: string, targetPath: string): Promise<void> {
    validateGitUrlOrThrow(url);
    try {
      await execAsync(`git clone "${url}" "${targetPath}"`);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function getRepositoryInfo(dirPath: string): Promise<GitInfo> {
    const isRepo = await isGitRepository(dirPath);

    if (!isRepo) {
      return { isRepository: false };
    }

    try {
      const [remoteInfo, branchInfo, commitInfo, statusInfo] = await Promise.all([
        getRemoteInfo(dirPath),
        getCurrentBranch(dirPath),
        getLastCommit(dirPath),
        getStatus(dirPath),
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
  }

  export async function getRemoteInfo(
    dirPath: string,
  ): Promise<{ repoName?: string; remoteName?: string; remoteUrl?: string }> {
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

      const repoName = extractRepoName(remoteUrl);

      return { repoName, remoteName, remoteUrl };
    } catch {
      return {};
    }
  }

  export async function getCurrentBranch(dirPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath });
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  export async function getDefaultBranch(dirPath: string): Promise<string> {
    try {
      // First try to get current branch
      const currentBranch = await getCurrentBranch(dirPath);
      if (currentBranch && currentBranch !== 'unknown') {
        return currentBranch;
      }

      // Fallback: check if main or master exists
      try {
        await execAsync('git rev-parse --verify main', { cwd: dirPath });
        return 'main';
      } catch {
        return 'master';
      }
    } catch {
      return 'main';
    }
  }

  export async function getLastCommit(
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
  }

  export async function getStatus(
    dirPath: string,
  ): Promise<{ ahead: number; behind: number; hasUncommittedChanges: boolean }> {
    try {
      const [aheadBehind, uncommitted] = await Promise.all([
        getAheadBehindCount(dirPath),
        hasUncommittedChanges(dirPath),
      ]);

      return {
        ...aheadBehind,
        hasUncommittedChanges: uncommitted,
      };
    } catch {
      return { ahead: 0, behind: 0, hasUncommittedChanges: false };
    }
  }

  export async function getAheadBehindCount(dirPath: string): Promise<{ ahead: number; behind: number }> {
    try {
      await execAsync('git fetch --dry-run', { cwd: dirPath });
      const { stdout } = await execAsync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: dirPath });
      const [ahead, behind] = stdout.trim().split('\t').map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    } catch {
      return { ahead: 0, behind: 0 };
    }
  }

  export async function hasUncommittedChanges(dirPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: dirPath });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  export async function initRepository(dirPath: string): Promise<void> {
    try {
      await execAsync('git init', { cwd: dirPath });
    } catch (error) {
      throw new Error(
        `Failed to initialize Git repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  export async function addRemote(dirPath: string, remoteName: string, url: string): Promise<void> {
    validateGitUrlOrThrow(url);
    try {
      // Check if remote already exists
      const { stdout } = await execAsync('git remote', { cwd: dirPath });
      const remotes = stdout.trim().split('\n').filter(Boolean);

      if (remotes.includes(remoteName)) {
        // Remote exists, update URL
        await execAsync(`git remote set-url ${remoteName} "${url}"`, { cwd: dirPath });
      } else {
        // Remote doesn't exist, add it
        await execAsync(`git remote add ${remoteName} "${url}"`, { cwd: dirPath });
      }
    } catch (error) {
      throw new Error(`Failed to add remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function pushToRemote(dirPath: string, branch = 'main'): Promise<void> {
    try {
      await execAsync(`git push -u origin ${branch}`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to push to remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function pushAndSetUpstream(dirPath: string): Promise<void> {
    try {
      const branch = await getDefaultBranch(dirPath);
      await execAsync(`git push --set-upstream origin ${branch}`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to push to remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function addAll(dirPath: string): Promise<void> {
    try {
      await execAsync('git add .', { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to add changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function commit(dirPath: string, message: string): Promise<void> {
    try {
      await execAsync(`git commit -m "${message}"`, { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export async function addAndCommit(dirPath: string, message: string): Promise<void> {
    await addAll(dirPath);
    await commit(dirPath, message);
  }

  export async function pullFromRemote(dirPath: string): Promise<void> {
    try {
      await execAsync('git pull', { cwd: dirPath });
    } catch (error) {
      throw new Error(`Failed to pull from remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  export function isGitHubUrl(url: string): boolean {
    return url.includes('github.com');
  }

  export async function isGhInstalled(): Promise<boolean> {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  export async function isGhAuthenticated(): Promise<boolean> {
    try {
      await execAsync('gh auth status');
      return true;
    } catch {
      return false;
    }
  }

  export async function createGitHubRepo(repoName: string, isPrivate = true): Promise<string> {
    try {
      const visibility = isPrivate ? '--private' : '--public';
      const { stdout } = await execAsync(
        `gh repo create ${repoName} ${visibility} --description "DotsX configuration" --clone=false`,
      );

      const match = stdout.match(/https:\/\/github\.com\/[^/]+\/[^\s]+/);
      return match ? match[0] : `https://github.com/${await getGitHubUsername()}/${repoName}`;
    } catch (error) {
      throw new Error(
        `Failed to create GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  export async function getGitHubUsername(): Promise<string> {
    try {
      const { stdout } = await execAsync('gh api user --jq .login');
      return stdout.trim();
    } catch {
      return 'username';
    }
  }

  export async function checkRemoteExists(url: string): Promise<boolean> {
    try {
      // Try to list remote refs without cloning
      await execAsync(`git ls-remote "${url}" HEAD`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  export function extractRepoInfoFromUrl(url: string): { owner: string; repo: string } | null {
    // Parse git@github.com:owner/repo.git
    const sshMatch = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    if (sshMatch?.[1] && sshMatch?.[2]) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }
    return null;
  }

  export async function hasConflicts(dirPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git diff --name-only --diff-filter=U', { cwd: dirPath });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  export async function getConflictedFiles(dirPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --name-only --diff-filter=U', { cwd: dirPath });
      return stdout.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  export function extractRepoName(url: string): string {
    try {
      const match = url.match(/\/([^/]+?)(?:\.git)?(?:\/)?$/);
      return match?.[1] || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  export function validateGitUrlOrThrow(url: string): void {
    // Only SSH format: git@github.com:user/repo.git
    const sshPattern = /^git@[\w.-]+:[\w.-]+\/[\w.-]+(?:\.git)?$/;
    if (!sshPattern.test(url)) {
      throw new Error(
        'Invalid Git URL. Only SSH format is supported.\n' +
          'Expected format: git@github.com:username/repo.git\n' +
          `Received: ${url}`,
      );
    }
  }
}
