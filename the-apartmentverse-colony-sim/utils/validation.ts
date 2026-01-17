/**
 * Validation & Defensive Programming Utilities
 *
 * WHY THIS FILE EXISTS:
 * When building simulations, bad state can cascade into hard-to-debug issues.
 * These utilities help us:
 * 1. Catch problems early (fail fast)
 * 2. Provide meaningful error messages
 * 3. Recover gracefully when possible
 *
 * DESIGN PRINCIPLE: "Trust but verify"
 * - We trust our own code to provide valid data
 * - But we verify at system boundaries and critical paths
 */

import { Agent, GameState, Artifact, Point, AgentType } from '../types';
import { GRID_W, GRID_H, BALANCE } from '../constants';

// =============================================================================
// VALUE CLAMPING
// =============================================================================

/**
 * Clamps a value between min and max bounds.
 *
 * WHY: JavaScript doesn't prevent numbers from going out of range.
 * Energy at -50 or 150 would break UI displays and game logic.
 *
 * USAGE: Use this whenever modifying needs values.
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

/**
 * Clamps all needs values to valid ranges (0-100).
 *
 * WHY: After multiple operations in a tick, needs might drift out of range.
 * Calling this at the end of each tick ensures consistent state.
 *
 * MUTATES: The agent object directly (for performance in hot path)
 */
export const clampAgentNeeds = (agent: Agent): void => {
    agent.needs.energy = clamp(agent.needs.energy, 0, 100);
    agent.needs.purpose = clamp(agent.needs.purpose, 0, 100);
    agent.needs.connection = clamp(agent.needs.connection, 0, 100);
    agent.needs.stability = clamp(agent.needs.stability, 0, 100);
};

// =============================================================================
// COORDINATE VALIDATION
// =============================================================================

/**
 * Checks if coordinates are within the grid bounds.
 *
 * WHY: Out-of-bounds access to the map array would return undefined,
 * which could cause ZoneType comparisons to fail silently.
 */
export const isValidCoordinate = (x: number, y: number): boolean => {
    return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
};

/**
 * Validates and optionally corrects agent position.
 *
 * WHY: If pathfinding has a bug or an agent gets teleported incorrectly,
 * they could end up outside the map. This catches that.
 *
 * RETURNS: True if position was valid, false if it was corrected.
 */
export const validateAgentPosition = (agent: Agent): boolean => {
    const wasValid = isValidCoordinate(agent.x, agent.y);

    if (!wasValid) {
        // Clamp to valid bounds - this is recovery, not normal operation
        console.warn(`Agent ${agent.name} had invalid position (${agent.x}, ${agent.y}), correcting.`);
        agent.x = clamp(agent.x, 0, GRID_W - 1);
        agent.y = clamp(agent.y, 0, GRID_H - 1);
        agent.path = []; // Clear potentially invalid path
    }

    return wasValid;
};

// =============================================================================
// STUCK DETECTION & RECOVERY
// =============================================================================

/**
 * Stuck Detection System
 *
 * WHY: In complex simulations, characters can get stuck due to:
 * - Pathfinding failing to find a route
 * - Target location becoming blocked
 * - Logic bugs that clear their path repeatedly
 *
 * DETECTION: If an agent hasn't moved for X ticks and has a target, they're stuck.
 * RECOVERY: Clear their path and target, let AI re-evaluate next tick.
 */

// Track last known positions for stuck detection
const lastPositions = new Map<string, { x: number; y: number; tick: number }>();

/**
 * Constants for stuck detection (could be moved to BALANCE)
 */
const STUCK_THRESHOLD_TICKS = 30; // Ticks without movement to consider "stuck"

/**
 * Checks if an agent is stuck and recovers them if so.
 *
 * RETURNS: True if agent was stuck and recovered, false otherwise.
 */
export const detectAndRecoverStuckAgent = (
    agent: Agent,
    currentTick: number,
    logFn?: (type: string, name: string, msg: string) => void
): boolean => {
    const lastPos = lastPositions.get(agent.id);
    const currentPos = { x: agent.x, y: agent.y, tick: currentTick };

    // First time seeing this agent, just record position
    if (!lastPos) {
        lastPositions.set(agent.id, currentPos);
        return false;
    }

    // Check if agent has moved
    const hasMoved = lastPos.x !== agent.x || lastPos.y !== agent.y;

    if (hasMoved) {
        // Update last known position
        lastPositions.set(agent.id, currentPos);
        return false;
    }

    // Agent hasn't moved - check if stuck
    const ticksStationary = currentTick - lastPos.tick;

    // Only consider stuck if they have a target and path but aren't moving
    const hasTarget = agent.target !== null || agent.path.length > 0;
    const isStuck = hasTarget && ticksStationary >= STUCK_THRESHOLD_TICKS;

    if (isStuck) {
        // Recovery: Clear navigation state and let AI re-decide
        agent.path = [];
        agent.target = null;
        agent.lastPathTarget = undefined; // Reset smart path tracking
        agent.currentAction = "Recalculating...";

        // Reset the stuck detection timer
        lastPositions.set(agent.id, currentPos);

        if (logFn) {
            logFn('DEBUG', agent.name, `Stuck detected, resetting navigation.`);
        }

        return true;
    }

    return false;
};

/**
 * Clears stuck detection state (call when simulation resets)
 */
export const resetStuckDetection = (): void => {
    lastPositions.clear();
};

// =============================================================================
// STATE VALIDATION
// =============================================================================

/**
 * Validates the entire game state for consistency.
 *
 * WHY: After complex operations or when loading saved state,
 * it's good to verify everything is consistent.
 *
 * RETURNS: Array of issues found (empty if valid)
 */
export const validateGameState = (state: GameState): string[] => {
    const issues: string[] = [];

    // Check tick is non-negative
    if (state.ticks < 0) {
        issues.push(`Invalid tick count: ${state.ticks}`);
    }

    // Check map dimensions
    if (state.map.length !== GRID_W * GRID_H) {
        issues.push(`Invalid map size: ${state.map.length}, expected ${GRID_W * GRID_H}`);
    }

    // Validate each agent
    state.agents.forEach(agent => {
        // Position check
        if (!isValidCoordinate(agent.x, agent.y)) {
            issues.push(`Agent ${agent.name} has invalid position: (${agent.x}, ${agent.y})`);
        }

        // Needs range check
        const needsKeys = ['energy', 'purpose', 'connection', 'stability'] as const;
        needsKeys.forEach(key => {
            const value = agent.needs[key];
            if (value < 0 || value > 100) {
                issues.push(`Agent ${agent.name} has out-of-range ${key}: ${value}`);
            }
        });

        // Speed check (prevent division by zero)
        if (agent.speed <= 0) {
            issues.push(`Agent ${agent.name} has invalid speed: ${agent.speed}`);
        }

        // Efficiency check (prevent division by zero)
        if (agent.efficiency <= 0) {
            issues.push(`Agent ${agent.name} has invalid efficiency: ${agent.efficiency}`);
        }
    });

    // Validate artifacts
    state.artifacts.forEach(artifact => {
        if (!isValidCoordinate(artifact.x, artifact.y)) {
            issues.push(`Artifact ${artifact.id} has invalid position: (${artifact.x}, ${artifact.y})`);
        }
    });

    return issues;
};

// =============================================================================
// SAFE OPERATIONS
// =============================================================================

/**
 * Safely modifies energy with clamping.
 *
 * WHY: Centralizing energy modification ensures we never forget to clamp.
 * Also provides a single point to add logging or debugging later.
 */
export const modifyEnergy = (agent: Agent, delta: number): number => {
    const oldValue = agent.needs.energy;
    agent.needs.energy = clamp(oldValue + delta, 0, 100);
    return agent.needs.energy - oldValue; // Return actual change
};

/**
 * Safely modifies any need with clamping.
 */
export const modifyNeed = (
    agent: Agent,
    need: 'energy' | 'purpose' | 'connection' | 'stability',
    delta: number
): number => {
    const oldValue = agent.needs[need];
    agent.needs[need] = clamp(oldValue + delta, 0, 100);
    return agent.needs[need] - oldValue;
};

// =============================================================================
// PATH VALIDATION
// =============================================================================

/**
 * Validates a path array for consistency.
 *
 * WHY: Corrupt paths could cause agents to teleport or walk through walls.
 */
export const validatePath = (path: Point[]): boolean => {
    if (path.length === 0) return true; // Empty path is valid

    for (let i = 0; i < path.length; i++) {
        const point = path[i];

        // Check bounds
        if (!isValidCoordinate(point.x, point.y)) {
            return false;
        }

        // Check continuity (each step should be adjacent)
        if (i > 0) {
            const prev = path[i - 1];
            const dx = Math.abs(point.x - prev.x);
            const dy = Math.abs(point.y - prev.y);

            // Manhattan distance should be 1 (no diagonals in our grid)
            if (dx + dy !== 1) {
                return false;
            }
        }
    }

    return true;
};

// =============================================================================
// ARTIFACT VALIDATION
// =============================================================================

/**
 * Validates artifact creation parameters.
 *
 * WHY: Bad artifact data could crash the UI or corrupt statistics.
 */
export const validateArtifactCreation = (
    type: string,
    creators: string[],
    x: number,
    y: number
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Must have at least one creator
    if (creators.length === 0) {
        errors.push('Artifact must have at least one creator');
    }

    // Position must be valid
    if (!isValidCoordinate(x, y)) {
        errors.push(`Invalid artifact position: (${x}, ${y})`);
    }

    // Type must be non-empty
    if (!type || type.trim() === '') {
        errors.push('Artifact type cannot be empty');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};
