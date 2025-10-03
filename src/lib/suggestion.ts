import { spinner } from '@clack/prompts';
import { getSuggestionsByOs, type Suggestion } from '@/suggestions';
import { FileLib } from './file';
import type { OsInfo } from './system';

export interface FoundPath {
  suggestedPath: string;
  type: 'file' | 'directory';
}

type ExistingPaths = Record<string, FoundPath[]>;

export namespace SuggestionLib {
  /**
   * Scan system for existing suggested paths based on current OS
   */
  export function getExistingSuggestedPaths(availableSuggestions: Suggestion[], osInfo: OsInfo): ExistingPaths {
    const s = spinner();
    s.start('Checking suggested paths...');

    const existingPaths: ExistingPaths = {};

    try {
      availableSuggestions.forEach((suggestion) => {
        const paths = suggestion.pathsToCheck[osInfo.family];
        if (!paths) return;

        const foundPaths: FoundPath[] = [];

        paths.forEach((suggestedPath) => {
          if (FileLib.isFile(suggestedPath)) {
            foundPaths.push({ suggestedPath, type: 'file' });
          } else if (FileLib.isDirectory(suggestedPath)) {
            foundPaths.push({ suggestedPath, type: 'directory' });
          }
        });

        if (foundPaths.length > 0) {
          existingPaths[suggestion.name] = foundPaths;
        }
      });

      s.stop(
        `Found ${Object.values(existingPaths).flat().length} existing suggested paths based on ${osInfo.family} ${osInfo.distro}`,
      );
      return existingPaths;
    } catch (error) {
      s.stop(`Error checking suggested paths: ${error}`);
      throw error;
    }
  }

  /**
   * Get all suggestions available for current OS
   */
  export function getAvailableSuggestions(osInfo: OsInfo): Suggestion[] {
    return getSuggestionsByOs(osInfo.family);
  }

  /**
   * Get all existing suggested paths for current OS
   */
  export function getAllExistingPaths(osInfo: OsInfo): Record<string, FoundPath[]> {
    const availableSuggestions = getAvailableSuggestions(osInfo);
    return getExistingSuggestedPaths(availableSuggestions, osInfo);
  }

  /**
   * Filter out paths that are already symlinked
   * @param existingPaths - All existing suggested paths
   * @param existingSymlinks - Array of system paths that are already symlinked
   */
  export function filterAlreadySymlinked(existingPaths: ExistingPaths, existingSymlinks: string[]): ExistingPaths {
    const filtered: ExistingPaths = {};

    Object.entries(existingPaths).forEach(([suggestionName, paths]) => {
      const filteredPaths = paths.filter((p) => {
        const expandedPath = FileLib.expand(p.suggestedPath);
        return !existingSymlinks.includes(expandedPath);
      });

      if (filteredPaths.length > 0) {
        filtered[suggestionName] = filteredPaths;
      }
    });

    return filtered;
  }

  /**
   * Build grouped options for groupMultiselect prompt
   * @param existingPaths - Paths grouped by suggestion name
   * @param valueMapper - Optional function to transform the value (default: returns path string)
   */
  export function buildGroupedOptions<T = string>(
    existingPaths: ExistingPaths,
    valueMapper?: (path: FoundPath) => T,
  ): Record<string, Array<{ value: T; label: string }>> {
    const options: Record<string, Array<{ value: T; label: string }>> = {};

    Object.entries(existingPaths).forEach(([suggestionName, paths]) => {
      options[suggestionName] = paths.map((p) => ({
        value: valueMapper ? valueMapper(p) : (p.suggestedPath as T),
        label: p.suggestedPath,
      }));
    });

    return options;
  }
}
