
# CLAUDE.md

## 🎯 Document Objective
This document describes **dotsx**, a CLI tool for managing dotfiles.  
It provides the LLM with:  
- The **context** and architecture of the project.  
- The main **features**.  
- The **code interfaces** to follow.  
- The **Git and usage workflows** in normalized form.  
- The **constraints** (current limitations).  

---

## 📌 Context
**dotsx** is a CLI tool that centralizes and manages configurations ("dotfiles") on GitHub:  
- Shell files (`.zshrc`, `.bashrc`, …).  
- IDE configurations (VSCode, Cursor, etc.).  
- Terminal configurations (ZSH, Bash, TMUX).  
- Packages installed depending on OS and package manager (`apt`, `pacman`, `brew`, etc.).  

All data is stored in `~/.dotsx` and versioned via GitHub.  

---

## 🛠 Features

### Symlinks
- Each configuration file is **symlinked** from its original location to `~/.dotsx/symlinks`.  
- Example:  
  ```
  ~/.claude/CLAUDE.md → ~/.dotsx/symlinks/__home__/.claude/CLAUDE.md
  ```  
- The `__home__` notation replaces `~` to stay user-agnostic.  

### Folder Architecture (`~/.dotsx`)
```
~/.dotsx/
  ├── bin/          # Executable scripts + aliases
  ├── ide/          # IDE configs (ex: vscode, cursor)
  ├── terminal/     # Terminal configs (zsh, bash, tmux)
  ├── os/           # OS + package managers configs
  └── symlinks/     # Symlinked content outside entities
```

#### Bin (`~/.dotsx/bin/`)
- Contains `.sh` executables.  
- Aliases generated in `~/.dotsx/bin/_dotsx-bin.aliases`.  
- This file is auto-sourced in the terminal RC.  

#### IDE (`~/.dotsx/ide/`)
- One folder per IDE.  
- Example: `~/.dotsx/ide/vscode/**`.  

#### Terminal (`~/.dotsx/terminal/`)
- One folder per shell/terminal.  
- Example: `~/.dotsx/terminal/zsh/**`.  

#### OS (`~/.dotsx/os/`)
- One folder per OS/distro.  
- Each package manager represented by `.txt` listing packages.  
- Example (Debian):  
  ```
  ~/.dotsx/os/debian/
    ├── apt.txt
    ├── flatpak.txt
    └── snap.txt
  ```

### Backup
- Each file/folder is backed up before modification.  
- Stored in `~/.backup.dotsx`.  
- Format: `<filename>.<YYYYMMDDHHMMSSMS>.dotsx.backup`.  
- Maximum 7 backups per file.  
- Backup is mandatory when:  
  - Creating a symlink.  
  - Daily modification (once/day).  

### Git & GitHub
- Entire `~/.dotsx` is a Git repo.  
- Remote required: GitHub via **SSH only**.  
- Integrated commands:  
  - `dotsx git sync` → add + commit + push.  
  - `dotsx git pull` → pull + check symlinks.  

---

## 🧩 Code Interfaces

### Domain & PackageManager
```ts
export interface Domain {
  name: string;
  type: DomainType;
  distro: string[] | null;
  packageManagers?: Record<string, PackageManagerConfig>;
  symlinkPaths?: Partial<Record<Family, string[]>>;
  defaultContent?: string;
}

export interface PackageManagerConfig {
  configPath: string;
  install: string;
  remove: string;
  status: string;
  defaultContent: string;
}
```

### Example: VSCode
```ts
export const vscodeDomain: Domain = {
  name: 'vscode',
  type: 'ide',
  distro: null,
  symlinkPaths: {
    linux: [
      '~/.config/Code/User/settings.json',
      '~/.config/Code/User/keybindings.json',
      '~/.config/Code/User/snippets',
    ],
    macos: [
      '~/Library/Application Support/Code/User/snippets',
      '~/Library/Application Support/Code/User/keybindings.json',
      '~/Library/Application Support/Code/User/settings.json',
    ],
  },
};
```

### Example: Debian + package managers
```ts
export const debianDomain: Domain = {
  name: 'debian',
  distro: ['debian', 'ubuntu'],
  type: 'os',
  packageManagers: {
    apt: {
      configPath: DOTSX.OS.DEBIAN.APT,
      install: 'sudo apt install -y %s',
      remove: 'sudo apt remove -y %s',
      status: 'dpkg -s %s',
      defaultContent: defaultPackageManagersContent('APT'),
    },
    snap: {
      configPath: DOTSX.OS.DEBIAN.SNAP,
      install: 'sudo snap install %s',
      remove: 'sudo snap remove %s',
      status: 'snap list | grep -w "%s"',
      defaultContent: defaultPackageManagersContent('Snap'),
    },
    flatpak: {
      configPath: DOTSX.OS.DEBIAN.FLATPAK,
      install: 'flatpak install -y %s',
      remove: 'flatpak uninstall -y %s',
      status: 'flatpak list | grep -w "%s"',
      defaultContent: defaultPackageManagersContent('Flatpak'),
    },
  },
};
```

---

## 🔄 Workflows

### Flow: Initialization with remote repo
**Trigger:** `~/.dotsx` does not exist, user provides GitHub URL.  
**Steps:**  
1. Clone repo into `~/.dotsx`.  
2. Validate structure.  
3. Create missing folders/files.  
**Notes:** GitHub SSH required.  

### Flow: Manual init without repo
**Trigger:** first setup without repo.  
**Steps:**  
1. Create folder `~/.dotsx`.  
2. Init local Git (`git init`).  
3. Ask for remote in CLI.  
4. Push first commit if requested (`git push --set-upstream origin main`).  

### Flow: Local add/modify
**Trigger:** symlink add, file edit, package add.  
**Steps:**  
1. dotsx makes an automatic backup.  
2. User runs `dotsx git sync` =  
   - `git add -A`  
   - `git commit -m "update <path> [auto]"`  
   - `git push`  

### Flow: Pulling remote changes
**Trigger:** multi-machine usage.  
**Steps:**  
1. Run `dotsx git pull`.  
2. Auto-merge/rebase if possible.  
3. Verify symlinks, repair if needed.  

### Flow: Conflict multi-machine
**Trigger:** 2 machines edit same file.  
**Steps:**  
1. `git pull` → conflict.  
2. dotsx asks user to resolve manually.  
3. After resolution: `dotsx check` to validate.  

### Flow: Restore
**Trigger:** `~/.dotsx` deleted/corrupted.  
**Steps:**  
1. Check `~/.backup.dotsx`.  
2. If available → restore.  
3. Else → re-clone GitHub repo.  
4. Rebuild symlinks.  

---

## ⚠️ Constraints & Limitations
- GitHub connection only via **SSH**.  
- No automatic conflict resolution.  
- Config paths are **hardcoded** (not dynamic).  
- Maximum 7 backups per file.  