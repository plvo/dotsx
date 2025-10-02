# 📋 TODO List - DotsX

## 🔄 ARCHITECTURE REFACTORING - IN PROGRESS

### ✅ Completed Refactoring (v1.5)

- [x] **OS-based structure**: Migrated from domain-based (`ide/`, `terminal/`, `os/`) to OS-first structure (`~/.dotsx/<os>/{bin,symlinks,packages}`)
- [x] **DotsxOsPath interface**: New unified path resolver replacing old nested domain paths
- [x] **Suggestion system**: Declarative metadata for detecting tools (replaced hardcoded domains)
- [x] **Backup system**: `src/lib/backup.ts` with daily backup logic + metadata tracking
- [x] **SymlinkLib namespace**: Centralized symlink operations in `src/lib/symlink.ts`
- [x] **Commands refactored**:
  - [x] `init` - Uses new suggestion system + DotsxOsPath
  - [x] `bin` - Adapted to OS-based structure
  - [x] `git` - Updated to work with new structure
  - [x] `symlink` - Fully migrated with enhanced features (see below)

### ✅ Completed - Command Migration (v1.5)

**Priority: HIGH** | **Time: 2-3h** | **Status: COMPLETED**

#### 1. Migrate `symlink` command ✅
**Status:** ✅ COMPLETED
**Files:** `src/commands/symlink.ts`

**Completed changes:**
- ✅ Removed `@/old/constants` import
- ✅ Now receives `dotsxOsPath` as parameter from `index.ts`
- ✅ Uses `SymlinkLib.safeSymlink()` instead of old `FileLib.safeSymlink()`
- ✅ Replaced `getDotsxPath()` with centralized `FileLib.toDotsxPath()` helper
- ✅ Enhanced `getSymlinks()` with directory symlink detection (heuristic-based)
- ✅ Added `isDirSymlinkCandidate()` to detect if directory should be symlinked
- ✅ Added "Manage suggestions" option to add IDE/terminal configs
- ✅ Integrated with `SuggestionLib` for centralized suggestion handling
- ✅ Filters already-configured paths from suggestions
- ✅ Fixed sync to handle missing system paths (recreate from dotsx content)

**Key improvements:**
1. **Directory symlink detection**: Distinguishes between directory symlinks and container directories
2. **Suggestion filtering**: Shows only unconfigured paths in suggestions menu
3. **Sync resilience**: Can recreate symlinks when system files deleted but dotsx has content
4. **Centralized helpers**: Uses `FileLib.toDotsxPath()` and `SuggestionLib.buildGroupedOptions()`

---

#### 2. Create `check` command
**Status:** MISSING (partially exists in git pull)
**Files:** Create `src/commands/check.ts`

**Purpose:** Standalone command to validate symlink integrity

**Implementation:**
```typescript
export const checkCommand = {
  async execute(dotsxOsPath: DotsxOsPath) {
    log.info('🔍 Checking symlink integrity...');

    const links = await symlinkCommand.checkStatus();

    if (links.incorrectSymlinks.length === 0) {
      log.success('✅ All symlinks are valid');
      return;
    }

    const shouldRepair = await confirm({
      message: `Fix ${links.incorrectSymlinks.length} broken symlink(s)?`,
      initialValue: true,
    });

    if (shouldRepair) {
      await symlinkCommand.syncLinks(links);
    }
  },
};
```

**Integration:**
- Add to main CLI menu
- Called automatically after `git pull`
- Can be run standalone for diagnostics

---

### 🔴 Critical Cleanup Tasks

#### 4. Remove old constants file
**Status:** PENDING
**Files:** `src/old/constants.ts`

**Action:**
- Once `symlink` command is migrated → delete `src/old/constants.ts`
- Verify no other files import from `@/old/constants`

**Verification:**
```bash
grep -r "@/old/constants" src/
```

---

#### 5. Consolidate FileLib/SymlinkLib
**Status:** PARTIAL DUPLICATION
**Files:** `src/lib/file.ts`, `src/lib/symlink.ts`

**Current state:**
- `FileLib` has symlink-related methods (legacy)
- `SymlinkLib` has new centralized symlink logic

**Action:**
1. Move ALL symlink logic to `SymlinkLib`
2. Remove from `FileLib`:
   - `safeSymlink()`
   - `isSymLinkContentCorrect()`
   - Any symlink-specific helpers
3. Update imports across codebase

---

## 🟢 Version 2.0 - Post-Refactoring Features

### 6. Improve Linux distro detection
**Priority:** MEDIUM
**Time:** 30 min
**Files:** `src/lib/system.ts`

**Current issues:**
- Only reads `/etc/os-release` ID field
- No support for derivatives (Pop!_OS, Manjaro, etc.)
- No fallback mechanism

**Enhancement:**
```typescript
getLinuxDistro(): string | null {
  // 1. Check /etc/os-release for ID and ID_LIKE
  // 2. Map derivatives:
  //    - pop, linuxmint, zorin, elementary → ubuntu
  //    - manjaro, endeavouros, garuda → arch
  // 3. Fallback to lsb_release command
  // 4. Return parent distro for unsupported derivatives
}
```

**Benefits:**
- Better multi-distro support
- Maps to existing package manager configs
- More robust detection

---

### 7. Add Fish shell suggestion
**Priority:** LOW
**Time:** 10 min
**Files:** `src/suggestions.ts`

**Implementation:**
```typescript
const fishSuggestion: Suggestion = {
  name: 'fish',
  type: 'terminal',
  hint: 'Fish shell is not installed',
  pathsToCheck: {
    linux: ['~/.config/fish/config.fish', '~/.config/fish/functions'],
    macos: ['~/.config/fish/config.fish', '~/.config/fish/functions'],
  },
};
```

**Action:**
- Add to `suggestions.ts`
- Export in suggestions object
- Test detection on Fish installations

---

### 8. Migration command for old structure
**Priority:** MEDIUM
**Time:** 1-2h
**Files:** Create `src/commands/migrate.ts`

**Purpose:** Help users migrate from old domain-based structure to new OS-based

**Logic:**
```typescript
export const migrateCommand = {
  async execute() {
    // 1. Detect old structure (~/.dotsx/ide/, ~/.dotsx/terminal/, etc.)
    // 2. Determine current OS
    // 3. Create new structure (~/.dotsx/<os>/)
    // 4. Move symlinks:
    //    - ide/vscode/* → <os>/symlinks/__home__/.config/Code/
    //    - terminal/zsh/* → <os>/symlinks/__home__/.zshrc
    // 5. Move package configs:
    //    - os/debian/apt.txt → <os>/packages/dotsx.packages.json (merged)
    // 6. Keep bin/ as-is (already correct location)
    // 7. Backup old structure to ~/.dotsx.old/
    // 8. Recreate all symlinks
  },
};
```

**Benefits:**
- Smooth transition for existing users
- Preserves all configs and history
- Automatic validation after migration

---

### 9. Enhanced backup validation
**Priority:** LOW
**Time:** 30 min
**Files:** `src/lib/backup.ts`

**Enhancements:**
1. Add `BackupLib.validateBackups()` - scan for corrupted backups
2. Add `BackupLib.listBackups(path)` - show backup history for file
3. Add `BackupLib.restoreBackup(path, timestamp)` - manual restore

**CLI integration:**
```bash
dotsx backup
  → List all backups
  → Restore specific backup
  → Validate backup integrity
```

---

## 🧪 Testing & Documentation

### 10. Unit tests for new architecture
**Priority:** HIGH
**Time:** 3-4h
**Files:** `tests/unit/lib/*.test.ts`

**Critical tests:**

#### A. `tests/unit/lib/constants.test.ts`
```typescript
describe('resolveDotsxOsPath', () => {
  test('resolves debian paths correctly', () => {
    const paths = resolveDotsxOsPath('debian');
    expect(paths.baseOs).toBe('/home/user/.dotsx/debian');
    expect(paths.symlinks).toBe('/home/user/.dotsx/debian/symlinks');
  });

  test('resolves arch paths correctly', () => {
    const paths = resolveDotsxOsPath('arch');
    expect(paths.packagesManager).toBe('/home/user/.dotsx/arch/packages');
  });
});
```

#### B. `tests/unit/suggestions.test.ts`
```typescript
describe('getSuggestionsByOs', () => {
  test('returns linux suggestions', () => {
    const suggestions = getSuggestionsByOs('linux');
    expect(suggestions.map(s => s.name)).toContain('vscode');
    expect(suggestions.map(s => s.name)).toContain('zsh');
  });
});

describe('getSuggestionsByType', () => {
  test('filters IDE suggestions', () => {
    const suggestions = getSuggestionsByType('ide');
    expect(suggestions.every(s => s.type === 'ide')).toBe(true);
  });
});
```

#### C. `tests/unit/lib/symlink.test.ts`
```typescript
describe('SymlinkLib.safeSymlink', () => {
  test('creates backup before symlinking', async () => {
    // Mock fs operations
  });

  test('skips if symlink already correct', async () => {
    // Mock fs operations
  });
});
```

---

### 11. Update CLAUDE.md examples
**Priority:** MEDIUM
**Time:** 30 min
**Files:** `.claude/CLAUDE.md`

**Actions:**
- ✅ Architecture section updated
- ✅ Code interfaces documented
- ✅ Workflows updated
- [ ] Add migration guide for contributors
- [ ] Add troubleshooting for common refactoring issues

---

### 12. Update README.md for users
**Priority:** LOW
**Time:** 1h
**Files:** `README.md`

**Current state:** README still shows old structure

**Required updates:**
1. Update directory structure diagram to show OS-based layout
2. Update quickstart examples
3. Update command examples (especially symlink/packages)
4. Add migration guide from v1.0 to v2.0
5. Update package manager config examples

---

## 📊 Summary

| Category | Items | Time | Status |
|----------|-------|------|--------|
| ✅ Refactoring Complete | 7 | - | 100% |
| 🟡 Command Migration | 2 | 1-2h | 0% |
| 🔴 Critical Cleanup | 2 | 1h | 0% |
| 🟢 Post-Refactoring | 6 | 4-5h | 0% |
| 🧪 Testing & Docs | 3 | 5h | 0% |
| **TOTAL** | **20** | **11-13h** | **35%** |

---

## 🎯 Recommended Execution Order

### Phase 1: Complete Migration (HIGH PRIORITY - 1-2h remaining)
1. ✅ Migrate `symlink` command (COMPLETED with enhancements)
2. ⏳ Create `check` command (partially implemented, needs standalone command)
3. ⏳ Create `packages` command (needs implementation)
4. ⏳ Remove `old/constants.ts` (can be done after check/packages)
5. ⏳ Consolidate FileLib/SymlinkLib (low priority cleanup)

### Phase 2: Polish & Extend (MEDIUM - 3-4h)
6. Improve distro detection
7. Add Fish shell suggestion
8. Create migration command
9. Enhanced backup validation

### Phase 3: Quality & Docs (5-6h)
10. Unit tests for new architecture
11. Update CLAUDE.md
12. Update README.md

---

## 💡 Future Ideas (Not Planned)

- Multi-OS config in single repo (e.g., `~/.dotsx/debian/` + `~/.dotsx/macos/`)
- Web UI for managing configs
- `dotsx diff` - compare configs across machines
- Encrypted configs support (for API keys, etc.)
- Plugin system for custom suggestions
- Windows support (WSL + PowerShell)
- Nix package manager integration
- Auto-update checker

---

**Note:** This TODO reflects the ongoing architecture refactoring (v1.5 → v2.0). Priority is completing command migration before adding new features.
