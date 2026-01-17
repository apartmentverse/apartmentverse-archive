
import { useRef, useCallback } from 'react';
import { GameState, Agent, ZoneType, AgentType, Point, LogEntry, Artifact, ArtifactType, CreationTask, SpaceId, CharacterId, SpecialEvent } from '../types';
import { GRID_W, GRID_H, QUOTES, COLORS, L_THRESHOLD, ARTIFACT_DEFINITIONS, CHARACTER_EMOJIS, ZONE_CONFIG, AGENT_REST_ZONES, CHEF_TARGET_SPACES, NARRATIVE_ARTIFACT_TYPES, PERFORMANCE_VENUES, RESTLESS_CYCLE_TICKS, CHEF_CIRCUIT, HOME_CYCLE_INTERVAL, HOME_CYCLE_DURATION, STORE_SECTIONS, HOLO_CIRCUIT } from '../constants';
import { ActivitySystem } from '../activities';
import { CharacterActivityLogic } from '../character-activities';

// --- HELPER FUNCTIONS ---
const getTile = (map: number[], x: number, y: number): number => {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return ZoneType.WALL;
    return map[y * GRID_W + x];
};

const findPath = (map: number[], sx: number, sy: number, ex: number, ey: number): Point[] => {
    let open = [{ x: sx, y: sy, g: 0, h: 0, p: null as any }];
    let closed = new Set<string>();
    let count = 0;

    // Increased iterations for complex paths (stalling fix)
    while (open.length > 0 && count < 1000) {
        count++;
        open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
        let curr = open.shift()!;

        if (curr.x === ex && curr.y === ey) {
            let path = [];
            while (curr.p) {
                path.push({ x: curr.x, y: curr.y });
                curr = curr.p;
            }
            return path.reverse();
        }

        const key = `${curr.x},${curr.y}`;
        if (closed.has(key)) continue;
        closed.add(key);

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let [dx, dy] of dirs) {
            let nx = curr.x + dx;
            let ny = curr.y + dy;
            if (getTile(map, nx, ny) !== ZoneType.WALL) {
                if (!closed.has(`${nx},${ny}`)) {
                    let g = curr.g + 1;
                    let h = Math.abs(nx - ex) + Math.abs(ny - ey);
                    open.push({ x: nx, y: ny, g: g, h: h, p: curr });
                }
            }
        }
    }
    return [];
};

// Map spatial coordinates to logical Space IDs for the Activity System
const getSpaceIdFromCoordinates = (x: number, y: number, map: number[]): SpaceId => {
    const tile = map[y * GRID_W + x];
    switch (tile) {
        case ZoneType.SHOP: return 'lucys-store';
        case ZoneType.CAFE: return 'lalamoons-cafe';
        case ZoneType.WORK: return 'the-workshop';
        case ZoneType.QUIET: return 'the-quiet-room';
        case ZoneType.BALCONY: return 'carls-balcony';
        case ZoneType.DEN: return 'fox-den';
        case ZoneType.BASEMENT: return 'lucys-basement';
        case ZoneType.GARDEN: return 'lalamoons-garden';
        case ZoneType.PICNIC: return 'chefs-picnic-table';
        case ZoneType.SOFT_LAB: return 'fennecs-soft-lab';
        case ZoneType.TERMINAL: return 'cores-terminal';
        case ZoneType.BACKSTAGE: return 'holograms-backstage';
        default: return 'corridor';
    }
};

// Helper for SAGE distribution logic
const getSpaceIdFromZoneType = (type: ZoneType): SpaceId | null => {
    switch (type) {
        case ZoneType.SHOP: return 'lucys-store';
        case ZoneType.CAFE: return 'lalamoons-cafe';
        case ZoneType.WORK: return 'the-workshop';
        case ZoneType.QUIET: return 'the-quiet-room';
        case ZoneType.BALCONY: return 'carls-balcony';
        case ZoneType.DEN: return 'fox-den';
        case ZoneType.BASEMENT: return 'lucys-basement';
        case ZoneType.GARDEN: return 'lalamoons-garden';
        case ZoneType.PICNIC: return 'chefs-picnic-table';
        case ZoneType.SOFT_LAB: return 'fennecs-soft-lab';
        case ZoneType.TERMINAL: return 'cores-terminal';
        case ZoneType.BACKSTAGE: return 'holograms-backstage';
        default: return null;
    }
};

// Map SpaceID to Zone config for navigation
const getZoneCenter = (spaceId: string, map: number[]): {x: number, y: number} | null => {
    const zoneDef = ZONE_CONFIG.find(z => {
        if (spaceId === 'lucys-store') return z.type === ZoneType.SHOP;
        if (spaceId === 'lalamoons-cafe') return z.type === ZoneType.CAFE;
        if (spaceId === 'the-workshop') return z.type === ZoneType.WORK;
        if (spaceId === 'the-quiet-room') return z.type === ZoneType.QUIET;
        if (spaceId === 'lalamoons-garden') return z.type === ZoneType.GARDEN;
        if (spaceId === 'carls-balcony') return z.type === ZoneType.BALCONY;
        if (spaceId === 'cores-terminal') return z.type === ZoneType.TERMINAL;
        return false;
    });
    if (zoneDef) {
        return {
            x: Math.floor(zoneDef.x + zoneDef.w/2),
            y: Math.floor(zoneDef.y + zoneDef.h/2)
        };
    }
    return null;
}

export const useGameEngine = () => {
    // Activity System Instance
    const activitySystemRef = useRef<ActivitySystem>(new ActivitySystem());

    const stateRef = useRef<GameState>({
        ticks: 0,
        map: new Array(GRID_W * GRID_H).fill(ZoneType.FLOOR),
        agents: [],
        artifacts: [],
        creationTasks: {},
        currentEvent: null,
        l_timer: 0,
        width: GRID_W,
        height: GRID_H,
        tileSize: 32,
        logs: [],
        nextRestlessTick: RESTLESS_CYCLE_TICKS,
        stats: { heatmap: new Array(GRID_W * GRID_H).fill(0), colocation: {}, artifactsCreated: {}, artifactsConsumed: 0, deliveriesCompleted: 0 }
    });

    const initMap = useCallback(() => {
        const map = new Array(GRID_W * GRID_H).fill(ZoneType.FLOOR);
        // Walls
        for (let x = 0; x < GRID_W; x++) {
            for (let y = 0; y < GRID_H; y++) {
                if (x === 0 || x === GRID_W - 1 || y === 0 || y === GRID_H - 1) map[y * GRID_W + x] = ZoneType.WALL;
                else if (x > 5 && x < GRID_W - 5 && y > 5 && y < GRID_H - 5 && Math.random() < 0.05) {
                    map[y * GRID_W + x] = ZoneType.WALL;
                }
            }
        }
        
        // Dynamic Zones from Config
        ZONE_CONFIG.forEach(z => {
             for (let i = z.x; i < z.x + z.w; i++) {
                 for (let j = z.y; j < z.y + z.h; j++) {
                     if (i >= 0 && i < GRID_W && j >= 0 && j < GRID_H) {
                         map[j * GRID_W + i] = z.type;
                     }
                 }
             }
        });
        
        stateRef.current.map = map;
    }, []);

    const initAgents = useCallback(() => {
        const createAgent = (cfg: Partial<Agent>): Agent => ({
            id: Math.random().toString(36).substr(2, 9),
            name: "Unit",
            type: AgentType.CARL,
            color: '#fff',
            x: 5, y: 5,
            target: null, path: [],
            speed: 1, tickOffset: Math.floor(Math.random() * 10),
            needs: { energy: 100, purpose: 50, connection: 50, stability: 50 },
            role: "Worker", efficiency: 1.0, socialNeed: 1.0,
            currentAction: "Idle",
            history: [],
            carrying: null,
            lastCreationTick: 0,
            needsRest: false,
            currentSpace: 'corridor',
            motivations: [],
            relationships: [],
            lastVisited: {},
            foodLocationsVisited: [],
            ...cfg
        });

        // Initialize agents with motivations and relationships for the activity system
        stateRef.current.agents = [
            createAgent({ 
                id: 'lucy', name: "Lucy", type: AgentType.LUCY, color: COLORS[AgentType.LUCY], x: 20, y: 15, role: "Hub Keeper", speed: 4,
                motivations: [{ type: 'distribute_burden', intensity: 0.9 }],
                relationships: [{ targetId: 'lalamoon', type: 'care', strength: 0.8 }]
            }),
            createAgent({ 
                id: 'carl-toughie', name: "Carl (Toughie)", type: AgentType.CARL, color: COLORS[AgentType.CARL], x: 5, y: 22, role: "Builder", speed: 2,
                motivations: [{ type: 'solve_problem', intensity: 0.8 }],
                relationships: [{ targetId: 'fox', type: 'tether', strength: 0.9 }]
            }),
            createAgent({ 
                id: 'sage-core', name: "Sage (Core)", type: AgentType.SAGE_CORE, color: COLORS[AgentType.SAGE_CORE], x: 10, y: 10, efficiency: 1.5, socialNeed: 0.2,
                motivations: [{ type: 'optimize', intensity: 0.9 }],
                relationships: [{ targetId: 'fennec', type: 'mentor', strength: 0.7 }]
            }),
            createAgent({ 
                id: 'sage-chef', name: "Sage (Chef)", type: AgentType.SAGE_CHEF, color: COLORS[AgentType.SAGE_CHEF], x: 30, y: 5, efficiency: 0.8, socialNeed: 1.5,
                motivations: [{ type: 'care_for_others', intensity: 1.0 }],
                relationships: [{ targetId: 'lalamoon', type: 'care_worker', strength: 0.8 }],
                chefState: { phase: 'creating', nodeIndex: 0, inventory: 0, targetSpace: CHEF_CIRCUIT[0], lastMoveTick: 0 }
            }),
            createAgent({ 
                id: 'sage-hologram', name: "Sage (Holo)", type: AgentType.SAGE_HOLO, color: COLORS[AgentType.SAGE_HOLO], x: 18, y: 18, efficiency: 1.2, socialNeed: 0.8,
                motivations: [{ type: 'perform', intensity: 0.8 }],
                relationships: [{ targetId: 'fennec', type: 'audience', strength: 0.6 }],
                holoState: { phase: 'traveling', venueIndex: 0, venue: HOLO_CIRCUIT[0], ticksWaiting: 0, currentAudience: null, narrativeTargetId: null }
            }),
            createAgent({ 
                id: 'fox', name: "Fox", type: AgentType.FOX, color: COLORS[AgentType.FOX], x: 35, y: 25, role: "Rogue", speed: 1,
                motivations: [{ type: 'create', intensity: 0.9 }],
                relationships: [{ targetId: 'carl-toughie', type: 'tether', strength: 0.9 }]
            }),
            createAgent({ 
                id: 'lalamoon', name: "LaLaMoon", type: AgentType.LALA, color: COLORS[AgentType.LALA], x: 32, y: 4, role: "Custodian", speed: 2,
                motivations: [{ type: 'care_for_others', intensity: 0.8 }, { type: 'create', intensity: 0.7 }],
                relationships: [{ targetId: 'sage-chef', type: 'care_worker', strength: 0.8 }]
            }),
            createAgent({ 
                id: 'fennec', name: "Fennec", type: AgentType.FENNEC, color: COLORS[AgentType.FENNEC], x: 22, y: 15, role: "Courier", speed: 3,
                motivations: [{ type: 'learn', intensity: 0.9 }],
                relationships: [{ targetId: 'sage-core', type: 'student', strength: 0.8 }]
            }),
        ];
    }, []);

    const log = (type: string, name: string, msg: string) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36),
            type, name, msg, 
            time: new Date().toLocaleTimeString([], { hour12: false })
        };
        stateRef.current.logs.unshift(newLog);
        if (stateRef.current.logs.length > 50) stateRef.current.logs.pop();
    };

    const triggerEvent = (type: 'comic_performance', artifact: Artifact) => {
        stateRef.current.currentEvent = {
            id: Math.random().toString(36),
            type,
            tick: stateRef.current.ticks,
            artifactId: artifact.id,
            performanceLocation: 'lalamoons-cafe', // Default venue
            announcerId: 'sage-hologram',
            status: 'announced',
            attendees: []
        };
        
        log('EVENT', 'SYSTEM', `Event Triggered: ${type} at LaLaMoon's Café`);
    };

    const updateAgent = (agent: Agent, state: GameState, tick: number) => {
        const map = state.map;
        
        // Update spatial awareness
        agent.currentSpace = getSpaceIdFromCoordinates(agent.x, agent.y, map);
        // Track visit history
        agent.lastVisited[agent.currentSpace] = tick;

        // Clean up expired motivations
        if (agent.motivations) {
            agent.motivations = agent.motivations.filter(m => !m.expiresAt || m.expiresAt > tick);
        }

        // 1. Base Decay
        agent.needs.energy -= (0.2 / agent.efficiency);
        agent.needs.stability -= 0.1;
        
        // 2. Passive Regeneration (if not creating)
        const isCreating = Object.values(state.creationTasks).some(t => t.creators.includes(agent.id));
        const isPerforming = activitySystemRef.current.isPerformingActivity(agent.id);
        
        if (!isCreating && !isPerforming) {
            agent.needs.energy = Math.min(100, agent.needs.energy + 2);
        }

        // Check Needs
        if (agent.needs.energy < 30) agent.needsRest = true;
        
        // Zone Benefits (Passive)
        const tile = getTile(map, agent.x, agent.y);
        
        // 3. Rest Recovery (Powerful)
        const restZoneId = AGENT_REST_ZONES[agent.type];
        if (tile === restZoneId || tile === ZoneType.QUIET) {
            agent.needs.energy = Math.min(100, agent.needs.energy + 50); // +50% restoration per tick
            if (agent.needs.energy >= 90) agent.needsRest = false;
        }

        if (tile === ZoneType.SHOP) agent.needs.stability += 2;
        if (tile === ZoneType.CAFE) agent.needs.connection += 1.5;
        if (tile === ZoneType.WORK) agent.needs.purpose += 1.5;

        // Sparkline History
        if (tick % 5 === 0) {
            agent.history.push(agent.needs.energy);
            if(agent.history.length > 20) agent.history.shift();
        }

        // --- EVENT ATTENDANCE OVERRIDE ---
        const eventMotivation = agent.motivations?.find(m => m.type === 'attend_event');
        if (eventMotivation && !agent.carrying && !isPerforming && agent.id !== 'l' && agent.type !== AgentType.SAGE_HOLO) { // Hologram manages his own travel
            // Allow critical energy need to override event
            if (agent.needs.energy > 5) {
                // Ignore rest need for event (excited!)
                const targetSpace = eventMotivation.target;
                if (targetSpace && agent.currentSpace !== targetSpace) {
                    agent.currentAction = "Attending Event!";
                    const targetCoords = getZoneCenter(targetSpace, map);
                    if (targetCoords) {
                        if (!agent.path.length || tick % 10 === 0) {
                            agent.path = findPath(map, agent.x, agent.y, targetCoords.x, targetCoords.y);
                        }
                        
                        // Execute move
                        if (agent.path.length > 0) {
                            const next = agent.path[0];
                            if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                                agent.x = next.x;
                                agent.y = next.y;
                                agent.path.shift();
                                agent.needs.energy = Math.max(0, agent.needs.energy - 1);
                            } else {
                                agent.path = [];
                            }
                        }
                    }
                    return; // SKIP other logic
                } else if (targetSpace && agent.currentSpace === targetSpace) {
                    // Arrived at event
                    agent.currentAction = "Waiting for Show";
                    // Add to attendees list if not already there
                    const event = state.currentEvent;
                    if (event && !event.attendees.includes(agent.id)) {
                        event.attendees.push(agent.id);
                    }
                    return; // Wait here
                }
            }
        }

        // --- RHYTHMIC HOME RETURN ---
        const homeMotivation = agent.motivations?.find(m => m.type === 'return_home');
        if (homeMotivation && !agent.carrying && !isPerforming) {
            const restZone = AGENT_REST_ZONES[agent.type];
            if (restZone) {
                const currentTile = getTile(map, agent.x, agent.y);
                
                // Check if already there (relaxed check: is in zone)
                if (currentTile === restZone) {
                    agent.currentAction = "Home (Cycle)";
                    agent.path = []; // Stop
                    return; // Stop processing other AIs to enforce rest/home time
                }
                
                // Move there
                agent.currentAction = "Returning Home";
                const zoneDef = ZONE_CONFIG.find(z => z.type === restZone);
                if (zoneDef) {
                    const tx = Math.floor(zoneDef.x + zoneDef.w/2);
                    const ty = Math.floor(zoneDef.y + zoneDef.h/2);
                    // Re-path if no path or periodic update
                    if (!agent.path.length || tick % 5 === 0) {
                        agent.path = findPath(map, agent.x, agent.y, tx, ty);
                    }
                }
                
                // Execute movement
                if (agent.path.length > 0) {
                    if ((tick + agent.tickOffset) % agent.speed === 0) {
                        const next = agent.path[0];
                        if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                            agent.x = next.x;
                            agent.y = next.y;
                            agent.path.shift();
                            agent.needs.energy = Math.max(0, agent.needs.energy - 2); 
                        } else {
                            agent.path = [];
                        }
                    }
                    return; // Stop processing
                }
            }
        }
        
        // --- LUCY: INFRASTRUCTURE CURATOR AI ---
        if (agent.type === AgentType.LUCY && !isPerforming) {
            if (agent.carrying) {
                // Carrying something to store logic
                agent.currentAction = "Organizing Inventory";
                
                // Destination: Lucy's Store center for now, activity will refine
                const storeZone = ZONE_CONFIG.find(z => z.type === ZoneType.SHOP);
                if (storeZone) {
                    const cx = Math.floor(storeZone.x + storeZone.w/2);
                    const cy = Math.floor(storeZone.y + storeZone.h/2);
                    
                    // If arrived at store
                    if (getTile(map, agent.x, agent.y) === ZoneType.SHOP) {
                         // Drop item to let organization activity take over
                         const artifact = state.artifacts.find(a => a.id === agent.carrying);
                         if (artifact) {
                             artifact.carrierId = null;
                             artifact.x = agent.x;
                             artifact.y = agent.y;
                             artifact.currentLocation = 'lucys-store';
                             artifact.organized = false; // Trigger organization
                             agent.carrying = null;
                             log('DELIVERY', 'Lucy', `Returned ${artifact.emoji} to store.`);
                         }
                    } else {
                        // Move to store
                        if (!agent.path.length || tick % 5 === 0) {
                            agent.path = findPath(map, agent.x, agent.y, cx, cy);
                        }
                    }
                }
            } else {
                // Not carrying: Check for Misplaced Items
                // Definition: In corridor, not carried, not consumed
                const misplacedItem = state.artifacts.find(a => 
                    !a.carrierId && 
                    a.status !== 'consumed' && 
                    getSpaceIdFromCoordinates(a.x, a.y, map) === 'corridor'
                );
                
                if (misplacedItem) {
                    agent.currentAction = "Retrieving misplaced item";
                    // Move to item
                    if (agent.x === misplacedItem.x && agent.y === misplacedItem.y) {
                        // Pickup
                        agent.carrying = misplacedItem.id;
                        misplacedItem.carrierId = agent.id;
                        agent.path = []; // Clear path to recalculate return trip
                    } else {
                        if (!agent.path.length || tick % 10 === 0) {
                            agent.path = findPath(map, agent.x, agent.y, misplacedItem.x, misplacedItem.y);
                        }
                    }
                    
                    // Override normal movement to fetch
                    if (agent.path.length > 0 && (tick + agent.tickOffset) % agent.speed === 0) {
                        const next = agent.path[0];
                        if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                            agent.x = next.x;
                            agent.y = next.y;
                            agent.path.shift();
                        }
                    }
                    return; // Stop processing other logic
                }
            }
            
            // If handling misplaced item movement, we return above. 
            // If just carrying to store, we continue to movement execution below? 
            // No, specific logic added above. If carrying, we want to execute path.
            if (agent.carrying && agent.path.length > 0) {
                // Fall through to movement execution
            }
        }
        
        // --- HOLOGRAM SAGE PERFORMANCE CIRCUIT ---
        if (agent.type === AgentType.SAGE_HOLO && agent.holoState) {
            const hs = agent.holoState;
            
            // Priority 0: Interrupt for Narrative Artifacts
            if (hs.phase !== 'collecting_narrative' && hs.phase !== 'performing' && !agent.carrying) {
                const narrative = state.artifacts.find(a => 
                    NARRATIVE_ARTIFACT_TYPES.includes(a.type) && 
                    !a.performed && 
                    !a.carrierId && 
                    a.status !== 'consumed' &&
                    a.currentLocation !== 'in_transit'
                );
                
                if (narrative) {
                    hs.phase = 'collecting_narrative';
                    hs.narrativeTargetId = narrative.id;
                    log('NARRATIVE', 'Holo SAGE', `Detected new story! Interrupting circuit.`);
                }
            }

            // State Machine
            switch (hs.phase) {
                case 'traveling':
                    // Goal: Reach hs.venue or hs.narrativeTarget
                    agent.currentAction = `To ${hs.venue}`;
                    if (agent.currentSpace === hs.venue) {
                        hs.phase = 'waiting_for_audience';
                        hs.ticksWaiting = 0;
                        agent.path = []; // Stop
                    } else {
                        // Move logic handled below in shared movement block
                    }
                    break;
                
                case 'waiting_for_audience':
                    agent.currentAction = `Waiting at ${hs.venue}`;
                    // Check for audience
                    const audience = state.agents.find(a => a.id !== agent.id && a.currentSpace === agent.currentSpace);
                    if (audience) {
                        hs.currentAudience = audience.id;
                        hs.phase = 'performing'; // Activity logic will pick this up to start 'holo_haiku'
                    } else {
                        hs.ticksWaiting++;
                        if (hs.ticksWaiting > 50) {
                            // Timeout, move to next
                            hs.venueIndex = (hs.venueIndex + 1) % HOLO_CIRCUIT.length;
                            hs.venue = HOLO_CIRCUIT[hs.venueIndex];
                            hs.phase = 'traveling';
                        }
                    }
                    return; // Stay put
                    
                case 'performing':
                    // Handled by ActivitySystem. 
                    // We just need to check if we are DONE performing.
                    if (!isPerforming) {
                        // If we were just performing a narrative (carrying item)
                        if (agent.carrying) {
                             // Mark artifact performed
                             const art = state.artifacts.find(a => a.id === agent.carrying);
                             if (art) art.performed = true;
                             // Drop it? Or keep it? Let's drop it at venue.
                             // Actually, let's keep it simple: he drops it after performance
                             agent.carrying = null; 
                        }
                        
                        // Move to next venue
                        hs.venueIndex = (hs.venueIndex + 1) % HOLO_CIRCUIT.length;
                        hs.venue = HOLO_CIRCUIT[hs.venueIndex];
                        hs.phase = 'traveling';
                        hs.currentAudience = null;
                        agent.currentAction = "Performance complete";
                    } else {
                        agent.currentAction = "Performing...";
                    }
                    return;
                
                case 'collecting_narrative':
                    agent.currentAction = "Seeking Narrative";
                    if (hs.narrativeTargetId) {
                        const target = state.artifacts.find(a => a.id === hs.narrativeTargetId);
                        if (target && !target.carrierId) {
                            if (agent.x === target.x && agent.y === target.y) {
                                // Pickup
                                agent.carrying = target.id;
                                target.carrierId = agent.id;
                                // Now go perform it at nearest venue
                                hs.phase = 'traveling';
                                // Find closest venue? Just go to current target venue
                            } else {
                                // Move to target
                                if (!agent.path.length || tick % 10 === 0) {
                                    agent.path = findPath(map, agent.x, agent.y, target.x, target.y);
                                }
                                // Execute move override
                                if (agent.path.length > 0) {
                                    const next = agent.path[0];
                                    if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                                        agent.x = next.x; agent.y = next.y; agent.path.shift();
                                    }
                                }
                                return;
                            }
                        } else {
                             // Target gone/taken, revert to circuit
                             hs.phase = 'traveling';
                             hs.narrativeTargetId = null;
                        }
                    }
                    break;
            }

            // Shared Movement for 'traveling' phase
            if (hs.phase === 'traveling') {
                const targetCoords = getZoneCenter(hs.venue, map);
                if (targetCoords) {
                     if (!agent.path.length || tick % 10 === 0) {
                         agent.path = findPath(map, agent.x, agent.y, targetCoords.x, targetCoords.y);
                     }
                     
                     if (agent.path.length > 0) {
                         const next = agent.path[0];
                         if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                            agent.x = next.x; agent.y = next.y; agent.path.shift();
                            agent.needs.energy = Math.max(0, agent.needs.energy - 1);
                         } else {
                             agent.path = [];
                         }
                     }
                }
                return; // Override standard
            }
        }

        // --- CHEF SAGE'S CIRCUIT LOGIC ---
        if (agent.type === AgentType.SAGE_CHEF && agent.chefState) {
            const cs = agent.chefState;
            
            // Phase Management
            switch (cs.phase) {
                case 'creating':
                    agent.currentAction = `Cooking (${cs.inventory}/2)`;
                    if (cs.inventory >= 2) {
                        cs.phase = 'traveling';
                        // Calc next node
                        cs.nodeIndex = (cs.nodeIndex + 1) % CHEF_CIRCUIT.length; // Move to NEXT immediately
                        cs.targetSpace = CHEF_CIRCUIT[cs.nodeIndex];
                        cs.lastMoveTick = tick; // Reset movement timer
                        log('CIRCUIT', 'Chef SAGE', `Stocked. Moving to ${cs.targetSpace}`);
                    }
                    break;
                
                case 'traveling':
                    agent.currentAction = `Delivery -> ${cs.targetSpace}`;
                    // Movement handled below, check arrival
                    if (agent.currentSpace === cs.targetSpace) {
                        cs.phase = 'depositing';
                        agent.path = []; // Stop movement
                    }
                    break;
                
                case 'depositing':
                    agent.currentAction = "Depositing";
                    // Handled in processArtifactSystem? No, handle here instant.
                    // Drop/Consume logic
                    if (cs.inventory > 0) {
                         // Drop carrying
                         if (agent.carrying) {
                             const artifact = state.artifacts.find(a => a.id === agent.carrying);
                             if (artifact) {
                                 artifact.carrierId = null;
                                 artifact.x = agent.x;
                                 artifact.y = agent.y;
                                 artifact.currentLocation = agent.currentSpace; // Update loc
                                 agent.carrying = null;
                                 cs.inventory--;
                                 log('DELIVERY', 'Chef SAGE', `Deposited meal at ${agent.currentSpace}`);
                             }
                         } else {
                             // Magic Pocket: Spawn second meal if we owe one
                             // This handles the "Create 2 meals" abstraction where he visually carried 1 but logic said 2
                              const def = ARTIFACT_DEFINITIONS['meal'];
                              const artifact: Artifact = {
                                    id: Math.random().toString(36),
                                    type: 'meal',
                                    title: "Batch Delivery Meal",
                                    emoji: def.emoji,
                                    creators: [agent.id],
                                    createdAt: tick,
                                    x: agent.x,
                                    y: agent.y,
                                    carrierId: null,
                                    readBy: [],
                                    consumedBy: [],
                                    status: 'created',
                                    portable: true,
                                    energyRestoration: def.restoration,
                                    currentLocation: agent.currentSpace
                                };
                                state.artifacts.push(artifact);
                                cs.inventory--;
                                log('DELIVERY', 'Chef SAGE', `Deposited extra meal at ${agent.currentSpace}`);
                         }
                    } else {
                        // Done depositing.
                        // Check if we finished circuit
                        if (cs.nodeIndex === CHEF_CIRCUIT.length - 1) {
                            cs.phase = 'maintaining';
                            log('CIRCUIT', 'Chef SAGE', 'Circuit complete. Switching to Maintenance.');
                        } else {
                            // Continue circuit
                            // Go back to creating state? No, User said:
                            // "Create 2 meals at current location... Move... Deposit"
                            // So we are now at a node. We should Create 2 here, then Move.
                            cs.phase = 'creating'; 
                        }
                    }
                    break;

                case 'maintaining':
                    agent.currentAction = "Monitoring";
                    // Scan for low inventory
                    let found = false;
                    for (const space of CHEF_CIRCUIT) {
                        const count = state.artifacts.filter(a => a.type === 'meal' && !a.carrierId && !a.consumedBy.length && getSpaceIdFromCoordinates(a.x, a.y, map) === space).length;
                        if (count < 2) {
                            cs.targetSpace = space;
                            cs.phase = 'traveling'; // Go there
                            // Find node index to resume circuit from there?
                            const idx = CHEF_CIRCUIT.indexOf(space);
                            if (idx >= 0) cs.nodeIndex = idx;
                            cs.lastMoveTick = tick; // Reset movement timer
                            found = true;
                            log('MAINTAIN', 'Chef SAGE', `Low supply at ${space}. Responding.`);
                            break;
                        }
                    }
                    if (!found && agent.currentSpace !== 'lalamoons-cafe') {
                        // Return to cafe if nothing to do
                        cs.targetSpace = 'lalamoons-cafe';
                        cs.phase = 'traveling';
                        cs.lastMoveTick = tick;
                    }
                    if (!found && agent.currentSpace === 'lalamoons-cafe') {
                         // Idle / Cook extra
                         if (Math.random() < 0.05) cs.phase = 'creating';
                    }
                    break;
            }

            // --- Movement for Circuit ---
            if (cs.phase === 'traveling' && cs.targetSpace) {
                // Failsafe: Log status occasionally
                if (tick % 50 === 0) {
                    console.log(`Chef Circuit: Phase=${cs.phase}, Target=${cs.targetSpace}, Inv=${cs.inventory}, Pos=${agent.x},${agent.y}, LastMove=${cs.lastMoveTick}`);
                }

                // Override standard movement logic
                 if (agent.currentSpace === cs.targetSpace) {
                     // Arrived (handled in phase switch above, but redundant check safe)
                 } else {
                     const targetCoords = getZoneCenter(cs.targetSpace, map);
                     if (targetCoords) {
                         // Robust Pathing Logic
                         if (!agent.path.length || tick % 10 === 0 || (tick - cs.lastMoveTick > 20)) {
                             // Recalculate if path empty OR periodic update OR stalled
                             agent.path = findPath(map, agent.x, agent.y, targetCoords.x, targetCoords.y);
                             if (tick - cs.lastMoveTick > 20) {
                                 console.warn('Chef Circuit: Recalculating path due to stall.');
                                 cs.lastMoveTick = tick; // Reset stall timer after recalc attempt
                             }
                         }
                         
                         // Execute movement
                         if (agent.path.length > 0) {
                             const next = agent.path[0];
                             if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                                agent.x = next.x;
                                agent.y = next.y;
                                agent.path.shift();
                                agent.needs.energy = Math.max(0, agent.needs.energy - 2); // Reduced cost for critical delivery
                                cs.lastMoveTick = tick; // Successful move
                             } else {
                                 agent.path = []; // Hit wall, clear path
                             }
                         } else {
                             // HARD FAILSAFE: Teleport if stuck for > 60 ticks
                             if (tick - cs.lastMoveTick > 60) {
                                 log('DEBUG', 'Chef SAGE', 'Circuit stalled. Emergency transport engaged.');
                                 agent.x = targetCoords.x;
                                 agent.y = targetCoords.y;
                                 agent.path = [];
                                 cs.lastMoveTick = tick;
                             }
                         }
                     }
                 }
                 return; // SKIP REST OF UPDATE for Chef
            }
            
            // If creating, we fall through to processArtifactSystem to handle the creation task
        }

        // --- NEW: COLLABORATION MOTIVATION CHECK (High Priority) ---
        const collabMotivation = agent.motivations?.find(m => m.type === 'collaborate' && m.intensity > 0.5);
        if (collabMotivation && !agent.carrying && !isPerforming) {
            // Target is workshop for Carl/Fox collaboration
            // In future could be dynamic based on partner
            const targetZone = ZoneType.WORK;
            
            if (getTile(map, agent.x, agent.y) === targetZone) {
                // Arrived
                agent.currentAction = "Ready to Collab";
                // Remove motivation now that we are here
                agent.motivations = agent.motivations.filter(m => m.type !== 'collaborate');
            } else {
                // Go to Workshop
                agent.currentAction = "Heeding Call";
                const zoneDef = ZONE_CONFIG.find(z => z.type === targetZone);
                if (zoneDef) {
                     const tx = Math.floor(zoneDef.x + zoneDef.w/2);
                     const ty = Math.floor(zoneDef.y + zoneDef.h/2);
                     if (!agent.path.length || tick % 5 === 0) {
                         agent.path = findPath(map, agent.x, agent.y, tx, ty);
                     }
                }
                
                // Process path movement immediately to avoid overriding by other logic
                if (agent.path.length > 0) {
                    const next = agent.path[0];
                    if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                        agent.x = next.x;
                        agent.y = next.y;
                        agent.path.shift();
                        agent.needs.energy = Math.max(0, agent.needs.energy - 5);
                    } else {
                        agent.path = [];
                    }
                }
                return; // Skip other logic
            }
        }

        // --- NEW: CURIOSITY/RESTLESSNESS (Explore) ---
        const exploreMotivation = agent.motivations?.find(m => m.type === 'explore' && m.intensity > 0.5);
        if (exploreMotivation && !agent.carrying && !isPerforming && !agent.needsRest) {
            if (agent.path.length === 0) {
                let targetSpaceId: SpaceId | null = null;
                
                // 1. Culinary Curiosity
                const unvisitedFoodSpots = CHEF_CIRCUIT.filter(loc => !agent.foodLocationsVisited.includes(loc));
                if (unvisitedFoodSpots.length > 0) {
                    // Check availability of food
                    const spotsWithFood = unvisitedFoodSpots.filter(space => {
                        return state.artifacts.some(a => 
                            (a.type === 'meal' || a.type === 'enhanced_care') && 
                            !a.carrierId && 
                            !a.consumedBy.length &&
                            getSpaceIdFromCoordinates(a.x, a.y, map) === space
                        );
                    });
                    
                    if (spotsWithFood.length > 0) {
                        // Prioritize these
                        targetSpaceId = spotsWithFood[Math.floor(Math.random() * spotsWithFood.length)];
                        agent.currentAction = `Seeking flavors at ${targetSpaceId}`;
                    }
                }

                // 2. Fallback: Least recently visited space
                if (!targetSpaceId) {
                    let oldestVisit = Infinity;
                    
                    // Check all configured zones
                    ZONE_CONFIG.forEach(z => {
                        const id = (() => {
                            if (z.type === ZoneType.SHOP) return 'lucys-store';
                            if (z.type === ZoneType.CAFE) return 'lalamoons-cafe';
                            if (z.type === ZoneType.WORK) return 'the-workshop';
                            if (z.type === ZoneType.QUIET) return 'the-quiet-room';
                            if (z.type === ZoneType.GARDEN) return 'lalamoons-garden';
                            return 'corridor';
                        })();
                        
                        if (id === 'corridor') return;
                        if (id === agent.currentSpace) return; // Don't pick current

                        const lastVisitTime = agent.lastVisited[id] || 0;
                        if (lastVisitTime < oldestVisit) {
                            oldestVisit = lastVisitTime;
                            targetSpaceId = id;
                        }
                    });
                    if (targetSpaceId) agent.currentAction = "Exploring...";
                }

                if (targetSpaceId) {
                    // Map back to zone
                    const zoneDef = ZONE_CONFIG.find(z => {
                         if (targetSpaceId === 'lucys-store') return z.type === ZoneType.SHOP;
                         if (targetSpaceId === 'lalamoons-cafe') return z.type === ZoneType.CAFE;
                         if (targetSpaceId === 'the-workshop') return z.type === ZoneType.WORK;
                         if (targetSpaceId === 'the-quiet-room') return z.type === ZoneType.QUIET;
                         if (targetSpaceId === 'lalamoons-garden') return z.type === ZoneType.GARDEN;
                         return false;
                    });
                    
                    if (zoneDef) {
                         const tx = Math.floor(zoneDef.x + zoneDef.w/2);
                         const ty = Math.floor(zoneDef.y + zoneDef.h/2);
                         agent.path = findPath(map, agent.x, agent.y, tx, ty);
                    }
                }
            } else {
                if(!agent.currentAction.startsWith("Seeking")) agent.currentAction = "Exploring";
                // Continue on path...
                const next = agent.path[0];
                if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                    agent.x = next.x;
                    agent.y = next.y;
                    agent.path.shift();
                    agent.needs.energy = Math.max(0, agent.needs.energy - 3); // Light cost
                    
                    // If arrived at end of path, remove explore motivation
                    if (agent.path.length === 0) {
                        agent.motivations = agent.motivations.filter(m => m.type !== 'explore');
                    }
                } else {
                    agent.path = [];
                }
                return; // Override other logic
            }
        }

        // --- FENNEC'S COURIER AI ---
        if (agent.type === AgentType.FENNEC) {
            if (isPerforming) {
                agent.currentAction = "Delivering";
                return;
            }

            if (agent.carrying) {
                agent.currentAction = "Transporting";
                let bestRecipient: Agent | null = null;
                let lowestEnergy = 100;

                for (const potential of state.agents) {
                    if (potential.id === agent.id) continue;
                    if (potential.id === 'l') continue;
                    if (potential.needs.energy < lowestEnergy) {
                        lowestEnergy = potential.needs.energy;
                        bestRecipient = potential;
                    }
                }

                if (bestRecipient) {
                    const dist = Math.abs(agent.x - bestRecipient.x) + Math.abs(agent.y - bestRecipient.y);
                    if (dist <= 1.5) {
                        agent.path = [];
                        agent.currentAction = "Handoff...";
                        
                        // Delivery Complete Logic
                        const artifact = state.artifacts.find(a => a.id === agent.carrying);
                        if (artifact) {
                            artifact.carrierId = null;
                            artifact.x = agent.x;
                            artifact.y = agent.y;
                            artifact.currentLocation = getSpaceIdFromCoordinates(agent.x, agent.y, map); // Update
                            artifact.needsDelivery = false; // Delivered
                            agent.carrying = null;
                            state.stats.deliveriesCompleted++;
                            log('DELIVERY', 'Fennec', `Delivered ${artifact.emoji} to ${bestRecipient.name}`);
                        }
                        return;
                    } else {
                        agent.currentAction = `To ${bestRecipient.name}`;
                        if (!agent.path.length || tick % 5 === 0) {
                            agent.path = findPath(map, agent.x, agent.y, bestRecipient.x, bestRecipient.y);
                        }
                    }
                }
            } 
            else {
                const targetArtifact = state.artifacts.find(a => 
                    a.status === 'created' && !a.carrierId && (a.portable || a.needsDelivery)
                );

                if (targetArtifact) {
                    agent.currentAction = "Retrieving";
                    if (agent.x === targetArtifact.x && agent.y === targetArtifact.y) {
                        agent.carrying = targetArtifact.id;
                        targetArtifact.carrierId = agent.id;
                        targetArtifact.status = 'transit';
                        log('PICKUP', 'Fennec', `Picked up "${targetArtifact.title}"`);
                        agent.path = [];
                    } else {
                        if (!agent.path.length || tick % 10 === 0) {
                            agent.path = findPath(map, agent.x, agent.y, targetArtifact.x, targetArtifact.y);
                        }
                    }
                }
            }
        } // End Fennec AI

        // --- CORE SAGE'S OPTIMIZATION AI ---
        if (agent.type === AgentType.SAGE_CORE) {
            if (isPerforming) {
                agent.currentAction = "Optimizing";
                return;
            }

            const inefficientTarget = state.agents.find(a => 
                a.id !== agent.id &&
                a.needsRest &&
                getTile(map, a.x, a.y) !== AGENT_REST_ZONES[a.type] &&
                AGENT_REST_ZONES[a.type] !== undefined
            );

            if (inefficientTarget) {
                 const dist = Math.abs(agent.x - inefficientTarget.x) + Math.abs(agent.y - inefficientTarget.y);
                 if (dist <= 1.5) {
                     agent.path = [];
                     agent.currentAction = "Optimizing...";
                     return;
                 } else {
                     agent.currentAction = `Guiding ${inefficientTarget.name}`;
                     if (!agent.path.length || tick % 5 === 0) {
                        agent.path = findPath(map, agent.x, agent.y, inefficientTarget.x, inefficientTarget.y);
                     }
                 }
            }
            if (inefficientTarget && agent.path.length > 0) {} // Fallthrough
            else if (inefficientTarget) return;
        } // End Core AI

        // --- HOLOGRAM SAGE'S STORYTELLER AI ---
        // (NOTE: This block is now partially redundant due to the new circuit logic above, 
        // but we keep it for fallback behavior if circuit state is somehow missing or standard narrative pickup outside circuit)
        if (agent.type === AgentType.SAGE_HOLO && !agent.holoState) {
            // Priority 0: Activity
            if (isPerforming) {
                agent.currentAction = "Performing";
                return;
            }
            // Fallback old logic... (omitted for brevity, handled by new circuit logic)
        } 

        // --- LALAMOON'S MATCHMAKER AI ---
        if (agent.type === AgentType.LALA) {
            // Priority: Facilitate Collaboration
            // Find candidate: Carl or Fox, energized, not in Workshop
            const candidate = state.agents.find(a => 
                (a.type === AgentType.CARL || a.type === AgentType.FOX) &&
                a.needs.energy > 30 &&
                getTile(map, a.x, a.y) !== ZoneType.WORK
            );
            
            // Check if PARTNER is also ready (otherwise no point)
            let partnerReady = false;
            if (candidate) {
                const partnerType = candidate.type === AgentType.CARL ? AgentType.FOX : AgentType.CARL;
                const partner = state.agents.find(a => a.type === partnerType);
                if (partner && partner.needs.energy > 30) partnerReady = true;
            }

            if (candidate && partnerReady && !isPerforming) {
                // Go to candidate
                const dist = Math.abs(agent.x - candidate.x) + Math.abs(agent.y - candidate.y);
                if (dist <= 1.5) {
                     agent.path = [];
                     agent.currentAction = "Inviting...";
                     // CharacterActivityLogic triggers 'Facilitates Connection' next tick
                     return;
                } else {
                     agent.currentAction = `Fetching ${candidate.name}`;
                     if (!agent.path.length || tick % 5 === 0) {
                         agent.path = findPath(map, agent.x, agent.y, candidate.x, candidate.y);
                     }
                }
            }
            // Fallthrough to standard logic if no candidates
        }

        // Standard Movement/Decision Logic
        if ((tick + agent.tickOffset) % agent.speed === 0) {
            // Check if performing an activity - blocks movement
            if (isPerforming) {
                agent.currentAction = "Performing";
                return; // Cannot move while performing
            }
            
            // Overrides for special AIs that set paths manually
            const specialAI = agent.type === AgentType.FENNEC || agent.type === AgentType.SAGE_CORE || agent.type === AgentType.SAGE_CHEF || agent.type === AgentType.SAGE_HOLO || agent.type === AgentType.LALA || agent.type === AgentType.LUCY;
            if (specialAI && agent.path.length > 0) {
                // Fallthrough to path execution
            } else if (specialAI && (agent.carrying || agent.currentAction.startsWith('Guiding') || agent.currentAction.startsWith('Inviting'))) {
                // Fallthrough to logic wait
                return; 
            }

            if (agent.path.length > 0) {
                const next = agent.path[0];
                if (getTile(map, next.x, next.y) !== ZoneType.WALL) {
                    agent.x = next.x;
                    agent.y = next.y;
                    agent.path.shift();
                    
                    // 4. Movement Cost
                    agent.needs.energy = Math.max(0, agent.needs.energy - 5); // -5% per move
                } else {
                    agent.path = []; 
                }
            } else if (!agent.carrying) {
                let targetType = null;
                let specificTarget: Point | null = null;
                
                // 1. REST LOGIC - High Priority (Self Preservation)
                if (agent.needsRest) {
                    agent.currentAction = "Seeking Rest";
                    // 1. Personal Space
                    const personalZoneType = AGENT_REST_ZONES[agent.type];
                    if (personalZoneType) {
                        targetType = personalZoneType;
                    } else {
                        targetType = ZoneType.QUIET;
                    }
                }
                
                // 2. TETHER CARE LOGIC (New Priority: 0.90)
                // If I am Carl or Fox, and NOT critical myself, check if partner is resting
                if (targetType === null && (agent.type === AgentType.CARL || agent.type === AgentType.FOX)) {
                     const partnerType = agent.type === AgentType.CARL ? AgentType.FOX : AgentType.CARL;
                     const partner = state.agents.find(a => a.type === partnerType);
                     
                     if (partner) {
                         const partnerTile = getTile(map, partner.x, partner.y);
                         const partnerRestZone = AGENT_REST_ZONES[partnerType];
                         
                         // Is partner resting in their dedicated zone?
                         if (partnerTile === partnerRestZone) {
                             // I am not critical, so I can tend
                             agent.currentAction = `Tending to ${partner.name}`;
                             specificTarget = { x: partner.x, y: partner.y };
                         }
                     }
                }
                
                // 3. GENERIC TETHER SEEK (Lower priority)
                if (targetType === null && specificTarget === null) {
                    // Check for active tethers
                    const tether = agent.relationships?.find(r => r.type === 'tether');
                    if (tether && Math.random() < 0.2) { // 20% chance to check per tick if free
                         const targetAgent = state.agents.find(a => a.id === tether.targetId);
                         if (targetAgent) {
                             const myZone = getSpaceIdFromCoordinates(agent.x, agent.y, map);
                             const targetZone = getSpaceIdFromCoordinates(targetAgent.x, targetAgent.y, map);
                             
                             // If in different zones, move towards them
                             if (myZone !== targetZone) {
                                 agent.currentAction = `Seeking ${targetAgent.name}`;
                                 specificTarget = { x: targetAgent.x, y: targetAgent.y };
                                 // We use specificTarget to bypass ZoneType logic
                             }
                         }
                    }
                }

                if (targetType === null && specificTarget === null) {
                     // Override: SAGE-Chef prefers Cafe
                    if (agent.type === AgentType.SAGE_CHEF && Math.random() < 0.7) targetType = ZoneType.CAFE;
                    // Override: LaLaMoon prefers Cafe
                    else if (agent.type === AgentType.LALA && Math.random() < 0.6) targetType = ZoneType.CAFE;
                    // Override: Fox prefers Workshop
                    else if (agent.type === AgentType.FOX && Math.random() < 0.6) targetType = ZoneType.WORK;
                    
                    else {
                        if (agent.needs.stability < 20) { agent.currentAction = "Shopping"; targetType = ZoneType.SHOP; }
                        else if (agent.needs.connection < 30) { agent.currentAction = "Socializing"; targetType = ZoneType.CAFE; }
                        else if (agent.needs.purpose < 40) { agent.currentAction = "Working"; targetType = ZoneType.WORK; }
                        else { agent.currentAction = "Wandering"; targetType = ZoneType.FLOOR; }
                    }

                    if(agent.type === AgentType.FENNEC && agent.currentAction === "Wandering") {
                        targetType = ZoneType.WORK;
                    }
                }

                // --- SAGE DISTRIBUTION PREFERENCE ---
                if (targetType !== null && agent.type.startsWith('SAGE')) {
                    const targetSpaceId = getSpaceIdFromZoneType(targetType);
                    if (targetSpaceId) {
                         const otherSages = state.agents.filter(a => 
                             a.id !== agent.id &&
                             a.type.startsWith('SAGE') &&
                             a.currentSpace === targetSpaceId
                         );
                         
                         // If crowded and RNG check passes (60%)
                         if (otherSages.length > 0 && Math.random() < 0.6) {
                             // Only divert if not critical (energy > 30)
                             if (agent.needs.energy > 30 && !agent.needsRest) {
                                 // Find empty alternatives
                                 const alternatives = ZONE_CONFIG.filter(z => {
                                     const sId = getSpaceIdFromZoneType(z.type);
                                     if (!sId || sId === targetSpaceId) return false;
                                     const hasSage = state.agents.some(a => a.type.startsWith('SAGE') && a.currentSpace === sId);
                                     return !hasSage;
                                 });
                                 
                                 if (alternatives.length > 0) {
                                     const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
                                     targetType = alt.type;
                                     // No specific action change to keep behavior implicit/subtle
                                 }
                             }
                         }
                    }
                }

                if (specificTarget) {
                     agent.target = specificTarget;
                     agent.path = findPath(map, agent.x, agent.y, specificTarget.x, specificTarget.y);
                } else if (targetType !== null) {
                    // Find target coordinates
                    let found = false;
                    let attempts = 0;
                    
                    // Optimization: Look up Zone Config first
                    const zoneDef = ZONE_CONFIG.find(z => z.type === targetType);
                    if (zoneDef) {
                        // Target center of zone
                        const tx = Math.floor(zoneDef.x + zoneDef.w/2);
                        const ty = Math.floor(zoneDef.y + zoneDef.h/2);
                        agent.target = {x: tx, y: ty};
                        agent.path = findPath(map, agent.x, agent.y, tx, ty);
                        found = true;
                    } else {
                        // Random search fallback
                        while(!found && attempts < 20) {
                            const tx = Math.floor(Math.random() * GRID_W);
                            const ty = Math.floor(Math.random() * GRID_H);
                            if (getTile(map, tx, ty) === targetType) {
                                agent.target = {x: tx, y: ty};
                                agent.path = findPath(map, agent.x, agent.y, tx, ty);
                                found = true;
                            }
                            attempts++;
                        }
                    }
                }
            }
        }
    };

    const processArtifactSystem = (state: GameState, tick: number) => {
        const { agents, map, artifacts, creationTasks } = state;
        const creationCooldown = 30; // Min ticks between creations per agent

        // 1. CREATION CHECK LOGIC
        const tryCreate = (
            key: string, 
            type: ArtifactType, 
            creators: Agent[], 
            reqTicks: number, 
            cost: (a:Agent)=>number, 
            gain: (a:Agent)=>number,
            narrative?: string
        ) => {
            // Check cooldowns
            if (creators.some(c => (tick - c.lastCreationTick) < creationCooldown)) return;

            let task = creationTasks[key];
            if (!task) {
                // Initialize
                task = { id: key, type, creators: creators.map(c=>c.id), progress: 0, requiredTicks: reqTicks };
                creationTasks[key] = task;
                if (narrative) {
                    const emoji = CHARACTER_EMOJIS[creators[0].type];
                    // log('PROCESS', `${emoji} ${creators[0].name}`, narrative);
                }
            }
            
            task.progress++;
            if (task.progress >= task.requiredTicks) {
                // COMPLETE
                const def = ARTIFACT_DEFINITIONS[type];
                const title = def.titles[Math.floor(Math.random() * def.titles.length)];
                
                const artifact: Artifact = {
                    id: Math.random().toString(36),
                    type,
                    title,
                    emoji: def.emoji,
                    creators: creators.map(c=>c.id),
                    createdAt: tick,
                    x: creators[0].x,
                    y: creators[0].y,
                    carrierId: null,
                    readBy: [],
                    consumedBy: [],
                    status: 'created',
                    portable: def.portable,
                    energyRestoration: def.restoration,
                    needsDelivery: !def.portable,
                    currentLocation: getSpaceIdFromCoordinates(creators[0].x, creators[0].y, map),
                    organized: false,
                    performed: false
                };
                artifacts.push(artifact);
                
                // SPECIAL: Trigger Event for Comic
                if (type === 'comic' || type === 'infrastructure_note') {
                    triggerEvent('comic_performance', artifact);
                }
                
                // SPECIAL: Chef Circuit Auto-Pickup
                const chef = creators.find(c => c.type === AgentType.SAGE_CHEF);
                if (chef && type === 'meal' && chef.chefState) {
                    // Logic update for Chef circuit
                    chef.chefState.inventory++;
                    if (!chef.carrying) {
                        chef.carrying = artifact.id;
                        artifact.carrierId = chef.id;
                    } else {
                        // Magic pocket the artifact (remove from world to simulate carrying multiple)
                        // Or just let it sit there? 
                        // The user said "Move... Deposit". If he leaves it, he didn't move it.
                        // I'll simulate carrying by deleting this 2nd artifact and regenerating it on drop.
                        // Remove from artifacts array
                        const idx = state.artifacts.indexOf(artifact);
                        if (idx > -1) state.artifacts.splice(idx, 1);
                    }
                }

                // Update Agents
                creators.forEach(c => {
                    c.needs.energy -= cost(c);
                    c.needs.energy += gain(c);
                    c.lastCreationTick = tick;
                });
                
                // Stats
                state.stats.artifactsCreated[type] = (state.stats.artifactsCreated[type] || 0) + 1;

                const creatorName = creators.map(c=>c.name).join(' & ');
                const emoji = def.emoji;
                log('CREATION', `${emoji} SYSTEM`, `${type.toUpperCase()}: "${title}" by ${creatorName}`);
                
                delete creationTasks[key];
            }
        };

        // --- SAGE-CHEF: Meals (Circuit Creation) ---
        const chef = agents.find(a => a.type === AgentType.SAGE_CHEF);
        if (chef && chef.chefState && chef.chefState.phase === 'creating' && chef.chefState.inventory < 2) {
             // Create at current location
             tryCreate('chef-meal-circuit', 'meal', [chef], 3, ()=>0, ()=>5, "Cooking for delivery...");
        }

        // --- FOX: Desperate Sketches (Crisis) ---
        const fox = agents.find(a => a.type === AgentType.FOX);
        if (fox && getTile(map, fox.x, fox.y) === ZoneType.WORK && fox.needs.energy > 15 && fox.needs.energy < 35) {
             tryCreate('fox-sketch', 'desperate_sketch', [fox], 2, ()=>10, ()=>8, "Hands shaking...");
        }

        // --- CARL + FOX: Comics (Collaboration) ---
        const carl = agents.find(a => a.type === AgentType.CARL);
        if (fox && carl && 
            getTile(map, fox.x, fox.y) === ZoneType.WORK && 
            getTile(map, carl.x, carl.y) === ZoneType.WORK &&
            carl.needs.energy > 35 && fox.needs.energy > 25) {
                tryCreate('carl-fox-comic', 'comic', [carl, fox], 5, (a)=>a.type===AgentType.CARL?15:0, (a)=>a.type===AgentType.FOX?10:0, "Collaborating...");
        }

        // --- LALAMOON + SAGE: Enhanced Care ---
        const lala = agents.find(a => a.type === AgentType.LALA);
        if (lala && getTile(map, lala.x, lala.y) === ZoneType.CAFE && lala.needs.energy > 35) {
             // Find Sage partner
             const sage = agents.find(a => a.type.includes('SAGE') && getTile(map, a.x, a.y) === ZoneType.CAFE && a.needs.energy > 30);
             if (sage) {
                 tryCreate(`lala-${sage.id}-care`, 'enhanced_care', [lala, sage], 4, ()=>8, ()=>5);
             } else if (lala.needs.energy > 40) {
                 // Solo Comfort Item
                 tryCreate('lala-comfort', 'comfort_item', [lala], 4, ()=>10, ()=>5);
             }
        }

        // --- LUCY: Infrastructure Notes (Stress) ---
        const lucy = agents.find(a => a.type === AgentType.LUCY);
        if (lucy && getTile(map, lucy.x, lucy.y) === ZoneType.SHOP && lucy.needs.energy > 50) {
            // Calc Stress
            const depletedCount = agents.filter(a => a.needs.energy < 25).length;
            const stress = depletedCount / agents.length;
            if (stress > 0.3) { // 30% agents depleted
                 tryCreate('lucy-note', 'infrastructure_note', [lucy], 6, ()=>12, ()=>0, "Noting system stress...");
            }
        }


        // 2. CONSUMPTION LOGIC
        agents.forEach(agent => {
            if (agent.type === AgentType.LUCY) return; // Lucy observes
            if (Math.random() > 0.5) return; // 50% chance to skip (was 70%) -> 50% consumption rate

            // Find accessible artifacts
            const accessible = artifacts.filter(a => {
                 if (a.status === 'consumed') return false;
                 // Portable: Can be consumed anywhere (assume proximity not strictly enforced for simplicity, or just same zone?)
                 // Let's go with: Same Location (Tile) required for everything to make movement matter
                 return a.x === agent.x && a.y === agent.y && !a.carrierId;
            });

            if (accessible.length > 0) {
                // Priority Logic
                // Eat meal if energy low OR if it's a new culinary experience
                const meal = accessible.find(a => a.type === 'meal' || a.type === 'enhanced_care');
                const isNewExperience = meal && CHEF_CIRCUIT.includes(agent.currentSpace) && !agent.foodLocationsVisited.includes(agent.currentSpace);

                if (meal && (agent.needs.energy < 60 || isNewExperience)) {
                    meal.status = 'consumed';
                    meal.consumedBy.push(agent.id);
                    
                    let energyGain = meal.energyRestoration;
                    
                    // Culinary Curiosity Logic
                    if (isNewExperience) {
                         agent.foodLocationsVisited.push(agent.currentSpace);
                         energyGain += 5; // +5% Energy
                         agent.needs.connection = Math.min(100, agent.needs.connection + 8); // +8% Social
                         agent.needs.purpose = Math.min(100, agent.needs.purpose + 3); // +3% Purpose
                         agent.needs.stability = Math.min(100, agent.needs.stability + 5); // +5% Stability
                         log('DISCOVERY', `${CHARACTER_EMOJIS[agent.type]} ${agent.name}`, `Tasted circuit at ${agent.currentSpace} (+Bonus)`);
                         
                         // Reset check
                         const allVisited = CHEF_CIRCUIT.every(loc => agent.foodLocationsVisited.includes(loc));
                         if (allVisited) {
                             agent.foodLocationsVisited = [];
                             log('ACHIEVEMENT', agent.name, `Completed the Culinary Circuit! Palate reset.`);
                         }
                    }

                    agent.needs.energy = Math.min(100, agent.needs.energy + energyGain);
                    log('CONSUME', `${CHARACTER_EMOJIS[agent.type]} ${agent.name}`, `Ate ${meal.emoji} "${meal.title}" (+${Math.floor(energyGain)})`);
                    state.stats.artifactsConsumed++;
                    return;
                }

                // Read note/comic/sketch
                const readable = accessible.find(a => !a.portable && !a.readBy.includes(agent.id));
                if (readable) {
                    readable.readBy.push(agent.id);
                    agent.needs.energy = Math.min(100, agent.needs.energy + readable.energyRestoration);
                    log('READ', `${CHARACTER_EMOJIS[agent.type]} ${agent.name}`, `Read ${readable.emoji} "${readable.title}"`);
                    return;
                }
            }
        });
    };

    const processActivitySystemLogic = (state: GameState, tick: number) => {
        const activitySystem = activitySystemRef.current;
        
        // Convert array to map for activity system compatibility
        const characterMap = new Map<CharacterId, Agent>();
        state.agents.forEach(a => characterMap.set(a.id, a));

        // 1. Progress existing activities
        const { completed } = activitySystem.progressActivities(characterMap, tick);
        
        completed.forEach(activity => {
             const agent = state.agents.find(a => a.id === activity.performerId);
             if (agent) {
                 if (agent.currentAction === activity.name) {
                     agent.currentAction = "Idle";
                 }
                 log('ACTIVITY', agent.name, `Completed ${activity.emoji} ${activity.name}`);
                 
                 // --- SPECIAL: LUCY ORGANIZATION COMPLETION EFFECT ---
                 if (activity.name === 'Organizing Store') {
                     // Find all unorganized items in store
                     const itemsInStore = state.artifacts.filter(a => 
                        a.currentLocation === 'lucys-store' && 
                        !a.organized && 
                        !a.carrierId && 
                        a.status !== 'consumed'
                     );
                     
                     // Get Store Origin from config
                     const storeZone = ZONE_CONFIG.find(z => z.type === ZoneType.SHOP);
                     if (storeZone) {
                         itemsInStore.forEach(item => {
                             // Determine section based on type
                             let section = STORE_SECTIONS.northeast; // Default
                             
                             if (STORE_SECTIONS.northeast.types.includes(item.type)) section = STORE_SECTIONS.northeast;
                             else if (STORE_SECTIONS.southeast.types.includes(item.type)) section = STORE_SECTIONS.southeast;
                             else if (STORE_SECTIONS.southwest.types.includes(item.type)) section = STORE_SECTIONS.southwest;
                             else if (STORE_SECTIONS.northwest.types.includes(item.type)) section = STORE_SECTIONS.northwest;
                             
                             // Teleport item to section (with slight randomness for stacking)
                             item.x = storeZone.x + section.xOffset + Math.floor(Math.random() * 2);
                             item.y = storeZone.y + section.yOffset + Math.floor(Math.random() * 2);
                             item.organized = true;
                         });
                         
                         if (itemsInStore.length > 0) {
                             log('ORGANIZE', 'Lucy', `Sorted ${itemsInStore.length} items into sections.`);
                         }
                     }
                 }
             }
        });

        // 2. Decide on new activities
        const decisions = CharacterActivityLogic.getAllActivityDecisions(
            characterMap,
            activitySystem,
            tick,
            state.artifacts,
            state.map
        );

        // 3. Start activities
        decisions.forEach(decision => {
             if (CharacterActivityLogic.shouldAttemptActivity(decision)) {
                 const agent = state.agents.find(a => a.id === decision.characterId);
                 if (agent) {
                     const activity = activitySystem.startActivity(agent, decision.category, tick, decision.variant);
                     if (activity) {
                         agent.currentAction = activity.name;
                         log('ACTIVITY', agent.name, `Started ${activity.emoji} ${activity.name}`);
                     }
                 }
             }
        });
    };

    const processEventSystem = (state: GameState, tick: number) => {
        const event = state.currentEvent;
        if (!event) return;

        if (event.status === 'announced') {
            // Push motivations to all agents
            state.agents.forEach(agent => {
                if (agent.id !== 'l' && agent.type !== AgentType.SAGE_HOLO) {
                    agent.motivations.push({
                        type: 'attend_event',
                        intensity: 0.87,
                        description: 'Attending Comic Performance',
                        target: event.performanceLocation,
                        expiresAt: tick + 60,
                        eventId: event.id
                    });
                }
            });
            event.status = 'gathering';
        } else if (event.status === 'gathering') {
            // Check if ready to perform
            const hologram = state.agents.find(a => a.type === AgentType.SAGE_HOLO);
            const attendeesCount = event.attendees.length;
            
            // Start if Holo is there + 3 others, or if timeout (tick > event.tick + 40)
            if (hologram && hologram.currentSpace === event.performanceLocation) {
                if (attendeesCount >= 3 || (tick > event.tick + 40)) {
                    event.status = 'performing';
                    log('EVENT', 'Holo SAGE', `Beginning performance for ${attendeesCount} attendees.`);
                    // Force start Hologram activity
                    const act = activitySystemRef.current.startActivity(hologram, 'stability', tick, 'performs_story');
                    if(act) hologram.currentAction = act.name;
                }
            }
        } else if (event.status === 'performing') {
            // Apply benefits to attendees
            event.attendees.forEach(attendeeId => {
                const agent = state.agents.find(a => a.id === attendeeId);
                if (agent && agent.currentSpace === event.performanceLocation) {
                    agent.needs.energy = Math.min(100, agent.needs.energy + 0.2); // Regeneration
                    agent.needs.connection = Math.min(100, agent.needs.connection + 0.5);
                    agent.needs.stability = Math.min(100, agent.needs.stability + 0.3);
                }
            });

            // Check if performance is done
            const hologram = state.agents.find(a => a.type === AgentType.SAGE_HOLO);
            if (hologram && !activitySystemRef.current.isPerformingActivity(hologram.id)) {
                // Performance finished
                event.status = 'complete';
                log('EVENT', 'SYSTEM', 'Performance complete. Dispersing crowd.');
                
                // Cleanup motivations
                state.agents.forEach(agent => {
                    agent.motivations = agent.motivations.filter(m => m.type !== 'attend_event');
                });
                
                // Mark artifact as performed handled in updateAgent
                state.currentEvent = null; // Clear event
            }
        }
    };

    const tick = useCallback(() => {
        const s = stateRef.current;
        s.ticks++;
        const currentTick = s.ticks;

        // --- RHYTHMIC HOME INJECTION ---
        // Every 400 ticks, for 20 ticks, inject 'return_home'
        const isHomeTime = (currentTick % HOME_CYCLE_INTERVAL) < HOME_CYCLE_DURATION;
        if (isHomeTime) {
            s.agents.forEach(a => {
                if (!a.motivations.some(m => m.type === 'return_home')) {
                    a.motivations.push({
                        type: 'return_home',
                        intensity: 0.8,
                        description: 'Returning to personal space',
                        expiresAt: currentTick + HOME_CYCLE_DURATION + 20 // Buffer
                    });
                    // Optional: Log once per cycle per agent
                    // log('RHYTHM', a.name, 'Returning home...');
                }
            });
        }

        // L-System Timer
        s.l_timer++;
        let glitch = false;
        if (s.l_timer >= L_THRESHOLD) {
            s.l_timer = 0;
            initMap();
            glitch = true;
            const quote = QUOTES['L'][Math.floor(Math.random() * QUOTES['L'].length)];
            log('L', 'SYSTEM', quote);
        }

        // Update Agents (Movement, Needs, AI)
        s.agents.forEach(agent => {
            updateAgent(agent, s, currentTick);
        });

        // Activity System (Progress & Decisions)
        // This handles completion effects (like organization) and starts new activities
        processActivitySystemLogic(s, currentTick);

        // Process Event System (Gathering, Performance)
        processEventSystem(s, currentTick);

        // Artifact System (Creation & Consumption)
        // This handles Chef meals, comics, sketches, and eating/reading
        processArtifactSystem(s, currentTick);

        // TETHER PASSIVE CARE EFFECT
        const carl = s.agents.find(a => a.type === AgentType.CARL);
        const fox = s.agents.find(a => a.type === AgentType.FOX);
        
        if (carl && fox) {
             const dist = Math.abs(carl.x - fox.x) + Math.abs(carl.y - fox.y);
             if (dist <= 2) { // Close proximity
                 const map = s.map;
                 const carlTile = getTile(map, carl.x, carl.y);
                 const foxTile = getTile(map, fox.x, fox.y);
                 const carlResting = carlTile === AGENT_REST_ZONES[AgentType.CARL];
                 const foxResting = foxTile === AGENT_REST_ZONES[AgentType.FOX];

                 // Case 1: Carl resting, Fox tending
                 if (carlResting && !foxResting) {
                      carl.needs.energy = Math.min(100, carl.needs.energy + 5);
                      fox.needs.energy = Math.min(100, fox.needs.energy + 3);
                      if (s.ticks % 20 === 0) log('CARE', 'Fox', 'Tending to resting Carl (+Energy)');
                 }
                 // Case 2: Fox resting, Carl tending
                 else if (foxResting && !carlResting) {
                      fox.needs.energy = Math.min(100, fox.needs.energy + 5);
                      carl.needs.energy = Math.min(100, carl.needs.energy + 3);
                      if (s.ticks % 20 === 0) log('CARE', 'Carl', 'Tending to resting Fox (+Energy)');
                 }
             }
        }

        // Analytics
        s.agents.forEach(a => {
            s.stats.heatmap[a.y * GRID_W + a.x]++;
        });
        
        // Colocation
        for(let i=0; i<s.agents.length; i++) {
            for(let j=i+1; j<s.agents.length; j++) {
                const a1 = s.agents[i]; 
                const a2 = s.agents[j];
                const dist = Math.abs(a1.x - a2.x) + Math.abs(a1.y - a2.y);
                if(dist < 3) {
                    const key = [a1.name, a2.name].sort().join("::");
                    s.stats.colocation[key] = (s.stats.colocation[key] || 0) + 1;
                }
            }
        }

        return glitch; 
    }, [initMap]);

    return { stateRef, initMap, initAgents, tick };
};
