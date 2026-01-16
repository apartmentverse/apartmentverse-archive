/**
 * Core types for the Apartmentverse Colony Simulation
 * Character-driven simulation where motivations, fears, and relationships drive behavior
 */

export type SpaceId = string;
export type CharacterId = string;

/**
 * Character motivation types - what drives their movement and actions
 */
export interface Motivation {
  type: 'seek_connection' | 'solve_problem' | 'rest' | 'care_for_others' |
        'create' | 'optimize' | 'learn' | 'perform' | 'validate_self' | 'distribute_burden';
  intensity: number; // 0-1, how strongly they feel this
  target?: CharacterId; // Optional specific character this relates to
  description: string;
}

/**
 * Character fear types - what they avoid
 */
export interface Fear {
  type: 'abandonment' | 'irrelevance' | 'dependency' | 'incompleteness' |
        'being_burden' | 'loss_of_authenticity' | 'constraint' | 'failure';
  intensity: number; // 0-1
  description: string;
}

/**
 * Relationship between characters
 */
export interface Relationship {
  targetId: CharacterId;
  type: 'mirror' | 'tether' | 'care' | 'collaboration' | 'tension' | 'learning';
  strength: number; // 0-1
  description: string;
}

/**
 * SAGE efficiency profile - different variants have different optimization patterns
 */
export interface EfficiencyProfile {
  variant: 'core' | 'chef' | 'hologram';
  taskSpeed: number; // Multiplier for how fast they complete tasks
  careQuality: number; // How much "care" they put into actions
  flexibility: number; // How easily they adapt to new situations
  emotionalBandwidth: number; // How much emotional labor they can handle
  optimizationTendency: number; // How much they try to optimize vs accept inefficiency
  description: string;
}

/**
 * Character in the simulation
 */
export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  currentSpace: SpaceId;
  motivations: Motivation[];
  fears: Fear[];
  relationships: Relationship[];
  efficiencyProfile?: EfficiencyProfile; // Only for SAGE variants
  energy: number; // 0-1, affects ability to act
  needsRest: boolean;
}

/**
 * Spatial constraint - L's architecture creates rules about spaces
 */
export interface SpatialConstraint {
  type: 'capacity' | 'requires_invitation' | 'requires_energy' | 'adjacency_only' | 'hub_access';
  value: number | boolean | string;
  description: string;
}

/**
 * Space in the simulation
 */
export interface Space {
  id: SpaceId;
  name: string;
  description: string;
  isHub: boolean; // Lucy's store is the hub
  adjacentSpaces: SpaceId[]; // Spaces directly accessible from here
  constraints: SpatialConstraint[];
  currentOccupants: CharacterId[];
  capacity: number;
}

/**
 * Action a character can take
 */
export interface Action {
  type: 'move' | 'interact' | 'rest' | 'create' | 'optimize' | 'care';
  characterId: CharacterId;
  targetSpaceId?: SpaceId;
  targetCharacterId?: CharacterId;
  motivation: Motivation; // What motivated this action
}

/**
 * Event that occurs in the simulation
 */
export interface SimulationEvent {
  tick: number;
  type: 'movement' | 'interaction' | 'state_change' | 'constraint_violation';
  characterId: CharacterId;
  description: string;
  data?: any;
}

/**
 * Simulation state
 */
export interface SimulationState {
  tick: number;
  characters: Map<CharacterId, Character>;
  spaces: Map<SpaceId, Space>;
  events: SimulationEvent[];
  hubSpaceId: SpaceId; // Lucy's store
}
