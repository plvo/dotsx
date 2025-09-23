import { arch, freemem, hostname, platform, totalmem } from 'node:os';
import { DOTFILES_PATH } from './constants.ts';

export const SystemLib = {
  getSystemInfo(): SystemInfo {
    const osInfo = `${platform()} ${arch()}`;

    const totalMem = (totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(1);
    const memPercent = Math.round((Number(usedMem) / Number(totalMem)) * 100);

    const shell = process.env.SHELL?.split('/').pop() || 'unknown';

    return {
      os: osInfo,
      hostname: hostname(),
      memory: `${usedMem}/${totalMem} GB (${memPercent}%)`,
      shell,
      dotfilesPath: DOTFILES_PATH,
    };
  },

  displayInfo() {
    const info = this.getSystemInfo();
    console.log('\n🔍 System Info');
    console.log('─'.repeat(30));
    console.log(`🖥️  OS: ${info.os}`);
    console.log(`🏠 Host: ${info.hostname}`);
    console.log(`💾 RAM: ${info.memory}`);
    console.log(`🐚 Shell: ${info.shell}`);
    console.log(`📁 Path: ${info.dotfilesPath}`);
  },
};
