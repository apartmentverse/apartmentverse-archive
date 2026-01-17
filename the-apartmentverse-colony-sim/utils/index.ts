/**
 * Utils Barrel Export
 *
 * WHY BARREL EXPORTS:
 * Instead of importing from specific files:
 *   import { clamp } from '../utils/validation';
 *
 * You can import from the index:
 *   import { clamp } from '../utils';
 *
 * Benefits:
 * 1. Cleaner imports
 * 2. Easy to refactor internal file structure
 * 3. Single point to see all available utilities
 */

export * from './validation';
