import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { confirm, select } from '@clack/prompts';
import { DOTFILE_PATH_DIRS } from '@/lib/constants';

export async function handleBin() {
  const action = await select({
    message: 'What do you want to do with bin scripts?',
    options: [
      { value: 'status', label: '📋 Check bin status' },
      { value: 'setup', label: '🔧 Setup bin scripts' },
      { value: 'sync', label: '🔄 Sync all bin scripts' },
    ],
  });

  if (action === 'status') await checkBinStatus();
  else if (action === 'setup') await setupBinScripts();
  else if (action === 'sync') await syncBinScripts();
}

async function checkBinStatus() {
  console.log('\n📋 Bin Scripts Status');
  console.log('═'.repeat(30));

  if (!existsSync(DOTFILE_PATH_DIRS.BIN)) {
    console.log(`❌ Directory ${DOTFILE_PATH_DIRS.BIN} does not exist`);
    return;
  }

  const scripts = getShellScripts();
  if (scripts.length === 0) {
    console.log('ℹ️ No shell scripts found');
    return;
  }

  const shell = detectShell();
  const rcFile = getRcFilePath(shell);
  
  console.log(`🐚 Detected shell: ${shell}`);
  console.log(`📄 RC file: ${rcFile}`);
  console.log('');

  let configured = 0;
  for (const script of scripts) {
    const scriptPath = resolve(DOTFILE_PATH_DIRS.BIN, script);
    const isExecutable = checkExecutablePermission(scriptPath);
    const hasAlias = checkAlias(script, rcFile);

    console.log(`📄 ${script}`);
    console.log(`   ${isExecutable ? '✅' : '❌'} Executable permission`);
    console.log(`   ${hasAlias ? '✅' : '❌'} Alias configured`);
    
    if (isExecutable && hasAlias) configured++;
  }

  console.log(`\n${configured}/${scripts.length} scripts properly configured`);
}

async function setupBinScripts() {
  console.log('\n🔧 Setup Bin Scripts');

  // Create bin directory if it doesn't exist
  if (!existsSync(DOTFILE_PATH_DIRS.BIN)) {
    const shouldCreate = await confirm({
      message: `Directory ${DOTFILE_PATH_DIRS.BIN} does not exist. Create it?`,
    });

    if (shouldCreate) {
      mkdirSync(DOTFILE_PATH_DIRS.BIN, { recursive: true });
      console.log(`✅ Created directory: ${DOTFILE_PATH_DIRS.BIN}`);
    } else {
      console.log('❌ Setup cancelled');
      return;
    }
  }

  const scripts = getShellScripts();
  if (scripts.length === 0) {
    console.log(`ℹ️ No shell scripts found in ${DOTFILE_PATH_DIRS.BIN}`);
    console.log('💡 Add your shell scripts to this directory and run setup again');
    return;
  }

  await syncBinScripts();
}

async function syncBinScripts() {
  console.log('\n🔄 Syncing Bin Scripts');

  const scripts = getShellScripts();
  if (scripts.length === 0) {
    console.log('ℹ️ No shell scripts found');
    return;
  }

  const shell = detectShell();
  const rcFile = getRcFilePath(shell);

  console.log(`🐚 Using shell: ${shell}`);
  console.log(`📄 RC file: ${rcFile}`);
  
  let processed = 0;

  for (const script of scripts) {
    const scriptPath = resolve(DOTFILE_PATH_DIRS.BIN, script);
    
    // Make executable
    try {
      chmodSync(scriptPath, 0o755);
      console.log(`✅ Made executable: ${script}`);
    } catch (error) {
      console.error(`❌ Failed to chmod ${script}: ${error}`);
      continue;
    }

    // Add alias if not present
    if (!checkAlias(script, rcFile)) {
      addAlias(script, rcFile);
      console.log(`✅ Added alias: ${script}`);
    } else {
      console.log(`ℹ️ Alias already exists: ${script}`);
    }

    processed++;
  }

  console.log(`\n🎉 Processed ${processed}/${scripts.length} scripts`);
  console.log('💡 Please restart your shell or run `source ~/.zshrc` (or ~/.bashrc) to use the new aliases');
}

function getShellScripts(): string[] {
  if (!existsSync(DOTFILE_PATH_DIRS.BIN)) {
    return [];
  }

  return readdirSync(DOTFILE_PATH_DIRS.BIN)
    .filter(file => {
      const filePath = resolve(DOTFILE_PATH_DIRS.BIN, file);
      const stat = statSync(filePath);
      
      // Only include regular files (not directories)
      if (!stat.isFile()) return false;
      
      // Include files without extension or with common shell script extensions
      const hasShellExtension = file.endsWith('.sh') || file.endsWith('.bash') || file.endsWith('.zsh');
      const hasNoExtension = !file.includes('.');
      
      return hasShellExtension || hasNoExtension;
    })
    .sort();
}

function detectShell(): string {
  const shell = process.env.SHELL?.split('/').pop() || 'bash';
  return ['zsh', 'bash'].includes(shell) ? shell : 'bash';
}

function getRcFilePath(shell: string): string {
  const home = homedir();
  return shell === 'zsh' ? resolve(home, '.zshrc') : resolve(home, '.bashrc');
}

function checkExecutablePermission(filePath: string): boolean {
  try {
    const stat = statSync(filePath);
    // Check if owner has execute permission
    return (stat.mode & 0o100) !== 0;
  } catch {
    return false;
  }
}

function checkAlias(scriptName: string, rcFile: string): boolean {
  if (!existsSync(rcFile)) {
    return false;
  }

  try {
    const content = readFileSync(rcFile, 'utf-8');
    const aliasPattern = new RegExp(`alias\\s+${scriptName}=`, 'm');
    return aliasPattern.test(content);
  } catch {
    return false;
  }
}

function addAlias(scriptName: string, rcFile: string): void {
  const aliasLine = `alias ${scriptName}="${DOTFILE_PATH_DIRS.BIN}/${scriptName}"`;
  
  try {
    // Check if file exists, create if not
    if (!existsSync(rcFile)) {
      writeFileSync(rcFile, '');
    }

    // Read existing content to check if we need to add a newline
    const content = readFileSync(rcFile, 'utf-8');
    const needsNewline = content.length > 0 && !content.endsWith('\n');

    // Add comment section if this is the first dotsx alias
    if (!content.includes('# dotsx bin aliases')) {
      const header = `${needsNewline ? '\n' : ''}\n# dotsx bin aliases\n`;
      appendFileSync(rcFile, header);
    }

    // Add the alias
    appendFileSync(rcFile, `${aliasLine}\n`);
  } catch (error) {
    throw new Error(`Failed to add alias to ${rcFile}: ${error}`);
  }
}
