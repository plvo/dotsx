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
    log.info(`${info.hostname} system info:
 🖥️  ${info.distro} ${info.release} (${info.platform} ${info.arch})
 💾 RAM: ${info.memory} 
 📄 ${info.rcFile} (${info.shell})`);

    const dotsxState = DotsxInfoLib.getDotsxState();

    if (dotsxState.isInitialized) {
      log.info(
        `Configuration status: ${dotsxState.isBinInitialized ? '✅' : '❌'} Bin | ${dotsxState.isOsInitialized ? '✅' : '❌'} OS | ${dotsxState.isTerminalInitialized ? '✅' : '❌'} Terminal | ${dotsxState.isIdeInitialized ? '✅' : '❌'} IDE`,
      );
    } else {
      log.error('DotsX (Not configured)');
    }
  },
};
