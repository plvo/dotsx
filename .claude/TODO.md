# 📋 TODO List - DotsX

Date de mise à jour : 2025-09-30

---

## ✅ Version 1.0 - TERMINÉE (100%)

### Features implémentées
- [x] Refacto notation `~` → `__home__` pour paths user-agnostic
- [x] Validation SSH stricte (uniquement `git@github.com:...`)
- [x] `dotsx git sync` atomique (add + commit + push en une commande)
- [x] `dotsx git pull` avec validation structure + symlinks
- [x] `MAX_BACKUPS_PER_FILE = 7` (conforme spec)
- [x] Commande `dotsx doctor` avec diagnostic complet + fix auto

---

## 🟡 Version 1.1 - EN COURS (0%)

### 1. Backup quotidien automatique
**Priorité:** MOYENNE
**Temps estimé:** 30 min
**Fichiers concernés:**
- `src/lib/file.ts`
- Nouveau fichier : `src/lib/backup.ts` (optionnel pour refacto)

**Description:**
Actuellement, un backup est créé **à chaque fois** qu'un symlink est modifié/créé. Selon CLAUDE.md, le backup devrait être fait **maximum 1 fois par jour** pour le même fichier.

**Implémentation suggérée:**

1. Créer un fichier de métadonnées `.dotsx/.last-backup.json` :
```json
{
  "symlinks/__home__/.zshrc": "2025-09-30",
  "symlinks/__home__/.config/Code/User/settings.json": "2025-09-29"
}
```

2. Modifier `FileLib.safeSymlink()` (ligne ~247) :
```typescript
async safeSymlink(systemPath: string, dotsxPath: string) {
  // ... existing checks ...

  const dotsxRelativePath = path.relative(DOTSX_PATH, dotsxPath);
  const today = new Date().toISOString().split('T')[0]; // "2025-09-30"

  // Check if backup already done today
  const lastBackupDate = this.getLastBackupDate(dotsxRelativePath);

  if (lastBackupDate !== today) {
    // Create backup in ~/.backup.dotsx
    this.createBackup(dotsxRelativePath, sourceToBackup);
    this.saveLastBackupDate(dotsxRelativePath, today);
  } else {
    log.info(`Backup already done today for ${displayPath}`);
  }

  // ... rest of existing code ...
}
```

3. Ajouter méthodes helper :
```typescript
getLastBackupDate(dotsxRelativePath: string): string | null {
  const metadataPath = path.join(DOTSX_PATH, '.last-backup.json');
  if (!this.isFile(metadataPath)) return null;

  const data = JSON.parse(this.readFile(metadataPath));
  return data[dotsxRelativePath] || null;
}

saveLastBackupDate(dotsxRelativePath: string, date: string): void {
  const metadataPath = path.join(DOTSX_PATH, '.last-backup.json');

  let data = {};
  if (this.isFile(metadataPath)) {
    data = JSON.parse(this.readFile(metadataPath));
  }

  data[dotsxRelativePath] = date;

  this.writeToFile(metadataPath, JSON.stringify(data, null, 2));
}
```

**Tests à faire:**
- Créer un symlink → backup créé
- Modifier le symlink le même jour → backup skip
- Modifier le symlink le lendemain → nouveau backup créé
- Vérifier que `.last-backup.json` est bien versionné dans Git

**Bénéfices:**
- Réduit taille de `~/.backup.dotsx` (pas de backup spam)
- Conforme à la spec CLAUDE.md
- Garde historique quotidien sur 7 jours

---

### 2. Améliorer détection distro Linux
**Priorité:** MOYENNE
**Temps estimé:** 20 min
**Fichiers concernés:**
- `src/lib/system.ts` (lignes 96-107)

**Description:**
La détection actuelle lit juste `/etc/os-release` ID field. Problèmes :
- Ne détecte pas les dérivés (Pop!_OS, Linux Mint, Zorin, etc.)
- Pas de fallback si fichier manquant
- Pas de mapping vers domaines parents

**Code actuel (simplifié):**
```typescript
getLinuxDistro(): string | null {
  try {
    const data = fs.readFileSync('/etc/os-release', 'utf-8');
    const idMatch = data.match(/^ID=(.+)$/m);
    if (idMatch?.[1]) {
      return idMatch[1].replace(/"/g, '').toLowerCase();
    }
  } catch {
    return null;
  }
  return null;
}
```

**Amélioration suggérée:**

```typescript
getLinuxDistro(): string | null {
  try {
    // 1. Try /etc/os-release (standard)
    const data = fs.readFileSync('/etc/os-release', 'utf-8');

    // Get ID and ID_LIKE (for derivatives)
    const idMatch = data.match(/^ID=(.+)$/m);
    const idLikeMatch = data.match(/^ID_LIKE=(.+)$/m);

    if (idMatch?.[1]) {
      const id = idMatch[1].replace(/"/g, '').toLowerCase();

      // Direct mapping for derivatives
      const derivatives: Record<string, string> = {
        'pop': 'ubuntu',        // Pop!_OS → Ubuntu
        'linuxmint': 'ubuntu',  // Linux Mint → Ubuntu
        'zorin': 'ubuntu',      // Zorin → Ubuntu
        'elementary': 'ubuntu', // Elementary → Ubuntu
        'neon': 'ubuntu',       // KDE Neon → Ubuntu
        'manjaro': 'arch',      // Manjaro → Arch
        'endeavouros': 'arch',  // EndeavourOS → Arch
        'garuda': 'arch',       // Garuda → Arch
      };

      // Check if it's a known derivative
      if (derivatives[id]) {
        log.info(`Detected ${id} (derivative of ${derivatives[id]})`);
        return derivatives[id];
      }

      // If ID_LIKE exists, use it (e.g., "ubuntu debian")
      if (idLikeMatch?.[1]) {
        const idLike = idLikeMatch[1].replace(/"/g, '').toLowerCase();
        const likes = idLike.split(' ');

        // Check if any parent is supported
        for (const like of likes) {
          if (['debian', 'ubuntu', 'fedora', 'arch', 'suse'].includes(like)) {
            log.info(`Detected ${id} (based on ${like})`);
            return like;
          }
        }
      }

      return id;
    }
  } catch {
    // Fallback: try lsb_release command
    try {
      const result = execSync('lsb_release -is', { encoding: 'utf-8' });
      return result.trim().toLowerCase();
    } catch {
      return null;
    }
  }

  return null;
}
```

**Tests à faire:**
- Ubuntu → détecte "ubuntu"
- Pop!_OS → détecte "ubuntu" (via mapping)
- Manjaro → détecte "arch" (via mapping)
- Debian → détecte "debian"
- Unknown distro avec ID_LIKE=debian → détecte "debian"

**Bénéfices:**
- Support des distros dérivées populaires
- Fallback robuste si `/etc/os-release` manquant
- Meilleur mapping vers package managers existants

---

## 🟢 Version 1.2 - BACKLOG (~6h)

### 3. Tests unitaires
**Priorité:** BASSE
**Temps estimé:** 2-3h

**Description:**
Les scripts de test existent dans `package.json` mais aucun test implémenté :
```json
"test:unit": "bun test tests/unit",
"test:integration": "bun test tests/integration",
"test": "bun test"
```

**Tests critiques à créer:**

#### A. `tests/unit/lib/file.test.ts`
```typescript
// Test expandPath
describe('FileLib.expandPath', () => {
  test('converts __home__/ to absolute path', () => {
    const result = FileLib.expandPath('__home__/.zshrc');
    expect(result).toBe('/home/testuser/.zshrc');
  });

  test('converts ~/ to absolute path (legacy)', () => {
    const result = FileLib.expandPath('~/.zshrc');
    expect(result).toBe('/home/testuser/.zshrc');
  });

  test('keeps absolute paths unchanged', () => {
    const result = FileLib.expandPath('/etc/config');
    expect(result).toBe('/etc/config');
  });
});

// Test getDisplayPath
describe('FileLib.getDisplayPath', () => {
  test('converts /home/user to __home__', () => {
    const result = FileLib.getDisplayPath('/home/testuser/.zshrc');
    expect(result).toBe('__home__/.zshrc');
  });

  test('keeps non-home paths unchanged', () => {
    const result = FileLib.getDisplayPath('/etc/config');
    expect(result).toBe('/etc/config');
  });
});

// Test safeSymlink
describe('FileLib.safeSymlink', () => {
  test('creates backup before symlinking', async () => {
    // TODO: Mock fs operations
  });

  test('skips if symlink already correct', async () => {
    // TODO: Mock fs operations
  });
});
```

#### B. `tests/unit/lib/git.test.ts`
```typescript
describe('GitLib.validateGitUrl', () => {
  test('accepts SSH format git@github.com:user/repo.git', () => {
    expect(GitLib.validateGitUrl('git@github.com:user/repo.git')).toBe(true);
  });

  test('rejects HTTPS format', () => {
    expect(GitLib.validateGitUrl('https://github.com/user/repo.git')).toBe(false);
  });

  test('rejects invalid URLs', () => {
    expect(GitLib.validateGitUrl('not-a-git-url')).toBe(false);
  });
});

describe('GitLib.extractRepoInfoFromUrl', () => {
  test('extracts owner and repo from SSH URL', () => {
    const result = GitLib.extractRepoInfoFromUrl('git@github.com:plvo/dotsx.git');
    expect(result).toEqual({ owner: 'plvo', repo: 'dotsx' });
  });

  test('returns null for invalid URL', () => {
    const result = GitLib.extractRepoInfoFromUrl('invalid-url');
    expect(result).toBeNull();
  });
});
```

#### C. `tests/integration/symlink.test.ts`
```typescript
// Test full symlink workflow
describe('Symlink integration', () => {
  test('creates symlink and backup', async () => {
    // TODO: Setup test environment
    // TODO: Create test file
    // TODO: Run symlinkCommand.addLink()
    // TODO: Verify symlink created
    // TODO: Verify backup created
    // TODO: Cleanup
  });
});
```

**Setup requis:**
```bash
bun add -D @types/bun-test
```

**Bénéfices:**
- Détecte régressions
- Documente comportement attendu
- Facilite refacto future

---

### 4. README.md utilisateur
**Priorité:** BASSE
**Temps estimé:** 1h

**Description:**
Créer documentation complète pour les utilisateurs.

**Structure suggérée:**

```markdown
# 🚀 DotsX - Dotfiles Manager

Centralize and version your dotfiles on GitHub with symlinks.

## ✨ Features

- 📦 **Multi-platform**: Linux (Debian, Arch, Fedora, etc.), macOS
- 🔗 **Symlink management**: Automatic backup + restore
- 🔧 **Git integration**: Atomic sync, SSH-only
- 💻 **IDE configs**: VSCode, Cursor
- ��️ **Terminal configs**: ZSH, Bash, TMUX
- 📋 **Package managers**: apt, snap, flatpak, dnf, pacman, yay, brew
- 🩺 **Health check**: `dotsx doctor` for diagnostics

## 🛠️ Installation

### Prerequisites
- Git
- Bun runtime

### Install
\`\`\`bash
git clone https://github.com/user/dotsx.git
cd dotsx
bun install
bun run build
sudo ln -s $(pwd)/dotsx /usr/local/bin/dotsx
\`\`\`

## 🚀 Quick Start

### 1. Initialize from scratch
\`\`\`bash
dotsx
# Choose: 🌱 From scratch
# Select terminals, IDEs to configure
\`\`\`

### 2. Initialize from existing GitHub repo
\`\`\`bash
dotsx
# Choose: 🔧 From Git
# Enter: git@github.com:username/dotsx-config.git
\`\`\`

### 3. Run diagnostics
\`\`\`bash
dotsx
# Choose: 🩺 Doctor
# Review + auto-fix issues
\`\`\`

## 📖 Common Workflows

### Sync changes to GitHub
\`\`\`bash
dotsx → 🔧 Git → 🔄 Sync
# Atomic: add + commit + push
\`\`\`

### Pull from another machine
\`\`\`bash
dotsx → 🔧 Git → 📥 Pull
# Auto-validates structure + symlinks
\`\`\`

### Add new symlink
\`\`\`bash
dotsx → 📋 Symlinks → ➕ Add new link
# Enter: ~/.config/myapp/config.yml
# Creates: ~/.dotsx/symlinks/__home__/.config/myapp/config.yml
\`\`\`

### Install packages from list
\`\`\`bash
dotsx → 📦 ubuntu packages → apt
# Select packages to install
\`\`\`

## 🗂️ Directory Structure

\`\`\`
~/.dotsx/
  ├── bin/                    # Executable scripts
  │   ├── my-script.sh
  │   └── _dotsx-bin.aliases  # Auto-generated aliases
  ├── ide/
  │   ├── vscode/
  │   └── cursor/
  ├── terminal/
  │   ├── zsh/
  │   ├── bash/
  │   └── tmux/
  ├── os/
  │   └── debian/
  │       ├── apt.txt         # Package lists
  │       ├── snap.txt
  │       └── flatpak.txt
  └── symlinks/
      └── __home__/           # User-agnostic notation
          ├── .zshrc
          └── .config/
              └── Code/
                  └── User/
                      └── settings.json

~/.backup.dotsx/              # Automatic backups (7 per file)
  └── symlinks/
      └── __home__/
          └── .zshrc.20250930123456.dotsx.backup
\`\`\`

## 🩺 Doctor Command

Run full diagnostics:
\`\`\`bash
dotsx → 🩺 Doctor
\`\`\`

Checks:
- ✅ System info
- ✅ Directory structure
- ✅ Git repository status
- ✅ All domain configurations
- ✅ Symlinks validity
- 🔧 Auto-fix available issues

## 🔧 Troubleshooting

### Symlink broken after pull
\`\`\`bash
dotsx → 🩺 Doctor
# Review broken symlinks
# Accept auto-fix
\`\`\`

### Git conflict
\`\`\`bash
# Resolve manually
git add .
git commit
dotsx → 🩺 Doctor  # Validate
\`\`\`

### Package manager config missing
\`\`\`bash
dotsx → 🩺 Doctor
# Auto-creates missing configs
\`\`\`

## 📝 Configuration

### Add custom OS domain
Edit `src/domains/os.ts`:
\`\`\`typescript
export const myDistro: Domain = {
  name: 'mydistro',
  distro: ['mydistro'],
  type: 'os',
  packageManagers: {
    mypkg: {
      configPath: DOTSX.OS.MYDISTRO.PKG,
      install: 'mypkg install %s',
      remove: 'mypkg remove %s',
      status: 'mypkg list | grep %s',
      defaultContent: '# Packages\\n',
    },
  },
};
\`\`\`

## 🤝 Contributing

Contributions welcome! See CONTRIBUTING.md

## 📄 License

MIT License
\`\`\`

**Fichier à créer:** `/README.md` (root)

---

### 5. Support Fish shell
**Priorité:** BASSE
**Temps estimé:** 10 min

**Fichiers concernés:**
- `src/domains/terminal.ts`

**Description:**
Le code détecte Fish shell dans `SystemLib.detectShell()` mais il n'y a pas de domain Fish.

**Implémentation:**

```typescript
// src/domains/terminal.ts

export const fishDomain: Domain = {
  name: 'fish',
  type: 'terminal',
  distro: null,
  symlinkPaths: {
    linux: ['~/.config/fish/config.fish', '~/.config/fish/functions'],
    macos: ['~/.config/fish/config.fish', '~/.config/fish/functions'],
  },
};

// Ajouter à l'export en bas du fichier
```

**Tests à faire:**
- Utilisateur avec Fish → init détecte Fish
- Symlinks créés vers `~/.config/fish/config.fish`

---

### 6. Meilleure gestion erreurs
**Priorité:** BASSE
**Temps estimé:** 1-2h

**Description:**
Améliorer les messages d'erreur et le logging.

**Implémentations suggérées:**

#### A. Codes d'erreur structurés
```typescript
// src/lib/errors.ts (nouveau fichier)

export enum DotsxErrorCode {
  GIT_NOT_INSTALLED = 'GIT_NOT_INSTALLED',
  GIT_REMOTE_NOT_FOUND = 'GIT_REMOTE_NOT_FOUND',
  SYMLINK_SOURCE_NOT_FOUND = 'SYMLINK_SOURCE_NOT_FOUND',
  BACKUP_FAILED = 'BACKUP_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export class DotsxError extends Error {
  constructor(
    public code: DotsxErrorCode,
    message: string,
    public suggestion?: string,
  ) {
    super(message);
    this.name = 'DotsxError';
  }
}

// Usage:
throw new DotsxError(
  DotsxErrorCode.GIT_NOT_INSTALLED,
  'Git is not installed',
  'Install git: sudo apt install git'
);
```

#### B. Mode debug avec stack traces
```typescript
// src/lib/logger.ts (nouveau fichier)

export const logger = {
  debug(message: string) {
    if (process.env.DOTSX_DEBUG === '1') {
      console.log(`[DEBUG] ${message}`);
    }
  },

  error(error: Error) {
    log.error(error.message);

    if (process.env.DOTSX_DEBUG === '1') {
      console.error(error.stack);
    }
  },
};

// Usage:
try {
  await dangerousOperation();
} catch (error) {
  logger.error(error);
}
```

**Variable d'environnement:**
```bash
DOTSX_DEBUG=1 dotsx  # Affiche stack traces
```

---

## 📊 Résumé des priorités

| Version | Items | Temps total | Status |
|---------|-------|-------------|--------|
| v1.0 | 6 | - | ✅ 100% |
| v1.1 | 2 | ~50 min | ⏳ 0% |
| v1.2 | 4 | ~6h | 📋 Backlog |

---

## 🎯 Prochaines étapes recommandées

1. **Court terme (1h)** : Finir v1.1
   - Backup quotidien automatique
   - Améliorer détection distro

2. **Moyen terme (3-4h)** : Tests unitaires de base
   - FileLib tests
   - GitLib tests

3. **Long terme (6h+)** : v1.2 complète
   - README complet
   - Support Fish
   - Gestion erreurs avancée

---

## 💡 Idées futures (non planifiées)

- Commande `dotsx migrate` pour changer de machine
- Support Windows (WSL + PowerShell)
- Interface web pour gérer configs
- Plugin system pour domaines custom
- Export/import de configs sans Git
- Chiffrement des configs sensibles
- Commande `dotsx diff` pour comparer machines
- Support Nix package manager
- Auto-update checker

---

**Note:** Ce fichier est maintenu à jour après chaque release. Dernière mise à jour : v1.0 (2025-09-30)