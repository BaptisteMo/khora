// Khôra Scoring Models and Rules

// 1. Define enums for all action types in the game
export enum ActionType {
  Military = 'military',
  Culture = 'culture',
  Economy = 'economy',
  Science = 'science',
  Politics = 'politics',
  Philosophy = 'philosophy',
  Progress = 'progress',
  Tax = 'tax',
  Event = 'event',
  Achievement = 'achievement',
  // Add more as needed
}

// 2. Define the structure for a player action
export interface PlayerAction {
  userId: string;
  actionType: ActionType;
  value: number; // e.g., points gained, resources spent, etc.
  phase: string; // phase in which the action was taken
  timestamp: string;
  details?: string; // optional description or metadata
}

// 3. Scoring rule system: map actions to point values or calculation functions
export const SCORING_RULES: Record<ActionType, (action: PlayerAction) => number> = {
  [ActionType.Military]: (action) => action.value, // Example: 1 point per military action
  [ActionType.Culture]: (action) => action.value * 2, // Example: 2 points per culture action
  [ActionType.Economy]: (action) => action.value, // Example: 1 point per economy action
  [ActionType.Science]: (action) => action.value * 2, // Example: 2 points per science action
  [ActionType.Politics]: (action) => action.value, // Example: 1 point per politics action
  [ActionType.Philosophy]: (action) => action.value * 3, // Example: 3 points per philosophy action
  [ActionType.Progress]: (action) => action.value, // Example: 1 point per progress
  [ActionType.Tax]: (action) => action.value, // Example: 1 point per tax collected
  [ActionType.Event]: (action) => 0, // Events may not directly score points
  [ActionType.Achievement]: (action) => action.value * 5, // Example: 5 points per achievement
};

// 4. Constants for min/max values and special scoring
export const MAX_SCORE = 100;
export const MIN_SCORE = 0;
export const SPECIAL_SCORING = {
  // Example: bonus for completing all achievements
  allAchievementsBonus: 10,
};

// 5. Validation rules for legal/illegal moves
export function isLegalAction(action: PlayerAction): boolean {
  // Example: value must be positive and not exceed a reasonable max
  if (action.value < 0) return false;
  if (action.value > 20) return false; // Arbitrary max per action
  // Add more validation as needed based on phase, user state, etc.
  return true;
}

// 6. Documentation reference (for devs):
// All rules should be cross-checked with the official Khôra rulebook for accuracy.
// Update this file as new rules or edge cases are discovered.

// 7. ScoreCalculator service class
export class ScoreCalculator {
  private actions: PlayerAction[];

  constructor(actions: PlayerAction[] = []) {
    this.actions = actions;
  }

  // Add a new action (if legal)
  addAction(action: PlayerAction): boolean {
    if (!isLegalAction(action)) return false;
    this.actions.push(action);
    return true;
  }

  // Get all actions for a user
  getActionsForUser(userId: string): PlayerAction[] {
    return this.actions.filter(a => a.userId === userId);
  }

  // Calculate score for a user (all actions)
  calculateScore(userId: string): number {
    const userActions = this.getActionsForUser(userId);
    let total = 0;
    for (const action of userActions) {
      const rule = SCORING_RULES[action.actionType];
      if (rule) {
        total += rule(action);
      }
    }
    // Apply special scoring (example: all achievements bonus)
    if (this.hasAllAchievements(userId)) {
      total += SPECIAL_SCORING.allAchievementsBonus;
    }
    // Clamp to min/max
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, total));
  }

  // Check if user has completed all achievements (example logic)
  hasAllAchievements(userId: string): boolean {
    const userActions = this.getActionsForUser(userId);
    const achievements = userActions.filter(a => a.actionType === ActionType.Achievement);
    // Suppose there are 3 achievements in the game
    return achievements.length >= 3;
  }

  // Calculate running totals for all users
  calculateAllScores(): Record<string, number> {
    const userIds = Array.from(new Set(this.actions.map(a => a.userId)));
    const scores: Record<string, number> = {};
    for (const userId of userIds) {
      scores[userId] = this.calculateScore(userId);
    }
    return scores;
  }

  // Helper: get score by action type for a user
  getScoreByActionType(userId: string, actionType: ActionType): number {
    const userActions = this.getActionsForUser(userId).filter(a => a.actionType === actionType);
    return userActions.reduce((sum, action) => sum + SCORING_RULES[actionType](action), 0);
  }

  // Validate a move before scoring
  static validateMove(action: PlayerAction): boolean {
    return isLegalAction(action);
  }
} 