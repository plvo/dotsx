import { confirm, isCancel, log, outro, select, spinner, text } from '@clack/prompts';
import { DOTSX_PATH, type DotsxOsPath } from '@/lib/constants';
import { GitLib } from '@/lib/git';
import { symlinkCommand } from './symlink';

export const gitCommand = {
  async execute(dotsxOsPath: DotsxOsPath) {
    const isGitInstalled = await GitLib.isGitInstalled();
    if (!isGitInstalled) {
      log.error('Git is not installed on your system. Please install Git and try again.');
      return;
    }

    const isRepo = await GitLib.isGitRepository(DOTSX_PATH);

    if (!isRepo) {
      const confirmNewRepo = await confirm({
        message: 'DotsX directory is not a Git repository. Do you want to create a new repository?',
        initialValue: true,
      });

      if (confirmNewRepo) {
        await this.createWithRemoteAtomic();
      }
      return;
    }

    const action = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'sync', label: '🔄 Sync', hint: 'Add + commit + push changes to remote' },
        { value: 'pull', label: '📥 Pull', hint: 'Pull + validate structure & symlinks' },
        { value: 'remote', label: '🔗 Manage remote', hint: 'Add or update remote URL (SSH only)' },
      ],
    });

    switch (action) {
      case 'sync':
        await this.gitSync();
        break;
      case 'pull':
        await this.gitPull(dotsxOsPath);
        break;
      case 'remote':
        await this.manageRemote();
        break;
    }
  },

  async gitSync() {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (!gitInfo.remoteUrl) {
      log.error('No remote repository configured. Add a remote first.');
      const shouldAdd = await confirm({
        message: 'Would you like to add a remote now?',
        initialValue: true,
      });

      if (shouldAdd) {
        await this.addExistingRemote();
        return;
      }
      return;
    }

    const s = spinner();
    s.start('Syncing with remote...');

    try {
      // 1. Add all changes
      await GitLib.addAll(DOTSX_PATH);

      // 2. Check if there are changes to commit
      const hasChanges = await GitLib.hasUncommittedChanges(DOTSX_PATH);
      if (!hasChanges) {
        s.stop('No changes to sync');
        log.info('Repository is up to date');
        return;
      }

      // 3. Commit with timestamp
      const timestamp = new Date().toISOString();
      await GitLib.commit(DOTSX_PATH, `update dotsx [${timestamp}]`);

      // 4. Push to remote
      await GitLib.pushToRemote(DOTSX_PATH, gitInfo.currentBranch);

      s.stop('✅ Synced successfully');
      log.success('Changes pushed to remote');
    } catch (error) {
      s.stop('❌ Sync failed');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async gitPull(dotsxOsPath: DotsxOsPath) {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (!gitInfo.remoteUrl) {
      log.error('No remote repository configured. Add a remote first.');
      return;
    }

    if (gitInfo.status?.hasUncommittedChanges) {
      const shouldContinue = await confirm({
        message: 'You have uncommitted changes. Continue with pull? (may cause conflicts)',
        initialValue: false,
      });

      if (!shouldContinue) {
        log.warn('Pull cancelled. Commit or stash your changes first.');
        return;
      }
    }

    const s = spinner();
    s.start('Pulling from remote...');

    try {
      await GitLib.pullFromRemote(DOTSX_PATH);
      s.stop('✅ Pulled successfully');

      const hasConflicts = await GitLib.hasConflicts(DOTSX_PATH);
      if (hasConflicts) {
        const conflictedFiles = await GitLib.getConflictedFiles(DOTSX_PATH);
        log.error(`Git conflicts detected:\n${conflictedFiles.map((f) => `  - ${f}`).join('\n')}`);
        log.info('💡 Resolve conflicts manually, then run:\n\tgit add .\n\tgit commit\n\tgit push');
        return;
      }

      log.info('Checking symlinks...');
      const links = await symlinkCommand.checkStatus(dotsxOsPath);
      if (links.incorrectSymlinks.length > 0) {
        const shouldFix = await confirm({
          message: `Fix ${links.incorrectSymlinks.length} broken symlink(s)?`,
          initialValue: true,
        });

        if (shouldFix) {
          await symlinkCommand.syncLinks(links);
        }
      } else {
        log.success('✅ All symlinks correct');
      }

      log.success('🎉 Pull complete');
    } catch (error) {
      s.stop('❌ Pull failed');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('CONFLICT') || errorMessage.includes('merge')) {
        log.error('Git conflict detected during merge!');
        log.warn('💡 Resolve conflicts manually by running git pull --rebase, and then run dotsx');
      } else {
        log.error(`Error: ${errorMessage}`);
      }
    }
  },

  async manageRemote() {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (gitInfo.remoteUrl) {
      log.info(`Current remote: ${gitInfo.remoteUrl}`);

      const action = await select({
        message: 'What would you like to do?',
        options: [{ value: 'change', label: '🔄 Change remote URL', hint: 'Update remote repository URL (SSH only)' }],
      });

      if (action === 'change') {
        await this.addExistingRemote();
      }
    } else {
      log.info('No remote repository configured');
      await this.addExistingRemote();
    }
  },

  async createWithRemoteAtomic() {
    // Step 1: Get remote URL
    const remoteUrl = await text({
      message: 'Please provide the SSH URL for the new remote repository:',
      placeholder: 'git@github.com:username/dotsx-config.git',
      validate: (value) => {
        if (!value) return 'Remote URL is required';
        try {
          GitLib.validateGitUrlOrThrow(value);
          return undefined;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid URL';
        }
      },
    });

    if (!remoteUrl || typeof remoteUrl !== 'string') {
      log.warn('Initialization cancelled.');
      return;
    }

    const s = spinner();
    s.start('Checking remote repository...');

    try {
      // Step 2: Check if remote exists
      const remoteExists = await GitLib.checkRemoteExists(remoteUrl);

      if (!remoteExists) {
        s.stop('  Remote repository does not exist');

        // Check if it's a GitHub URL and offer to create
        const repoInfo = GitLib.extractRepoInfoFromUrl(remoteUrl);
        if (repoInfo && GitLib.isGitHubUrl(remoteUrl)) {
          const shouldCreate = await confirm({
            message: `Repository ${repoInfo.owner}/${repoInfo.repo} not found. Create it on GitHub and push the first commit?`,
            initialValue: true,
          });

          if (shouldCreate) {
            const isGhInstalled = await GitLib.isGhInstalled();
            if (!isGhInstalled) {
              log.error(
                `GitHub CLI (gh) is not installed.\n\t💡 Install it: https://cli.github.com/\n\tOr create the repository manually on GitHub and try again.`,
              );
              return;
            }

            const isAuthenticated = await GitLib.isGhAuthenticated();
            if (!isAuthenticated) {
              log.error('GitHub CLI is not authenticated.\n\t💡 Run: gh auth login');
              return;
            }

            const isPrivate = await confirm({
              message: 'Make repository private?',
              initialValue: true,
            });

            if (isCancel(isPrivate)) {
              return outro('Creating GitHub repository cancelled');
            }

            s.start('Creating GitHub repository...');
            try {
              await GitLib.createGitHubRepo(repoInfo.repo, isPrivate);
              s.stop('✅ GitHub repository created');

              // Wait a bit for GitHub to fully create the repo
              await new Promise((resolve) => setTimeout(resolve, 2000));
            } catch (error) {
              s.stop(
                `❌ Failed to create repository \n\t💡 Create the repository manually on GitHub and try again.\n\tError: ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
              return;
            }
          } else {
            log.info('💡 Create the repository manually on GitHub and try again.');
            return;
          }
        } else {
          log.error(`Remote repository does not exist.\n\t💡 Create the repository first or check the URL.`);
          return;
        }
      } else {
        s.stop('✅ Remote repository found');
      }

      // Step 3: Init local repository
      s.start('Initializing Git repository...');
      await GitLib.initRepository(DOTSX_PATH);
      await GitLib.addAndCommit(DOTSX_PATH, 'feat: initial DotsX configuration');

      // Step 4: Add remote
      await GitLib.addRemote(DOTSX_PATH, 'origin', remoteUrl);

      // Step 5: Push
      s.message('Pushing to remote...');
      await GitLib.pushAndSetUpstream(DOTSX_PATH);

      s.stop('✅ Repository created and synced');
    } catch (error) {
      s.stop(
        `❌ Failed\n\t💡 Check your SSH keys and repository permissions.\n\tError: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async addExistingRemote() {
    const remoteUrl = await text({
      message: 'Enter the remote repository URL (SSH only):',
      placeholder: 'git@github.com:username/dotsx-config.git',
      validate: (value) => {
        if (!value) return 'Remote URL is required';
        try {
          GitLib.validateGitUrlOrThrow(value);
          return undefined;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid URL';
        }
      },
    });

    if (!remoteUrl || typeof remoteUrl !== 'string') {
      log.warn('Adding remote cancelled.');
      return;
    }

    try {
      await GitLib.addRemote(DOTSX_PATH, 'origin', remoteUrl);
      log.success('✅ Remote repository added successfully');
    } catch (error) {
      log.error(`❌ Failed to add remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
