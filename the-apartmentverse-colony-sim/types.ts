
export enum ZoneType {
    VOID = 0,
    WALL = 1,
    FLOOR = 2,
    SHOP = 3,
    CAFE = 4,
    WORK = 5,
    QUIET = 6,
    BALCONY = 7,
    DEN = 8,
    BASEMENT = 9,
    GARDEN = 10,
    PICNIC = 11,
    SOFT_LAB = 12,
    TERMINAL = 13,
    BACKSTAGE = 14
}

export enum AgentType {
    LUCY = 'LUCY',
    CARL = 'CARL',
    SAGE_CORE = 'SAGE_CORE',
    SAGE_CHEF = 'SAGE_CHEF',
    SAGE_HOLO = 'SAGE_HOLO',
    FOX = 'FOX',
    LALA = 'LALA',
    FENNEC = 'FENNEC'
}

export type ArtifactType = 'comic' | 'meal' | 'comfort_item' | 'desperate_sketch' | 'enhanced_care' | 'infrastructure_note';
export type CharacterId = string;
export type SpaceId = string;

export interface Point {
    x: number;
    y: number;
}

export interface AgentNeeds {
    energy: number;
    purpose: number;
    connection: number;
    stability: number;
}

export interface Motivation {
    type: string;
    intensity: number;
    target?: string;
    description?: string;
    expiresAt?: number;
    eventId?: string; // For linking to specific events
}

export interface Relationship {
    targetId: string;
    type: string;
    strength: number;
}

export interface ChefCircuitState {
    phase: 'creating' | 'traveling' | 'depositing' | 'maintaining';
    nodeIndex: number;
    inventory: number;
    targetSpace: SpaceId | null;
    lastMoveTick: number; // For stall detection
}

export interface HoloCircuitState {
    phase: 'traveling' | 'waiting_for_audience' | 'performing' | 'collecting_narrative';
    venueIndex: number;
    venue: SpaceId;
    ticksWaiting: number;
    currentAudience: string | null;
    narrativeTargetId: string | null;
}

export interface Agent {
    id: string; // This corresponds to CharacterId (e.g., 'carl-toughie')
    name: string;
    type: AgentType;
    color: string;
    x: number;
    y: number;
    target: Point | null;
    path: Point[];
    speed: number;
    tickOffset: number;
    needs: AgentNeeds;
    role: string;
    efficiency: number;
    socialNeed: number;
    currentAction: string;
    history: number[]; // For sparklines
    carrying: string | null; // Artifact ID
    lastCreationTick: number;
    needsRest: boolean;
    
    // New fields for Activity/Movement Systems
    currentSpace: SpaceId;
    motivations: Motivation[];
    relationships: Relationship[];
    lastVisited: Record<string, number>; // SpaceId -> tick timestamp
    foodLocationsVisited: string[]; // Track where they have eaten
    
    // Location Preference Tracking
    lastActivityLocation?: SpaceId;
    lastActivityTick?: number;
    
    // Custom State
    chefState?: ChefCircuitState;
    holoState?: HoloCircuitState;
}

export interface Artifact {
    id: string;
    type: ArtifactType;
    title: string;
    emoji: string;
    creators: string[];
    createdAt: number;
    x: number;
    y: number;
    carrierId: string | null;
    readBy: string[];
    consumedBy: string[]; // For consumables
    status: 'created' | 'transit' | 'delivered' | 'consumed';
    portable: boolean;
    energyRestoration: number;
    needsDelivery?: boolean; // New flag for courier logic
    
    // Organization Tracking
    currentLocation?: SpaceId | 'corridor' | 'in_transit' | 'misplaced';
    organized?: boolean;
    performed?: boolean; // Track if Hologram has performed this
}

export interface CreationTask {
    id: string; // unique key for the task
    type: ArtifactType;
    creators: string[];
    progress: number;
    requiredTicks: number;
}

export interface LogEntry {
    id: string;
    type: string;
    name: string;
    msg: string;
    time: string;
}

export interface SpecialEvent {
    id: string;
    type: 'comic_performance' | 'major_creation';
    tick: number;
    artifactId: string;
    performanceLocation: SpaceId;
    announcerId: string; // Usually Hologram
    status: 'announced' | 'gathering' | 'performing' | 'complete';
    attendees: string[];
}

export interface GameState {
    ticks: number;
    map: number[];
    agents: Agent[];
    artifacts: Artifact[];
    creationTasks: Record<string, CreationTask>;
    currentEvent: SpecialEvent | null;
    l_timer: number;
    width: number;
    height: number;
    tileSize: number;
    logs: LogEntry[];
    nextRestlessTick: number; // For scheduling curiosity cycles
    stats: {
        heatmap: number[];
        colocation: Record<string, number>;
        artifactsCreated: Record<string, number>;
        artifactsConsumed: number;
        deliveriesCompleted: number;
    }
}

export interface CameraState {
    x: number;
    y: number;
    zoom: number;
    followingId: string | null;
}

// Re-export Character alias for compatibility with new files
export type Character = Agent;

// Activity System Types
export type ActivityCategory = 'social' | 'purpose' | 'stability';

export interface ActivityDefinition {
    id: string;
    name: string;
    emoji: string;
    category: ActivityCategory;
    duration: number;
    selfBenefit: number;
    preferredLocations: SpaceId[];
    audienceBenefits: {
        characterId: string;
        energyGain: number;
    }[];
}

export interface Activity {
    name: string;
    emoji: string;
    category: ActivityCategory;
    duration: number;
    selfBenefit: number;
    audienceBenefits: {
        characterId: string;
        energyGain: number;
    }[];
    performerId: string;
    variant?: string;
}

export interface ActivityProgress {
    activity: Activity;
    ticksCompleted: number;
    location: SpaceId;
}

export interface ActivityDecision {
    characterId: string;
    category: ActivityCategory;
    reason: string;
    urgency: number;
    variant?: string;
}
