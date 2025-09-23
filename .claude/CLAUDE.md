# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DotsX is a CLI tool for managing dotfiles built with Bun and TypeScript. It provides an interactive interface for initializing, linking, and managing dotfiles, packages, and bin scripts across different systems.

## Commands

### Development
- `bun run dev` - Run the application in development mode
- `bun run build` - Build the production binary (`dotsx`)
- `bun run prepublishOnly` - Build and make executable for publishing

### Code Quality
- `bun run lint` - Run Biome linter with auto-fixes
- `bun run format` - Format code with Biome
- `bun run check` - Check code without fixes

## Architecture

### Core Structure
The application follows a command-based architecture with modular components:

- **Entry Point**: `src/index.ts` - Interactive CLI with @clack/prompts
- **Commands**: `src/commands/` - Each major feature as separate command modules
  - `init.ts` - Initialize ~/.dotsx directory structure
  - `link.ts` - Manage symlinks between dotfiles and system locations
  - `bin.ts` - Manage executable scripts and aliases
  - `package/` - Package management (APT, Snap) for different distros
- **Libraries**: `src/lib/` - Shared utilities
  - `file.ts` - File system operations and utilities
  - `system.ts` - System information and shell detection
  - `constants.ts` - Path constants for ~/.dotsx structure

### Key Concepts

**Dotfiles Structure**: The tool manages a `~/.dotsx` directory with:
- `core/` - OS-specific configurations
- `terminal/` - Shell configurations (.zshrc, .bashrc, .tmux.conf)
- `ide/` - IDE settings (Cursor, VSCode)
- `bin/` - Executable scripts with alias management
- `links/` - Symlinked files and directories

**File Operations**: All file operations go through `FileLib` which provides safe symlink creation, directory copying, and executable management.

**System Detection**: `SystemLib` detects OS, shell, and provides system information display.

## TypeScript Configuration

- Uses path aliases: `@/*` maps to `./src/*`
- Bundler module resolution for Bun compatibility
- Strict TypeScript settings enabled
- Global types defined in `src/types/types.d.ts`

## Development Notes

- Uses Biome for linting/formatting with custom rules
- Console.log is allowed for CLI output
- Template files in `templates/` directory provide initial configurations
- The CLI tool becomes a single executable binary `dotsx` when built