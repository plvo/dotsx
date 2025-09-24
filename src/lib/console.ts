export const ConsoleLib = {
  logListWithTitle(title: string, list: string[]) {
    console.log(`\n${title} (${list.length}):`);
    list.forEach((item) => {
      console.log(`   ${item}`);
    });
  },
};
