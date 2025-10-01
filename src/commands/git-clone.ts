import { log, spinner, text } from '@clack/prompts';
import { FileLib } from '@/lib/file';
import { GitLib } from '@/lib/git';
import { DOTSX_PATH } from '@/old/constants';
import type { CliCommand } from '@/types';

export const gitCloneCommand: CliCommand = {
  async execute() {
    log.step('🔗 Clone DotsX from Existing Repository');

    const isGitInstalled = await GitLib.isGitInstalled();
    if (!isGitInstalled) {
      log.error('Git is not installed on your system. Please install Git and try again.');
      return;
    }

    if (FileLib.isPathExists(DOTSX_PATH)) {
      const isRepo = await GitLib.isGitRepository(DOTSX_PATH);

      if (isRepo) {
        log.error(`${DOTSX_PATH} is already a Git repository.`);
        log.info('💡 Use "🔗 Manage remote" to connect to a different repository');
        return;
      }

      log.error(`${DOTSX_PATH} already exists and contains files.`);
      log.warn('⚠️  Cannot clone - this would overwrite your existing configuration!');
      log.info('💡 To use an existing remote repository:');
      log.info('   1. Backup your current ~/.dotsx if needed');
      log.info('   2. Use "🔧 Git" → "🆕 Create new repository" to initialize git');
      log.info('   3. Then use "🔗 Manage remote" to connect to your remote');
      return;
    }

    const repoUrl = await text({
      message: 'Enter the SSH repository URL:',
      placeholder: 'git@github.com:username/dotsx-config.git',
      validate: (value) => {
        if (!value) return 'Repository URL is required';
        try {
          GitLib.validateGitUrlOrThrow(value);
          return undefined;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid URL';
        }
      },
    });

    if (!repoUrl || typeof repoUrl !== 'string') {
      log.warn('Initialization cancelled.');
      return;
    }

    const s = spinner();
    s.start('Cloning repository...');

    try {
      await GitLib.cloneRepository(repoUrl, DOTSX_PATH);
      s.stop('Repository cloned successfully');

      // Validate structure
      const validation = GitLib.validateDotsxStructure(DOTSX_PATH);

      if (validation.isValid) {
        log.success('🎉 DotsX initialized successfully from Git repository!');
        log.info('All required directories are present.');
      } else {
        log.warn('⚠️  Repository structure is incomplete');
        log.info(validation.message);
        log.info('💡 Run: dotsx repair');
      }

      const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);
      if (gitInfo.repoName) {
        log.info(`Repository: ${gitInfo.repoName}`);
      }
      if (gitInfo.currentBranch) {
        log.info(`Branch: ${gitInfo.currentBranch}`);
      }
    } catch (error) {
      s.stop('Failed to clone repository');
      log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
