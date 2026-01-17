
import React from 'react';
import { Agent, LogEntry, GameState } from '../types';
import { Activity, Zap, Shield, Heart, Anchor, MapPin, Radio, Terminal, BookOpen } from 'lucide-react';
import { CHARACTER_EMOJIS } from '../constants';

interface SidebarProps {
    agents: Agent[];
    selectedAgentId: string | null;
    onSelectAgent: (id: string) => void;
    logs: LogEntry[];
    lTimer: number;
    lThreshold: number;
    tick: number;
    toggleTerminal: () => void;
    terminalOpen: boolean;
}

const StatBar = ({ label, value, color, icon: Icon }: any) => (
    <div className="mb-2">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            <span className="flex items-center gap-1">{Icon && <Icon size={10} />} {label}</span>
            <span>{Math.floor(value)}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-300 ${color}`} 
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            ></div>
        </div>
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ 
    agents, selectedAgentId, onSelectAgent, logs, lTimer, lThreshold, tick, toggleTerminal, terminalOpen 
}) => {
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <aside className="w-96 bg-gray-900/95 border-l border-gray-700 flex flex-col h-full shadow-2xl z-20 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-900">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-sm font-bold text-purple-400 tracking-widest font-mono">LUCY'S SUNDRIES</h2>
                    <span className="text-[10px] text-gray-500 font-mono">V2.0.1</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                    SYS_TICK: <span className="text-white">{tick}</span> | NET_STATUS: <span className="text-green-500">ONLINE</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                
                {/* Selected Unit Card */}
                <div className="bg-gray-800/50 rounded border border-gray-700 p-4">
                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-2 border-b border-gray-700 pb-1 flex justify-between">
                        <span>Target Focus</span>
                        {selectedAgent && <span className="text-blue-400 animate-pulse">TRACKING</span>}
                    </div>
                    
                    {selectedAgent ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-none flex items-center gap-2" style={{ color: selectedAgent.color }}>
                                        <span className="text-2xl">{CHARACTER_EMOJIS[selectedAgent.type]}</span>
                                        {selectedAgent.name}
                                    </h3>
                                    <span className="text-xs text-gray-400 font-mono block mt-1">{selectedAgent.role}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-gray-500 uppercase">Action</div>
                                    <div className="text-xs text-blue-300 font-mono">{selectedAgent.currentAction}</div>
                                </div>
                            </div>
                            
                            {selectedAgent.carrying && (
                                <div className="mb-3 bg-purple-900/20 border border-purple-500/30 p-2 rounded flex items-center gap-2 text-xs text-purple-200">
                                    <BookOpen size={14} />
                                    <span>Carrying Artifact...</span>
                                </div>
                            )}

                            {/* Circuit Status for Hologram */}
                            {selectedAgent.type === 'SAGE_HOLO' && selectedAgent.holoState && (
                                <div className="mb-3 bg-blue-900/20 border border-blue-500/30 p-2 rounded text-[10px] font-mono text-blue-300">
                                    <div className="font-bold border-b border-blue-500/30 mb-1">PERFORMANCE CIRCUIT</div>
                                    <div className="grid grid-cols-2 gap-x-2">
                                        <span className="text-gray-500">PHASE:</span>
                                        <span className="uppercase text-white">{selectedAgent.holoState.phase}</span>
                                        <span className="text-gray-500">VENUE:</span>
                                        <span className="uppercase text-white truncate">{selectedAgent.holoState.venue}</span>
                                        {selectedAgent.holoState.phase === 'waiting_for_audience' && (
                                            <>
                                                <span className="text-gray-500">WAIT:</span>
                                                <span>{selectedAgent.holoState.ticksWaiting}/50</span>
                                            </>
                                        )}
                                        {selectedAgent.holoState.currentAudience && (
                                            <span className="col-span-2 text-green-400 mt-1 flex items-center gap-1">
                                                <Radio size={8} /> AUDIENCE DETECTED
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <StatBar label="Energy" value={selectedAgent.needs.energy} color="bg-yellow-500" icon={Zap} />
                            <StatBar label="Stability" value={selectedAgent.needs.stability} color="bg-purple-500" icon={Shield} />
                            <StatBar label="Purpose" value={selectedAgent.needs.purpose} color="bg-blue-500" icon={Anchor} />
                            <StatBar label="Social" value={selectedAgent.needs.connection} color="bg-pink-500" icon={Heart} />
                            
                            {/* Sparkline (Simulated) */}
                            <div className="mt-4 pt-2 border-t border-gray-700/50">
                                <div className="text-[9px] text-gray-500 font-mono mb-1">ENERGY HISTORY (LAST 20)</div>
                                <div className="flex items-end h-8 gap-0.5">
                                    {selectedAgent.history.map((h, i) => (
                                        <div key={i} className="bg-gray-600 w-full rounded-sm opacity-50" style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex flex-col items-center justify-center text-gray-600 text-xs text-center p-4 border border-dashed border-gray-700 rounded">
                            <MapPin size={24} className="mb-2 opacity-50"/>
                            <span>Select a unit from the roster or map to view telemetry.</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <button 
                    onClick={toggleTerminal}
                    className={`w-full py-2 px-4 rounded border font-mono text-xs flex items-center justify-center gap-2 transition-all
                        ${terminalOpen 
                            ? 'bg-purple-900/30 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                >
                    <Terminal size={14} />
                    {terminalOpen ? 'CLOSE ANALYTICS TERMINAL' : 'OPEN ANALYTICS TERMINAL'}
                </button>

                {/* Roster */}
                <div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-2 border-b border-gray-700 pb-1">Active Units</div>
                    <div className="space-y-1">
                        {agents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => onSelectAgent(agent.id)}
                                className={`w-full text-left px-3 py-2 rounded flex items-center justify-between group transition-colors ${selectedAgentId === agent.id ? 'bg-gray-800 border-l-2 border-blue-500' : 'hover:bg-gray-800/50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-base">{CHARACTER_EMOJIS[agent.type]}</span>
                                    <span className="text-xs font-mono text-gray-300 group-hover:text-white transition-colors">{agent.name}</span>
                                    {agent.carrying && <span className="text-[10px] text-purple-400">📖</span>}
                                </div>
                                {agent.id === selectedAgentId && <Radio size={12} className="text-blue-500 animate-pulse" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* System Logs */}
                <div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-2 border-b border-gray-700 pb-1">System Logs</div>
                    <div className="font-mono text-[10px] space-y-1.5 h-32 overflow-hidden relative">
                        {logs.slice(0, 8).map((log) => (
                            <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-gray-600 shrink-0">[{log.time}]</span>
                                <span style={{ color: log.type === 'L' ? '#fff' : '#94a3b8' }}>
                                    <span className="font-bold opacity-80">{log.name}:</span> {log.msg}
                                </span>
                            </div>
                        ))}
                        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>

            {/* Footer / L-Timer */}
            <div className="p-4 border-t border-gray-800 bg-gray-950">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono">
                    <span>ARCHITECTURAL SHIFT</span>
                    <span>{lThreshold - lTimer} TICKS</span>
                </div>
                <div className="h-1 w-full bg-gray-800 rounded overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-100 ease-linear" 
                        style={{ width: `${(lTimer / lThreshold) * 100}%` }}
                    ></div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
