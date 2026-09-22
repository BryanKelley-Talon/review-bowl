// ============================================================
// THREAT — one signal, both sides of the ball (iteration order §4).
//
// The offensive "big moment" check already knew what a dangerous down looks like:
// 3rd-and-long, or the red zone. v3 reuses that same signal on the OTHER side —
// the deeper an opponent's drive gets, the more your trained Defense decides
// whether it ends in points. One definition, so the two can never drift apart.
//
// `spot` is always measured from the ATTACKING team's own goal: 80 is first-and-goal
// territory, 50 is midfield. That holds whether the attacker is the player or the AI.
// ============================================================

export const RED_ZONE = 80
export const FG_RANGE = 62

// The player's offence: worth stopping play to offer a question before the snap.
export function isBigMoment({ down, toGo, ballOn }) {
  return (down === 3 && toGo >= 8) || ballOn >= RED_ZONE
}

// 0 → harmless, 1 → about to score. This is the weight Defense is paid at.
export function threatOf(spot) {
  if (spot >= RED_ZONE) return 1
  if (spot >= FG_RANGE) return 0.6
  if (spot >= 50) return 0.35
  return 0.15
}

export function threatLabel(spot) {
  if (spot >= RED_ZONE) return 'in the red zone'
  if (spot >= FG_RANGE) return 'in field-goal range'
  if (spot >= 50) return 'across midfield'
  return 'in their own end'
}
