/**
 * Theme types and utilities
 */

import * as colorsModule from './colors';
import * as componentsModule from './components';

// Re-export module name type
export type ModuleName = colorsModule.ModuleName;

// Type for module theme
export interface ModuleTheme {
  name: ModuleName;
  colors: ReturnType<typeof colorsModule.getModuleColors>;
  components: ReturnType<typeof componentsModule.getModuleComponentStyles>;
}

// Create module-specific theme
export const createModuleTheme = (moduleName: ModuleName): ModuleTheme => ({
  name: moduleName,
  colors: colorsModule.getModuleColors(moduleName),
  components: componentsModule.getModuleComponentStyles(moduleName),
});
