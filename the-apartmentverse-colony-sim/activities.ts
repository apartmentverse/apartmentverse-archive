
import { Character, CharacterId, SpaceId, Agent } from './types';
import { Activity, ActivityProgress, ActivityCategory, ActivityDecision, ActivityDefinition } from './types';

export class ActivitySystem {
  activityProgress: Map<CharacterId, ActivityProgress> = new Map();
  activityCooldowns: Map<CharacterId, number> = new Map();
  lastActivityLog: Map<CharacterId, { type: string, location: SpaceId, tick: number }> = new Map();
  lastActivityPartners: Map<CharacterId, { partnerId: string, tick: number }> = new Map();
  
  // NEW: Granular history of interactions between specific pairs
  // Map<ActorId, Map<PartnerId, LastTick>>
  private interactionHistory: Map<CharacterId, Map<CharacterId, number>> = new Map();

  isPerformingActivity(charId: CharacterId): boolean {
    return this.activityProgress.has(charId);
  }

  /**
   * Record an interaction between two characters
   */
  recordInteraction(charId: CharacterId, partnerId: CharacterId, tick: number) {
      if (!this.interactionHistory.has(charId)) {
          this.interactionHistory.set(charId, new Map());
      }
      this.interactionHistory.get(charId)!.set(partnerId, tick);
  }

  /**
   * Get the last tick these two characters interacted
   */
  getLastInteractionTick(charId: CharacterId, partnerId: CharacterId): number | undefined {
      return this.interactionHistory.get(charId)?.get(partnerId);
  }

  getLastActivityLog(charId: CharacterId) {
      return this.lastActivityLog.get(charId);
  }

  startActivity(agent: Agent, category: ActivityCategory, tick: number, variant?: string): Activity | null {
      const def = ActivityDefinitions.getActivity(agent.id, category);
      if (!def) return null;

      const activity: Activity = {
          name: def.name,
          emoji: def.emoji,
          category: def.category,
          duration: def.duration,
          selfBenefit: def.selfBenefit,
          audienceBenefits: def.audienceBenefits,
          performerId: agent.id,
          variant: variant
      };

      this.activityProgress.set(agent.id, {
          activity,
          ticksCompleted: 0,
          location: agent.currentSpace
      });

      return activity;
  }

  /**
   * Progress activities and check for completion
   */
  progressActivities(
    characters: Map<CharacterId, Character>,
    tick: number
  ): {
    completed: Activity[],
    inProgress: ActivityProgress[]
  } {
    const completed: Activity[] = [];
    const inProgress: ActivityProgress[] = [];

    for (const [charId, progress] of this.activityProgress) {
      const character = characters.get(charId);
      if (!character) {
        this.activityProgress.delete(charId);
        continue;
      }

      // Check if character moved (cancels activity)
      if (character.currentSpace !== progress.location) {
        this.activityProgress.delete(charId);
        continue;
      }

      // Progress tick
      progress.ticksCompleted++;

      // Check completion
      if (progress.ticksCompleted >= progress.activity.duration) {
        // Apply self benefit
        character.needs.energy = Math.min(100, character.needs.energy + (progress.activity.selfBenefit * 100));

        // Update stability stats
        if (progress.activity.category === 'stability') {
           character.needs.stability = Math.min(100, character.needs.stability + 20);
        } else {
           character.needs.stability = Math.min(100, character.needs.stability + 2);
        }

        // Update purpose/social stats based on activity type
        if (progress.activity.category === 'purpose') character.needs.purpose += 10;
        if (progress.activity.category === 'social') character.needs.connection += 10;

        // Apply audience benefits (characters in same space)
        for (const benefit of progress.activity.audienceBenefits) {
          const audience = characters.get(benefit.characterId);
          if (audience && audience.currentSpace === progress.location) {
            audience.needs.energy = Math.min(100, audience.needs.energy + (benefit.energyGain * 100));
            // Audience also gets stability boost if they participated/watched
             if (progress.activity.category === 'stability') {
                audience.needs.stability += 10;
             }
             
             // NEW: Record Partnership (Reciprocal) to prevent immediate loops
             this.lastActivityPartners.set(charId, { partnerId: audience.id, tick });
             this.lastActivityPartners.set(audience.id, { partnerId: charId, tick });
             
             // NEW: Record granular history for diversity tracking
             this.recordInteraction(charId, audience.id, tick);
             this.recordInteraction(audience.id, charId, tick);
          }
        }

        completed.push(progress.activity);
        this.activityProgress.delete(charId);
        
        // Set cooldown and log
        this.activityCooldowns.set(charId, tick);
        this.lastActivityLog.set(charId, {
            type: progress.activity.category,
            location: progress.location,
            tick
        });
        
        // NEW: Record last activity location for movement preference logic
        character.lastActivityLocation = progress.location;
        character.lastActivityTick = tick;

        // --- POST-ACTIVITY MOVEMENT INCENTIVE ---
        if (progress.activity.category !== 'stability' || Math.random() < 0.7) {
            character.motivations.push({
                type: 'post_activity_movement',
                intensity: 0.65,
                description: 'Feeling energized, wants to move',
                target: undefined,
                expiresAt: tick + 15
            });
        }

      } else {
        inProgress.push(progress);
      }
    }

    return { completed, inProgress };
  }
}

export class ActivityDefinitions {
    static getActivity(charId: CharacterId, category: ActivityCategory): ActivityDefinition | null {
        // Specific Character Mappings
        if (charId === 'lucy' && category === 'purpose') {
            return {
                id: 'lucy_organize',
                name: 'Organizing Store',
                emoji: '🗂️',
                category: 'purpose',
                duration: 5,
                selfBenefit: 0.15,
                preferredLocations: ['lucys-store'],
                audienceBenefits: []
            };
        }
        if (charId === 'carl-toughie' && category === 'purpose') {
            return {
                id: 'carl_build',
                name: 'Constructing',
                emoji: '🔨',
                category: 'purpose',
                duration: 20,
                selfBenefit: 0.2,
                preferredLocations: ['the-workshop'],
                audienceBenefits: []
            };
        }
        if (charId === 'carl-toughie' && category === 'stability') {
            return {
                id: 'carl_rest',
                name: 'Balcony Watch',
                emoji: '🚬',
                category: 'stability',
                duration: 30,
                selfBenefit: 0.5,
                preferredLocations: ['carls-balcony'],
                audienceBenefits: []
            };
        }
        if (charId === 'fox' && category === 'purpose') {
            return {
                 id: 'fox_chaos',
                 name: 'Chaotic Tinkering',
                 emoji: '⚙️',
                 category: 'purpose',
                 duration: 15,
                 selfBenefit: 0.15,
                 preferredLocations: ['the-workshop'],
                 audienceBenefits: [{ characterId: 'carl-toughie', energyGain: 0.05 }]
            };
        }
        if (charId === 'fox' && category === 'stability') {
             return {
                 id: 'fox_hide',
                 name: 'Hiding',
                 emoji: '🦊',
                 category: 'stability',
                 duration: 25,
                 selfBenefit: 0.4,
                 preferredLocations: ['fox-den'],
                 audienceBenefits: []
             };
        }
        if (charId === 'lucy' && category === 'social') {
            return {
                id: 'lucy_distribute',
                name: 'Distributing',
                emoji: '📦',
                category: 'social',
                duration: 10,
                selfBenefit: 0.1,
                preferredLocations: ['lucys-store'],
                audienceBenefits: []
            };
        }
        if (charId === 'sage-core' && category === 'purpose') {
            return {
                id: 'core_opt',
                name: 'System Optimization',
                emoji: '💠',
                category: 'purpose',
                duration: 40,
                selfBenefit: 0.1,
                preferredLocations: ['cores-terminal'],
                audienceBenefits: []
            };
        }
        if (charId === 'sage-core' && category === 'stability') {
             return {
                id: 'core_charge',
                name: 'Recharging',
                emoji: '🔋',
                category: 'stability',
                duration: 50,
                selfBenefit: 0.6,
                preferredLocations: ['cores-terminal'],
                audienceBenefits: []
            };
        }
        if (charId === 'sage-chef' && category === 'purpose') {
             return {
                id: 'chef_menu',
                name: 'Menu Planning',
                emoji: '📝',
                category: 'purpose',
                duration: 10,
                selfBenefit: 0.1,
                preferredLocations: ['lalamoons-cafe'],
                audienceBenefits: []
             };
        }
        if (charId === 'sage-hologram' && (category === 'social' || category === 'stability')) {
            return {
                id: 'holo_perform',
                name: 'Holographic Play',
                emoji: '🎭',
                category: category,
                duration: 30,
                selfBenefit: 0.3,
                preferredLocations: ['lalamoons-cafe', 'lucys-store', 'the-workshop', 'holograms-backstage'],
                audienceBenefits: [{ characterId: 'fennec', energyGain: 0.1 }, { characterId: 'lalamoon', energyGain: 0.1 }]
            };
        }
        // NEW: Short Circuit Haiku Performance
        if (charId === 'sage-hologram' && category === 'social') {
            return {
                id: 'holo_haiku',
                name: 'Reciting Haiku',
                emoji: '📜',
                category: 'social',
                duration: 2, // Very fast
                selfBenefit: 0.05,
                preferredLocations: ['lucys-store', 'lalamoons-cafe', 'the-workshop'],
                audienceBenefits: [{ characterId: 'lalamoon', energyGain: 0.05 }, { characterId: 'lucy', energyGain: 0.05 }, { characterId: 'carl-toughie', energyGain: 0.05 }]
            };
        }

        if (charId === 'lalamoon' && category === 'social') {
             return {
                id: 'lala_host',
                name: 'Hosting',
                emoji: '🍵',
                category: 'social',
                duration: 20,
                selfBenefit: 0.2,
                preferredLocations: ['lalamoons-cafe', 'lalamoons-garden'],
                audienceBenefits: [{ characterId: 'sage-chef', energyGain: 0.1 }]
             };
        }
        if (charId === 'fennec' && category === 'purpose') {
            return {
                id: 'fennec_run',
                name: 'Speed Training',
                emoji: '👟',
                category: 'purpose',
                duration: 10,
                selfBenefit: 0.2,
                preferredLocations: ['corridor', 'fennecs-soft-lab'],
                audienceBenefits: []
            };
        }

        // Generic Fallback
        if (category === 'social') {
            return {
                id: 'generic_chat',
                name: 'Chatting',
                emoji: '💬',
                category: 'social',
                duration: 5,
                selfBenefit: 0.05,
                preferredLocations: ['lalamoons-cafe', 'lalamoons-garden', 'lucys-store'],
                audienceBenefits: []
            };
        }

        return null;
    }
}
