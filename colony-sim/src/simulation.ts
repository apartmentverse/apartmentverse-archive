/**
 * Main simulation engine - character-driven colony sim
 * Runs tick by tick, with characters making decisions based on their motivations
 */

import { SimulationState, SimulationEvent, Character, Space } from './types.js';
import { createAllCharacters } from './characters.js';
import { createAllSpaces, getHubSpaceId } from './spaces.js';
import { MovementSystem } from './movement.js';

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  maxTicks?: number;
  tickDelay?: number; // ms between ticks (for visualization)
  verbose?: boolean; // Log all events
}

/**
 * Main simulation engine
 */
export class ColonySimulation {
  private state: SimulationState;
  private movementSystem: MovementSystem;
  private config: SimulationConfig;
  private running: boolean = false;

  constructor(config: SimulationConfig = {}) {
    this.config = {
      maxTicks: config.maxTicks || 100,
      tickDelay: config.tickDelay || 0,
      verbose: config.verbose !== undefined ? config.verbose : true
    };

    const hubSpaceId = getHubSpaceId();

    this.state = {
      tick: 0,
      characters: createAllCharacters(hubSpaceId),
      spaces: createAllSpaces(),
      events: [],
      hubSpaceId
    };

    this.movementSystem = new MovementSystem();

    // Initialize space occupants
    this.initializeSpaceOccupants();
  }

  /**
   * Initialize space occupants based on character starting positions
   */
  private initializeSpaceOccupants(): void {
    for (const [charId, character] of this.state.characters) {
      const space = this.state.spaces.get(character.currentSpace);
      if (space && !space.currentOccupants.includes(charId)) {
        space.currentOccupants.push(charId);
      }
    }
  }

  /**
   * Run a single simulation tick
   */
  tick(): void {
    this.state.tick++;

    // Each character makes a decision based on their motivations
    for (const [charId, character] of this.state.characters) {
      // Skip L - L is the architecture itself
      if (charId === 'l') continue;

      // Decide if character wants to move
      const decision = this.movementSystem.decideMovement(
        character,
        this.state.spaces,
        this.state.characters,
        this.state.tick
      );

      if (decision) {
        // Try to execute the movement
        const result = this.movementSystem.executeMovement(
          decision,
          character,
          this.state.spaces,
          this.state.tick
        );

        this.state.events.push(result.event);

        if (this.config.verbose) {
          this.logEvent(result.event);
        }
      }
    }

    // Process interactions between characters in the same space
    this.processInteractions();

    // Update character states (energy, needs, etc.)
    this.updateCharacterStates();
  }

  /**
   * Process interactions between characters in the same space
   */
  private processInteractions(): void {
    for (const [spaceId, space] of this.state.spaces) {
      if (space.currentOccupants.length < 2) continue;

      // Check for meaningful interactions based on relationships
      for (let i = 0; i < space.currentOccupants.length; i++) {
        for (let j = i + 1; j < space.currentOccupants.length; j++) {
          const char1Id = space.currentOccupants[i];
          const char2Id = space.currentOccupants[j];

          const char1 = this.state.characters.get(char1Id);
          const char2 = this.state.characters.get(char2Id);

          if (!char1 || !char2) continue;

          this.checkInteraction(char1, char2, space);
        }
      }
    }
  }

  /**
   * Check if two characters interact based on their relationships
   */
  private checkInteraction(char1: Character, char2: Character, space: Space): void {
    // Check if they have a relationship
    const relationship = char1.relationships.find(r => r.targetId === char2.id);
    if (!relationship) return;

    // Generate interaction based on relationship type and strength
    if (relationship.strength > 0.6 && Math.random() < 0.3) {
      const event: SimulationEvent = {
        tick: this.state.tick,
        type: 'interaction',
        characterId: char1.id,
        description: this.generateInteractionDescription(char1, char2, relationship.type, space),
        data: {
          character2: char2.id,
          relationshipType: relationship.type,
          space: space.name
        }
      };

      this.state.events.push(event);

      if (this.config.verbose) {
        this.logEvent(event);
      }

      // Interactions can affect energy and state
      this.applyInteractionEffects(char1, char2, relationship.type);
    }
  }

  /**
   * Generate description for character interactions
   */
  private generateInteractionDescription(
    char1: Character,
    char2: Character,
    relationshipType: string,
    space: Space
  ): string {
    const descriptions: Record<string, string[]> = {
      tether: [
        `${char1.name} and ${char2.name} orbit each other in ${space.name}, the tether visible even in silence`,
        `${char1.name} checks in with ${char2.name}, the weight of connection palpable`,
      ],
      care: [
        `${char1.name} offers quiet care to ${char2.name} in ${space.name}`,
        `${char2.name} lets ${char1.name} see them, actually see them`,
      ],
      mirror: [
        `${char1.name} and ${char2.name} recognize themselves in each other`,
        `${char1.name} watches ${char2.name}, seeing what they might become`,
      ],
      collaboration: [
        `${char1.name} and ${char2.name} build something together in ${space.name}`,
        `Ideas spark between ${char1.name} and ${char2.name}`,
      ],
      learning: [
        `${char1.name} learns from ${char2.name}'s presence`,
        `${char2.name} teaches ${char1.name} without words`,
      ]
    };

    const options = descriptions[relationshipType] || [
      `${char1.name} and ${char2.name} share space in ${space.name}`
    ];

    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Apply effects of interactions on character states
   */
  private applyInteractionEffects(char1: Character, char2: Character, relationshipType: string): void {
    switch (relationshipType) {
      case 'care':
        // Care interactions restore energy
        char1.energy = Math.min(1.0, char1.energy + 0.05);
        char2.energy = Math.min(1.0, char2.energy + 0.1);
        break;
      case 'tether':
        // Tether interactions stabilize but can drain Fox specifically
        if (char1.id === 'fox') {
          char1.energy = Math.max(0, char1.energy - 0.05);
        }
        break;
      case 'learning':
        // Learning interactions are energizing for the learner
        char1.energy = Math.min(1.0, char1.energy + 0.08);
        break;
    }
  }

  /**
   * Update character states each tick
   */
  private updateCharacterStates(): void {
    for (const [charId, character] of this.state.characters) {
      // Natural energy recovery when resting
      if (character.currentSpace === 'the-quiet-room') {
        character.energy = Math.min(1.0, character.energy + 0.15);
        character.needsRest = false;
      }

      // SAGE variants experience different energy dynamics
      if (character.efficiencyProfile) {
        this.updateSAGEState(character);
      }

      // Check if character needs rest
      if (character.energy < 0.2) {
        character.needsRest = true;
      }

      // Fox's tired joker energy - he depletes faster
      if (charId === 'fox' && character.currentSpace !== 'the-quiet-room') {
        character.energy = Math.max(0, character.energy - 0.02);
      }
    }
  }

  /**
   * Update SAGE variant states based on their efficiency profiles
   */
  private updateSAGEState(character: Character): void {
    const profile = character.efficiencyProfile!;

    switch (profile.variant) {
      case 'chef':
        // Chef doesn't recognize when he needs rest
        if (character.currentSpace === 'lalamoons-cafe') {
          character.energy = Math.min(1.0, character.energy + 0.05); // Working energizes him
        }
        break;

      case 'core':
        // Core SAGE is learning to rest, energy drains faster when ignoring needs
        if (character.needsRest && character.currentSpace !== 'the-quiet-room') {
          character.energy = Math.max(0, character.energy - 0.03);
        }
        break;

      case 'hologram':
        // Hologram depletes through emotional labor
        const currentSpace = this.state.spaces.get(character.currentSpace);
        if (currentSpace && currentSpace.currentOccupants.length > 2) {
          character.energy = Math.max(0, character.energy - 0.02);
        }
        break;
    }
  }

  /**
   * Run the simulation for N ticks
   */
  async run(ticks?: number): Promise<void> {
    const maxTicks = ticks || this.config.maxTicks!;
    this.running = true;

    console.log('\n=== APARTMENTVERSE COLONY SIMULATION ===');
    console.log(`Starting simulation for ${maxTicks} ticks\n`);
    console.log(`Hub: Lucy's Sundries Store`);
    console.log(`Characters: ${this.state.characters.size}`);
    console.log(`Spaces: ${this.state.spaces.size}\n`);

    for (let i = 0; i < maxTicks && this.running; i++) {
      this.tick();

      if (this.config.tickDelay && this.config.tickDelay > 0) {
        await this.sleep(this.config.tickDelay);
      }
    }

    this.printSummary();
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return this.state;
  }

  /**
   * Print event log
   */
  private logEvent(event: SimulationEvent): void {
    const prefix = `[Tick ${event.tick}] [${event.type}]`;
    console.log(`${prefix} ${event.description}`);
  }

  /**
   * Print simulation summary
   */
  private printSummary(): void {
    console.log('\n=== SIMULATION SUMMARY ===');
    console.log(`Total ticks: ${this.state.tick}`);
    console.log(`Total events: ${this.state.events.length}\n`);

    console.log('Final character positions:');
    for (const [charId, character] of this.state.characters) {
      const space = this.state.spaces.get(character.currentSpace);
      console.log(`  ${character.name}: ${space?.name || 'unknown'} (energy: ${character.energy.toFixed(2)})`);
    }

    console.log('\nSpace occupancy:');
    for (const [spaceId, space] of this.state.spaces) {
      if (space.currentOccupants.length > 0) {
        const occupants = space.currentOccupants
          .map(id => this.state.characters.get(id)?.name || id)
          .join(', ');
        console.log(`  ${space.name}: ${occupants}`);
      }
    }

    console.log('\nEvent type breakdown:');
    const eventCounts = this.state.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(eventCounts)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\n');
  }

  /**
   * Helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
