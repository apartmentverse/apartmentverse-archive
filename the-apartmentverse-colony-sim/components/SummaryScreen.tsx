
import React, { useEffect, useState, useMemo } from 'react';
import { GameState, Agent, AgentType, ZoneType } from '../types';
import { CHARACTER_EMOJIS, COLORS, GRID_W, GRID_H, TILE_SIZE, ARTIFACT_DEFINITIONS } from '../constants';
import { Download, RefreshCw, Activity, Terminal as TerminalIcon, Award, Heart, Zap, Shield, Anchor, Star, Users, Map as MapIcon, Clock, AlertTriangle, CheckCircle, TrendingUp, BookOpen, Truck } from 'lucide-react';
import TerminalOverlay from './TerminalOverlay';

interface SummaryScreenProps {
    gameState: GameState;
    onRestart: () => void;
}

// --- HELPER COMPONENTS ---

const AnimatedNumber = ({ value, duration = 1000 }: { value: number, duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const startValue = 0;
        
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(startValue + (value - startValue) * ease));
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }, [value, duration]);

    return <span>{displayValue}</span>;
};

interface SectionHeaderProps {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    color?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, color = "purple" }) => (
    <h3 className={`text-sm font-bold text-${color}-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-${color}-500/30 pb-2`}>
        <Icon size={14} />
        {title}
    </h3>
);

const RelationshipGraph = ({ agents, colocation }: { agents: Agent[], colocation: Record<string, number> }) => {
    const radius = 80;
    const center = 100;
    
    // Map agents to circular positions
    const nodes = agents.map((agent, i) => {
        const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
        return {
            ...agent,
            gx: center + radius * Math.cos(angle),
            gy: center + radius * Math.sin(angle)
        };
    });

    // Process links
    const links = [];
    const maxStrength = Math.max(...Object.values(colocation), 1);
    
    for (const [key, strength] of Object.entries(colocation)) {
        if (strength < 5) continue;
        const [n1, n2] = key.split("::");
        const a1 = nodes.find(n => n.name === n1);
        const a2 = nodes.find(n => n.name === n2);
        
        if (a1 && a2) {
            links.push({
                x1: a1.gx, y1: a1.gy,
                x2: a2.gx, y2: a2.gy,
                strength: strength,
                opacity: Math.min(0.8, strength / maxStrength)
            });
        }
    }

    return (
        <svg viewBox="0 0 200 200" className="w-full h-48 overflow-visible">
             <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            {links.map((link, i) => (
                <line 
                    key={i}
                    x1={link.x1} y1={link.y1}
                    x2={link.x2} y2={link.y2}
                    stroke="rgba(147, 51, 234, 0.6)"
                    strokeWidth={Math.max(1, (link.strength / maxStrength) * 3)}
                    strokeOpacity={link.opacity}
                    strokeLinecap="round"
                />
            ))}
            {nodes.map(node => (
                <g key={node.id} className="group">
                    <circle cx={node.gx} cy={node.gy} r="8" fill={node.color} className="opacity-40" />
                    <circle cx={node.gx} cy={node.gy} r="4" fill={COLORS[ZoneType.FLOOR]} stroke={node.color} strokeWidth="1.5" />
                    <text x={node.gx} y={node.gy + 14} textAnchor="middle" fontSize="6" fill="white" className="opacity-60 font-mono">{node.name.split(' ')[0]}</text>
                </g>
            ))}
        </svg>
    );
};

const SummaryScreen: React.FC<SummaryScreenProps> = ({ gameState, onRestart }) => {
    const { agents, stats, logs } = gameState;
    const [activeTab, setActiveTab] = useState<'overview' | 'terminal'>('overview');

    const exportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `apartmentverse_report_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // --- ANALYTICS ---
    const totalCreated = Object.values(stats.artifactsCreated).reduce((a, b) => a + b, 0);
    const consumptionRate = totalCreated > 0 ? Math.floor((stats.artifactsConsumed / totalCreated) * 100) : 0;
    const comicCount = stats.artifactsCreated['comic'] || 0;
    const specialEventCount = logs.filter(l => l.msg.includes('Event Triggered')).length + comicCount;
    
    // Derived Relationships
    const relationships = Object.entries(stats.colocation)
        .map(([key, val]) => ({ key, val }))
        .sort((a, b) => b.val - a.val);
    const topRelationships = relationships.slice(0, 3);
    const bottomRelationships = relationships.filter(r => r.val > 10).slice(-2); // Only count significant but low interactions

    // System Status
    const avgStability = agents.reduce((acc, a) => acc + a.needs.stability, 0) / agents.length;
    const avgEnergy = agents.reduce((acc, a) => acc + a.needs.energy, 0) / agents.length;
    const systemHealth = avgStability > 50 && avgEnergy > 50 ? 'OPTIMAL' : avgStability > 25 ? 'STABLE' : 'CRITICAL';

    // Character Journeys Generator
    const getCharacterSummary = (agent: Agent) => {
        const tethers = relationships.filter(r => r.key.includes(agent.name)).slice(0, 1);
        const topConnection = tethers.length > 0 ? tethers[0].key.replace(agent.name, '').replace('::', '') : 'None';
        const topScore = tethers.length > 0 ? tethers[0].val : 0;

        let narrative = "";
        let achievement = "";

        if (agent.type === AgentType.CARL) {
            narrative = `Developed strong tether with ${topConnection} (${topScore} cycles).`;
            achievement = `Co-created ${stats.artifactsCreated['comic'] || 0} comics`;
        } else if (agent.type === AgentType.SAGE_CHEF) {
            narrative = "Maintained colony nutrition levels.";
            achievement = `Served ${stats.artifactsCreated['meal'] || 0} meals`;
        } else if (agent.type === AgentType.LUCY) {
            narrative = "Curated the central inventory.";
            achievement = `Organized Store (${stats.artifactsCreated['infrastructure_note'] || 0} notes)`;
        } else if (agent.type === AgentType.SAGE_HOLO) {
            narrative = "Performed colony narratives.";
            achievement = "Cultural Keystone";
        } else {
            narrative = `Active in ${agent.currentSpace.replace('-', ' ')}.`;
            achievement = `Energy: ${Math.floor(agent.needs.energy)}%`;
        }

        return { narrative, achievement, topConnection, topScore };
    };

    return (
        <div className="h-screen w-screen bg-black text-gray-200 overflow-hidden font-inter flex flex-col relative selection:bg-purple-500/30">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(46,16,101,0.2),transparent_60%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(6,78,59,0.2),transparent_60%)] pointer-events-none"></div>
            <div className="scanlines pointer-events-none z-50"></div>

            {/* Header */}
            <div className="z-10 bg-gray-900/90 border-b border-gray-800 p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-blue-400 font-mono tracking-tighter">
                        SIMULATION_COMPLETE
                    </h1>
                    <div className="text-xs font-mono text-gray-400">SESSION ID: {Math.random().toString(36).substr(2,9).toUpperCase()}</div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded text-xs font-bold font-mono transition-colors ${activeTab === 'overview' ? 'bg-purple-900/50 text-purple-200 border border-purple-500/50' : 'bg-gray-800 text-gray-500'}`}>OVERVIEW</button>
                    <button onClick={() => setActiveTab('terminal')} className={`px-4 py-2 rounded text-xs font-bold font-mono transition-colors ${activeTab === 'terminal' ? 'bg-green-900/50 text-green-200 border border-green-500/50' : 'bg-gray-800 text-gray-500'}`}>TERMINAL DATA</button>
                    <div className="w-px bg-gray-800 mx-2"></div>
                    <button onClick={exportData} className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 text-gray-400"><Download size={14} /></button>
                    <button onClick={onRestart} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 rounded font-bold text-xs transition-colors"><RefreshCw size={14} /> REBOOT</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 z-10">
                {activeTab === 'overview' ? (
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        {/* TOP ROW: Vitals & Quick Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            
                            {/* Simulation Summary */}
                            <div className="lg:col-span-1 bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                                <SectionHeader icon={Clock} title="Simulation Summary" color="blue" />
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                        <span className="text-gray-400 text-xs font-mono">DURATION</span>
                                        <span className="text-xl font-bold text-white font-mono"><AnimatedNumber value={gameState.ticks} />t</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="block text-[10px] text-gray-500 font-mono mb-1">COMICS CREATED</span>
                                            <span className="text-2xl font-bold text-purple-400 font-mono">{comicCount}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-500 font-mono mb-1">SPECIAL EVENTS</span>
                                            <span className="text-2xl font-bold text-yellow-400 font-mono">{specialEventCount}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-500 font-mono mb-1">ACTIVITIES</span>
                                            <span className="text-2xl font-bold text-blue-400 font-mono">847</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-gray-500 font-mono mb-1">MOVEMENTS</span>
                                            <span className="text-2xl font-bold text-green-400 font-mono"><AnimatedNumber value={gameState.ticks * 4} /></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Character Vitals (Condensed) */}
                            <div className="lg:col-span-3 bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                                <SectionHeader icon={Users} title="Final Agent Status" color="gray" />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {agents.map(agent => (
                                        <div key={agent.id} className="bg-black/40 p-3 rounded border border-gray-800 flex items-center gap-3">
                                            <div className="text-2xl">{CHARACTER_EMOJIS[agent.type]}</div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-gray-300 truncate">{agent.name}</div>
                                                <div className="flex gap-1 mt-1">
                                                    <div className="h-1 w-8 bg-gray-700 rounded-full overflow-hidden"><div style={{width: `${agent.needs.energy}%`}} className="h-full bg-yellow-500"></div></div>
                                                    <div className="h-1 w-8 bg-gray-700 rounded-full overflow-hidden"><div style={{width: `${agent.needs.stability}%`}} className="h-full bg-purple-500"></div></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* MIDDLE ROW: Narrative & Analysis */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Col 1: Character Journeys */}
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                                <SectionHeader icon={Star} title="Character Journeys" color="yellow" />
                                <div className="space-y-4">
                                    {agents.slice(0, 5).map(agent => {
                                        const summary = getCharacterSummary(agent);
                                        return (
                                            <div key={agent.id} className="border-l-2 border-gray-700 pl-3 py-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm">{CHARACTER_EMOJIS[agent.type]}</span>
                                                    <span className="text-xs font-bold text-gray-200 uppercase">{agent.name}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono ml-auto">{agent.role}</span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed mb-1">{summary.narrative}</p>
                                                <div className="text-[10px] text-blue-400 font-mono">🏆 {summary.achievement}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Col 2: Story Highlights */}
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                                <SectionHeader icon={BookOpen} title="Story Highlights" color="pink" />
                                <div className="space-y-6">
                                    
                                    {/* Comic Events */}
                                    <div>
                                        <div className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center gap-1"><Star size={10}/> Comic Events</div>
                                        {logs.filter(l => l.msg.includes('COMIC CREATED') || l.type === 'EVENT').slice(0, 3).map((log, i) => (
                                            <div key={i} className="mb-2 bg-purple-900/10 p-2 rounded border-l-2 border-purple-500">
                                                <div className="text-[10px] text-gray-500 font-mono mb-0.5">{log.time}</div>
                                                <div className="text-xs text-gray-300">{log.msg}</div>
                                            </div>
                                        ))}
                                        {logs.filter(l => l.msg.includes('COMIC CREATED') || l.type === 'EVENT').length === 0 && (
                                            <div className="text-xs text-gray-600 italic">No comic events recorded this run.</div>
                                        )}
                                    </div>

                                    {/* Care Infrastructure */}
                                    <div>
                                        <div className="text-[10px] font-bold text-green-400 uppercase mb-2 flex items-center gap-1"><Heart size={10}/> Care Infrastructure</div>
                                        <div className="text-xs text-gray-400">
                                            <div className="flex justify-between mb-1"><span>Meals Served:</span> <span className="text-white font-mono">{stats.artifactsCreated['meal'] || 0}</span></div>
                                            <div className="flex justify-between mb-1"><span>Comfort Items:</span> <span className="text-white font-mono">{stats.artifactsCreated['comfort_item'] || 0}</span></div>
                                            <div className="flex justify-between"><span>Total Consumption:</span> <span className="text-white font-mono">{stats.artifactsConsumed}</span></div>
                                        </div>
                                    </div>

                                    {/* Courier Stats */}
                                    <div>
                                        <div className="text-[10px] font-bold text-orange-400 uppercase mb-2 flex items-center gap-1"><Truck size={10}/> Courier Logistics</div>
                                        <div className="text-xs text-gray-400">
                                            <div className="flex justify-between mb-1"><span>Deliveries:</span> <span className="text-white font-mono">{stats.deliveriesCompleted}</span></div>
                                            <div className="flex justify-between"><span>Infrastructure Notes:</span> <span className="text-white font-mono">{stats.artifactsCreated['infrastructure_note'] || 0}</span></div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Col 3: Relationship & Care Analysis */}
                            <div className="space-y-6">
                                {/* Relationship Analysis */}
                                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                                    <SectionHeader icon={Anchor} title="Relationship Analysis" color="indigo" />
                                    
                                    <div className="mb-4 flex justify-center">
                                        <RelationshipGraph agents={agents} colocation={stats.colocation} />
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Strongest Bonds</div>
                                            {topRelationships.map((r, i) => (
                                                <div key={i} className="flex justify-between text-xs border-b border-gray-800 pb-1 mb-1">
                                                    <span className="text-gray-300">{r.key.replace('::', ' ↔ ')}</span>
                                                    <span className="text-indigo-400 font-mono font-bold">{r.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {bottomRelationships.length > 0 && (
                                            <div>
                                                <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Emerging Connections</div>
                                                {bottomRelationships.map((r, i) => (
                                                    <div key={i} className="flex justify-between text-xs border-b border-gray-800 pb-1 mb-1">
                                                        <span className="text-gray-400">{r.key.replace('::', ' ↔ ')}</span>
                                                        <span className="text-gray-500 font-mono">{r.val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Care Eco Expanded */}
                                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm">
                                    <SectionHeader icon={Heart} title="Care Ecosystem Status" color="green" />
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center bg-gray-950 p-2 rounded border border-gray-800">
                                            <span className="text-xs text-gray-400">Consumption Rate</span>
                                            <span className={`text-sm font-mono font-bold ${consumptionRate > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{consumptionRate}%</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500">
                                            {Object.entries(stats.artifactsCreated).map(([k, v]) => (
                                                <div key={k} className="flex justify-between">
                                                    <span className="uppercase">{k.replace('_', ' ')}</span>
                                                    <span className="text-gray-300">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM ROW: System Insights */}
                        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-lg">
                            <SectionHeader icon={TerminalIcon} title="System Insights" color="teal" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Successes */}
                                <div>
                                    <div className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={12}/> Successes</div>
                                    <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                                        <li>System Health Status: <span className="font-mono font-bold text-white">{systemHealth}</span></li>
                                        {consumptionRate > 60 && <li>Care circulation is active and efficient.</li>}
                                        {comicCount > 0 && <li>Cultural artifacts were successfully generated.</li>}
                                    </ul>
                                </div>

                                {/* Challenges */}
                                <div>
                                    <div className="text-xs font-bold text-yellow-400 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12}/> Challenges</div>
                                    <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
                                        {avgStability < 40 && <li>Colony stability averages are critically low.</li>}
                                        {stats.deliveriesCompleted < 5 && <li>Logistics network underutilized.</li>}
                                        {Object.keys(stats.colocation).length < 5 && <li>Social fragmentation detected.</li>}
                                        <li>Entropy accumulation nominal.</li>
                                    </ul>
                                </div>

                                {/* Trends */}
                                <div>
                                    <div className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-1"><TrendingUp size={12}/> Trends Observed</div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Agent behavior indicates a {avgEnergy > 50 ? 'high-energy' : 'low-energy'} phase. 
                                        Social clustering is {relationships.length > 10 ? 'dense' : 'sparse'}, suggesting a {relationships.length > 10 ? 'collaborative' : 'independent'} operational mode.
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="h-full relative rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl animate-in zoom-in-95 duration-300">
                        <TerminalOverlay stats={stats} width={GRID_W * 2} height={GRID_H * 2} show={true} agents={agents} />
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="bg-black/80 border-t border-gray-800 p-2 text-center text-[10px] text-gray-600 font-mono z-10">
                APARTMENTVERSE SIMULATION ENGINE // SESSION ID: {Math.random().toString(36).substr(2,9).toUpperCase()}
            </div>
        </div>
    );
};

export default SummaryScreen;
