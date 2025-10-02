
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
- AI tool configurations (Claude Code, etc.).
- Executable shell scripts (bin/).
- Packages installed depending on OS and package manager (`apt`, `pacman`, `brew`, etc.).

All data is stored in `~/.dotsx` and versioned via GitHub.

---

## 🔄 Architecture Evolution (Refactoring)

### Previous Structure (Deprecated)
```
~/.dotsx/
  ├── bin/
  ├── symlinks/
  ├── ide/
  │   ├── vscode/
  │   └── cursor/
  ├── terminal/
  │   ├── zsh/
  │   └── bash/
  └── os/
      └── debian/
          ├── apt.txt
          └── snap.txt
```

**Problems with old structure:**
1. **Conceptual duplication**: `ide/` and `terminal/` were essentially symlinks, but separated from `symlinks/`.
2. **Complex backup/git logic**: Different logic needed for `bin/`, `ide/`, `terminal/`, `os/`.
3. **Hardcoded domains**: Detection logic was tightly coupled to domain implementations.
4. **Poor multi-OS support**: Mixing OS configs with non-OS entities made structure unclear.

---

### New Structure (Current)
```
~/.dotsx/
  └── <os>/                 # e.g., debian, arch, macos
      ├── dotsx.config.json
      ├── bin/              # Native executable scripts
      │   └── dotsx.bin.aliases
      ├── packages/         # Package manager configs
      │   └── dotsx.packages.json
      └── symlinks/         # ALL symlinked configs (IDE, terminal, custom)
          └── __home__/
              ├── .zshrc
              ├── .config/Code/User/...
              └── .claude/...
```

**Benefits of new structure:**
1. **Unified symlink management**: Everything symlinked goes to `symlinks/` - no exceptions.
2. **Simplified backup/git**: One consistent logic for all symlinks under `<os>/symlinks/`.
3. **OS-first organization**: Clear separation per OS/distro, easier to manage multi-boot setups.
4. **Declarative suggestions**: Detection logic separated into `suggestions.ts` - easy to extend.
5. **Clear separation of concerns**:
   - `bin/`: Native scripts (executed from dotsx, aliased in shell).
   - `symlinks/`: Symlinked configs (point TO dotsx from system).
   - `packages/`: Package metadata (declarative list of installed packages).

---

### Migration Notes
- **Suggestion system** replaces hardcoded domain logic (see [Suggestion System](#suggestion-system)).
- **DotsxOsPath interface** replaces nested domain paths (see [DotsxOsPath Interface](#dotsxospath-interface)).
- Commands refactored: `init`, `bin` complete; `symlink`, `packages`, `check` in progress.  

---

## 🛠 Features

### Symlinks
- Each configuration file is **symlinked** from its original location to `~/.dotsx/<os>/symlinks/`.
- Example:
  ```
  ~/.zshrc → ~/.dotsx/debian/symlinks/__home__/.zshrc
  ```
- The `__home__` notation replaces `~` to stay user-agnostic and portable across machines.
- Symlinks apply to **all configuration files** (IDE settings, terminal configs, custom configs, etc.).

### Folder Architecture (`~/.dotsx`)

The structure is **OS-based**, meaning each operating system/distro has its own folder:

```
~/.dotsx/
  └── <os>/                 # OS/distro name (e.g., debian, fedora, arch, macos)
      ├── dotsx.config.json # OS-specific configuration metadata
      ├── bin/              # Executable shell scripts
      │   └── dotsx.bin.aliases  # Auto-generated aliases file
      ├── packages/         # Package manager configurations
      │   └── dotsx.packages.json  # Package manager metadata
      └── symlinks/         # All symlinked configurations
          └── __home__/     # User home directory paths
              ├── .zshrc
              ├── .bashrc
              ├── .config/
              │   ├── Code/User/settings.json
              │   └── Cursor/User/settings.json
              └── .claude/
                  └── CLAUDE.md
```

#### Example: Debian
```
~/.dotsx/debian/
  ├── dotsx.config.json
  ├── bin/
  │   ├── dotsx.bin.aliases
  │   ├── my-script.sh
  │   └── deploy.sh
  ├── packages/
  │   └── dotsx.packages.json  # Contains apt, snap, flatpak package lists
  └── symlinks/
      └── __home__/
          ├── .zshrc
          └── .config/
              └── Code/User/settings.json
```

#### Bin (`~/.dotsx/<os>/bin/`)
- Contains **executable shell scripts** (`.sh` files).
- Scripts are **NOT symlinks** - they are native files stored directly in dotsx.
- Aliases are **auto-generated** in `~/.dotsx/<os>/bin/dotsx.bin.aliases`.
- The alias file is **sourced automatically** in the terminal RC file (`.zshrc`, `.bashrc`).
- Example workflow:
  1. User adds script: `~/.dotsx/debian/bin/deploy.sh`
  2. dotsx creates alias: `alias deploy="~/.dotsx/debian/bin/deploy.sh"`
  3. Alias file is sourced in `~/.zshrc`
  4. User can run: `deploy` from anywhere

#### Packages (`~/.dotsx/<os>/packages/`)
- Contains package manager metadata in `dotsx.packages.json`.
- Stores lists of installed packages per package manager (apt, snap, flatpak, brew, etc.).
- Example structure:
  ```json
  {
    "apt": ["git", "curl", "tmux"],
    "snap": ["code"],
    "flatpak": ["com.spotify.Client"]
  }
  ```

#### Symlinks (`~/.dotsx/<os>/symlinks/`)
- Contains **all symlinked configuration files**.
- Uses `__home__/` prefix to represent user home directory (`~`).
- **Everything is centralized here**: IDE configs, terminal configs, custom dotfiles.
- The old structure (separate `ide/`, `terminal/` folders) is **deprecated** - now everything is unified under `symlinks/`.

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

### DotsxOsPath Interface

The core interface that represents the OS-based structure:

```ts
export interface DotsxOsPath {
  baseOs: string;              // ~/.dotsx/<os>
  config: string;              // ~/.dotsx/<os>/dotsx.config.json
  bin: string;                 // ~/.dotsx/<os>/bin
  binAliases: string;          // ~/.dotsx/<os>/bin/dotsx.bin.aliases
  packagesManager: string;     // ~/.dotsx/<os>/packages
  packagesManagerConfig: string; // ~/.dotsx/<os>/packages/dotsx.packages.json
  symlinks: string;            // ~/.dotsx/<os>/symlinks
}
```

**Usage:**
```ts
import { resolveDotsxOsPath } from '@/lib/constants';

const dotsxPath = resolveDotsxOsPath('debian');
// Returns:
// {
//   baseOs: '/home/user/.dotsx/debian',
//   config: '/home/user/.dotsx/debian/dotsx.config.json',
//   bin: '/home/user/.dotsx/debian/bin',
//   binAliases: '/home/user/.dotsx/debian/bin/dotsx.bin.aliases',
//   packagesManager: '/home/user/.dotsx/debian/packages',
//   packagesManagerConfig: '/home/user/.dotsx/debian/packages/dotsx.packages.json',
//   symlinks: '/home/user/.dotsx/debian/symlinks'
// }
```

---

### Suggestion System

Suggestions are **declarative metadata** for detecting installed applications/tools and offering to manage their configurations.

```ts
export interface Suggestion {
  name: string;                 // Identifier (e.g., 'vscode', 'zsh')
  type: SuggestionType;         // Category: 'ide' | 'terminal' | 'ai' | 'others'
  hint: string;                 // Help text shown to user
  pathsToCheck: Partial<Record<OsFamily | KnownLinuxDistro, string[]>>; // OS-specific paths to detect
}
```

**Example: VSCode Suggestion**
```ts
const vscodeSuggestion: Suggestion = {
  name: 'vscode',
  type: 'ide',
  hint: 'VSCode is not installed',
  pathsToCheck: {
    linux: [
      '~/.config/Code/User/settings.json',
      '~/.config/Code/User/keybindings.json',
      '~/.config/Code/User/snippets',
    ],
    macos: [
      '~/Library/Application Support/Code/User/settings.json',
      '~/Library/Application Support/Code/User/keybindings.json',
      '~/Library/Application Support/Code/User/snippets',
    ],
  },
};
```

**Example: ZSH Suggestion**
```ts
const zshSuggestion: Suggestion = {
  name: 'zsh',
  type: 'terminal',
  hint: 'Zsh is not installed',
  pathsToCheck: {
    linux: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
};
```

**How it works:**
1. During `dotsx init`, the system checks if any `pathsToCheck` exist on the current OS.
2. If found, the user is prompted to manage those configs with dotsx.
3. Selected paths are symlinked to `~/.dotsx/<os>/symlinks/__home__/...`.

**Helper functions:**
```ts
// Get suggestions by type
getSuggestionsByType('ide');      // Returns: [vscodeSuggestion, cursorSuggestion]
getSuggestionsByType('terminal'); // Returns: [zshSuggestion, bashSuggestion, tmuxSuggestion]

// Get suggestions available for current OS
getSuggestionsByOs('linux');      // Returns all suggestions with linux paths
getSuggestionsByOs('macos');      // Returns all suggestions with macos paths
```

---

### Key Design Decisions

1. **Why OS-based structure?**
   - Simplifies backup/git logic (everything under one OS folder).
   - Avoids duplication: terminal/IDE were conceptually symlinks anyway.
   - Easier to maintain multiple OS configs (e.g., dual-boot Linux/macOS).

2. **Why suggestions instead of hardcoded domains?**
   - More flexible: easy to add new tools without modifying core logic.
   - Declarative: `pathsToCheck` clearly defines what to detect.
   - Separation of concerns: detection logic separate from core functionality.

3. **Why `bin/` at same level as `symlinks/`?**
   - Bin scripts are **native files**, not symlinks.
   - They live in dotsx and are executed directly (via aliases).
   - Symlinks point **to** dotsx, bin scripts point **from** dotsx.

---

## 🔄 Workflows

### Flow: First-time initialization (local)

**Trigger:** User runs `dotsx init` on a fresh machine.

**Steps:**
1. Detect current OS/distro (e.g., `debian`, `arch`, `macos`).
2. Create base structure:
   ```
   ~/.dotsx/<os>/
     ├── dotsx.config.json
     ├── bin/
     │   └── dotsx.bin.aliases
     ├── packages/
     │   └── dotsx.packages.json
     └── symlinks/
   ```
3. Scan system for available suggestions (VSCode, Zsh, Tmux, etc.).
4. Prompt user to select which configs to manage.
5. For each selected path:
   - Create daily backup in `~/.backup.dotsx`.
   - Move original file to `~/.dotsx/<os>/symlinks/__home__/...`.
   - Create symlink: `original_path → ~/.dotsx/<os>/symlinks/__home__/...`.
6. Add `source ~/.dotsx/<os>/bin/dotsx.bin.aliases` to terminal RC file.

---

### Flow: Initialization with remote repository

**Trigger:** User has an existing dotsx repo on GitHub.

**Steps:**
1. Run `dotsx git` → select "Clone from existing repository".
2. Provide GitHub SSH URL (e.g., `git@github.com:username/dotsx.git`).
3. Clone repo into `~/.dotsx`.
4. Detect current OS and validate structure exists for `~/.dotsx/<os>/`.
5. Check all symlinks:
   - If system file already exists → create backup, replace with symlink.
   - If system file missing → create symlink to dotsx content.
6. Add `source ~/.dotsx/<os>/bin/dotsx.bin.aliases` to terminal RC file.

**Notes:**
- GitHub SSH required.
- Multi-OS support: user can have `~/.dotsx/debian/` on one machine and `~/.dotsx/arch/` on another.

---

### Flow: Adding a new symlink

**Trigger:** User wants to manage a new config file.

**Command:** `dotsx symlink add`

**Steps:**
1. User provides path (e.g., `~/.tmux.conf`).
2. System validates file exists.
3. Create daily backup in `~/.backup.dotsx/symlinks/__home__/.tmux.conf.<timestamp>.dotsx.backup`.
4. Move original file to `~/.dotsx/<os>/symlinks/__home__/.tmux.conf`.
5. Create symlink: `~/.tmux.conf → ~/.dotsx/<os>/symlinks/__home__/.tmux.conf`.
6. File is now tracked by git in `~/.dotsx`.

---

### Flow: Adding a bin script

**Trigger:** User wants to create a reusable shell script.

**Command:** `dotsx bin`

**Steps:**
1. User adds script manually to `~/.dotsx/<os>/bin/my-script.sh`.
2. Run `dotsx bin`.
3. System detects new script and prompts to set up.
4. Makes script executable: `chmod +x my-script.sh`.
5. Adds alias to `dotsx.bin.aliases`:
   ```bash
   alias my-script="~/.dotsx/<os>/bin/my-script.sh"
   ```
6. User can now run `my-script` from anywhere.

**Auto-cleanup:**
- If alias references a deleted script → removed from `dotsx.bin.aliases`.

---

### Flow: Git sync (commit + push)

**Trigger:** User modified configs and wants to sync to GitHub.

**Command:** `dotsx git sync`

**Steps:**
1. Check if remote repository is configured.
2. Stage all changes: `git add -A`.
3. Check for uncommitted changes.
4. Commit with timestamp: `git commit -m "update dotsx [2025-01-15T10:30:00Z]"`.
5. Push to remote: `git push origin main`.

**Notes:**
- Automatic daily backups are created before any modifications.
- User does NOT manually backup - dotsx handles it.

---

### Flow: Git pull (fetch updates from remote)

**Trigger:** User on second machine wants latest configs.

**Command:** `dotsx git pull`

**Steps:**
1. Check for uncommitted local changes → warn user if found.
2. Pull from remote: `git pull origin main`.
3. Check for merge conflicts:
   - **If conflicts exist** → prompt user to resolve manually, then run `dotsx check`.
   - **If no conflicts** → continue.
4. Validate repository structure:
   - Check `~/.dotsx/<os>/` folders exist.
   - Offer to repair if missing.
5. Check all symlinks:
   - Detect broken/incorrect symlinks.
   - Offer to fix automatically.
6. Complete: `✅ Pull complete`.

**Conflict resolution:**
- User resolves conflicts manually: `git add . && git commit`.
- Then runs: `dotsx check` to validate symlinks.

---

### Flow: Backup and restore

**Automatic daily backup:**
- Triggered **once per day** per file when:
  - Creating a new symlink.
  - Modifying a tracked file.
- Stored in: `~/.backup.dotsx/symlinks/__home__/.../<file>.<timestamp>.dotsx.backup`.
- Maximum **7 backups per file** (oldest deleted automatically).

**Manual restore:**
1. User accidentally deletes `~/.dotsx`.
2. Check `~/.backup.dotsx` for recent backups.
3. If backups exist → restore manually or re-clone from GitHub.
4. Run `dotsx check` to rebuild symlinks.

---

### Flow: Checking symlink integrity

**Trigger:** User wants to validate all symlinks are correct.

**Command:** `dotsx check` (or `dotsx symlink`)

**Steps:**
1. Scan `~/.dotsx/<os>/symlinks/` recursively.
2. For each file, check if corresponding system symlink:
   - **Exists** at expected location.
   - **Points to correct dotsx path**.
3. Display results:
   - ✅ Correct symlinks.
   - ❌ Broken/incorrect symlinks.
4. Offer to repair broken symlinks automatically.

**Repair process:**
- Delete incorrect symlink.
- Recreate correct symlink to dotsx.

---

### Flow: Multi-machine sync

**Scenario:** User has dotsx on two machines (Machine A and Machine B).

**On Machine A:**
1. Modify `~/.zshrc`.
2. Run `dotsx git sync` → commits and pushes to GitHub.

**On Machine B:**
1. Run `dotsx git pull` → fetches latest changes.
2. System detects `~/.zshrc` changed.
3. Creates daily backup of current `~/.zshrc` (if not backed up today).
4. Updates symlink content from dotsx.
5. User's `~/.zshrc` now reflects Machine A's changes.

**Conflict scenario:**
- Both machines modify `~/.zshrc` simultaneously.
- Machine B runs `dotsx git pull` → merge conflict detected.
- User resolves manually: edits file, `git add .`, `git commit`.
- Runs `dotsx check` to validate symlinks.  

---

## ⚠️ Constraints & Limitations
- GitHub connection only via **SSH**.  
- No automatic conflict resolution.  
- Maximum 7 backups per file.  