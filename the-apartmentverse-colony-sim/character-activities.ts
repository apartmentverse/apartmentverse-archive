
import { Character, CharacterId, AgentType, Artifact, ActivityDecision } from './types';
import { ActivitySystem, ActivityDefinitions } from './activities';
import { AGENT_REST_ZONES, PERFORMANCE_VENUES, BALANCE } from './constants';

export class CharacterActivityLogic {
  /**
   * Decide if character should perform an activity this tick
   */
  static getActivity(
    character: Character,
    allCharacters: Map<CharacterId, Character>,
    activitySystem: ActivitySystem,
    tick: number,
    artifacts: Artifact[] = [], 
    map: number[] = []
  ): ActivityDecision | null {
    
    // Don't perform if already doing something
    if (activitySystem.isPerformingActivity(character.id)) {
      return null;
    }

    // FIX FOR CHEF CIRCUIT STALL
    if (character.type === AgentType.SAGE_CHEF && character.chefState?.phase === 'traveling') {
        return null;
    }
    
    // FIX FOR HOLOGRAM CIRCUIT STALL
    if (character.type === AgentType.SAGE_HOLO && character.holoState?.phase === 'traveling') {
        return null;
    }
    if (character.type === AgentType.SAGE_HOLO && character.holoState?.phase === 'collecting_narrative') {
        return null;
    }

    // --- POST-ACTIVITY MOVEMENT CHECK ---
    const hasMoveUrge = character.motivations?.some(m => m.type === 'post_activity_movement');
    if (hasMoveUrge) {
        return null;
    }

    // Need minimum energy
    const minEnergy = character.id.startsWith('sage') ? BALANCE.MIN_ENERGY_FOR_ACTIVITY_SAGE : BALANCE.MIN_ENERGY_FOR_ACTIVITY_OTHER;
    if (character.needs.energy < minEnergy) {
      return null;
    }

    // L doesn't perform activities
    if (character.id === 'l') {
      return null;
    }
    
    // LUCY ORGANIZATION PRIORITY
    if (character.id === 'lucy' && character.currentSpace === 'lucys-store') {
        const unorganizedItems = artifacts.filter(a => 
            a.currentLocation === 'lucys-store' && 
            !a.organized && 
            !a.carrierId
        );
        
        if (unorganizedItems.length > 0) {
            return {
                characterId: character.id,
                category: 'purpose',
                reason: `Organizing ${unorganizedItems.length} items`,
                urgency: 0.85,
                variant: 'organize_store'
            };
        }
    }

    // WORKSHOP COLLABORATION PRIORITY
    if (character.id === 'carl-toughie' || character.id === 'fox') {
      const carl = allCharacters.get('carl-toughie');
      const fox = allCharacters.get('fox');
      if (carl && fox && 
          carl.currentSpace === 'the-workshop' && 
          fox.currentSpace === 'the-workshop' &&
          carl.needs.energy > 30 && fox.needs.energy > 20) {
        return null;
      }
    }

    // CORE SAGE REST OPTIMIZATION CHECK
    if (character.id === 'sage-core') {
        const nearbyNeedy = Array.from(allCharacters.values()).find(a => 
            a.id !== character.id &&
            a.needsRest && 
            a.currentSpace === character.currentSpace &&
            (AGENT_REST_ZONES[a.type] && character.currentSpace !== 'corridor' && AGENT_REST_ZONES[a.type] !== undefined)
        );
        
        if (nearbyNeedy) {
            return {
                characterId: character.id,
                category: 'purpose',
                reason: `Optimizing rest for ${nearbyNeedy.name}`,
                urgency: 0.95,
                variant: 'optimize_rest'
            };
        }
    }

    // HOLOGRAM SAGE CIRCUIT LOGIC
    if (character.id === 'sage-hologram') {
        // Case 1: Narrative Performance (High Priority)
        // If phase is 'performing' but carrying artifact, triggers standard 'perform_story' logic
        if (character.carrying && PERFORMANCE_VENUES.includes(character.currentSpace)) {
             return {
                characterId: character.id,
                category: 'stability', // Using stability for narrative performance
                reason: 'Performing collected narrative',
                urgency: 1.0, 
                variant: 'performs_story'
            };
        }
        
        // Case 2: Circuit Haiku (Standard)
        if (character.holoState?.phase === 'waiting_for_audience') {
            const hasAudience = Array.from(allCharacters.values()).some(a => 
                a.id !== character.id && 
                a.currentSpace === character.currentSpace
            );
            
            if (hasAudience) {
                // Trigger haiku immediately
                 return {
                    characterId: character.id,
                    category: 'social',
                    reason: 'Audience detected - performing Haiku',
                    urgency: 1.0, 
                    variant: 'holo_haiku'
                };
            }
        }
    }

    // LALA FACILITATION
    if (character.id === 'lalamoon') {
        const nearby = Array.from(allCharacters.values()).find(a => 
            a.id !== character.id && 
            a.currentSpace === character.currentSpace &&
            a.needs.energy > 30
        );
        
        if (nearby) {
            if ((nearby.id === 'carl-toughie' || nearby.id === 'fox') && nearby.currentSpace !== 'the-workshop') {
                 const partnerId = nearby.id === 'carl-toughie' ? 'fox' : 'carl-toughie';
                 const partner = allCharacters.get(partnerId);
                 if (partner && partner.needs.energy > 30) {
                     return {
                        characterId: character.id,
                        category: 'social',
                        reason: `Inviting ${nearby.name} to collaborate`,
                        urgency: 0.9,
                        variant: 'facilitate_collaboration'
                     };
                 }
            }
        }
    }

    // Check current motivations
    const sortedMotivations = [...(character.motivations || [])].sort((a, b) => b.intensity - a.intensity);

    if (character.id === 'sage-core' && !sortedMotivations.find(m => m.type === 'optimize')) {
        sortedMotivations.push({ type: 'optimize', intensity: 0.9 });
    }

    for (const motivation of sortedMotivations) {
      let decision: ActivityDecision | null = null;
      let category: 'social' | 'purpose' | 'stability' | null = null;

      switch (motivation.type) {
          case 'seek_connection': category = 'social'; break;
          case 'care_for_others': category = Math.random() < 0.4 ? 'stability' : 'purpose'; break;
          case 'create': category = 'stability'; break;
          case 'distribute_burden': if(character.id==='lucy') category = 'social'; break;
          case 'solve_problem': if(character.id==='carl-toughie') category = 'stability'; break;
          case 'perform': if(character.id==='sage-hologram') category = Math.random()<0.4 || character.needs.stability<20 ? 'stability' : 'social'; break;
          case 'optimize': if(character.id==='sage-core') category = 'stability'; break;
          case 'learn': if(character.id==='fennec') category = 'purpose'; break;
      }

      if (category) {
          const activityDef = ActivityDefinitions.getActivity(character.id, category);
          
          if (activityDef) {
              const inPreferredLocation = activityDef.preferredLocations.includes(character.currentSpace);
              const energyOK = character.needs.energy > (character.id.startsWith('sage') ? 20 : 30);
              
              if (inPreferredLocation && energyOK) {
                   const audience = activityDef.audienceBenefits
                        .map(b => allCharacters.get(b.characterId))
                        .filter(a => a && a.currentSpace === character.currentSpace);
                   
                   const hasAudience = audience.length > 0;
                   
                   let urgency = motivation.intensity;
                   if (character.needs.energy > 70) urgency *= 1.0;
                   else if (character.needs.energy > 50) urgency *= 0.85;
                   else urgency *= 0.65;
                   
                   if (hasAudience) urgency *= 1.2;

                   const lastLog = activitySystem.getLastActivityLog(character.id);
                   if (lastLog && lastLog.type === category) {
                        urgency *= 0.5;
                   }

                   if (activityDef.audienceBenefits.length > 0 && hasAudience) {
                       const targetPartnerId = activityDef.audienceBenefits[0].characterId;
                       const lastTick = activitySystem.getLastInteractionTick(character.id, targetPartnerId);
                       
                       if (lastTick !== undefined && tick - lastTick < 100) {
                           let penalty = 0.85;
                           const pair = [character.id, targetPartnerId].sort().join(':');
                           if (pair.includes('carl') && pair.includes('fox')) penalty = 0.95;
                           if (pair.includes('lucy') && pair.includes('lala')) penalty = 0.92;
                           
                           urgency *= penalty;
                       } else if (lastTick === undefined || tick - lastTick > 200) {
                           urgency *= 1.15;
                       }
                   }

                   decision = {
                       characterId: character.id,
                       category: category,
                       reason: `${character.name} performs ${category} activity`,
                       urgency: urgency
                   };
              }
          }
      }

      if (decision) {
        return decision;
      }
    }

    if (character.needs.energy > 40 && Math.random() < 0.15) {
        const act = ActivityDefinitions.getActivity(character.id, 'social');
        if (act && act.preferredLocations.includes(character.currentSpace)) {
            return {
                characterId: character.id,
                category: 'social',
                reason: 'Idle social',
                urgency: 0.3
            };
        }
    }

    return null;
  }
  
  // Method alias for compatibility
  static getActivityDecision(character: Character, allCharacters: Map<CharacterId, Character>, activitySystem: ActivitySystem, tick: number, artifacts: Artifact[] = [], map: number[] = []) {
      return this.getActivity(character, allCharacters, activitySystem, tick, artifacts, map);
  }

  static getAllActivityDecisions(
    characters: Map<CharacterId, Character>,
    activitySystem: ActivitySystem,
    tick: number,
    artifacts: Artifact[],
    map: number[]
  ): ActivityDecision[] {
      const decisions: ActivityDecision[] = [];
      for (const char of characters.values()) {
          const decision = this.getActivityDecision(char, characters, activitySystem, tick, artifacts, map);
          if (decision) decisions.push(decision);
      }
      return decisions;
  }
  
  static shouldAttemptActivity(decision: ActivityDecision): boolean {
    if (decision.urgency > 0.75) return true;
    if (decision.urgency > 0.5) return Math.random() < decision.urgency;
    return Math.random() < 0.25;
  }
}
