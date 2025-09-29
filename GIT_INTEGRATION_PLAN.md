# Git Integration Plan for DotsX CLI

## Overview

This document outlines the comprehensive plan for integrating Git functionality into the DotsX CLI tool, enabling users to manage their dotfiles configurations through Git repositories for seamless synchronization across multiple machines.

## Current Architecture Analysis

### Existing Structure
- **Entry Point**: `src/index.ts` - Interactive CLI with initialization flow
- **Command Pattern**: `src/commands/` - Modular command architecture
- **Libraries**: `src/lib/` - Shared utilities (file, system, console)
- **Constants**: `src/lib/constants.ts` - Defines DOTSX directory structure
- **Type Safety**: TypeScript with custom types in `src/types/`

### Key Patterns Observed
- Uses `@clack/prompts` for interactive CLI experience
- File operations abstracted through `FileLib`
- System information through `SystemLib` 
- Modular command architecture with `execute()` methods
- Console display logic centralized in `ConsoleLib`

## Git Integration Strategy

### Core Components to Implement

#### 1. Git Library (`src/lib/git.ts`)
**Purpose**: Centralize all Git operations and status checking

**Key Functions**:
- `cloneRepository(url: string, targetPath: string)`: Clone repo to ~/.dotsx
- `getRepositoryInfo(path: string)`: Get repo name, remote URL, current branch
- `getLastCommit(path: string)`: Get latest commit hash and message
- `checkUpToDate(path: string)`: Compare local vs remote status
- `initRepository(path: string)`: Initialize new Git repository
- `addRemote(path: string, remoteName: string, url: string)`: Add remote origin
- `pushToRemote(path: string, branch?: string)`: Push changes to remote
- `isGitRepository(path: string)`: Check if directory is Git repo
- `validateDotsxStructure(path: string)`: Verify cloned repo has expected directories

#### 2. Git Command (`src/commands/git.ts`)
**Purpose**: Handle Git-specific CLI interactions

**Features**:
- Repository initialization for existing manual setups
- Remote configuration management
- Push/pull operations
- Repository status display

#### 3. Git Initialization Command (`src/commands/git-init.ts`)
**Purpose**: Handle Git-based initialization flow

**Features**:
- Repository URL input validation
- Clone operation with progress feedback
- Post-clone directory structure validation
- Missing directory creation prompts

## Implementation Plan

### Phase 1: Core Git Library
```
✅ Create GitLib with basic Git operations
✅ Add repository detection and validation
✅ Implement directory structure checking
✅ Add error handling for Git operations
```

### Phase 2: Git-based Initialization  
```
✅ Implement git-init command
✅ Add URL input validation and prompts
✅ Clone repository to ~/.dotsx
✅ Validate cloned structure against DOTSX constants
✅ Handle missing directories (prompt user to create)
✅ Integrate with existing initialization flow
```

### Phase 3: Console Git Information Display
```
✅ Extend ConsoleLib.displayInfo() with Git section
✅ Show repository name, last commit, branch
✅ Display sync status (up-to-date, ahead, behind)
✅ Handle cases where Git is not initialized
```

### Phase 4: Git Integration for Manual Setups
```
✅ Add Git integration option to main menu
✅ Repository initialization workflow
✅ Remote repository creation guidance
✅ Initial commit and push functionality
```

## Technical Considerations

### Git Operations
- Use `child_process.exec()` for Git commands (consistent with existing patterns)
- Implement proper error handling for network issues, auth failures
- Add timeout handling for clone operations
- Support both HTTPS and SSH repository URLs

### Directory Structure Validation
Based on `DOTSX` constants, validate presence of:
- `bin/` directory
- `ide/` directory (cursor, vscode subdirs)
- `os/` directory (distro-specific subdirs)
- `terminal/` directory (zsh, bash, tmux subdirs)
- `symlinks/` directory

### Error Handling Scenarios
- Git not installed on system
- Invalid repository URLs
- Network connectivity issues
- Authentication failures
- Incomplete repository structures
- Merge conflicts during sync

### Configuration Management
- Store Git configuration in `~/.dotsx/.git/`
- Add Git metadata to DotsX state tracking
- Handle repository migration scenarios

## User Experience Flows

### Flow 1: Initialize from Git Repository
```
1. User selects "🔧 From Git" during initialization
2. System prompts for repository URL
3. Validate URL format and accessibility
4. Clone repository to ~/.dotsx
5. Validate directory structure
6. Prompt for missing directories creation
7. Complete initialization with Git tracking enabled
```

### Flow 2: Git Integration for Existing Setup
```
1. User accesses main menu after manual initialization
2. New option: "🔧 Git Integration"
3. Sub-menu options:
   - Initialize Git repository
   - Add remote repository
   - Push to remote
   - Repository status
```

### Flow 3: Enhanced Information Display
```
System Info:
🖥️  Ubuntu 22.04 (linux x64)
💾 RAM: 16GB
📄 ~/.zshrc (zsh)

DotsX Status:
✅ Bin ✅ IDE ✅ OS ✅ Terminal

Git Repository:
📦 origin: user/dotsx-config
🌿 branch: main
📝 last commit: "Update terminal configs" (2 hours ago)
🔄 status: up-to-date
```

## Integration Points

### Existing Code Modifications

#### `src/index.ts`
- Implement the existing "git" initialization option
- Add Git integration to main menu for initialized setups

#### `src/lib/console.ts`
- Extend `displayInfo()` with Git information section
- Add Git status formatting utilities

#### `src/lib/system.ts`
- Add Git installation detection to system checks
- Include Git information in DotsX state tracking

## Security Considerations

- Validate repository URLs to prevent command injection
- Handle authentication securely (rely on user's Git config)
- Avoid storing credentials in DotsX configuration
- Sanitize Git command outputs before display

## Dependencies

### Required System Dependencies
- Git (validate installation before operations)
- Network connectivity for clone/push operations

### Node.js Dependencies
- No additional dependencies required (use existing `child_process`)
- Leverage existing `@clack/prompts` for Git URL input

## Success Metrics

- Users can successfully initialize DotsX from Git repositories
- Existing manual setups can be migrated to Git tracking
- Git information is clearly displayed in system info
- Repository structure validation prevents configuration errors
- Error handling provides clear feedback for troubleshooting

## Future Enhancements

- Automatic backup creation before Git operations
- Branch management and switching capabilities
- Conflict resolution workflows
- Multi-repository support for different configuration sets
- Integration with GitHub/GitLab APIs for repository creation