import React, { useRef, useEffect } from 'react';
import { GameState, CameraState, ZoneType } from '../types';
import { TILE_SIZE, COLORS, GRID_W, GRID_H, CHARACTER_EMOJIS, ZONE_CONFIG } from '../constants';

interface GameCanvasProps {
    gameStateRef: React.MutableRefObject<GameState>;
    camera: CameraState;
    setCamera: React.Dispatch<React.SetStateAction<CameraState>>;
    onSelectAgent: (id: string | null) => void;
    glitch: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameStateRef, camera, setCamera, onSelectAgent, glitch }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Coordinate conversion
    const screenToWorld = (sx: number, sy: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        
        // (Input - Center - Offset) / Zoom
        const wx = (sx - cx - camera.x) / camera.zoom;
        const wy = (sy - cy - camera.y) / camera.zoom;
        return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) };
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { x, y } = screenToWorld(mx, my);

        const agent = gameStateRef.current.agents.find(a => a.x === x && a.y === y);
        if (agent) {
            onSelectAgent(agent.id);
        }
    };

    useEffect(() => {
        let animationFrameId: number;
        const render = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            // Resize if needed
            if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Clear
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Camera Transform
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Tracking logic
            let currentCamX = camera.x;
            let currentCamY = camera.y;

            if (camera.followingId) {
                const target = gameStateRef.current.agents.find(a => a.id === camera.followingId);
                if (target) {
                    const awx = (target.x * TILE_SIZE + TILE_SIZE/2);
                    const awy = (target.y * TILE_SIZE + TILE_SIZE/2);
                    currentCamX = -(awx * camera.zoom);
                    currentCamY = -(awy * camera.zoom);
                }
            }

            ctx.save();
            ctx.translate(centerX + currentCamX, centerY + currentCamY);
            ctx.scale(camera.zoom, camera.zoom);

            // Draw Map
            const { map } = gameStateRef.current;
            for (let y = 0; y < GRID_H; y++) {
                for (let x = 0; x < GRID_W; x++) {
                    const tile = map[y * GRID_W + x];
                    
                    // Base Tile
                    ctx.fillStyle = COLORS[tile as ZoneType] || '#000';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    
                    // Grid lines (subtle)
                    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

                    // Wall top highlight
                    if (tile === ZoneType.WALL) {
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 4);
                    }
                }
            }

            // Draw Zone Emojis
            ZONE_CONFIG.forEach(z => {
                // Calculate center
                const cx = (z.x + z.w/2) * TILE_SIZE;
                const cy = (z.y + z.h/2) * TILE_SIZE;
                
                // Opacity based on zoom to avoid clutter?
                ctx.globalAlpha = 0.3;
                ctx.font = `${Math.min(z.w, z.h) * 10}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(z.emoji, cx, cy);
                ctx.globalAlpha = 1.0;
            });
            
            // Draw Artifacts (On floor)
            gameStateRef.current.artifacts.forEach(artifact => {
                if (!artifact.carrierId && artifact.status !== 'consumed') { 
                    const ax = artifact.x * TILE_SIZE + TILE_SIZE / 2;
                    const ay = artifact.y * TILE_SIZE + TILE_SIZE / 2;
                    
                    ctx.font = '16px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(artifact.emoji, ax, ay);
                }
            });

            // Draw Agents
            gameStateRef.current.agents.forEach(agent => {
                const ax = agent.x * TILE_SIZE + TILE_SIZE / 2;
                const ay = agent.y * TILE_SIZE + TILE_SIZE / 2;
                const r = (TILE_SIZE / 2) - 4;

                // Shadow
                ctx.beginPath();
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.arc(ax + 2, ay + 4, r, 0, Math.PI * 2);
                ctx.fill();

                // Glow for SAGEs
                if (agent.type.includes('SAGE')) {
                    const glowSize = 10 + Math.sin(Date.now() / 200) * 2;
                    const gradient = ctx.createRadialGradient(ax, ay, r, ax, ay, r + glowSize);
                    gradient.addColorStop(0, agent.color);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(ax, ay, r + glowSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Body (Solid color background for emoji)
                ctx.fillStyle = agent.color;
                ctx.beginPath();
                ctx.arc(ax, ay, r, 0, Math.PI * 2);
                ctx.fill();
                
                // Emoji Face
                const emoji = CHARACTER_EMOJIS[agent.type] || '😐';
                ctx.font = '20px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Slightly adjust emoji position to center in circle
                ctx.fillText(emoji, ax, ay + 2);

                // Carrying Indicator
                if (agent.carrying) {
                    // Find what they are carrying to show correct emoji if possible, or generic
                    const carriedArtifact = gameStateRef.current.artifacts.find(a => a.id === agent.carrying);
                    const carryEmoji = carriedArtifact ? carriedArtifact.emoji : '📦';
                    
                    ctx.font = '12px serif';
                    ctx.fillText(carryEmoji, ax + r, ay - r);
                }
                
                // Rest Indicator
                if (agent.needsRest) {
                    ctx.font = '10px serif';
                    ctx.fillText('💤', ax - r, ay - r);
                }

                // Selection Ring
                if (camera.followingId === agent.id) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.arc(ax, ay, r + 6, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Name Tag
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px JetBrains Mono';
                    ctx.textAlign = 'center';
                    ctx.fillText(agent.name, ax, ay - TILE_SIZE);
                }
            });

            ctx.restore();
            
            // Glitch Overlay
            if (glitch) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const sliceY = Math.random() * canvas.height;
                const sliceH = Math.random() * 50;
                const offset = (Math.random() - 0.5) * 20;
                try {
                    const imgData = ctx.getImageData(0, sliceY, canvas.width, sliceH);
                    ctx.putImageData(imgData, offset, sliceY);
                } catch(e) {}
            }

            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [camera, glitch]); 

    return (
        <div ref={containerRef} className="flex-1 relative bg-gray-900 overflow-hidden cursor-crosshair" onClick={handleClick}>
            <canvas ref={canvasRef} className="block" />
            <div className="scanlines pointer-events-none"></div>
            
            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-4 flex gap-2">
                <button 
                    onClick={() => setCamera(p => ({...p, zoom: Math.min(3, p.zoom + 0.2)}))}
                    className="bg-gray-800/80 text-white p-2 rounded hover:bg-gray-700 border border-gray-600 font-mono text-xs backdrop-blur-sm"
                >
                    ZOOM+
                </button>
                <button 
                    onClick={() => setCamera(p => ({...p, zoom: Math.max(0.5, p.zoom - 0.2)}))}
                    className="bg-gray-800/80 text-white p-2 rounded hover:bg-gray-700 border border-gray-600 font-mono text-xs backdrop-blur-sm"
                >
                    ZOOM-
                </button>
            </div>
            
            {/* Artifact Count Overlay */}
            <div className="absolute top-4 right-4 bg-gray-900/80 text-purple-300 p-2 rounded border border-purple-500/30 backdrop-blur-sm font-mono text-xs">
                <div>ARTIFACTS_CREATED: {gameStateRef.current.artifacts.length}</div>
                <div>ACTIVE_TASKS: {Object.keys(gameStateRef.current.creationTasks).length}</div>
            </div>
        </div>
    );
};

export default GameCanvas;