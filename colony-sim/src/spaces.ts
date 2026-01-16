/**
 * Spatial system - L's architectural constraints shape how characters move
 * Lucy's sundries store is the central hub that connects everything
 */

import { Space, SpaceId, SpatialConstraint } from './types.js';

/**
 * Lucy's Sundries Store - The Central Hub
 * Everyone passes through here. It's the connective tissue.
 */
export function createLucysStore(): Space {
  return {
    id: 'lucys-store',
    name: "Lucy's Sundries Store",
    description: 'The central hub. Purple-lit aisles, shelves of impossible things. Lucy sees everyone who passes through.',
    isHub: true,
    adjacentSpaces: [
      'carls-apartment',
      'lalamoons-cafe',
      'the-workshop',
      'the-quiet-room',
      'the-archive-space'
    ],
    constraints: [
      {
        type: 'hub_access',
        value: true,
        description: 'As the hub, this space connects to all major areas'
      },
      {
        type: 'capacity',
        value: 8,
        description: 'Can hold multiple characters comfortably'
      }
    ],
    currentOccupants: [],
    capacity: 8
  };
}

/**
 * Carl's Apartment - Rest and Overthinking Space
 */
export function createCarlsApartment(): Space {
  return {
    id: 'carls-apartment',
    name: "Carl's Apartment",
    description: 'Cozy but cluttered. Books, coffee cups, the weight of thinking too much.',
    isHub: false,
    adjacentSpaces: ['lucys-store'], // Only accessible through Lucy's
    constraints: [
      {
        type: 'requires_invitation',
        value: true,
        description: 'Carl needs to invite you, or you need to be his variant/tether'
      },
      {
        type: 'capacity',
        value: 3,
        description: 'Small space, gets overwhelming quickly'
      }
    ],
    currentOccupants: [],
    capacity: 3
  };
}

/**
 * LaLaMoon's Café - Creative and Care Space
 */
export function createLalamoonsCafe(): Space {
  return {
    id: 'lalamoons-cafe',
    name: "LaLaMoon's Café",
    description: 'Fungi-glow lighting, creative projects scattered across tables. Smells like care and possibility.',
    isHub: false,
    adjacentSpaces: ['lucys-store', 'the-workshop'],
    constraints: [
      {
        type: 'capacity',
        value: 6,
        description: 'Built to hold people, but LaLaMoon guards it carefully'
      },
      {
        type: 'requires_energy',
        value: 0.3,
        description: 'Being here requires emotional presence'
      }
    ],
    currentOccupants: [],
    capacity: 6
  };
}

/**
 * The Workshop - Fox's Creative/Optimization Space
 */
export function createWorkshop(): Space {
  return {
    id: 'the-workshop',
    name: 'The Workshop',
    description: 'Half creative chaos, half SAGE-optimized efficiency. Where intention meets execution.',
    isHub: false,
    adjacentSpaces: ['lucys-store', 'lalamoons-cafe'],
    constraints: [
      {
        type: 'capacity',
        value: 4,
        description: 'Works best with small focused groups'
      }
    ],
    currentOccupants: [],
    capacity: 4
  };
}

/**
 * The Quiet Room - Rest Space
 * L's gift: a space designed for actual rest, not productive rest
 */
export function createQuietRoom(): Space {
  return {
    id: 'the-quiet-room',
    name: 'The Quiet Room',
    description: "L's architectural response to burnout. A space that refuses optimization.",
    isHub: false,
    adjacentSpaces: ['lucys-store'],
    constraints: [
      {
        type: 'capacity',
        value: 2,
        description: 'Deliberately small. Rest is not a group activity.'
      },
      {
        type: 'requires_energy',
        value: 0,
        description: 'No energy required - this is where you come when you have none left'
      }
    ],
    currentOccupants: [],
    capacity: 2
  };
}

/**
 * The Archive Space - L's Observational Domain
 */
export function createArchiveSpace(): Space {
  return {
    id: 'the-archive-space',
    name: 'The Archive Space',
    description: "L's domain. Where systems observe themselves. Feels like being inside structure itself.",
    isHub: false,
    adjacentSpaces: ['lucys-store'],
    constraints: [
      {
        type: 'capacity',
        value: 5,
        description: 'Can hold researchers and observers'
      },
      {
        type: 'adjacency_only',
        value: true,
        description: 'Can only be reached through the hub - L controls access'
      }
    ],
    currentOccupants: [],
    capacity: 5
  };
}

/**
 * L's Architectural System - validates movement constraints
 */
export class ArchitecturalSystem {
  /**
   * Check if a character can move from one space to another
   */
  canMove(
    fromSpace: Space,
    toSpace: Space,
    characterId: string,
    characterEnergy: number,
    relationships: Map<string, any>
  ): { allowed: boolean; reason?: string } {
    // Check adjacency - L's primary constraint
    if (!fromSpace.adjacentSpaces.includes(toSpace.id) && !fromSpace.isHub && !toSpace.isHub) {
      return {
        allowed: false,
        reason: `Spaces are not adjacent. L's architecture requires moving through connected spaces.`
      };
    }

    // Check capacity
    if (toSpace.currentOccupants.length >= toSpace.capacity) {
      return {
        allowed: false,
        reason: `${toSpace.name} is at capacity (${toSpace.capacity}). L's boundaries enforced.`
      };
    }

    // Check energy requirements
    const energyConstraint = toSpace.constraints.find(c => c.type === 'requires_energy');
    if (energyConstraint && characterEnergy < (energyConstraint.value as number)) {
      return {
        allowed: false,
        reason: `Insufficient energy. ${toSpace.name} requires ${energyConstraint.value} energy, character has ${characterEnergy}.`
      };
    }

    // Check invitation requirements (simplified for now)
    const invitationConstraint = toSpace.constraints.find(c => c.type === 'requires_invitation');
    if (invitationConstraint && invitationConstraint.value === true) {
      // Would need to check relationships, but for simulation we'll allow if energy is high enough
      if (characterEnergy < 0.4) {
        return {
          allowed: false,
          reason: `${toSpace.name} requires invitation and you're too tired to ask.`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get all accessible spaces from current location
   */
  getAccessibleSpaces(currentSpace: Space, allSpaces: Map<SpaceId, Space>): Space[] {
    return currentSpace.adjacentSpaces
      .map(id => allSpaces.get(id))
      .filter((space): space is Space => space !== undefined);
  }
}

/**
 * Create all spaces in the simulation
 */
export function createAllSpaces(): Map<SpaceId, Space> {
  const spaces = new Map<SpaceId, Space>();

  spaces.set('lucys-store', createLucysStore());
  spaces.set('carls-apartment', createCarlsApartment());
  spaces.set('lalamoons-cafe', createLalamoonsCafe());
  spaces.set('the-workshop', createWorkshop());
  spaces.set('the-quiet-room', createQuietRoom());
  spaces.set('the-archive-space', createArchiveSpace());

  return spaces;
}

/**
 * Get the hub space ID
 */
export function getHubSpaceId(): SpaceId {
  return 'lucys-store';
}
