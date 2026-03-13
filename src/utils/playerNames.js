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
 * Get the short label for scoring grids (first name or nickname)
 */
export function getShortName(player) {
  return getDisplayName(player, 'short')
}
