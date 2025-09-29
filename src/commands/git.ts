import { confirm, log, select, spinner, text } from '@clack/prompts';
import { DOTSX_PATH } from '@/lib/constants';
import { GitLib } from '@/lib/git';

export const gitCommand = {
  async execute() {
    const isGitInstalled = await GitLib.isGitInstalled();
    if (!isGitInstalled) {
      log.error('Git is not installed on your system. Please install Git and try again.');
      return;
    }

    const isRepo = await GitLib.isGitRepository(DOTSX_PATH);

    if (!isRepo) {
      const shouldInit = await confirm({
        message: 'DotsX directory is not a Git repository. Initialize Git?',
        initialValue: true,
      });

      if (!shouldInit) {
        log.warn('Git management cancelled.');
        return;
      }

      await this.initializeRepository();
      return;
    }

    const action = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'sync', label: '🔄 Sync with remote', hint: 'Pull latest changes from remote repository' },
        { value: 'commit', label: '💾 Commit changes', hint: 'Add and commit local changes' },
        { value: 'push', label: '📤 Push to remote', hint: 'Push committed changes to remote repository' },
        { value: 'remote', label: '🔗 Manage remote', hint: 'Add or update remote repository URL' },
      ],
    });

    switch (action) {
      case 'sync':
        await this.syncWithRemote();
        break;
      case 'commit':
        await this.commitChanges();
        break;
      case 'push':
        await this.pushChanges();
        break;
      case 'remote':
        await this.manageRemote();
        break;
    }
  },

  async manageRemote() {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (gitInfo.remoteUrl) {
      log.info(`Current remote: ${gitInfo.remoteUrl}`);

      const action = await select({
        message: 'What would you like to do?',
        options: [{ value: 'change', label: '🔄 Change remote URL', hint: 'Update remote repository URL' }],
      });

      if (action === 'change') {
        await this.changeRemote();
      }
    } else {
      log.info('No remote repository configured');
      await this.addRemote();
    }
  },

  async initializeRepository() {
    const s = spinner();
    s.start('Initializing Git repository...');

    try {
      await GitLib.initRepository(DOTSX_PATH);
      s.stop('Git repository initialized');

      const shouldAddRemote = await confirm({
        message: 'Add a remote repository?',
        initialValue: true,
      });

      if (shouldAddRemote) {
        await this.addRemote();
      }

      const shouldCommit = await confirm({
        message: 'Create initial commit?',
        initialValue: true,
      });

      if (shouldCommit) {
        await GitLib.addAndCommit(DOTSX_PATH, 'feat: initial DotsX configuration');
        log.success('Initial commit created');
      }
    } catch (error) {
      s.stop('Failed to initialize repository');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async addRemote() {
    const createRepoOption = await select({
      message: 'How do you want to add the remote repository?',
      options: [
        { value: 'existing', label: '🔗 Use existing repository', hint: 'I already have a repository created' },
        { value: 'create', label: '✨ Create new repository', hint: 'Create a new repository automatically' },
      ],
    });

    if (createRepoOption === 'create') {
      await this.createAndAddRemote();
    } else {
      await this.addExistingRemote();
    }
  },

  async createAndAddRemote() {
    const repoName = await text({
      message: 'Enter repository name:',
      placeholder: 'dotsx-config',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Repository name is required';
        }
        return undefined;
      },
    });

    if (!repoName || typeof repoName !== 'string') {
      log.warn('Repository creation cancelled.');
      return;
    }

    const platform = await select({
      message: 'Choose platform:',
      options: [
        { value: 'github', label: '🐙 GitHub', hint: 'Create repository on GitHub (requires gh CLI)' },
        { value: 'manual', label: '🔧 Manual', hint: 'I will create the repository myself' },
      ],
    });

    if (platform === 'github') {
      await this.createGitHubRepository(repoName);
    } else {
      await this.showManualInstructions(repoName);
    }
  },

  async createGitHubRepository(repoName: string) {
    log.warn('⚠️  This will create a repository on your GitHub account');

    const isGhInstalled = await GitLib.isGhInstalled();
    if (!isGhInstalled) {
      log.error('GitHub CLI (gh) is not installed. Install it first:');
      log.info(
        '💡 curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg',
      );
      return;
    }

    const isAuthenticated = await GitLib.isGhAuthenticated();
    if (!isAuthenticated) {
      log.error('GitHub CLI is not authenticated. Run:');
      log.info('💡 gh auth login');
      return;
    }

    let isPrivate = await confirm({
      message: 'Make repository private?',
      initialValue: true,
    });

    if (typeof isPrivate !== 'boolean') {
      log.warn('Repository will be created as public');
      isPrivate = true;
    }

    const s = spinner();
    s.start('Creating GitHub repository...');

    try {
      const repoUrl = await GitLib.createGitHubRepo(repoName, isPrivate);
      await GitLib.addRemote(DOTSX_PATH, 'origin', repoUrl);
      s.stop('✅ Repository created and remote added');
      log.success(`🎉 Repository created: ${repoUrl}`);
    } catch (error) {
      s.stop('❌ Failed to create repository');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.info('💡 You can create the repository manually and add it as a remote');
    }
  },

  async showManualInstructions(repoName: string) {
    log.warn('⚠️  You need to create the repository manually');
    log.info('📋 Instructions:');
    log.info('1. Go to your Git platform (GitHub, GitLab, Bitbucket, etc.)');
    log.info(`2. Create a new repository named: ${repoName}`);
    log.info('3. Keep it empty (no README, .gitignore, or license)');
    log.info('4. Copy the repository URL');

    const shouldAddNow = await confirm({
      message: 'Have you created the repository? Add it now?',
      initialValue: false,
    });

    if (shouldAddNow) {
      await this.addExistingRemote();
    } else {
      log.info('💡 You can add the remote later via "🔗 Manage remote"');
    }
  },

  async addExistingRemote() {
    const remoteUrl = await text({
      message: 'Enter the remote repository URL:',
      placeholder: 'https://github.com/username/dotsx-config.git',
      validate: (value) => {
        if (!value) return 'Remote URL is required';
        if (!GitLib.validateGitUrl(value)) {
          return 'Please enter a valid Git repository URL';
        }
        return undefined;
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

  async syncWithRemote() {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (!gitInfo.remoteUrl) {
      log.error('No remote repository configured. Add a remote first.');
      return;
    }

    if (gitInfo.status?.hasUncommittedChanges) {
      const shouldContinue = await confirm({
        message: 'You have uncommitted changes. Continue with sync? (may cause conflicts)',
        initialValue: false,
      });

      if (!shouldContinue) {
        log.warn('Sync cancelled. Commit your changes first.');
        return;
      }
    }

    const s = spinner();
    s.start('Syncing with remote repository...');

    try {
      await GitLib.pullFromRemote(DOTSX_PATH);
      s.stop('Successfully synced with remote');
      log.success('Your DotsX configuration is now up-to-date');
    } catch (error) {
      s.stop('Sync failed');
      log.error(`Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.info('💡 Try resolving conflicts manually or stash your changes first');
    }
  },

  async commitChanges() {
    const hasChanges = await GitLib.hasUncommittedChanges(DOTSX_PATH);

    if (!hasChanges) {
      log.info('No changes to commit');
      return;
    }

    const commitMessage = await text({
      message: 'Enter commit message:',
      placeholder: 'Update DotsX configuration',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Commit message is required';
        }
        return undefined;
      },
    });

    if (!commitMessage || typeof commitMessage !== 'string') {
      log.warn('Commit cancelled.');
      return;
    }

    const s = spinner();
    s.start('Committing changes...');

    try {
      await GitLib.addAndCommit(DOTSX_PATH, commitMessage);
      s.stop('Changes committed successfully');
      log.success('Your changes have been committed');
    } catch (error) {
      s.stop('Commit failed');
      log.error(`Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async pushChanges() {
    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (!gitInfo.remoteUrl) {
      log.error('No remote repository configured. Add a remote first.');
      return;
    }

    if (gitInfo.status?.hasUncommittedChanges) {
      log.warn('You have uncommitted changes. Commit them first.');
      return;
    }

    if (gitInfo.status?.ahead === 0) {
      log.info('No commits to push');
      return;
    }

    const s = spinner();
    s.start('Pushing to remote repository...');

    try {
      await GitLib.pushToRemote(DOTSX_PATH, gitInfo.currentBranch);
      s.stop('Successfully pushed to remote');
      log.success('Your changes have been pushed to the remote repository');
    } catch (error) {
      s.stop('Push failed');
      log.error(`Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async changeRemote() {
    const newRemoteUrl = await text({
      message: 'Enter new remote repository URL:',
      placeholder: 'https://github.com/username/dotsx-config.git',
      validate: (value) => {
        if (!value) return 'Remote URL is required';
        if (!GitLib.validateGitUrl(value)) {
          return 'Please enter a valid Git repository URL';
        }
        return undefined;
      },
    });

    if (!newRemoteUrl || typeof newRemoteUrl !== 'string') {
      log.warn('Remote change cancelled.');
      return;
    }

    try {
      await GitLib.addRemote(DOTSX_PATH, 'origin', newRemoteUrl);
      log.success('Remote repository updated successfully');
    } catch (error) {
      log.error(`Failed to update remote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
