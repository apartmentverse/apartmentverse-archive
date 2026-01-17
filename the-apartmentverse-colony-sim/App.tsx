
import React, { useEffect, useState, useRef } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import GameCanvas from './components/GameCanvas';
import Sidebar from './components/Sidebar';
import TerminalOverlay from './components/TerminalOverlay';
import TitleScreen from './components/TitleScreen';
import SummaryScreen from './components/SummaryScreen';
import EventPopup from './components/EventPopup';
import { SimulationErrorBoundary, ErrorBoundary } from './components/ErrorBoundary';
import { TICK_RATE, L_THRESHOLD, GRID_W, GRID_H, ZONE_CONFIG } from './constants';
import { CameraState, ZoneType } from './types';

const App: React.FC = () => {
    const { stateRef, initMap, initAgents, tick } = useGameEngine();
    
    // Simulation State: 'title' | 'running' | 'complete'
    const [simulationState, setSimulationState] = useState<'title' | 'running' | 'complete'>('title');
    const [isPaused, setIsPaused] = useState(false);

    // UI State (synced from game state periodically)
    const [uiTick, setUiTick] = useState(0);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1.5, followingId: null });
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [glitchEffect, setGlitchEffect] = useState(false);
    
    // Event Popup State
    const [activeEventTick, setActiveEventTick] = useState<number>(0);

    // Initial Setup
    useEffect(() => {
        initMap();
        initAgents();
    }, [initMap, initAgents]);

    // Game Loop
    useEffect(() => {
        if (simulationState !== 'running') return;

        const interval = setInterval(() => {
            // Check pause state
            if (isPaused) return;

            // Auto-stop condition
            if (stateRef.current.ticks >= 2000) {
                setSimulationState('complete');
                clearInterval(interval);
                return;
            }

            const needsGlitch = tick();
            
            // Sync UI state every tick? Too expensive.
            // Sync every 5 ticks or if high priority
            if (stateRef.current.ticks % 5 === 0) {
                setUiTick(stateRef.current.ticks);
            }
            
            // Check for new event announcement to trigger UI update AND PAUSE
            if (stateRef.current.currentEvent?.status === 'announced' && stateRef.current.currentEvent.tick > activeEventTick) {
                setActiveEventTick(stateRef.current.currentEvent.tick);
                setUiTick(stateRef.current.ticks); // Force update
                setIsPaused(true); // PAUSE SIMULATION
            }

            if (needsGlitch) {
                setGlitchEffect(true);
                setTimeout(() => setGlitchEffect(false), 200);
            }

        }, TICK_RATE);
        return () => clearInterval(interval);
    }, [tick, stateRef, simulationState, activeEventTick, isPaused]);

    const handleSelectAgent = (id: string | null) => {
        setSelectedAgentId(id);
        // Automatically track when selected from list
        setCamera(prev => ({
            ...prev,
            followingId: id
        }));
    };

    const handleStart = () => {
        setSimulationState('running');
    };
    
    const handleRestart = () => {
        window.location.reload(); // Simple reload to clear state cleanly
    };
    
    const handleEventFocus = () => {
        const event = stateRef.current.currentEvent;
        if (event) {
            // Find location coordinates to center camera
            const zoneDef = ZONE_CONFIG.find(z => {
                if (event.performanceLocation === 'lucys-store') return z.type === ZoneType.SHOP;
                if (event.performanceLocation === 'lalamoons-cafe') return z.type === ZoneType.CAFE;
                if (event.performanceLocation === 'the-workshop') return z.type === ZoneType.WORK;
                return false;
            });
            
            if (zoneDef) {
                // Focus on center of zone
                const cx = (zoneDef.x + zoneDef.w / 2) * 32;
                const cy = (zoneDef.y + zoneDef.h / 2) * 32;
                setCamera({
                    x: -cx * 2 + (window.innerWidth/2), // Approx center logic
                    y: -cy * 2 + (window.innerHeight/2),
                    zoom: 2,
                    followingId: null
                });
                
                // Track Announcer
                if (event.announcerId) {
                     setCamera(prev => ({ ...prev, followingId: event.announcerId }));
                }
            }
        }
        setIsPaused(false); // RESUME
    };

    const handleEventClose = () => {
        setIsPaused(false); // RESUME WITHOUT FOCUS
    };

    // =========================================================================
    // RENDER WITH ERROR BOUNDARIES
    // WHY: Wrapping with error boundaries prevents crashes from cascading.
    // - SimulationErrorBoundary: Catches errors in the entire simulation
    // - Individual ErrorBoundary: Catches errors in specific components
    // =========================================================================
    return (
        <SimulationErrorBoundary>
            <div className="flex h-screen w-screen bg-black overflow-hidden relative font-inter">
                {simulationState === 'title' ? (
                    <TitleScreen onStart={handleStart} />
                ) : simulationState === 'complete' ? (
                    <SummaryScreen gameState={stateRef.current} onRestart={handleRestart} />
                ) : (
                    <>
                        {/* Game View - wrapped for isolation */}
                        <ErrorBoundary componentName="GameCanvas">
                            <GameCanvas
                                gameStateRef={stateRef}
                                camera={camera}
                                setCamera={setCamera}
                                onSelectAgent={handleSelectAgent}
                                glitch={glitchEffect}
                            />
                        </ErrorBoundary>

                        {/* Terminal Overlay (Absolute positioning over canvas) */}
                        <ErrorBoundary componentName="TerminalOverlay">
                            <TerminalOverlay
                                stats={stateRef.current.stats}
                                agents={stateRef.current.agents}
                                width={GRID_W}
                                height={GRID_H}
                                show={terminalOpen}
                            />
                        </ErrorBoundary>

                        {/* Event Popup */}
                        <EventPopup
                            event={stateRef.current.currentEvent}
                            artifacts={stateRef.current.artifacts}
                            agents={stateRef.current.agents}
                            onClose={handleEventClose}
                            onFocus={handleEventFocus}
                        />

                        {/* Sidebar UI */}
                        <ErrorBoundary componentName="Sidebar">
                            <Sidebar
                                agents={stateRef.current.agents}
                                selectedAgentId={selectedAgentId}
                                onSelectAgent={handleSelectAgent}
                                logs={stateRef.current.logs}
                                lTimer={stateRef.current.l_timer}
                                lThreshold={L_THRESHOLD}
                                tick={uiTick}
                                toggleTerminal={() => setTerminalOpen(!terminalOpen)}
                                terminalOpen={terminalOpen}
                            />
                        </ErrorBoundary>
                    </>
                )}
            </div>
        </SimulationErrorBoundary>
    );
};

export default App;
