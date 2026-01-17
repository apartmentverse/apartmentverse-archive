/**
 * Data exporters for simulation analytics
 * Exports data in JSON, CSV, and HTML formats
 */

import { writeFileSync } from 'fs';
import { SimulationAnalytics } from './analytics.js';

/**
 * Export analytics data to JSON file
 */
export function exportToJSON(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.exportAsObject();
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filepath, json, 'utf-8');
  console.log(`✓ Analytics exported to JSON: ${filepath}`);
}

/**
 * Export space heat map data to CSV
 */
export function exportSpaceHeatMapCSV(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  
  let csv = 'Space,Total Visits,Average Occupancy,Visits Per Tick\n';
  
  for (const [spaceId, visits] of data.spaceVisits) {
    const spaceName = analytics.getSpaceName(spaceId);
    const occupancy = data.spaceOccupancyRate.get(spaceId) || 0;
    const visitsPerTick = data.spaceVisitsByTick.get(spaceId) || [];
    const avgVisitsPerTick = visitsPerTick.reduce((a, b) => a + b, 0) / visitsPerTick.length;
    
    csv += `"${spaceName}",${visits},${occupancy.toFixed(4)},${avgVisitsPerTick.toFixed(4)}\n`;
  }
  
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Space heat map exported to CSV: ${filepath}`);
}

/**
 * Export proximity matrix to CSV
 */
export function exportProximityMatrixCSV(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  const chars = data.characterIds;
  const matrix = data.proximityMatrix;
  
  // Header row
  let csv = 'Character,' + chars.map(id => analytics.getCharacterName(id)).join(',') + '\n';
  
  // Data rows
  for (let i = 0; i < chars.length; i++) {
    const row = [analytics.getCharacterName(chars[i])];
    for (let j = 0; j < chars.length; j++) {
      row.push(matrix[i][j].toString());
    }
    csv += row.join(',') + '\n';
  }
  
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Proximity matrix exported to CSV: ${filepath}`);
}

/**
 * Export energy history to CSV
 */
export function exportEnergyHistoryCSV(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  
  // Header row
  const chars = Array.from(data.energyHistory.keys());
  let csv = 'Tick,' + chars.map(id => analytics.getCharacterName(id)).join(',') + '\n';
  
  // Data rows
  const maxTicks = Math.max(...Array.from(data.energyHistory.values()).map(h => h.length));
  for (let tick = 0; tick < maxTicks; tick++) {
    const row = [tick.toString()];
    for (const charId of chars) {
      const history = data.energyHistory.get(charId) || [];
      row.push(history[tick]?.toFixed(4) || '');
    }
    csv += row.join(',') + '\n';
  }
  
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Energy history exported to CSV: ${filepath}`);
}

/**
 * Export all data as multiple CSV files
 */
export function exportAllCSV(analytics: SimulationAnalytics, outputDir: string): void {
  exportSpaceHeatMapCSV(analytics, `${outputDir}/space-heatmap.csv`);
  exportProximityMatrixCSV(analytics, `${outputDir}/proximity-matrix.csv`);
  exportEnergyHistoryCSV(analytics, `${outputDir}/energy-history.csv`);
  exportMovementDataCSV(analytics, `${outputDir}/movement-data.csv`);
  exportInteractionDataCSV(analytics, `${outputDir}/interaction-data.csv`);
}

/**
 * Export movement data to CSV
 */
export function exportMovementDataCSV(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  
  let csv = 'Character,Total Moves,Mobility Rate\n';
  
  for (const [charId, moves] of data.movementCounts) {
    const name = analytics.getCharacterName(charId);
    const mobility = moves / data.totalTicks;
    csv += `"${name}",${moves},${mobility.toFixed(4)}\n`;
  }
  
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Movement data exported to CSV: ${filepath}`);
}

/**
 * Export interaction data to CSV
 */
export function exportInteractionDataCSV(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  
  let csv = 'Character 1,Character 2,Interaction Count\n';
  
  for (const [key, count] of data.interactionCounts) {
    const [c1, c2] = key.split('_');
    const name1 = analytics.getCharacterName(c1);
    const name2 = analytics.getCharacterName(c2);
    csv += `"${name1}","${name2}",${count}\n`;
  }
  
  writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Interaction data exported to CSV: ${filepath}`);
}

/**
 * Generate HTML visualization with embedded charts
 */
export function exportToHTML(analytics: SimulationAnalytics, filepath: string): void {
  const data = analytics.export();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apartmentverse Colony Simulation - Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: 'Courier New', monospace;
      background: #0a0e27;
      color: #e0e0e0;
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    h1, h2 {
      color: #9d4edd;
      border-bottom: 2px solid #7b2cbf;
      padding-bottom: 10px;
    }
    .chart-container {
      background: #1a1e3a;
      border: 1px solid #7b2cbf;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    canvas {
      max-height: 400px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: #1a1e3a;
      border: 1px solid #7b2cbf;
      border-radius: 8px;
      padding: 15px;
    }
    .stat-card h3 {
      color: #c77dff;
      margin-top: 0;
    }
    .stat-value {
      font-size: 24px;
      color: #e0aaff;
      font-weight: bold;
    }
    .metadata {
      background: #1a1e3a;
      border-left: 4px solid #9d4edd;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>🏢 Apartmentverse Colony Simulation - Analytics Dashboard</h1>
  
  <div class="metadata">
    <strong>Simulation Metadata:</strong><br>
    Total Ticks: ${data.totalTicks}<br>
    Start: ${data.startTime.toISOString()}<br>
    End: ${data.endTime.toISOString()}<br>
    Characters: ${data.characterIds.length}<br>
    Spaces: ${data.spaceVisits.size}
  </div>
  
  <h2>Space Heat Map</h2>
  <div class="chart-container">
    <canvas id="spaceHeatMap"></canvas>
  </div>
  
  <h2>Energy Curves Over Time</h2>
  <div class="chart-container">
    <canvas id="energyCurves"></canvas>
  </div>
  
  <h2>Character Proximity Matrix</h2>
  <div class="chart-container">
    <canvas id="proximityMatrix"></canvas>
  </div>
  
  <h2>Movement Patterns</h2>
  <div class="chart-container">
    <canvas id="movementChart"></canvas>
  </div>
  
  <h2>Energy Statistics</h2>
  <div class="stats-grid">
    ${generateEnergyStatsCards(analytics)}
  </div>
  
  <script>
    // Chart.js default config
    Chart.defaults.color = '#e0e0e0';
    Chart.defaults.borderColor = '#7b2cbf';
    
    // Space Heat Map
    new Chart(document.getElementById('spaceHeatMap'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(Array.from(data.spaceVisits.keys()).map(id => analytics.getSpaceName(id)))},
        datasets: [{
          label: 'Total Visits',
          data: ${JSON.stringify(Array.from(data.spaceVisits.values()))},
          backgroundColor: 'rgba(157, 78, 221, 0.6)',
          borderColor: 'rgba(157, 78, 221, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
    
    // Energy Curves
    const energyData = ${JSON.stringify(
      Array.from(data.energyHistory.entries()).map(([id, history]) => ({
        label: analytics.getCharacterName(id),
        data: history
      }))
    )};
    
    const colors = [
      'rgb(157, 78, 221)',
      'rgb(199, 125, 255)',
      'rgb(224, 170, 255)',
      'rgb(123, 44, 191)',
      'rgb(94, 33, 142)',
      'rgb(154, 73, 222)',
      'rgb(180, 99, 236)',
      'rgb(206, 149, 250)'
    ];
    
    new Chart(document.getElementById('energyCurves'), {
      type: 'line',
      data: {
        labels: Array.from({ length: ${data.totalTicks} }, (_, i) => i),
        datasets: energyData.map((series, i) => ({
          label: series.label,
          data: series.data,
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length] + '33',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 1.0,
            title: { display: true, text: 'Energy Level' }
          },
          x: {
            title: { display: true, text: 'Tick' }
          }
        }
      }
    });
    
    // Proximity Matrix (as bar chart of top pairs)
    const proximityPairs = ${JSON.stringify(
      Array.from(data.characterProximity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => {
          const [c1, c2] = key.split('_');
          return {
            label: \`\${analytics.getCharacterName(c1)} ↔ \${analytics.getCharacterName(c2)}\`,
            value
          };
        })
    )};
    
    new Chart(document.getElementById('proximityMatrix'), {
      type: 'bar',
      data: {
        labels: proximityPairs.map(p => p.label),
        datasets: [{
          label: 'Ticks Together',
          data: proximityPairs.map(p => p.value),
          backgroundColor: 'rgba(199, 125, 255, 0.6)',
          borderColor: 'rgba(199, 125, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true
      }
    });
    
    // Movement Chart
    new Chart(document.getElementById('movementChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(Array.from(data.movementCounts.keys()).map(id => analytics.getCharacterName(id)))},
        datasets: [{
          label: 'Total Moves',
          data: ${JSON.stringify(Array.from(data.movementCounts.values()))},
          backgroundColor: 'rgba(224, 170, 255, 0.6)',
          borderColor: 'rgba(224, 170, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  </script>
</body>
</html>`;
  
  writeFileSync(filepath, html, 'utf-8');
  console.log(`✓ Interactive HTML visualization exported: ${filepath}`);
}

function generateEnergyStatsCards(analytics: SimulationAnalytics): string {
  const data = analytics.export();
  let cards = '';
  
  for (const [charId, stats] of data.energyStats) {
    const name = analytics.getCharacterName(charId);
    const trend = stats.depletionRate < -0.001 ? '↓' :
                  stats.depletionRate > 0.001 ? '↑' : '→';
    const sustainability = stats.final > 0.5 ? '✓ Sustainable' :
                          stats.final > 0.3 ? '⚠ At Risk' :
                          '✗ Critical';
    
    cards += `
    <div class="stat-card">
      <h3>${name} ${trend}</h3>
      <div class="stat-value">${(stats.final * 100).toFixed(1)}%</div>
      <div style="margin-top: 10px;">
        Final Energy: ${sustainability}<br>
        Range: ${(stats.min * 100).toFixed(1)}% - ${(stats.max * 100).toFixed(1)}%<br>
        Average: ${(stats.average * 100).toFixed(1)}%<br>
        Depletion Rate: ${stats.depletionRate.toFixed(4)}/tick
      </div>
    </div>`;
  }
  
  return cards;
}
