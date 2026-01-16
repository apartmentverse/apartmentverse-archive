/**
 * Apartmentverse Colony Simulation - Main Entry Point
 *
 * A character-driven colony sim where:
 * - Lucy's sundries store is the central hub
 * - Characters' motivations drive their movement through spaces
 * - SAGE variants have different "efficiency profiles"
 * - L's architecture creates spatial constraints
 *
 * Based on CHARACTER_LORE_QUICKREF_CORE_TEMPLATE
 */

import { ColonySimulation } from './simulation.js';

/**
 * Main function - run the simulation
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          APARTMENTVERSE COLONY SIMULATION                      ║');
  console.log('║          Character-Driven Space Navigation                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('SIMULATION DESIGN:');
  console.log('==================');
  console.log('• Lucy\'s Sundries Store = Central Hub');
  console.log('• Character motivations/fears drive movement decisions');
  console.log('• SAGE variants (Core/Chef/Hologram) have different efficiency profiles');
  console.log('• L\'s architecture enforces spatial constraints');
  console.log('• Relationships trigger interactions when characters share space\n');

  console.log('KEY MECHANICS:');
  console.log('==============');
  console.log('Motivations (drive movement):');
  console.log('  • Carl-Toughie: solve_problem, rest (follows Fox)');
  console.log('  • Fox: create, distribute_burden (tired joker energy)');
  console.log('  • Lucy: optimize, distribute_burden (stays at hub)');
  console.log('  • LaLaMoon: create, care_for_others (builds café)');
  console.log('  • SAGE-Core: optimize, rest (learning inefficiency is okay)');
  console.log('  • SAGE-Chef: care_for_others (over-optimized, doesn\'t recognize rest)');
  console.log('  • SAGE-Hologram: seek_connection, care (emotional bandwidth)');
  console.log('  • Fennec: learn (seeks archive, mirrors Fox)\n');

  console.log('Efficiency Profiles (SAGE variants):');
  console.log('  • Core: Balanced (1.0 speed, 0.9 optimization tendency)');
  console.log('  • Chef: Fast but rigid (1.5 speed, 0.3 flexibility, 1.0 care)');
  console.log('  • Hologram: Slow but attuned (0.7 speed, 1.0 emotional bandwidth)\n');

  console.log('Spatial Constraints (L\'s architecture):');
  console.log('  • Adjacency rules - must move through connected spaces');
  console.log('  • Capacity limits - spaces can fill up');
  console.log('  • Energy requirements - some spaces need emotional presence');
  console.log('  • Hub access - Lucy\'s store connects everything\n');

  console.log('Press Ctrl+C to stop the simulation at any time.\n');
  console.log('─'.repeat(64) + '\n');

  // Create simulation with moderate verbosity and reasonable tick count
  const sim = new ColonySimulation({
    maxTicks: 50,
    verbose: true,
    tickDelay: 0 // Set to 100+ for slower visualization
  });

  // Run the simulation
  await sim.run();

  console.log('─'.repeat(64));
  console.log('\nSIMULATION COMPLETE');
  console.log('\nKEY OBSERVATIONS:');
  console.log('• Did characters follow their motivations?');
  console.log('• How did SAGE variants behave differently?');
  console.log('• Did L\'s constraints shape movement patterns?');
  console.log('• What interactions emerged in shared spaces?');
  console.log('• Did Lucy stay at the hub as the anchor point?\n');
}

// Run the simulation
main().catch(error => {
  console.error('Simulation error:', error);
  process.exit(1);
});
