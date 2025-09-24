import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { ConsoleLib } from '../../../src/lib/console';

describe('ConsoleLib', () => {
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('logListWithTitle', () => {
    test('should log title with count and items', () => {
      const title = 'Test Items';
      const list = ['item1', 'item2', 'item3'];

      ConsoleLib.logListWithTitle(title, list);

      expect(consoleSpy).toHaveBeenCalledWith('\nTest Items (3):');
      expect(consoleSpy).toHaveBeenCalledWith('   item1');
      expect(consoleSpy).toHaveBeenCalledWith('   item2');
      expect(consoleSpy).toHaveBeenCalledWith('   item3');
      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    test('should handle empty list', () => {
      const title = 'Empty List';
      const list: string[] = [];

      ConsoleLib.logListWithTitle(title, list);

      expect(consoleSpy).toHaveBeenCalledWith('\nEmpty List (0):');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle single item list', () => {
      const title = 'Single Item';
      const list = ['only-item'];

      ConsoleLib.logListWithTitle(title, list);

      expect(consoleSpy).toHaveBeenCalledWith('\nSingle Item (1):');
      expect(consoleSpy).toHaveBeenCalledWith('   only-item');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });

    test('should handle list with special characters', () => {
      const title = 'Special Characters';
      const list = ['item-with-dashes', 'item_with_underscores', 'item.with.dots'];

      ConsoleLib.logListWithTitle(title, list);

      expect(consoleSpy).toHaveBeenCalledWith('\nSpecial Characters (3):');
      expect(consoleSpy).toHaveBeenCalledWith('   item-with-dashes');
      expect(consoleSpy).toHaveBeenCalledWith('   item_with_underscores');
      expect(consoleSpy).toHaveBeenCalledWith('   item.with.dots');
    });
  });
});
