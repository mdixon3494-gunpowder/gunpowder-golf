/**
 * Player display name utilities
 *
 * Display modes:
 *   'full'     → Greg "The Legend" Peppers  (or just Greg Peppers if no nickname)
 *   'short'    → The Legend  (or first name if no nickname)
 *   'nickname' → The Legend  (or full name if no nickname)
 */

export function getDisplayName(player, mode = 'full') {
  if (!player) return ''
  const name = player.name || ''
  const nickname = player.nickname || ''

  if (!nickname) {
    if (mode === 'short') return name.split(' ')[0]
    return name
  }

  switch (mode) {
    case 'full': {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0]} "${nickname}" ${parts.slice(1).join(' ')}`
      }
      return `${name} "${nickname}"`
    }
    case 'short':
      return nickname
    case 'nickname':
      return nickname
    default:
      return name
  }
}

/**
 * Get the short label for scoring grids (first name or nickname).
 * If allPlayers is provided, disambiguates duplicate short names
 * by appending a last initial (e.g. "Mike D." vs "Mike S.").
 */
export function getShortName(player, allPlayers) {
  if (!player) return ''
  const short = getDisplayName(player, 'short')

  if (!allPlayers || allPlayers.length <= 1) return short

  // Check for duplicates among all players
  const duplicates = allPlayers.filter(p => {
    if (!p || p.id === player.id) return false
    return getDisplayName(p, 'short') === short
  })

  if (duplicates.length === 0) return short

  // Disambiguate with last initial
  const parts = (player.name || '').split(' ')
  if (parts.length >= 2) {
    return `${short} ${parts[parts.length - 1][0]}.`
  }
  return short
}
