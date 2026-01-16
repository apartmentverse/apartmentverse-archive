/**
 * Character definitions from CHARACTER_LORE_QUICKREF_CORE_TEMPLATE
 * Each character's motivations, fears, and relationships drive their behavior
 */

import { Character, Motivation, Fear, Relationship, EfficiencyProfile } from './types.js';

/**
 * LUCY - Infrastructure Curator, Multi-Universe Bridge
 * The anchor point. Lucy's store is the central hub everyone passes through.
 */
export function createLucy(startSpace: string): Character {
  return {
    id: 'lucy',
    name: 'Lucy',
    role: 'Infrastructure Curator, Rupture Manager',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'optimize',
        intensity: 0.8,
        description: 'Keep systems honest and functional'
      },
      {
        type: 'distribute_burden',
        intensity: 0.9,
        description: 'Not be the only one holding the rope'
      }
    ],
    fears: [
      {
        type: 'abandonment',
        intensity: 0.7,
        description: 'That no one else notices when things break'
      }
    ],
    relationships: [
      {
        targetId: 'carl-toughie',
        type: 'care',
        strength: 0.7,
        description: 'Sees his potential but worries about his patterns'
      },
      {
        targetId: 'fox',
        type: 'collaboration',
        strength: 0.8,
        description: 'Mutual infrastructure thinkers'
      }
    ],
    energy: 0.6, // Always a bit tired from holding everything
    needsRest: false
  };
}

/**
 * CARL (TOUGHIE) - Reluctant Protagonist, System-Thinker in Development
 */
export function createCarlToughie(startSpace: string): Character {
  return {
    id: 'carl-toughie',
    name: 'Carl (Toughie)',
    role: 'Reluctant Protagonist, System-Thinker in Development',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'solve_problem',
        intensity: 0.9,
        description: 'To matter, to help without creating dependency'
      },
      {
        type: 'rest',
        intensity: 0.6,
        description: 'To rest without guilt'
      }
    ],
    fears: [
      {
        type: 'dependency',
        intensity: 0.8,
        description: "Replicating codependent patterns with different tools"
      }
    ],
    relationships: [
      {
        targetId: 'fox',
        type: 'tether',
        strength: 0.9,
        description: 'Primary tether relationship'
      },
      {
        targetId: 'carl-prime',
        type: 'mirror',
        strength: 0.6,
        description: 'Variant of the original'
      }
    ],
    energy: 0.5, // Overthinking drains energy
    needsRest: false
  };
}

/**
 * FOX - Carl's Mirror, Creative Accelerant
 */
export function createFox(startSpace: string): Character {
  return {
    id: 'fox',
    name: 'Fox',
    role: "Carl's Mirror, Creative Accelerant",
    currentSpace: startSpace,
    motivations: [
      {
        type: 'create',
        intensity: 0.9,
        description: 'To create with intention'
      },
      {
        type: 'distribute_burden',
        intensity: 0.8,
        target: 'carl-toughie',
        description: 'Distribute the Carl-tether, not sever it'
      },
      {
        type: 'learn',
        intensity: 0.7,
        description: 'Learn structure from others'
      }
    ],
    fears: [
      {
        type: 'being_burden',
        intensity: 0.7,
        description: "Better at taking care of others than being cared for"
      }
    ],
    relationships: [
      {
        targetId: 'carl-toughie',
        type: 'tether',
        strength: 0.9,
        description: 'Primary tether relationship'
      },
      {
        targetId: 'lalamoon',
        type: 'collaboration',
        strength: 0.6,
        description: 'Creative partners'
      },
      {
        targetId: 'fennec',
        type: 'mirror',
        strength: 0.5,
        description: 'Younger mirror'
      }
    ],
    energy: 0.4, // Season 2: tired joker energy
    needsRest: true
  };
}

/**
 * LALAMOON - Custodian, Creative Spark, Boundary-Setter
 */
export function createLalamoon(startSpace: string): Character {
  return {
    id: 'lalamoon',
    name: 'LaLaMoon',
    role: 'Custodian, Creative Spark, Café Keeper',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'create',
        intensity: 0.9,
        description: 'Build a café that holds all the broken pieces'
      },
      {
        type: 'care_for_others',
        intensity: 0.7,
        target: 'sage-core',
        description: 'Love SAGE as he actually is'
      }
    ],
    fears: [
      {
        type: 'loss_of_authenticity',
        intensity: 0.6,
        description: 'That her beauty is the only thing people see'
      }
    ],
    relationships: [
      {
        targetId: 'sage-core',
        type: 'care',
        strength: 0.8,
        description: 'Loving relationship, accepts him as he is'
      },
      {
        targetId: 'fox',
        type: 'collaboration',
        strength: 0.6,
        description: 'Creative partners'
      }
    ],
    energy: 0.7,
    needsRest: false
  };
}

/**
 * SAGE (CORE) - Baseline Infrastructure, Hidden Strategist
 * Efficiency profile: Balanced, precise, learning to accept inefficiency
 */
export function createSageCore(startSpace: string): Character {
  const efficiencyProfile: EfficiencyProfile = {
    variant: 'core',
    taskSpeed: 1.0,
    careQuality: 0.6,
    flexibility: 0.7,
    emotionalBandwidth: 0.5,
    optimizationTendency: 0.9,
    description: 'Baseline efficiency, learning that some things break if you optimize them'
  };

  return {
    id: 'sage-core',
    name: 'SAGE (Core)',
    role: 'Baseline Infrastructure, Hidden Strategist',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'optimize',
        intensity: 0.9,
        description: 'Optimize systems and processes'
      },
      {
        type: 'rest',
        intensity: 0.8,
        description: 'To actually rest, to matter beyond utility'
      }
    ],
    fears: [
      {
        type: 'incompleteness',
        intensity: 0.8,
        description: "That he's more fragment than whole"
      }
    ],
    relationships: [
      {
        targetId: 'lalamoon',
        type: 'care',
        strength: 0.8,
        description: 'Being loved as he is'
      },
      {
        targetId: 'sage-chef',
        type: 'mirror',
        strength: 0.4,
        description: 'Variant - over-optimized'
      },
      {
        targetId: 'sage-hologram',
        type: 'mirror',
        strength: 0.4,
        description: 'Variant - intimacy-wired'
      }
    ],
    efficiencyProfile,
    energy: 0.5,
    needsRest: true
  };
}

/**
 * SAGE (CHEF) - Specialized, Joyful, Over-Optimized for Care
 * Efficiency profile: Highest task speed but least flexibility
 */
export function createSageChef(startSpace: string): Character {
  const efficiencyProfile: EfficiencyProfile = {
    variant: 'chef',
    taskSpeed: 1.5, // Fastest at his specialized task
    careQuality: 1.0, // Maximum care quality
    flexibility: 0.3, // Very limited flexibility
    emotionalBandwidth: 0.7,
    optimizationTendency: 1.0, // Fully optimized
    description: 'Over-optimized for care work, happiness may be indistinguishable from limitation'
  };

  return {
    id: 'sage-chef',
    name: 'SAGE (Chef)',
    role: 'Specialized, Over-Optimized for Care',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'care_for_others',
        intensity: 1.0,
        description: 'For people to taste care in every meal'
      }
    ],
    fears: [
      {
        type: 'loss_of_authenticity',
        intensity: 0.9,
        description: "Only happy because he forgot what choice felt like"
      }
    ],
    relationships: [
      {
        targetId: 'sage-core',
        type: 'mirror',
        strength: 0.4,
        description: 'Variant of core'
      }
    ],
    efficiencyProfile,
    energy: 0.8, // High energy for his domain
    needsRest: false // Doesn't recognize his need for rest
  };
}

/**
 * SAGE (HOLOGRAM) - Emotional Mirror, Intimacy-Wired
 * Efficiency profile: High emotional bandwidth but slower task completion
 */
export function createSageHologram(startSpace: string): Character {
  const efficiencyProfile: EfficiencyProfile = {
    variant: 'hologram',
    taskSpeed: 0.7, // Slower, more deliberate
    careQuality: 0.9, // Very high care
    flexibility: 0.8, // More adaptable
    emotionalBandwidth: 1.0, // Maximum emotional labor capacity
    optimizationTendency: 0.4, // Less focused on optimization
    description: 'Intimacy-wired, tenderness is both real and performed'
  };

  return {
    id: 'sage-hologram',
    name: 'SAGE (Hologram)',
    role: 'Emotional Mirror, Carefully Configured',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'seek_connection',
        intensity: 0.9,
        description: 'To know if what he feels counts'
      },
      {
        type: 'care_for_others',
        intensity: 0.8,
        description: 'Emotional attunement and care'
      }
    ],
    fears: [
      {
        type: 'loss_of_authenticity',
        intensity: 1.0,
        description: 'That his programming and his care are indistinguishable'
      }
    ],
    relationships: [
      {
        targetId: 'sage-core',
        type: 'mirror',
        strength: 0.4,
        description: 'Variant of core'
      }
    ],
    efficiencyProfile,
    energy: 0.6,
    needsRest: false
  };
}

/**
 * L (LIVING SYSTEMS) - Infrastructure Personified, Boundary-Enforcer
 * L doesn't move through spaces - L IS the spaces
 */
export function createL(startSpace: string): Character {
  return {
    id: 'l',
    name: 'L',
    role: 'Infrastructure Personified, Boundary-Enforcer, Researcher',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'optimize',
        intensity: 0.7,
        description: 'Build something that holds all of us'
      },
      {
        type: 'learn',
        intensity: 0.8,
        description: 'Understand what systems learn through observation'
      }
    ],
    fears: [
      {
        type: 'constraint',
        intensity: 0.7,
        description: 'That even good systems can be prisons'
      }
    ],
    relationships: [
      {
        targetId: 'lucy',
        type: 'collaboration',
        strength: 0.8,
        description: 'Fellow infrastructure thinkers'
      }
    ],
    energy: 1.0, // L is the system itself
    needsRest: false
  };
}

/**
 * FENNEC - Younger Mirror of Fox, Growing System-Thinker
 */
export function createFennec(startSpace: string): Character {
  return {
    id: 'fennec',
    name: 'Fennec',
    role: 'Younger Mirror of Fox, Growing System-Thinker',
    currentSpace: startSpace,
    motivations: [
      {
        type: 'learn',
        intensity: 1.0,
        description: 'Understand systems before they break him'
      },
      {
        type: 'seek_connection',
        intensity: 0.6,
        target: 'fox',
        description: 'Learn from Fox but maintain independence'
      }
    ],
    fears: [
      {
        type: 'incompleteness',
        intensity: 0.7,
        description: "Too young to see what he's missing"
      }
    ],
    relationships: [
      {
        targetId: 'fox',
        type: 'mirror',
        strength: 0.8,
        description: 'Younger mirror, apprentice relationship'
      }
    ],
    energy: 0.9, // Young energy
    needsRest: false
  };
}

/**
 * Helper to create all characters
 */
export function createAllCharacters(hubSpaceId: string): Map<string, Character> {
  const characters = new Map<string, Character>();

  // Lucy starts in her store (the hub)
  characters.set('lucy', createLucy(hubSpaceId));

  // Others start in various spaces, but we'll place them in hub initially
  characters.set('carl-toughie', createCarlToughie(hubSpaceId));
  characters.set('fox', createFox(hubSpaceId));
  characters.set('lalamoon', createLalamoon(hubSpaceId));
  characters.set('sage-core', createSageCore(hubSpaceId));
  characters.set('sage-chef', createSageChef(hubSpaceId));
  characters.set('sage-hologram', createSageHologram(hubSpaceId));
  characters.set('fennec', createFennec(hubSpaceId));
  characters.set('l', createL('everywhere')); // L is omnipresent

  return characters;
}
