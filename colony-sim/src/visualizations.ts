/**
 * Visualization generators for simulation analytics
 * Creates heat maps, proximity matrices, energy curves, and other visual outputs
 */

import { AnalyticsData, SimulationAnalytics } from './analytics.js';

/**
 * Generate ASCII-style space heat map
 */
export function generateSpaceHeatMap(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  const maxVisits = Math.max(...Array.from(data.spaceVisits.values()));
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║                     SPACE HEAT MAP                             ║\n';
  output += '║                 (Total Visit Counts)                           ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  // Sort spaces by visit count
  const sortedSpaces = Array.from(data.spaceVisits.entries())
    .sort((a, b) => b[1] - a[1]);
  
  for (const [spaceId, visits] of sortedSpaces) {
    const spaceName = analytics.getSpaceName(spaceId);
    const intensity = visits / maxVisits;
    const barLength = Math.floor(intensity * 40);
    const bar = '█'.repeat(barLength) + '░'.repeat(40 - barLength);
    const occupancyRate = data.spaceOccupancyRate.get(spaceId) || 0;
    
    output += `${spaceName.padEnd(25)} │${bar}│ ${visits} visits (${(occupancyRate * 100).toFixed(1)}% avg occupancy)\n`;
  }
  
  return output + '\n';
}

/**
 * Generate character proximity matrix visualization
 */
export function generateProximityMatrix(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  const chars = data.characterIds;
  const matrix = data.proximityMatrix;
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║              CHARACTER PROXIMITY MATRIX                        ║\n';
  output += '║         (Ticks spent together in same space)                   ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  // Find max value for scaling
  const maxProximity = Math.max(...matrix.flat().filter(v => v > 0));
  
  // Header row
  output += '       ';
  for (let i = 0; i < chars.length; i++) {
    const shortName = analytics.getCharacterName(chars[i]).substring(0, 8).padEnd(8);
    output += shortName + ' ';
  }
  output += '\n';
  output += '       ' + '─'.repeat((chars.length * 9) - 1) + '\n';
  
  // Data rows
  for (let i = 0; i < chars.length; i++) {
    const rowName = analytics.getCharacterName(chars[i]).substring(0, 6).padEnd(6);
    output += rowName + '│';
    
    for (let j = 0; j < chars.length; j++) {
      if (i === j) {
        output += '   -    ';
      } else {
        const value = matrix[i][j];
        const intensity = value / maxProximity;
        const symbol = getProximitySymbol(intensity);
        output += ` ${symbol}${value.toString().padStart(3)} `;
      }
      output += ' ';
    }
    output += '\n';
  }
  
  output += '\nSymbols: ● (high) ◐ (medium) ○ (low) · (minimal)\n\n';
  
  return output;
}

/**
 * Generate top proximity pairs summary
 */
export function generateTopProximityPairs(analytics: SimulationAnalytics, top: number = 10): string {
  const data = analytics.export();
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║           TOP CHARACTER PROXIMITY PAIRS                        ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  const pairs = Array.from(data.characterProximity.entries())
    .map(([key, ticks]) => {
      const [c1, c2] = key.split('_');
      return {
        char1: analytics.getCharacterName(c1),
        char2: analytics.getCharacterName(c2),
        ticks,
        percentage: (ticks / data.totalTicks) * 100
      };
    })
    .sort((a, b) => b.ticks - a.ticks)
    .slice(0, top);
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const bar = '█'.repeat(Math.floor(pair.percentage / 2));
    output += `${(i + 1).toString().padStart(2)}. ${pair.char1} ↔ ${pair.char2}\n`;
    output += `    ${bar} ${pair.ticks} ticks (${pair.percentage.toFixed(1)}% of simulation)\n\n`;
  }
  
  return output;
}

/**
 * Generate energy curves summary
 */
export function generateEnergyCurvesSummary(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║              ENERGY SUSTAINABILITY ANALYSIS                    ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  // Sort by depletion rate (most negative first)
  const sortedChars = Array.from(data.energyStats.entries())
    .sort((a, b) => a[1].depletionRate - b[1].depletionRate);
  
  for (const [charId, stats] of sortedChars) {
    const name = analytics.getCharacterName(charId);
    const trend = stats.depletionRate < -0.001 ? '↓ DEPLETING' :
                  stats.depletionRate > 0.001 ? '↑ RECOVERING' :
                  '→ STABLE';
    
    const sustainability = stats.final > 0.5 ? '✓ Sustainable' :
                          stats.final > 0.3 ? '⚠ At Risk' :
                          '✗ Critical';
    
    output += `${name.padEnd(20)} ${trend.padEnd(12)} │ Final: ${(stats.final * 100).toFixed(1)}% │ ${sustainability}\n`;
    output += `  Range: ${(stats.min * 100).toFixed(1)}% - ${(stats.max * 100).toFixed(1)}% │ Avg: ${(stats.average * 100).toFixed(1)}% │ Rate: ${stats.depletionRate.toFixed(4)}/tick\n\n`;
  }
  
  return output;
}

/**
 * Generate ASCII sparkline for energy history
 */
export function generateEnergySparklines(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║              ENERGY CURVES (SPARKLINES)                        ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  for (const [charId, history] of data.energyHistory) {
    const name = analytics.getCharacterName(charId);
    const sparkline = createSparkline(history, 50);
    const stats = data.energyStats.get(charId);
    
    output += `${name.padEnd(20)} ${sparkline} ${stats ? (stats.final * 100).toFixed(0) + '%' : ''}\n`;
  }
  
  output += '\n';
  return output;
}

/**
 * Generate movement patterns summary
 */
export function generateMovementPatterns(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║                 MOVEMENT PATTERNS                              ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  const sortedChars = Array.from(data.movementCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const maxMoves = Math.max(...Array.from(data.movementCounts.values()));
  
  for (const [charId, moves] of sortedChars) {
    const name = analytics.getCharacterName(charId);
    const intensity = moves / maxMoves;
    const bar = '▓'.repeat(Math.floor(intensity * 30)) + '░'.repeat(30 - Math.floor(intensity * 30));
    const mobility = moves / data.totalTicks;
    
    output += `${name.padEnd(20)} │${bar}│ ${moves} moves (${(mobility * 100).toFixed(1)}% mobility)\n`;
  }
  
  return output + '\n';
}

/**
 * Generate interaction patterns summary
 */
export function generateInteractionPatterns(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  
  let output = '╔════════════════════════════════════════════════════════════════╗\n';
  output += '║              INTERACTION PATTERNS                              ║\n';
  output += '╚════════════════════════════════════════════════════════════════╝\n\n';
  
  // By type
  output += 'By Relationship Type:\n';
  const sortedTypes = Array.from(data.interactionsByType.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const maxInteractions = Math.max(...Array.from(data.interactionsByType.values()));
  
  for (const [type, count] of sortedTypes) {
    const intensity = count / maxInteractions;
    const bar = '█'.repeat(Math.floor(intensity * 25));
    output += `  ${type.padEnd(15)} │${bar.padEnd(25)}│ ${count}\n`;
  }
  
  output += '\n';
  
  // Top character pairs
  output += 'Top Interacting Pairs:\n';
  const topPairs = Array.from(data.interactionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  for (const [key, count] of topPairs) {
    const [c1, c2] = key.split('_');
    const name1 = analytics.getCharacterName(c1);
    const name2 = analytics.getCharacterName(c2);
    output += `  ${name1} ↔ ${name2}: ${count} interactions\n`;
  }
  
  return output + '\n';
}

/**
 * Generate comprehensive report
 */
export function generateComprehensiveReport(analytics: SimulationAnalytics): string {
  let report = '';
  
  report += '═'.repeat(64) + '\n';
  report += '         APARTMENTVERSE COLONY SIMULATION ANALYSIS\n';
  report += '═'.repeat(64) + '\n\n';
  
  const data = analytics.export();
  report += `Simulation Duration: ${data.totalTicks} ticks\n`;
  report += `Start: ${data.startTime.toISOString()}\n`;
  report += `End: ${data.endTime.toISOString()}\n\n`;
  
  report += generateSpaceHeatMap(analytics);
  report += generateEnergySparklines(analytics);
  report += generateEnergyCurvesSummary(analytics);
  report += generateProximityMatrix(analytics);
  report += generateTopProximityPairs(analytics, 8);
  report += generateMovementPatterns(analytics);
  report += generateInteractionPatterns(analytics);
  
  return report;
}

// Helper functions

function getProximitySymbol(intensity: number): string {
  if (intensity > 0.7) return '●';
  if (intensity > 0.4) return '◐';
  if (intensity > 0.1) return '○';
  return '·';
}

function createSparkline(data: number[], width: number = 50): string {
  if (data.length === 0) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  // Sample data to fit width
  const step = Math.max(1, Math.floor(data.length / width));
  const sampled: number[] = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  
  // Create sparkline with Unicode block characters
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  return sampled.map(value => {
    const normalized = range > 0 ? (value - min) / range : 0.5;
    const index = Math.floor(normalized * (chars.length - 1));
    return chars[index];
  }).join('');
}
