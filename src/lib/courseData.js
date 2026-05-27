// Course Scorecards
// Gunpowder is the legacy default. Shenvalee is a 27-hole multi-nine course
// used for trip leagues — its active 18 holes are built per-round from a
// selected front nine + back nine.

export const GUNPOWDER_SCORECARD = {
  name: 'Gunpowder Golf Course',
  // Slope/Rating: Gold 110/67.3, Blue 100/63.5, Red 105/64.8
  front9: [
    { hole: 1, par: 4, gold: 346, blue: 336, red: 300, hcp: 9 },
    { hole: 2, par: 4, gold: 401, blue: 336, red: 290, hcp: 5 },
    { hole: 3, par: 5, gold: 494, blue: 459, red: 425, hcp: 15 },
    { hole: 4, par: 3, gold: 194, blue: 160, red: 154, hcp: 13 },
    { hole: 5, par: 4, gold: 321, blue: 257, red: 256, hcp: 11 },
    { hole: 6, par: 4, gold: 325, blue: 265, red: 211, hcp: 7 },
    { hole: 7, par: 4, gold: 467, blue: 409, red: 296, hcp: 1 },
    { hole: 8, par: 3, gold: 167, blue: 127, red: 100, hcp: 17 },
    { hole: 9, par: 4, gold: 435, blue: 389, red: 319, hcp: 3 }
  ],
  back9: [
    { hole: 10, par: 4, gold: 360, blue: 339, red: 315, hcp: 6 },
    { hole: 11, par: 4, gold: 335, blue: 300, red: 290, hcp: 8 },
    { hole: 12, par: 3, gold: 161, blue: 129, red: 110, hcp: 16 },
    { hole: 13, par: 4, gold: 305, blue: 265, red: 260, hcp: 12 },
    { hole: 14, par: 4, gold: 254, blue: 254, red: 250, hcp: 14 },
    { hole: 15, par: 5, gold: 530, blue: 478, red: 461, hcp: 10 },
    { hole: 16, par: 4, gold: 387, blue: 258, red: 258, hcp: 2 },
    { hole: 17, par: 3, gold: 155, blue: 122, red: 90, hcp: 18 },
    { hole: 18, par: 4, gold: 405, blue: 384, red: 325, hcp: 4 }
  ],
  ratings: {
    gold: { slope: 110, rating: 67.3 },
    blue: { slope: 100, rating: 63.5 },
    red: { slope: 105, rating: 64.8 }
  }
}

// Par 3 holes (for greenies) — Gunpowder default
export const GUNPOWDER_PAR_3_HOLES = [4, 8, 12, 17]
export const PAR_3_HOLES = GUNPOWDER_PAR_3_HOLES // legacy export

// Shenvalee Golf Resort — New Market, VA. 27-hole layout.
// Tee colors per official scorecard: Blue (back), White, Gold, Red, Green (forward).
// Sources: shenvalee.com (official per-nine pages) + GolfPass cross-check.
// Miller hole 4 plays as par 4 from Blue/White and par 3 from Gold/Red/Green (parByTee).
export const SHENVALEE_COURSE = {
  name: 'Shenvalee Golf Resort',
  location: 'New Market, VA',
  nines: {
    olde: {
      key: 'olde',
      name: 'Olde',
      par: 36,
      holes: [
        { holeOnNine: 1, par: 4, hcp: 5, blue: 311, white: 295, gold: 261, red: 261, green: 210 },
        { holeOnNine: 2, par: 4, hcp: 8, blue: 310, white: 300, gold: 290, red: 289, green: 252 },
        { holeOnNine: 3, par: 5, hcp: 7, blue: 441, white: 432, gold: 432, red: 329, green: 309 },
        { holeOnNine: 4, par: 3, hcp: 6, blue: 179, white: 165, gold: 155, red: 141, green: 123 },
        { holeOnNine: 5, par: 4, hcp: 2, blue: 390, white: 334, gold: 295, red: 295, green: 230 },
        { holeOnNine: 6, par: 3, hcp: 9, blue: 146, white: 137, gold: 137, red: 128, green: 110 },
        { holeOnNine: 7, par: 4, hcp: 3, blue: 329, white: 314, gold: 292, red: 292, green: 215 },
        { holeOnNine: 8, par: 5, hcp: 4, blue: 447, white: 430, gold: 375, red: 361, green: 237 },
        { holeOnNine: 9, par: 4, hcp: 1, blue: 364, white: 323, gold: 313, red: 205, green: 197 }
      ]
    },
    creek: {
      key: 'creek',
      name: 'Creek',
      par: 35,
      // NOTE: official Creek hcp indices need confirmation against a physical scorecard;
      // values below are the best-effort men's indices from the parsed scorecard.
      holes: [
        { holeOnNine: 1, par: 5, hcp: 5, blue: 545, white: 490, gold: 422, red: 410, green: 371 },
        { holeOnNine: 2, par: 3, hcp: 8, blue: 174, white: 160, gold: 150, red: 141, green: 133 },
        { holeOnNine: 3, par: 5, hcp: 4, blue: 577, white: 480, gold: 470, red: 450, green: 389 },
        { holeOnNine: 4, par: 3, hcp: 9, blue: 212, white: 190, gold: 165, red: 165, green: 91 },
        { holeOnNine: 5, par: 4, hcp: 2, blue: 409, white: 380, gold: 355, red: 303, green: 258 },
        { holeOnNine: 6, par: 4, hcp: 6, blue: 340, white: 300, gold: 275, red: 215, green: 215 },
        { holeOnNine: 7, par: 3, hcp: 7, blue: 145, white: 122, gold: 105, red: 93, green: 89 },
        { holeOnNine: 8, par: 4, hcp: 3, blue: 373, white: 346, gold: 300, red: 232, green: 211 },
        { holeOnNine: 9, par: 4, hcp: 1, blue: 428, white: 396, gold: 320, red: 320, green: 250 }
      ]
    },
    miller: {
      key: 'miller',
      name: 'Miller',
      // Par 36 from Blue/White, 35 from Gold/Red/Green (hole 4 swings from 4 to 3).
      par: 36,
      holes: [
        { holeOnNine: 1, par: 5, hcp: 8, blue: 472, white: 439, gold: 410, red: 368, green: 297 },
        { holeOnNine: 2, par: 4, hcp: 5, blue: 396, white: 331, gold: 315, red: 264, green: 237 },
        { holeOnNine: 3, par: 3, hcp: 3, blue: 193, white: 165, gold: 135, red: 80, green: 75 },
        {
          holeOnNine: 4,
          par: 4,
          parByTee: { blue: 4, white: 4, gold: 3, red: 3, green: 3 },
          hcp: 6,
          blue: 337, white: 288, gold: 165, red: 165, green: 145
        },
        { holeOnNine: 5, par: 5, hcp: 4, blue: 498, white: 474, gold: 450, red: 366, green: 311 },
        { holeOnNine: 6, par: 4, hcp: 1, blue: 445, white: 400, gold: 345, red: 310, green: 272 },
        { holeOnNine: 7, par: 4, hcp: 2, blue: 360, white: 333, gold: 310, red: 281, green: 227 },
        { holeOnNine: 8, par: 3, hcp: 7, blue: 187, white: 170, gold: 170, red: 118, green: 110 },
        { holeOnNine: 9, par: 4, hcp: 9, blue: 290, white: 270, gold: 243, red: 243, green: 236 }
      ]
    }
  },
  // 18-hole USGA ratings per combo (from GolfPass).
  ratings: {
    'olde+creek': {
      par: 71,
      tees: {
        blue: { slope: 129, rating: 69.3 },
        white: { slope: 120, rating: 65.7 },
        gold: { slope: 117, rating: 64.0 },
        red: { slope: 113, rating: 62.3 }
      }
    },
    'creek+miller': {
      par: 71,
      tees: {
        blue: { slope: 125, rating: 70.1 },
        white: { slope: 116, rating: 65.7 },
        gold: { slope: 113, rating: 64.0 },
        red: { slope: 108, rating: 61.9 }
      }
    },
    'miller+olde': {
      par: 72,
      tees: {
        blue: { slope: 126, rating: 69.4 },
        white: { slope: 119, rating: 65.6 },
        gold: { slope: 117, rating: 64.2 },
        red: { slope: 112, rating: 62.2 }
      }
    }
  }
}

/**
 * Build an 18-hole scorecard (front9 + back9 with holes renumbered 1..18)
 * from a Shenvalee front/back nine selection.
 */
export function buildShenvaleeScorecard(frontKey, backKey) {
  const front = SHENVALEE_COURSE.nines[frontKey]
  const back = SHENVALEE_COURSE.nines[backKey]
  if (!front || !back) return null

  // Renumber and merge handicap indices across the 18 holes.
  // We rescale per-nine hcp (1-9) into a unique 1-18 scale: odd indices to front, even to back.
  // (Standard golf practice for combined nines.)
  const front9 = front.holes.map((h, i) => ({
    ...h,
    hole: i + 1,
    hcp: h.hcp * 2 - 1 // 1,3,5,7,9,11,13,15,17
  }))
  const back9 = back.holes.map((h, i) => ({
    ...h,
    hole: i + 10,
    hcp: h.hcp * 2 // 2,4,6,8,10,12,14,16,18
  }))

  const combo = `${frontKey}+${backKey}`
  const reverseCombo = `${backKey}+${frontKey}`
  const ratings = SHENVALEE_COURSE.ratings[combo] || SHENVALEE_COURSE.ratings[reverseCombo] || null

  return {
    name: `Shenvalee — ${front.name} / ${back.name}`,
    front9,
    back9,
    ratings: ratings?.tees || {},
    parTotal: (ratings?.par) || (front.par + back.par)
  }
}

/**
 * Get par 3 hole numbers (1-18) from a built scorecard.
 */
export function par3HolesFromScorecard(scorecard) {
  if (!scorecard) return PAR_3_HOLES
  const all = [...scorecard.front9, ...scorecard.back9]
  return all.filter(h => h.par === 3).map(h => h.hole)
}

// ---------------------------------------------------------------------------
// Active scorecard singleton — set by LeagueContext when a league/round loads.
// Defaults to GUNPOWDER_SCORECARD so existing flows keep working unchanged.
// ---------------------------------------------------------------------------
let _activeScorecard = GUNPOWDER_SCORECARD
let _activePar3Holes = GUNPOWDER_PAR_3_HOLES

export function setActiveScorecard(scorecard, par3Holes) {
  _activeScorecard = scorecard || GUNPOWDER_SCORECARD
  _activePar3Holes = par3Holes || par3HolesFromScorecard(_activeScorecard)
}

export function getActiveScorecard() {
  return _activeScorecard
}

export function getActivePar3Holes() {
  return _activePar3Holes
}

// Helper functions — all read from the active scorecard.
export function getAllHoles() {
  return [..._activeScorecard.front9, ..._activeScorecard.back9]
}

export function getHoleInfo(holeNumber) {
  return getAllHoles().find(h => h.hole === holeNumber)
}

export function getFront9Par() {
  return _activeScorecard.front9.reduce((sum, hole) => sum + hole.par, 0)
}

export function getBack9Par() {
  return _activeScorecard.back9.reduce((sum, hole) => sum + hole.par, 0)
}

export function getTotalPar() {
  return getFront9Par() + getBack9Par()
}

export function getFront9Yardage(tee = 'blue') {
  return _activeScorecard.front9.reduce((sum, hole) => sum + (hole[tee] || 0), 0)
}

export function getBack9Yardage(tee = 'blue') {
  return _activeScorecard.back9.reduce((sum, hole) => sum + (hole[tee] || 0), 0)
}

export function getTotalYardage(tee = 'blue') {
  return getFront9Yardage(tee) + getBack9Yardage(tee)
}

export function isPar3(holeNumber) {
  return _activePar3Holes.includes(holeNumber)
}

/**
 * Per-tee par for a hole. Honors `parByTee` overrides (e.g. Shenvalee Miller #4).
 * `hole` may be a hole number (1-18) or a hole object.
 */
export function getHolePar(hole, tee) {
  const h = typeof hole === 'object' ? hole : getHoleInfo(hole)
  if (!h) return null
  if (h.parByTee && tee && h.parByTee[tee] != null) return h.parByTee[tee]
  return h.par
}
