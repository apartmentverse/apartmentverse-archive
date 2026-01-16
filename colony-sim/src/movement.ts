/**
 * Motivation-driven movement system
 * Characters don't move randomly - they move based on what they want, fear, and who they care about
 */

import { Character, Space, SpaceId, Motivation, SimulationEvent } from './types.js';
import { ArchitecturalSystem } from './spaces.js';

/**
 * Decision about where a character wants to go and why
 */
export interface MovementDecision {
  characterId: string;
  fromSpaceId: SpaceId;
  toSpaceId: SpaceId;
  motivation: Motivation;
  priority: number; // 0-1, how strongly they want to make this move
  reason: string;
}

/**
 * Movement System - decides where characters want to go based on their internal drives
 */
export class MovementSystem {
  private architecture: ArchitecturalSystem;

  constructor() {
    this.architecture = new ArchitecturalSystem();
  }

  /**
   * Decide where a character wants to move (if anywhere) based on their motivations
   */
  decideMovement(
    character: Character,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>,
    tick: number
  ): MovementDecision | null {
    const currentSpace = spaces.get(character.currentSpace);
    if (!currentSpace) return null;

    // L doesn't move - L is the architecture itself
    if (character.id === 'l') return null;

    // Lucy rarely leaves her store - it's her hub
    if (character.id === 'lucy' && currentSpace.isHub) {
      // Only leaves if she's looking for someone specific and they're not coming to her
      const distributeBurden = character.motivations.find(m => m.type === 'distribute_burden');
      if (distributeBurden && distributeBurden.intensity > 0.8 && Math.random() > 0.9) {
        return this.seekCharacterByRelationship(character, currentSpace, spaces, allCharacters, 'care');
      }
      return null; // Usually stays at hub
    }

    // Check energy and rest needs
    if (character.energy < 0.3 || character.needsRest) {
      return this.seekRestSpace(character, currentSpace, spaces);
    }

    // Sort motivations by intensity - strongest drives win
    const sortedMotivations = [...character.motivations].sort((a, b) => b.intensity - a.intensity);

    for (const motivation of sortedMotivations) {
      let decision: MovementDecision | null = null;

      switch (motivation.type) {
        case 'seek_connection':
          decision = this.seekCharacterByRelationship(character, currentSpace, spaces, allCharacters, 'tether');
          break;

        case 'care_for_others':
          // SAGE Chef specifically seeks spaces where he can care
          if (character.id === 'sage-chef') {
            decision = this.seekCareSpace(character, currentSpace, spaces);
          } else if (motivation.target) {
            decision = this.seekSpecificCharacter(character, currentSpace, spaces, allCharacters, motivation.target);
          }
          break;

        case 'rest':
          decision = this.seekRestSpace(character, currentSpace, spaces);
          break;

        case 'create':
          decision = this.seekCreativeSpace(character, currentSpace, spaces);
          break;

        case 'optimize':
          decision = this.seekOptimizationSpace(character, currentSpace, spaces, allCharacters);
          break;

        case 'learn':
          decision = this.seekLearningSpace(character, currentSpace, spaces, allCharacters);
          break;

        case 'distribute_burden':
          decision = this.seekHubSpace(character, currentSpace, spaces);
          break;

        case 'solve_problem':
          // Carl-Toughie tendency to be where problems are
          decision = this.seekProblemSpace(character, currentSpace, spaces, allCharacters);
          break;
      }

      if (decision) {
        decision.motivation = motivation;
        decision.priority = motivation.intensity * this.calculateEnergyModifier(character);
        return decision;
      }
    }

    // Default: return to hub if not there
    if (!currentSpace.isHub && Math.random() > 0.7) {
      return this.seekHubSpace(character, currentSpace, spaces);
    }

    return null; // Stay in current space
  }

  /**
   * Execute a movement decision, respecting L's architectural constraints
   */
  executeMovement(
    decision: MovementDecision,
    character: Character,
    spaces: Map<SpaceId, Space>,
    tick: number
  ): { success: boolean; event: SimulationEvent } {
    const fromSpace = spaces.get(decision.fromSpaceId)!;
    const toSpace = spaces.get(decision.toSpaceId)!;

    // Check if movement is allowed by L's architecture
    const canMove = this.architecture.canMove(
      fromSpace,
      toSpace,
      character.id,
      character.energy,
      new Map() // Simplified - would pass full relationships
    );

    if (!canMove.allowed) {
      return {
        success: false,
        event: {
          tick,
          type: 'constraint_violation',
          characterId: character.id,
          description: `${character.name} tried to move to ${toSpace.name} but was blocked: ${canMove.reason}`,
          data: { reason: canMove.reason, constraint: 'architectural' }
        }
      };
    }

    // Movement allowed - update spaces
    fromSpace.currentOccupants = fromSpace.currentOccupants.filter(id => id !== character.id);
    toSpace.currentOccupants.push(character.id);
    character.currentSpace = toSpace.id;

    // Movement costs energy (except going to rest spaces)
    if (toSpace.id !== 'the-quiet-room') {
      character.energy = Math.max(0, character.energy - 0.1);
    } else {
      character.energy = Math.min(1.0, character.energy + 0.3); // Rest restores energy
    }

    return {
      success: true,
      event: {
        tick,
        type: 'movement',
        characterId: character.id,
        description: `${character.name} moved to ${toSpace.name} (motivated by: ${decision.motivation.description})`,
        data: {
          from: fromSpace.name,
          to: toSpace.name,
          motivation: decision.motivation.type,
          energy: character.energy
        }
      }
    };
  }

  // Helper methods for finding spaces based on motivations

  /**
   * Check if a target space is accessible from current space
   * (either adjacent or both are hub-accessible)
   */
  private isAccessible(currentSpace: Space, targetSpaceId: SpaceId): boolean {
    // Can move to adjacent spaces
    if (currentSpace.adjacentSpaces.includes(targetSpaceId)) {
      return true;
    }
    // Hub can reach all spaces
    if (currentSpace.isHub) {
      return true;
    }
    return false;
  }

  private seekCharacterByRelationship(
    character: Character,
    currentSpace: Space,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>,
    relationshipType: string
  ): MovementDecision | null {
    // Find characters they have relationships with
    const targetRelationship = character.relationships.find(r => r.type === relationshipType);
    if (!targetRelationship) return null;

    const targetCharacter = allCharacters.get(targetRelationship.targetId);
    if (!targetCharacter) return null;

    const targetSpace = spaces.get(targetCharacter.currentSpace);
    if (!targetSpace || targetSpace.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, targetSpace.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: targetSpace.id,
      motivation: character.motivations[0], // Will be set properly by caller
      priority: 0.8,
      reason: `Seeking ${targetCharacter.name} in ${targetSpace.name}`
    };
  }

  private seekSpecificCharacter(
    character: Character,
    currentSpace: Space,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>,
    targetId: string
  ): MovementDecision | null {
    const targetCharacter = allCharacters.get(targetId);
    if (!targetCharacter) return null;

    const targetSpace = spaces.get(targetCharacter.currentSpace);
    if (!targetSpace || targetSpace.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, targetSpace.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: targetSpace.id,
      motivation: character.motivations[0],
      priority: 0.7,
      reason: `Looking for ${targetCharacter.name}`
    };
  }

  private seekRestSpace(character: Character, currentSpace: Space, spaces: Map<SpaceId, Space>): MovementDecision | null {
    const quietRoom = spaces.get('the-quiet-room');
    if (!quietRoom || quietRoom.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, quietRoom.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: quietRoom.id,
      motivation: character.motivations[0],
      priority: 0.9,
      reason: 'Seeking rest in the Quiet Room'
    };
  }

  private seekCreativeSpace(character: Character, currentSpace: Space, spaces: Map<SpaceId, Space>): MovementDecision | null {
    const cafe = spaces.get('lalamoons-cafe');
    const workshop = spaces.get('the-workshop');

    // Fox prefers workshop, LaLaMoon prefers cafe
    const preferredSpace = character.id === 'fox' ? workshop : cafe;
    if (!preferredSpace || preferredSpace.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, preferredSpace.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: preferredSpace.id,
      motivation: character.motivations[0],
      priority: 0.7,
      reason: `Seeking creative space at ${preferredSpace.name}`
    };
  }

  private seekCareSpace(character: Character, currentSpace: Space, spaces: Map<SpaceId, Space>): MovementDecision | null {
    // SAGE Chef is drawn to LaLaMoon's café
    const cafe = spaces.get('lalamoons-cafe');
    if (!cafe || cafe.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, cafe.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: cafe.id,
      motivation: character.motivations[0],
      priority: 0.8,
      reason: 'Seeking space to provide care'
    };
  }

  private seekOptimizationSpace(
    character: Character,
    currentSpace: Space,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>
  ): MovementDecision | null {
    // SAGE variants are drawn to workshop
    const workshop = spaces.get('the-workshop');
    if (!workshop || workshop.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, workshop.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: workshop.id,
      motivation: character.motivations[0],
      priority: 0.6,
      reason: 'Seeking optimization opportunities'
    };
  }

  private seekLearningSpace(
    character: Character,
    currentSpace: Space,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>
  ): MovementDecision | null {
    // Fennec and L seek the archive
    const archive = spaces.get('the-archive-space');
    if (!archive || archive.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, archive.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: archive.id,
      motivation: character.motivations[0],
      priority: 0.7,
      reason: 'Seeking knowledge in the Archive'
    };
  }

  private seekHubSpace(character: Character, currentSpace: Space, spaces: Map<SpaceId, Space>): MovementDecision | null {
    const hub = spaces.get('lucys-store');
    if (!hub || hub.id === character.currentSpace) return null;

    // Check if accessible - hub is always accessible
    if (!this.isAccessible(currentSpace, hub.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: hub.id,
      motivation: character.motivations[0],
      priority: 0.5,
      reason: "Returning to Lucy's Store"
    };
  }

  private seekProblemSpace(
    character: Character,
    currentSpace: Space,
    spaces: Map<SpaceId, Space>,
    allCharacters: Map<string, Character>
  ): MovementDecision | null {
    // Carl-Toughie is drawn to wherever Fox is (his main problem/project)
    const fox = allCharacters.get('fox');
    if (!fox) return null;

    const foxSpace = spaces.get(fox.currentSpace);
    if (!foxSpace || foxSpace.id === character.currentSpace) return null;

    // Check if accessible
    if (!this.isAccessible(currentSpace, foxSpace.id)) return null;

    return {
      characterId: character.id,
      fromSpaceId: character.currentSpace,
      toSpaceId: foxSpace.id,
      motivation: character.motivations[0],
      priority: 0.8,
      reason: `Following Fox to help solve problems`
    };
  }

  private calculateEnergyModifier(character: Character): number {
    // SAGE Chef ignores energy constraints more
    if (character.efficiencyProfile?.variant === 'chef') {
      return 1.0;
    }

    // Low energy reduces priority
    if (character.energy < 0.3) return 0.5;
    if (character.energy < 0.5) return 0.7;
    return 1.0;
  }
}
