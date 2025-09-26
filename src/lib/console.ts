import { log } from '@clack/prompts';
import { DotsxInfoLib, SystemLib } from './system';

export const ConsoleLib = {
  logListWithTitle(title: string, list: string[]) {
    console.log(`\n${title} (${list.length}):`);
    list.forEach((item) => {
      console.log(` ${item}`);
    });
  },

  displayInfo() {
    const info = SystemLib.getSystemInfo();
    log.info(`${info.hostname} System:
 🖥️  ${info.distro} ${info.release} (${info.platform} ${info.arch})
 💾 RAM: ${info.memory} 
 📄 ${info.rcFile} (${info.shell})`);

    const dotsxState = DotsxInfoLib.getDotsxState();

    if (dotsxState.isInitialized) {
    log.info(`DotsX (Initialized): 
 ${dotsxState.isBinInitialized ? '✅' : '❌'} Bin Initialized
 ${dotsxState.isOsInitialized ? '✅' : '❌'} OS Initialized
 ${dotsxState.isTerminalInitialized ? '✅' : '❌'} Terminal Initialized
 ${dotsxState.isIdeInitialized ? '✅' : '❌'} IDE Initialized`);
  } else {
    log.info('DotsX (Not Initialized)');
  }
  },
};
