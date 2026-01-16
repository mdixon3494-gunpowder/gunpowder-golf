// Gunpowder Golf Course Scorecard
// Extracted from v5.18

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

// Par 3 holes (for greenies)
export const PAR_3_HOLES = [4, 8, 12, 17]

// Helper functions
export function getAllHoles() {
  return [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]
}

export function getHoleInfo(holeNumber) {
  const allHoles = getAllHoles()
  return allHoles.find(h => h.hole === holeNumber)
}

export function getFront9Par() {
  return GUNPOWDER_SCORECARD.front9.reduce((sum, hole) => sum + hole.par, 0)
}

export function getBack9Par() {
  return GUNPOWDER_SCORECARD.back9.reduce((sum, hole) => sum + hole.par, 0)
}

export function getTotalPar() {
  return getFront9Par() + getBack9Par()
}

export function getFront9Yardage(tee = 'blue') {
  return GUNPOWDER_SCORECARD.front9.reduce((sum, hole) => sum + hole[tee], 0)
}

export function getBack9Yardage(tee = 'blue') {
  return GUNPOWDER_SCORECARD.back9.reduce((sum, hole) => sum + hole[tee], 0)
}

export function getTotalYardage(tee = 'blue') {
  return getFront9Yardage(tee) + getBack9Yardage(tee)
}

export function isPar3(holeNumber) {
  return PAR_3_HOLES.includes(holeNumber)
}
