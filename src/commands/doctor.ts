import { confirm, log, outro } from '@clack/prompts';
import { ConsoleLib } from '@/lib/console';
import { FileLib } from '@/lib/file';
import { GitLib } from '@/lib/git';
import { SystemLib } from '@/lib/system';
import { allDomains, getDomainByDistro, getDomainByName } from '@/old';
import { DOTSX, DOTSX_PATH } from '@/old/constants';
import type { Domain } from '@/types';
import { symlinkCommand } from './symlink';

interface DoctorIssue {
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'git' | 'symlinks' | 'domains';
  message: string;
  fixable: boolean;
  fix?: () => Promise<void>;
}

export const doctorCommand = {
  async execute() {
    const issues: DoctorIssue[] = [];

    // 2. Check DotsX structure
    await this.checkStructure(issues);

    // 3. Check Git
    await this.checkGit(issues);

    // 4. Check domains
    await this.checkDomains(issues);

    // 5. Check symlinks
    await this.checkSymlinks(issues);

    // 6. Summary
    await this.showSummary(issues);

    // 7. Propose fixes
    if (issues.some((i) => i.fixable)) {
      await this.proposeFixes(issues);
    }
  },

  async checkStructure(issues: DoctorIssue[]) {
    log.info('📁 Directory Structure');

    const requiredDirs = [
      { path: DOTSX_PATH, name: '~/.dotsx' },
      { path: DOTSX.BIN.PATH, name: 'bin/' },
      { path: DOTSX.IDE.PATH, name: 'ide/' },
      { path: DOTSX.OS.PATH, name: 'os/' },
      { path: DOTSX.TERMINAL.PATH, name: 'terminal/' },
      { path: DOTSX.SYMLINKS, name: 'symlinks/' },
    ];

    const existsPaths = [];
    const missingPaths = [];

    for (const dir of requiredDirs) {
      const exists = FileLib.isDirectory(dir.path);
      if (exists) {
        existsPaths.push(dir.path);
      } else {
        missingPaths.push(dir.path);
        issues.push({
          type: 'error',
          category: 'structure',
          message: `Missing directory: ${dir.name}`,
          fixable: true,
          fix: async () => {
            FileLib.createDirectory(dir.path);
            log.success(`Created ${dir.name}`);
          },
        });
      }
    }

    ConsoleLib.logListWithTitle('Directories present', existsPaths);
    ConsoleLib.logListWithTitle('Directories missing', missingPaths);
  },

  async checkGit(issues: DoctorIssue[]) {
    log.info('🔧 Git Repository');
    const isGitInstalled = await GitLib.isGitInstalled();
    if (!isGitInstalled) {
      log.message('  ❌ Git not installed');
      issues.push({
        type: 'error',
        category: 'git',
        message: 'Git is not installed',
        fixable: false,
      });
      return;
    }

    const isRepo = await GitLib.isGitRepository(DOTSX_PATH);
    if (!isRepo) {
      log.message('  ⚠️ Not a Git repository');
      issues.push({
        type: 'warning',
        category: 'git',
        message: 'DotsX is not a Git repository',
        fixable: false,
      });
      log.message('  💡 Run: dotsx git → Create new repository\n');
      return;
    }

    let gitStatus = 'Git repository initialized';

    const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

    if (gitInfo.remoteUrl) {
      gitStatus += `\n  ✅ Remote: ${gitInfo.remoteUrl}`;
      gitStatus += `\n  ✅ Branch: ${gitInfo.currentBranch}`;

      if (gitInfo.lastCommit) {
        gitStatus += `\n  ✅ Last commit: ${gitInfo.lastCommit.hash} - "${gitInfo.lastCommit.message}"`;
      }

      if (gitInfo.status) {
        if (gitInfo.status.hasUncommittedChanges) {
          gitStatus += '\n  ⚠️  Uncommitted changes';
          issues.push({
            type: 'warning',
            category: 'git',
            message: 'You have uncommitted changes',
            fixable: false,
          });
          gitStatus += '\n  💡 Run: dotsx git sync';
        }

        if (gitInfo.status.ahead > 0) {
          gitStatus += `\n  ⚠️  ${gitInfo.status.ahead} commit(s) ahead of remote`;
          issues.push({
            type: 'warning',
            category: 'git',
            message: `${gitInfo.status.ahead} unpushed commit(s)`,
            fixable: false,
          });
          gitStatus += '\n  💡 Run: dotsx git sync';
        }

        if (gitInfo.status.behind > 0) {
          gitStatus += `\n  ⚠️  ${gitInfo.status.behind} commit(s) behind remote`;
          issues.push({
            type: 'warning',
            category: 'git',
            message: `${gitInfo.status.behind} unpulled commit(s)`,
            fixable: false,
          });
          gitStatus += '\n  💡 Run: dotsx git pull';
        }

        if (!gitInfo.status.hasUncommittedChanges && gitInfo.status.ahead === 0 && gitInfo.status.behind === 0) {
          gitStatus += '\n  ✅ Up to date with remote';
        }
      }

      // Check for conflicts
      const hasConflicts = await GitLib.hasConflicts(DOTSX_PATH);
      if (hasConflicts) {
        const conflictedFiles = await GitLib.getConflictedFiles(DOTSX_PATH);
        gitStatus += `\n  🚨 ${conflictedFiles.length} conflicted file(s)`;
        issues.push({
          type: 'error',
          category: 'git',
          message: `${conflictedFiles.length} Git conflicts`,
          fixable: false,
        });
        gitStatus += '\n  💡 Resolve manually, then: git add . && git commit';
      }
    } else {
      gitStatus += '\n  ⚠️  No remote configured';
      issues.push({
        type: 'warning',
        category: 'git',
        message: 'No remote repository configured',
        fixable: false,
      });
      gitStatus += '\n  💡 Run: dotsx git → Manage remote';
    }

    log.step(gitStatus);
  },

  async checkDomains(issues: DoctorIssue[]) {
    log.info('🔍 Domain Configurations');

    const osInfo = SystemLib.getOsInfo();
    const currentOs = osInfo.family;

    // Check OS domain
    const osDomain = osInfo.distro ? getDomainByDistro(osInfo.distro) : getDomainByName(currentOs);
    if (osDomain) {
      await this.checkOsDomain(osDomain, issues);
    }

    // Check IDE domains
    const ideDomains = allDomains.filter((d) => d.type === 'ide');
    for (const domain of ideDomains) {
      await this.checkIdeDomain(domain, currentOs, issues);
    }

    // Check Terminal domains
    const terminalDomains = allDomains.filter((d) => d.type === 'terminal');
    for (const domain of terminalDomains) {
      await this.checkTerminalDomain(domain, currentOs, issues);
    }

    // Check Bin
    await this.checkBin(issues);
  },

  async checkOsDomain(domain: Domain, issues: DoctorIssue[]) {
    const domainPath = `${DOTSX.OS.PATH}/${domain.name}`;
    const exists = FileLib.isDirectory(domainPath);

    log.step(`📦 ${domain.name.toUpperCase()} (OS)`);

    if (!exists) {
      log.message(`  ⚠️ Not initialized`);
      return;
    }

    if (domain.packageManagers) {
      for (const [pmName, pmConfig] of Object.entries(domain.packageManagers)) {
        const configExists = FileLib.isFile(pmConfig.configPath);
        if (configExists) {
          const packages = FileLib.readFileAsArray(pmConfig.configPath);
          log.message(`  ✅ ${pmName}: ${packages.length} package(s)`);
        } else {
          log.message(`  ❌ ${pmName}: config missing`);
          issues.push({
            type: 'error',
            category: 'domains',
            message: `${domain.name}/${pmName} config missing`,
            fixable: true,
            fix: async () => {
              FileLib.createFile(pmConfig.configPath, pmConfig.defaultContent);
              log.message(`  ✅ Created ${pmName} config`);
            },
          });
        }
      }
    }
  },

  async checkIdeDomain(domain: Domain, currentOs: string, issues: DoctorIssue[]) {
    const domainPath = `${DOTSX.IDE.PATH}/${domain.name}`;
    const exists = FileLib.isDirectory(domainPath);

    log.step(`💻 ${domain.name.toUpperCase()} (IDE)`);

    if (!exists) {
      log.message(`  ⚠️  Not initialized`);
      return;
    }

    const status = ConsoleLib.getConfigStatus(domain, currentOs as any, DOTSX.IDE.PATH);

    if (status.status === 'incompatible') {
      log.message(`  ⚠️ Not compatible with ${currentOs}`);
    } else if (status.status === 'fully_imported') {
      log.message(`  ✅ ${status.importedFiles}/${status.totalFiles} config(s) imported`);
    } else if (status.status === 'partially_imported') {
      log.message(`  ⚠️ ${status.importedFiles}/${status.totalFiles} config(s) imported`);
      for (const missing of status.missingPaths) {
        log.message(`  ❌ ${missing}`);
      }
    } else {
      log.message(`  ❌ Not imported (0/${status.totalFiles})`);
    }
  },

  async checkTerminalDomain(domain: Domain, currentOs: string, issues: DoctorIssue[]) {
    const domainPath = `${DOTSX.TERMINAL.PATH}/${domain.name}`;
    const exists = FileLib.isDirectory(domainPath);

    log.step(`🖥️  ${domain.name.toUpperCase()} (Terminal)`);

    if (!exists) {
      log.message(`  ⚠️ Not initialized`);
      return;
    }

    const status = ConsoleLib.getConfigStatus(domain, currentOs as any, DOTSX.TERMINAL.PATH);

    if (status.status === 'incompatible') {
      log.message(`  ⚠️ Not compatible with ${currentOs}`);
    } else if (status.status === 'fully_imported') {
      log.message(`  ✅ ${status.importedFiles}/${status.totalFiles} config(s) imported`);
    } else if (status.status === 'partially_imported') {
      log.message(`  ⚠️ ${status.importedFiles}/${status.totalFiles} config(s) imported`);
      for (const missing of status.missingPaths) {
        log.message(`  ❌ ${missing}`);
      }
    } else {
      log.message(`  ❌ Not imported (0/${status.totalFiles})`);
    }
  },

  async checkBin(issues: DoctorIssue[]) {
    log.step('🚀 BIN Scripts');

    const binExists = FileLib.isDirectory(DOTSX.BIN.PATH);
    if (!binExists) {
      log.message('  ⚠️ Not initialized');
      issues.push({
        type: 'warning',
        category: 'domains',
        message: 'Bin directory not initialized',
        fixable: true,
        fix: async () => {
          FileLib.createDirectory(DOTSX.BIN.PATH);
          FileLib.createFile(DOTSX.BIN.ALIAS);
          log.message('  ✅ Created bin directory and alias file');
        },
      });
      log.message('  💡 Run: dotsx init');
      return;
    }

    const aliasExists = FileLib.isFile(DOTSX.BIN.ALIAS);
    if (!aliasExists) {
      log.message('  ❌ Alias file missing');
      issues.push({
        type: 'error',
        category: 'domains',
        message: 'Bin alias file missing',
        fixable: true,
        fix: async () => {
          FileLib.createFile(DOTSX.BIN.ALIAS);
          log.message('  ✅ Created alias file');
        },
      });
    } else {
      log.message('  ✅ Alias file exists');
    }

    const scripts = FileLib.readDirectory(DOTSX.BIN.PATH).filter(
      (f) => !f.startsWith('_') && FileLib.isFile(`${DOTSX.BIN.PATH}/${f}`),
    );

    log.message(`  ✅ ${scripts.length} script(s) found`);
  },

  async checkSymlinks(issues: DoctorIssue[]) {
    log.info('🔗 Symlinks Status');

    const links = symlinkCommand.getSymlinks();

    if (links.length === 0) {
      log.message('  ⚠️ No symlinks configured');
      return;
    }

    let correct = 0;
    let incorrect = 0;

    for (const { systemPath, dotsxPath } of links) {
      const displayPath = FileLib.getDisplayPath(dotsxPath);
      const isCorrect = FileLib.isSymLinkContentCorrect(dotsxPath, systemPath);

      if (isCorrect) {
        correct++;
      } else {
        incorrect++;
        log.message(`  ❌ ${displayPath}`);
        issues.push({
          type: 'error',
          category: 'symlinks',
          message: `Broken symlink: ${displayPath}`,
          fixable: true,
          fix: async () => {
            FileLib.safeSymlink(systemPath, dotsxPath);
          },
        });
      }
    }

    if (incorrect === 0) {
      log.message(`  ✅ All ${correct} symlink(s) are correct`);
    } else {
      log.message(`  ⚠️ ${correct}/${links.length} symlink(s) correct`);
      log.message(`  ❌ ${incorrect} broken symlink(s)`);
    }
  },

  async showSummary(issues: DoctorIssue[]) {
    log.info('📊 Diagnosis Summary');

    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');
    const fixable = issues.filter((i) => i.fixable);

    if (issues.length === 0) {
      log.message('🎉 Everything looks great! No issues found.');
      return;
    }

    if (errors.length > 0) {
      log.message(`${errors.length} error(s) found:`);
      for (const error of errors) {
        log.message(`  ❌ ${error.message}`);
      }
    }

    if (warnings.length > 0) {
      log.message(`⚠️  ${warnings.length} warning(s) found:`);
      for (const warning of warnings) {
        log.message(`  ⚠️ ${warning.message}`);
      }
    }

    if (fixable.length > 0) {
      log.message(`💡 ${fixable.length} issue(s) can be fixed automatically`);
    }
  },

  async proposeFixes(issues: DoctorIssue[]) {
    const fixableIssues = issues.filter((i) => i.fixable);

    if (fixableIssues.length === 0) return;

    const shouldFix = await confirm({
      message: `Do you want to fix ${fixableIssues.length} issue(s) automatically?`,
      initialValue: true,
    });

    if (!shouldFix) {
      outro('Skipped automatic fixes');
      return;
    }

    log.step('🔧 Applying fixes...');

    let fixed = 0;
    let failed = 0;

    for (const issue of fixableIssues) {
      if (issue.fix) {
        try {
          await issue.fix();
          fixed++;
        } catch (error) {
          log.error(`Failed to fix: ${issue.message}`);
          log.message(`  ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }
    }

    if (fixed > 0) {
      log.success(`Fixed ${fixed} issue(s)`);
    }
    if (failed > 0) {
      log.error(`Failed to fix ${failed} issue(s)`);
    }
  },
};
