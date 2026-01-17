/**
 * Analytics system for tracking simulation data
 * Collects space visits, character proximity, energy levels, and interactions
 */

import { Character, Space, SimulationEvent, SpaceId, CharacterId } from './types.js';

/**
 * Snapshot of the simulation state at a single tick
 */
export interface TickSnapshot {
  tick: number;
  timestamp: Date;
  characterStates: Map<CharacterId, CharacterTickState>;
  spaceOccupancy: Map<SpaceId, CharacterId[]>;
}

/**
 * Character state at a specific tick
 */
export interface CharacterTickState {
  id: CharacterId;
  name: string;
  space: SpaceId;
  energy: number;
  needsRest: boolean;
  motivationTypes: string[];
}

/**
 * Aggregated analytics data for the entire simulation
 */
export interface AnalyticsData {
  // Metadata
  totalTicks: number;
  startTime: Date;
  endTime: Date;
  
  // Space analytics
  spaceVisits: Map<SpaceId, number>;           // space ID → total visit count
  spaceVisitsByTick: Map<SpaceId, number[]>;   // space ID → visits per tick
  spaceOccupancyRate: Map<SpaceId, number>;    // space ID → average occupancy (0-1)
  
  // Character proximity
  characterProximity: Map<string, number>;      // "char1_char2" → ticks together
  proximityMatrix: number[][];                  // NxN matrix of co-location frequency
  characterIds: CharacterId[];                  // Ordered list for matrix indexing
  
  // Energy tracking
  energyHistory: Map<CharacterId, number[]>;    // character ID → energy per tick
  energyStats: Map<CharacterId, EnergyStats>;   // character ID → statistics
  
  // Interaction tracking
  interactionCounts: Map<string, number>;       // "char1_char2" → interaction count
  interactionsByType: Map<string, number>;      // interaction type → count
  
  // Movement patterns
  movementCounts: Map<CharacterId, number>;     // character ID → total moves
  movementPaths: Map<CharacterId, MovementPath[]>; // character ID → path history
  
  // Tick snapshots (full state history)
  tickSnapshots: TickSnapshot[];
}

/**
 * Energy statistics for a character
 */
export interface EnergyStats {
  min: number;
  max: number;
  average: number;
  final: number;
  depletionRate: number; // Average change per tick
}

/**
 * Movement path record
 */
export interface MovementPath {
  tick: number;
  from: SpaceId;
  to: SpaceId;
  motivation: string;
}

/**
 * Analytics collector - tracks data during simulation
 */
export class SimulationAnalytics {
  private data: AnalyticsData;
  private characterNames: Map<CharacterId, string>;
  private spaceNames: Map<SpaceId, string>;
  
  constructor() {
    this.characterNames = new Map();
    this.spaceNames = new Map();
    
    this.data = {
      totalTicks: 0,
      startTime: new Date(),
      endTime: new Date(),
      spaceVisits: new Map(),
      spaceVisitsByTick: new Map(),
      spaceOccupancyRate: new Map(),
      characterProximity: new Map(),
      proximityMatrix: [],
      characterIds: [],
      energyHistory: new Map(),
      energyStats: new Map(),
      interactionCounts: new Map(),
      interactionsByType: new Map(),
      movementCounts: new Map(),
      movementPaths: new Map(),
      tickSnapshots: []
    };
  }
  
  /**
   * Initialize analytics with character and space information
   */
  initialize(characters: Map<CharacterId, Character>, spaces: Map<SpaceId, Space>): void {
    // Store character names and IDs
    this.data.characterIds = Array.from(characters.keys());
    for (const [id, char] of characters) {
      this.characterNames.set(id, char.name);
      this.data.energyHistory.set(id, []);
      this.data.movementCounts.set(id, 0);
      this.data.movementPaths.set(id, []);
    }
    
    // Store space names
    for (const [id, space] of spaces) {
      this.spaceNames.set(id, space.name);
      this.data.spaceVisits.set(id, 0);
      this.data.spaceVisitsByTick.set(id, []);
    }
    
    // Initialize proximity matrix
    const n = this.data.characterIds.length;
    this.data.proximityMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
  }
  
  /**
   * Record a single tick of simulation data
   */
  recordTick(
    tick: number,
    characters: Map<CharacterId, Character>,
    spaces: Map<SpaceId, Space>,
    events: SimulationEvent[]
  ): void {
    this.data.totalTicks = tick;
    
    // Create tick snapshot
    const snapshot: TickSnapshot = {
      tick,
      timestamp: new Date(),
      characterStates: new Map(),
      spaceOccupancy: new Map()
    };
    
    // Record character states and energy
    for (const [charId, character] of characters) {
      // Character state
      snapshot.characterStates.set(charId, {
        id: charId,
        name: character.name,
        space: character.currentSpace,
        energy: character.energy,
        needsRest: character.needsRest,
        motivationTypes: character.motivations.map(m => m.type)
      });
      
      // Energy history
      const energyHistory = this.data.energyHistory.get(charId)!;
      energyHistory.push(character.energy);
    }
    
    // Record space occupancy and visits
    for (const [spaceId, space] of spaces) {
      snapshot.spaceOccupancy.set(spaceId, [...space.currentOccupants]);
      
      // Count visits (occupancy this tick)
      const visitCount = space.currentOccupants.length;
      if (visitCount > 0) {
        this.data.spaceVisits.set(
          spaceId,
          (this.data.spaceVisits.get(spaceId) || 0) + visitCount
        );
      }
      
      // Track visits per tick
      const visitsPerTick = this.data.spaceVisitsByTick.get(spaceId)!;
      visitsPerTick.push(visitCount);
    }
    
    // Record character proximity (who's in same space)
    for (const [spaceId, space] of spaces) {
      if (space.currentOccupants.length < 2) continue;
      
      // For each pair of characters in the space
      for (let i = 0; i < space.currentOccupants.length; i++) {
        for (let j = i + 1; j < space.currentOccupants.length; j++) {
          const char1 = space.currentOccupants[i];
          const char2 = space.currentOccupants[j];
          const key = this.makeProximityKey(char1, char2);
          
          this.data.characterProximity.set(
            key,
            (this.data.characterProximity.get(key) || 0) + 1
          );
          
          // Update proximity matrix
          const idx1 = this.data.characterIds.indexOf(char1);
          const idx2 = this.data.characterIds.indexOf(char2);
          if (idx1 !== -1 && idx2 !== -1) {
            this.data.proximityMatrix[idx1][idx2]++;
            this.data.proximityMatrix[idx2][idx1]++; // Symmetric
          }
        }
      }
    }
    
    // Process events for this tick
    for (const event of events) {
      if (event.tick !== tick) continue;
      
      switch (event.type) {
        case 'movement':
          this.recordMovement(event);
          break;
        case 'interaction':
          this.recordInteraction(event);
          break;
      }
    }
    
    this.data.tickSnapshots.push(snapshot);
  }
  
  /**
   * Record a movement event
   */
  private recordMovement(event: SimulationEvent): void {
    const charId = event.characterId;
    
    // Increment movement count
    this.data.movementCounts.set(
      charId,
      (this.data.movementCounts.get(charId) || 0) + 1
    );
    
    // Record movement path
    if (event.data && event.data.from && event.data.to) {
      const paths = this.data.movementPaths.get(charId)!;
      paths.push({
        tick: event.tick,
        from: event.data.from,
        to: event.data.to,
        motivation: event.data.motivation || 'unknown'
      });
    }
  }
  
  /**
   * Record an interaction event
   */
  private recordInteraction(event: SimulationEvent): void {
    if (!event.data || !event.data.character2) return;
    
    const char1 = event.characterId;
    const char2 = event.data.character2;
    const key = this.makeProximityKey(char1, char2);
    
    // Count interactions between characters
    this.data.interactionCounts.set(
      key,
      (this.data.interactionCounts.get(key) || 0) + 1
    );
    
    // Count by interaction type
    const type = event.data.relationshipType || 'unknown';
    this.data.interactionsByType.set(
      type,
      (this.data.interactionsByType.get(type) || 0) + 1
    );
  }
  
  /**
   * Finalize analytics and compute aggregate statistics
   */
  finalize(): void {
    this.data.endTime = new Date();
    
    // Compute space occupancy rates
    for (const [spaceId, visitsPerTick] of this.data.spaceVisitsByTick) {
      const spaces = Array.from(this.spaceNames.keys());
      const space = spaces.find(s => s === spaceId);
      if (!space) continue;
      
      const totalCapacityTicks = this.data.totalTicks;
      const totalOccupancy = visitsPerTick.reduce((sum, v) => sum + v, 0);
      const averageOccupancy = totalOccupancy / totalCapacityTicks;
      
      this.data.spaceOccupancyRate.set(spaceId, averageOccupancy);
    }
    
    // Compute energy statistics
    for (const [charId, energyHistory] of this.data.energyHistory) {
      if (energyHistory.length === 0) continue;
      
      const stats: EnergyStats = {
        min: Math.min(...energyHistory),
        max: Math.max(...energyHistory),
        average: energyHistory.reduce((sum, e) => sum + e, 0) / energyHistory.length,
        final: energyHistory[energyHistory.length - 1],
        depletionRate: this.calculateDepletionRate(energyHistory)
      };
      
      this.data.energyStats.set(charId, stats);
    }
  }
  
  /**
   * Calculate average energy depletion rate
   */
  private calculateDepletionRate(energyHistory: number[]): number {
    if (energyHistory.length < 2) return 0;
    
    let totalChange = 0;
    let count = 0;
    
    for (let i = 1; i < energyHistory.length; i++) {
      totalChange += energyHistory[i] - energyHistory[i - 1];
      count++;
    }
    
    return count > 0 ? totalChange / count : 0;
  }
  
  /**
   * Create consistent key for character pairs
   */
  private makeProximityKey(char1: CharacterId, char2: CharacterId): string {
    return [char1, char2].sort().join('_');
  }
  
  /**
   * Get character name from ID
   */
  getCharacterName(id: CharacterId): string {
    return this.characterNames.get(id) || id;
  }
  
  /**
   * Get space name from ID
   */
  getSpaceName(id: SpaceId): string {
    return this.spaceNames.get(id) || id;
  }
  
  /**
   * Export all analytics data
   */
  export(): AnalyticsData {
    return this.data;
  }
  
  /**
   * Export as plain object (for JSON serialization)
   */
  exportAsObject(): any {
    return {
      metadata: {
        totalTicks: this.data.totalTicks,
        startTime: this.data.startTime.toISOString(),
        endTime: this.data.endTime.toISOString(),
        durationMs: this.data.endTime.getTime() - this.data.startTime.getTime()
      },
      spaceAnalytics: {
        visits: Object.fromEntries(this.data.spaceVisits),
        visitsByTick: Object.fromEntries(
          Array.from(this.data.spaceVisitsByTick.entries()).map(([k, v]) => [
            this.getSpaceName(k), v
          ])
        ),
        occupancyRate: Object.fromEntries(
          Array.from(this.data.spaceOccupancyRate.entries()).map(([k, v]) => [
            this.getSpaceName(k), v.toFixed(3)
          ])
        )
      },
      characterAnalytics: {
        proximity: Object.fromEntries(
          Array.from(this.data.characterProximity.entries()).map(([k, v]) => {
            const [c1, c2] = k.split('_');
            return [`${this.getCharacterName(c1)}_${this.getCharacterName(c2)}`, v];
          })
        ),
        proximityMatrix: {
          characterIds: this.data.characterIds.map(id => this.getCharacterName(id)),
          matrix: this.data.proximityMatrix
        },
        energyHistory: Object.fromEntries(
          Array.from(this.data.energyHistory.entries()).map(([k, v]) => [
            this.getCharacterName(k), v
          ])
        ),
        energyStats: Object.fromEntries(
          Array.from(this.data.energyStats.entries()).map(([k, v]) => [
            this.getCharacterName(k), v
          ])
        ),
        movementCounts: Object.fromEntries(
          Array.from(this.data.movementCounts.entries()).map(([k, v]) => [
            this.getCharacterName(k), v
          ])
        )
      },
      interactions: {
        byCharacterPair: Object.fromEntries(
          Array.from(this.data.interactionCounts.entries()).map(([k, v]) => {
            const [c1, c2] = k.split('_');
            return [`${this.getCharacterName(c1)}_${this.getCharacterName(c2)}`, v];
          })
        ),
        byType: Object.fromEntries(this.data.interactionsByType)
      },
      tickSnapshots: this.data.tickSnapshots.map(snapshot => ({
        tick: snapshot.tick,
        characterStates: Object.fromEntries(snapshot.characterStates),
        spaceOccupancy: Object.fromEntries(
          Array.from(snapshot.spaceOccupancy.entries()).map(([k, v]) => [
            this.getSpaceName(k), v.map(id => this.getCharacterName(id))
          ])
        )
      }))
    };
  }
}
