interface SystemInfo {
  os: string;
  hostname: string;
  memory: string;
  shell: string;
  rcFile: string;
  dotfilesPath: string;
}

type CliCommand = {
  execute: () => Promise<void>;
  [key: string]: () => unknown;
};
