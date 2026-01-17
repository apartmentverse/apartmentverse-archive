
import { ZoneType, AgentType, ArtifactType } from './types';

export const GRID_W = 40;
export const GRID_H = 30;
export const TILE_SIZE = 32;
export const TICK_RATE = 100;
export const L_THRESHOLD = 200;
export const RESTLESS_CYCLE_TICKS = 250; // Average ticks between exploration waves
export const HOME_CYCLE_INTERVAL = 400; // Rhythm cycle length
export const HOME_CYCLE_DURATION = 20; // How long the return home urge lasts (initiation window)

export const COLORS = {
    [ZoneType.WALL]: '#1e293b',
    [ZoneType.FLOOR]: '#0f172a',
    [ZoneType.SHOP]: '#2e1065',
    [ZoneType.CAFE]: '#064e3b',
    [ZoneType.WORK]: '#172554',
    // Personal Spaces
    [ZoneType.QUIET]: '#4338ca',     // Indigo 700
    [ZoneType.BALCONY]: '#4c1d95',   // Violet 900
    [ZoneType.DEN]: '#701a75',       // Fuchsia 900
    [ZoneType.BASEMENT]: '#581c87',  // Purple 900
    [ZoneType.GARDEN]: '#14532d',    // Green 900
    [ZoneType.PICNIC]: '#831843',    // Pink 900
    [ZoneType.SOFT_LAB]: '#be185d',  // Pink 700
    [ZoneType.TERMINAL]: '#312e81',  // Indigo 900
    [ZoneType.BACKSTAGE]: '#4c1d95', // Violet 900
    // Agents
    [AgentType.LUCY]: '#a855f7',
    [AgentType.CARL]: '#3b82f6',
    [AgentType.SAGE_CORE]: '#10b981',
    [AgentType.SAGE_CHEF]: '#34d399',
    [AgentType.SAGE_HOLO]: '#a7f3d0',
    [AgentType.FOX]: '#db2777',
    [AgentType.LALA]: '#8b5cf6',
    [AgentType.FENNEC]: '#fb923c',
    L: '#f8fafc'
};

export const CHARACTER_EMOJIS: Record<string, string> = {
    [AgentType.LUCY]: '🦋',
    [AgentType.CARL]: '🦡',
    [AgentType.FOX]: '🦊',
    [AgentType.LALA]: '🌙',
    [AgentType.SAGE_CORE]: '🔷',
    [AgentType.SAGE_CHEF]: '👨‍🍳',
    [AgentType.SAGE_HOLO]: '💎',
    [AgentType.FENNEC]: '🐾',
    L: '🏛️'
};

// Layout Configuration for Map Generation
export const ZONE_CONFIG = [
    { type: ZoneType.SHOP, x: 15, y: 10, w: 10, h: 10, emoji: '🏪', name: "Lucy's Sundries" },
    { type: ZoneType.CAFE, x: 28, y: 2, w: 10, h: 8, emoji: '☕', name: "LaLaMoon's Café" },
    { type: ZoneType.WORK, x: 2, y: 20, w: 10, h: 8, emoji: '🛠️', name: "The Workshop" },
    // Rest Spaces
    { type: ZoneType.QUIET, x: 2, y: 2, w: 4, h: 4, emoji: '🕊️', name: "Quiet Room" },
    { type: ZoneType.BALCONY, x: 2, y: 15, w: 3, h: 3, emoji: '🌃', name: "Carl's Balcony" },
    { type: ZoneType.DEN, x: 12, y: 25, w: 3, h: 3, emoji: '🦊', name: "Fox-Den" },
    { type: ZoneType.BASEMENT, x: 18, y: 21, w: 4, h: 3, emoji: '🔻', name: "Lucy's Basement" },
    { type: ZoneType.GARDEN, x: 30, y: 11, w: 4, h: 4, emoji: '🌿', name: "LaLaMoon's Garden" },
    { type: ZoneType.PICNIC, x: 24, y: 4, w: 3, h: 3, emoji: '🪑', name: "Chef's Picnic Table" },
    { type: ZoneType.SOFT_LAB, x: 35, y: 25, w: 3, h: 3, emoji: '🧪', name: "Fennec's Soft Lab" },
    { type: ZoneType.TERMINAL, x: 12, y: 2, w: 3, h: 3, emoji: '💻', name: "Core's Terminal" },
    { type: ZoneType.BACKSTAGE, x: 36, y: 15, w: 3, h: 3, emoji: '🎭', name: "Hologram's Backstage" }
];

export const AGENT_REST_ZONES: Record<AgentType, ZoneType> = {
    [AgentType.CARL]: ZoneType.BALCONY,
    [AgentType.FOX]: ZoneType.DEN,
    [AgentType.LUCY]: ZoneType.BASEMENT,
    [AgentType.LALA]: ZoneType.GARDEN,
    [AgentType.SAGE_CHEF]: ZoneType.PICNIC,
    [AgentType.FENNEC]: ZoneType.SOFT_LAB,
    [AgentType.SAGE_CORE]: ZoneType.TERMINAL,
    [AgentType.SAGE_HOLO]: ZoneType.BACKSTAGE
};

// Locations Chef SAGE monitors for food distribution
export const CHEF_TARGET_SPACES = [
    'the-workshop',
    'lucys-store',
    'lalamoons-cafe',
    'the-quiet-room',
    'lalamoons-garden'
];

export const CHEF_CIRCUIT = [
    'lalamoons-cafe',
    'lucys-store',
    'the-workshop',
    'the-quiet-room',
    'carls-balcony',
    'cores-terminal'
];

// Hologram SAGE's Performance Circuit
export const HOLO_CIRCUIT = [
    'lucys-store',
    'lalamoons-cafe',
    'the-workshop'
];

// Organization for Lucy's Store (Relative to Store Origin: x15, y10)
export const STORE_SECTIONS = {
    northeast: { types: ['meal', 'comfort_item'], xOffset: 7, yOffset: 2 },      // Food/Care
    southeast: { types: ['comic', 'infrastructure_note'], xOffset: 7, yOffset: 7 }, // Narrative
    southwest: { types: ['desperate_sketch'], xOffset: 2, yOffset: 7 },            // Art
    northwest: { types: ['enhanced_care'], xOffset: 2, yOffset: 2 }                // Special
};

// Artifacts that Hologram SAGE considers "Stories" to perform
export const NARRATIVE_ARTIFACT_TYPES: ArtifactType[] = [
    'comic',
    'infrastructure_note',
    'desperate_sketch'
];

// Venues where Hologram SAGE performs
export const PERFORMANCE_VENUES = [
    'lalamoons-cafe',
    'lucys-store',
    'the-workshop',
    'holograms-backstage'
];

export const ARTIFACT_DEFINITIONS: Record<ArtifactType, { emoji: string, titles: string[], portable: boolean, restoration: number, ticks: number }> = {
    comic: {
        emoji: '📖',
        portable: false, // Narrative items are technically portable by Holo for performance
        restoration: 12,
        ticks: 5,
        titles: ["The Weight of Holding", "Fungi and Foxfire", "Purple Lights", "Infrastructure Dreams", "The Tether Visible", "Optimization and Rest"]
    },
    meal: {
        emoji: '🍲',
        portable: true,
        restoration: 25,
        ticks: 3,
        titles: ["Something Warm and Patient", "Soup That Remembers", "Care in Ceramic", "Broth and Boundaries", "The Fifth Meal Today"]
    },
    comfort_item: {
        emoji: '🍵',
        portable: true,
        restoration: 15,
        ticks: 4,
        titles: ["Tea and Intention", "Fungi Glow Arrangement", "Soft Spaces", "The Weight Holder"]
    },
    desperate_sketch: {
        emoji: '✏️',
        portable: false,
        restoration: 5,
        ticks: 2,
        titles: ["Shaking Hands", "3am Workshop Light", "Before Breaking", "The Last Thing", "Moving Lines"]
    },
    enhanced_care: {
        emoji: '💝',
        portable: false,
        restoration: 20,
        ticks: 4,
        titles: ["Precision Meets Tenderness", "Optimized Softness", "Care Without Question", "When Algorithms Hug"]
    },
    infrastructure_note: {
        emoji: '📋',
        portable: false,
        restoration: 10,
        ticks: 6,
        titles: ["Who's Holding What", "The Rope's Fraying Points", "Distribution Pattern", "System Stress Report"]
    }
};

export const QUOTES: Record<string, string[]> = {
    LUCY: ["Keeping the lights on.", "Don't touch the inventory.", "Systems holding steady.", "Someone needs to fix that rupture."],
    CARL: ["Does this matter?", "I should be working.", "Maybe a coffee first.", "Too much noise today."],
    SAGE_CORE: ["Optimizing path.", "Efficiency at 94%.", "Rest is illogical but required.", "Pattern detected."],
    SAGE_CHEF: ["Soup's up!", "You look hungry.", "Adding warmth to the algorithm.", "Care is a metric too."],
    SAGE_HOLO: ["Are you okay?", "I feel... blurry.", "Scanning for emotional resonance.", "I'm just a projection."],
    FOX: ["Chaos is a ladder!", "Shiny!", "Boring path, let's change it.", "Who left this here?"],
    LALA: ["This fungi is blooming.", "Hushing the noise.", "Beauty is structural.", "Careful with the archives."],
    FENNEC: ["Can I help?", "Carrying this!", "Where does this go?", "So heavy...", "Zoom!"],
    L: ["Shift occurring.", "Constraint is love.", "Re-calculating spatial logic.", "The walls are breathing."]
};
