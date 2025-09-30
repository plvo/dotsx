import { confirm, log, select, spinner, text } from '@clack/prompts';
import { DOTSX_PATH } from '@/lib/constants';
import { GitLib } from '@/lib/git';
import { gitCloneCommand } from './git-clone';

export const gitCommand = {
  async execute() {
    const isGitInstalled = await GitLib.isGitInstalled();
    if (!isGitInstalled) {
      log.error('Git is not installed on your system. Please install Git and try again.');
      return;
    }

    const isRepo = await GitLib.isGitRepository(DOTSX_PATH);

    if (!isRepo) {
      const choice = await select({
        message: 'DotsX directory is not a Git repository. How would you like to proceed?',
        options: [
          { value: 'new', label: '🆕 Create new repository', hint: 'Initialize a new local Git repository' },
          {
            value: 'clone',
            label: '🔗 Connect to existing repository',
            hint: 'Clone from an existing remote repository',
          },
        ],
      });

      if (choice === 'new') {
        await this.createNewRepository();
      } else if (choice === 'clone') {
        await gitCloneCommand.execute();
      }
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

  async createNewRepository() {
    const s = spinner();
    s.start('Initializing Git repository...');

    try {
      await GitLib.initRepository(DOTSX_PATH);
      await GitLib.addAndCommit(DOTSX_PATH, 'feat: initial DotsX configuration');
      s.stop('Git repository initialized');

      const shouldAddRemote = await confirm({
        message: 'Do you want to connect this to a remote repository?',
        initialValue: true,
      });

      if (!shouldAddRemote) {
        log.success('Local repository created successfully');
        return;
      }

      await this.addRemote();

      // Push if remote was added
      const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);
      if (gitInfo.remoteUrl) {
        await this.pushToRemoteWithConfirm();
      }
    } catch (error) {
      s.stop('Failed to initialize repository');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async pushToRemoteWithConfirm() {
    const shouldPush = await confirm({
      message: 'Push to remote repository now?',
      initialValue: true,
    });

    if (!shouldPush) return;

    const s = spinner();
    s.start('Pushing to remote...');
    try {
      await GitLib.pushAndSetUpstream(DOTSX_PATH);
      s.stop('Successfully pushed to remote');
      log.success('Repository is now connected and synced with remote');
    } catch (error) {
      s.stop('Failed to push');
      log.error(`Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.info('💡 You can push later using the "📤 Push to remote" option');
    }
  },

  async addRemote() {
    const createRepoOption = await select({
      message: 'How do you want to add the remote repository?',
      options: [
        {
          value: 'create',
          label: '📦 Create on GitHub automatically',
          hint: 'Create a new repository on GitHub (requires gh CLI)',
        },
        {
          value: 'existing',
          label: '🔗 I have an existing repository',
          hint: 'Connect to an existing remote repository URL',
        },
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

    await this.createGitHubRepository(repoName);
  },

  async createGitHubRepository(repoName: string) {
    log.info('This will create a repository on your GitHub account');

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
      s.stop('Repository created and remote added');
      log.success(`Repository created: ${repoUrl}`);
    } catch (error) {
      s.stop('Failed to create repository');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.info('💡 You can create the repository manually and add it as a remote');
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
    s.start('Syncing with remote...');

    try {
      await GitLib.pullFromRemote(DOTSX_PATH);
      s.stop('Successfully synced with remote');
    } catch (error) {
      s.stop('Sync failed');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      validate: (value) => (!value?.trim() ? 'Commit message is required' : undefined),
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
    } catch (error) {
      s.stop('Commit failed');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    s.start('Pushing to remote...');

    try {
      await GitLib.pushToRemote(DOTSX_PATH, gitInfo.currentBranch);
      s.stop('Successfully pushed to remote');
    } catch (error) {
      s.stop('Push failed');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
