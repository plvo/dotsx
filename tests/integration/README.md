# DotsX Integration Tests

This directory contains integration tests that test the actual functionality of DotsX CLI commands with real file operations in isolated environments.

## Overview

Integration tests are organized into 3 tiers:

### Tier 1: File System Integration Tests ✅ (Implemented)
- **Location**: `filesystem/`
- **Purpose**: Test actual file operations (create, copy, symlink) in isolated temporary directories
- **Safety**: Completely safe - uses temporary directories with overridden `DOTSX_PATH`
- **Examples**: Directory creation, file operations, symlink management

### Tier 2: CLI Workflow Integration Tests ✅ (Implemented)
- **Location**: `commands/`
- **Purpose**: Test end-to-end CLI command workflows with real file operations
- **Safety**: Safe - mocks dangerous operations (package installs) but tests real file operations
- **Examples**: Full init workflow, package management workflow, link command workflow

### Tier 3: System Integration Tests 🚧 (Planned)
- **Location**: `system/` (future)
- **Purpose**: Test actual system operations (package managers, etc.)
- **Safety**: High risk - requires containerization or dedicated test environments

## Test Environment

### Isolation Strategy
- Uses temporary directories created with `mkdtemp()`
- Overrides `DOTSX_PATH` environment variable to point to test directory
- Overrides `HOME` environment variable for path expansion testing
- All tests clean up after themselves automatically

### Test Utilities
- **`setup/test-environment.ts`**: Provides isolated test environments
- **`setup/test-fixtures.ts`**: Creates sample configurations and test data
- **`withIntegrationEnvironment()`**: Utility function for easy test setup

## Running Tests

```bash
# Run all integration tests
bun run test:integration

# Run integration tests with watch mode
bun run test:integration:watch

# Run both unit and integration tests
bun run test:all

# Run specific integration test file
bun test tests/integration/filesystem/directory-creation.test.ts
```

## Test Structure

```
tests/integration/
├── setup/
│   ├── test-environment.ts     # Test environment isolation
│   └── test-fixtures.ts        # Sample data and configs
├── filesystem/
│   └── directory-creation.test.ts  # File system operations
├── commands/
│   └── init-integration.test.ts    # CLI command workflows
└── workflows/                      # (planned) Cross-command integration
```

## Writing Integration Tests

### Basic Pattern

```typescript
import { withIntegrationEnvironment } from '../setup/test-environment';

test('should test something with real files', async () => {
  await withIntegrationEnvironment(async ({ dotsxPath, systemConfigDir }) => {
    // Test code here - real file operations in isolated environment
    // dotsxPath points to temporary ~/.dotsx directory
    // All operations are isolated and cleaned up automatically
  });
});
```

### Using Test Fixtures

```typescript
import { TestFixtures } from '../setup/test-fixtures';

test('should test with sample data', async () => {
  await withIntegrationEnvironment(async ({ dotsxPath }) => {
    const fixtures = new TestFixtures();

    // Create complete dotsx structure with sample files
    await fixtures.createCompleteDotsxStructure(dotsxPath);

    // Test operations...
  });
});
```

### Testing CLI Commands

```typescript
import { mock, spyOn } from 'bun:test';

// Mock interactive prompts
const mockSelect = mock(() => 'debian');
mock.module('@clack/prompts', () => ({ select: mockSelect }));

// Mock dangerous operations but allow file operations
const mockExecSync = mock(() => '');
mock.module('node:child_process', () => ({ execSync: mockExecSync }));

test('should test CLI command', async () => {
  await withIntegrationEnvironment(async ({ dotsxPath }) => {
    // Import command after environment setup (important!)
    const { initCommand } = await import('../../../src/commands/init');

    // Setup mocks and spies
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Execute command
    await initCommand.execute();

    // Verify results with real file system checks
    expect(existsSync(dotsxPath)).toBe(true);

    // Cleanup
    consoleSpy.mockRestore();
  });
});
```

## Important Notes

### Module Import Order
Always import modules **after** setting up the test environment to ensure environment variable overrides take effect:

```typescript
// ✅ Good - import after environment setup
await withIntegrationEnvironment(async ({ dotsxPath }) => {
  const { initCommand } = await import('../../../src/commands/init');
  // ...
});

// ❌ Bad - import before environment setup
const { initCommand } = await import('../../../src/commands/init');
await withIntegrationEnvironment(async ({ dotsxPath }) => {
  // Environment overrides won't affect already-imported constants
});
```

### Mocking Strategy
- **File operations**: Allow real operations in isolated environment
- **User interaction**: Mock `@clack/prompts` for automated testing
- **Dangerous operations**: Mock `execSync` for package installs/removals
- **System calls**: Mock system-specific operations

### Safety Considerations
- Integration tests use completely isolated temporary directories
- No risk of affecting user's actual `~/.dotsx` directory
- All tests clean up automatically, even on failure
- Package installations are mocked to prevent system changes

## Future Enhancements

### Planned Tier 3: System Integration
- Docker-based testing for package manager operations
- Cross-platform testing (different Linux distributions)
- Actual package installation testing (in containers)

### Additional Test Areas
- Performance testing with large dotfile collections
- Concurrent operation testing
- Error recovery and rollback testing
- Backup and restore functionality testing