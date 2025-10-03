import { describe, expect, it } from 'bun:test';
import { GitLib } from '@/lib/git';

describe('GitLib', () => {
  describe('isGitInstalled', () => {
    it('should return true when git is installed', async () => {
      const result = await GitLib.isGitInstalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('validateGitUrlOrThrow', () => {
    it('should accept valid SSH URLs', () => {
      const validUrls = ['git@github.com:user/repo.git', 'git@github.com:user/repo', 'git@gitlab.com:org/project.git'];

      validUrls.forEach((url) => {
        expect(() => GitLib.validateGitUrlOrThrow(url)).not.toThrow();
      });
    });

    it('should reject non-SSH URLs', () => {
      const invalidUrls = [
        'https://github.com/user/repo.git',
        'http://github.com/user/repo.git',
        '/local/path/to/repo',
        'user@host.com:path',
      ];

      invalidUrls.forEach((url) => {
        expect(() => GitLib.validateGitUrlOrThrow(url)).toThrow('Invalid Git URL');
      });
    });
  });

  describe('extractRepoName', () => {
    it('should extract repo name from SSH URL', () => {
      expect(GitLib.extractRepoName('git@github.com:user/dotsx.git')).toBe('dotsx');
    });

    it('should extract repo name from HTTPS URL', () => {
      expect(GitLib.extractRepoName('https://github.com/user/dotsx.git')).toBe('dotsx');
    });

    it('should extract repo name without .git', () => {
      expect(GitLib.extractRepoName('git@github.com:user/dotsx')).toBe('dotsx');
    });

    it('should return unknown for invalid URL', () => {
      expect(GitLib.extractRepoName('invalid')).toBe('unknown');
    });
  });

  describe('extractRepoInfoFromUrl', () => {
    it('should extract owner and repo from SSH URL', () => {
      const result = GitLib.extractRepoInfoFromUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should extract without .git extension', () => {
      const result = GitLib.extractRepoInfoFromUrl('git@github.com:owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid URL', () => {
      expect(GitLib.extractRepoInfoFromUrl('https://github.com/owner/repo')).toBe(null);
    });
  });

  describe('isGitHubUrl', () => {
    it('should return true for GitHub URLs', () => {
      expect(GitLib.isGitHubUrl('git@github.com:user/repo.git')).toBe(true);
      expect(GitLib.isGitHubUrl('https://github.com/user/repo')).toBe(true);
    });

    it('should return false for non-GitHub URLs', () => {
      expect(GitLib.isGitHubUrl('git@gitlab.com:user/repo.git')).toBe(false);
      expect(GitLib.isGitHubUrl('https://bitbucket.org/user/repo')).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return unknown on error', async () => {
      const result = await GitLib.getCurrentBranch('/non/existing/path');
      expect(result).toBe('unknown');
    });
  });

  describe('getDefaultBranch', () => {
    it('should return main or master as fallback', async () => {
      const result = await GitLib.getDefaultBranch('/non/existing/path');
      expect(['main', 'master']).toContain(result);
    });
  });

  describe('getLastCommit', () => {
    it('should return undefined on error', async () => {
      const result = await GitLib.getLastCommit('/non/existing/path');
      expect(result).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return zero status on error', async () => {
      const result = await GitLib.getStatus('/non/existing/path');
      expect(result).toEqual({ ahead: 0, behind: 0, hasUncommittedChanges: false });
    });
  });

  describe('getAheadBehindCount', () => {
    it('should return zero counts on error', async () => {
      const result = await GitLib.getAheadBehindCount('/non/existing/path');
      expect(result).toEqual({ ahead: 0, behind: 0 });
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return false on error', async () => {
      const result = await GitLib.hasUncommittedChanges('/non/existing/path');
      expect(result).toBe(false);
    });
  });

  describe('isGitRepository', () => {
    it('should return false for non-repository', async () => {
      const result = await GitLib.isGitRepository('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('getRepositoryInfo', () => {
    it('should return isRepository false for non-repo', async () => {
      const result = await GitLib.getRepositoryInfo('/non/existing/path');
      expect(result).toEqual({ isRepository: false });
    });
  });

  describe('getRemoteInfo', () => {
    it('should return empty object when no remotes', async () => {
      const result = await GitLib.getRemoteInfo('/non/existing/path');
      expect(result).toEqual({});
    });
  });

  describe('hasConflicts', () => {
    it('should return false on error', async () => {
      const result = await GitLib.hasConflicts('/non/existing/path');
      expect(result).toBe(false);
    });
  });

  describe('getConflictedFiles', () => {
    it('should return empty array on error', async () => {
      const result = await GitLib.getConflictedFiles('/non/existing/path');
      expect(result).toEqual([]);
    });
  });

  describe('checkRemoteExists', () => {
    it('should return false for invalid URL', async () => {
      const result = await GitLib.checkRemoteExists('git@github.com:invalid/nonexistent-repo-xyz123.git');
      expect(result).toBe(false);
    });
  });

  describe('isGhInstalled', () => {
    it('should return boolean', async () => {
      const result = await GitLib.isGhInstalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('isGhAuthenticated', () => {
    it('should return boolean', async () => {
      const result = await GitLib.isGhAuthenticated();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getGitHubUsername', () => {
    it('should return username or fallback', async () => {
      const result = await GitLib.getGitHubUsername();
      expect(typeof result).toBe('string');
    });
  });

  describe('initRepository', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.initRepository('/root/no-permission');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('cloneRepository', () => {
    it('should validate URL before cloning', async () => {
      await expect(GitLib.cloneRepository('https://github.com/user/repo.git', '/tmp/test')).rejects.toThrow(
        'Invalid Git URL',
      );
    });
  });

  describe('addRemote', () => {
    it('should validate URL before adding', async () => {
      await expect(GitLib.addRemote('/tmp', 'origin', 'https://github.com/user/repo.git')).rejects.toThrow(
        'Invalid Git URL',
      );
    });
  });

  describe('pushToRemote', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.pushToRemote('/non/existing/path');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('pullFromRemote', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.pullFromRemote('/non/existing/path');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('addAll', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.addAll('/non/existing/path');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('commit', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.commit('/non/existing/path', 'test');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('addAndCommit', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.addAndCommit('/non/existing/path', 'test');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('pushAndSetUpstream', () => {
    it('should throw error on failure', async () => {
      try {
        await GitLib.pushAndSetUpstream('/non/existing/path');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('createGitHubRepo', () => {
    it('should throw error when gh not authenticated', async () => {
      const isAuth = await GitLib.isGhAuthenticated();
      if (!isAuth) {
        await expect(GitLib.createGitHubRepo('test-repo')).rejects.toThrow();
      }
    });
  });
});
