/**
 * Penalty-related types
 */

export interface PenaltyByUser {
  user_id: number;
  total_penalty: number;
  late_penalty: number;
  early_penalty: number;
  violation_count: number;
}

