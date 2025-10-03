import { confirm, isCancel, log, outro } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { GitLib } from '@/lib/git';
import { SymlinkLib } from '@/lib/symlink';
import { SystemLib } from '@/lib/system';
import { symlinkCommand } from './symlink';

interface DoctorIssue {
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'git' | 'symlinks' | 'bin';
  message: string;
  fixable: boolean;
  fix?: () => Promise<void>;
}

export const doctorCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    const issues: DoctorIssue[] = [];

    await this.checkStructure(issues, dotsxPath);
    await this.checkGit(issues, dotsxPath);
    await this.checkBin(issues, dotsxPath);
    await this.checkSymlinks(issues, dotsxPath);
    await this.showSummary(issues);

    if (issues.some((i) => i.fixable)) {
      await this.proposeFixes(issues);
    }
  },

  async checkStructure(issues: DoctorIssue[], dotsxPath: DotsxOsPath) {
    log.info('📁 Directory Structure');

    const requiredDirs = [
      { path: dotsxPath.baseOs, name: '~/.dotsx' },
      { path: dotsxPath.bin, name: 'bin/' },
      { path: dotsxPath.packagesManager, name: 'packages/' },
      { path: dotsxPath.symlinks, name: 'symlinks/' },
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
            FileLib.Directory.create(dir.path);
            log.success(`Created ${dir.name}`);
          },
        });
      }
    }

    log.message(`  ✅ ${existsPaths.length}/${requiredDirs.length} directories present`);
  },

  async checkGit(issues: DoctorIssue[], dotsxPath: DotsxOsPath) {
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

    const isRepo = await GitLib.isGitRepository(dotsxPath.baseOs);
    if (!isRepo) {
      log.message('  ⚠️ Not a Git repository');
      issues.push({
        type: 'warning',
        category: 'git',
        message: 'dotsx is not a Git repository',
        fixable: false,
      });
      log.message('  💡 Run: dotsx git → Create new repository\n');
      return;
    }

    let gitStatus = 'Git repository initialized';

    const gitInfo = await GitLib.getRepositoryInfo(dotsxPath.baseOs);

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
      const hasConflicts = await GitLib.hasConflicts(dotsxPath.baseOs);
      if (hasConflicts) {
        const conflictedFiles = await GitLib.getConflictedFiles(dotsxPath.baseOs);
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

    log.message(gitStatus);
  },

  async checkBin(issues: DoctorIssue[], dotsxPath: DotsxOsPath) {
    log.step('🚀 BIN Scripts');

    const binExists = FileLib.isDirectory(dotsxPath.bin);
    if (!binExists) {
      log.message('  ⚠️ Not initialized');
      issues.push({
        type: 'warning',
        category: 'bin',
        message: 'Bin directory not initialized',
        fixable: true,
        fix: async () => {
          FileLib.Directory.create(dotsxPath.bin);
          FileLib.File.create(dotsxPath.binAliases);
          log.message('  ✅ Created bin directory and alias file');
        },
      });
      log.message('  💡 Run: dotsx init');
      return;
    }

    const aliasExists = FileLib.isFile(dotsxPath.binAliases);
    if (!aliasExists) {
      log.message('  ❌ Alias file missing');
      issues.push({
        type: 'error',
        category: 'bin',
        message: 'Bin alias file missing',
        fixable: true,
        fix: async () => {
          FileLib.File.create(dotsxPath.binAliases);
          log.message('  ✅ Created alias file');
        },
      });
    } else {
      log.message('  ✅ Alias file exists');
    }

    const rcFilePath = SystemLib.getRcFilePath();
    if (!rcFilePath) {
      log.message('  ❌ RC file not found');
      issues.push({
        type: 'error',
        category: 'bin',
        message: 'RC file not found',
        fixable: false,
      });
      return;
    } else {
      log.message('  ✅ RC file found');
    }

    const isSourceWritten = FileLib.File.read(rcFilePath).includes(dotsxPath.binAliases);
    if (!isSourceWritten) {
      log.message('  ❌ Source not written');
      issues.push({
        type: 'error',
        category: 'bin',
        message: 'Source not written',
        fixable: true,
        fix: async () => {
          FileLib.File.writeAppend(rcFilePath, `source ${dotsxPath.binAliases}`);
          log.message('  ✅ Source written');
        },
      });
    } else {
      log.message('  ✅ Source written');
    }

    const scripts = FileLib.Directory.read(dotsxPath.bin).filter(
      (f) => f !== dotsxPath.binAliases && FileLib.isFile(`${dotsxPath.bin}/${f}`),
    );

    log.message(`  ✅ ${scripts.length} script(s) found`);
  },

  async checkSymlinks(issues: DoctorIssue[], dotsxOsPath: DotsxOsPath) {
    log.info('🔗 Symlinks Status');

    const links = symlinkCommand.getSymlinks(dotsxOsPath);

    if (links.length === 0) {
      log.message('  ⚠️  No symlinks configured');
      return;
    }

    let correct = 0;
    let incorrect = 0;

    for (const { systemPath, dotsxPath } of links) {
      const displayPath = FileLib.display(dotsxPath);
      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, systemPath);

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
            SymlinkLib.safeSymlink(systemPath, dotsxPath);
          },
        });
      }
    }

    if (incorrect === 0) {
      log.message(`  ✅ All ${correct} symlink(s) are correct`);
    } else {
      log.message(`  ⚠️  ${correct}/${links.length} symlink(s) correct`);
    }
  },

  async showSummary(issues: DoctorIssue[]) {
    log.info('📊 Diagnosis Summary');

    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');

    if (issues.length === 0) {
      log.success('🎉 Everything looks great! No issues found.');
      return;
    }

    if (errors.length > 0) {
      log.error(`${errors.length} error(s) found:`);
      for (const error of errors) {
        log.message(`  ${error.message}`);
      }
    }

    if (warnings.length > 0) {
      log.warn(`${warnings.length} warning(s) found:`);
      for (const warning of warnings) {
        log.message(`  ${warning.message}`);
      }
    }
  },

  async proposeFixes(issues: DoctorIssue[]) {
    const fixableIssues = issues.filter((i) => i.fixable);

    if (fixableIssues.length === 0) return;

    const shouldFix = await confirm({
      message: `Do you want to fix ${fixableIssues.length} issue(s) automatically?`,
      initialValue: true,
    });

    if (isCancel(shouldFix)) {
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
