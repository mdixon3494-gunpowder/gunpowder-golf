# Migration Plan: Gunpowder Big Boy's Golf

## Overview

Migrating from a single 12,500-line HTML file (v5.18) that uses in-browser Babel/React to a proper Vite + React project with component-based architecture.

**Key Discovery:** The original app is already written in React (using browser-based Babel transpilation). This simplifies migration significantly - we're essentially restructuring and modularizing existing React code, not converting vanilla JS.

---

## Original App Analysis

### Architecture
- **Single Component:** `GunpowderBigBoysGolf()` - one massive component (~12,000 lines)
- **State Management:** ~80+ `useState` hooks at the top level
- **Data Storage:** Supabase with a single `leagues` table storing JSON blobs
- **Real-time:** Supabase real-time subscriptions for live scoring sync

### Tabs/Features (7 main sections)
| Tab | Description | Complexity |
|-----|-------------|------------|
| `players` | Player roster, add/edit/delete, stats, contact info | High |
| `generate` | Team generation algorithm (skill-based balancing) | Medium |
| `teams` | View generated teams, manual team creation | Medium |
| `live` | Live round with sub-tabs (leaderboard, scoring, greenies, skins, money) | Very High |
| `history` | Past rounds, score editing, statistics | Medium |
| `scorecard` | Gunpowder Golf course scorecard display | Low |
| `settings` | Admin settings, payout formats, hole-in-one pot | Medium |

### Data Model (stored in `leagues` table as JSON)
```javascript
{
  players: [{
    id, name, skillRating, gamesPlayed,
    avgFrontNine, avgBackNine, avgTotal,
    teammates: {}, recentTeammates: [],
    scoreHistory: [], holeStats: {},
    isActive, phone, email,
    emergencyName, emergencyPhone, privacyPublic
  }],
  teams: [],
  history: [],  // Past rounds
  liveRound: {  // Current active round
    id, date, teams: [{
      id, name, players: [{
        id, name, scores: {1: 4, 2: 5, ...},
        isDNF, includeInTeamScore, joinedLate
      }],
      isFinished, greenies: {}
    }]
  },
  pairingRequests: [],
  leagueSettings: {},
  pendingPlayerRequests: [],
  payoutFormats: {},
  holeInOnePot: { balance, transactions, ... },
  moneyVisibility: {},
  defaultStartingHole: 1,
  playerMoneyRecords: [],
  skinsMatch: {}
}
```

### Course Data (hardcoded)
```javascript
GUNPOWDER_SCORECARD = {
  front9: [holes 1-9 with par, yardages, handicap],
  back9: [holes 10-18],
  ratings: { gold, blue, red slope/rating }
}
```

---

## Revised Project Structure

```
gunpowder-golf/
├── legacy/
│   └── gunpowder-golf-v5.18.html  # Original for reference
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Modal.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── PinPrompt.jsx
│   │   │   └── ScoreKeypad.jsx
│   │   ├── layout/
│   │   │   ├── Layout.jsx
│   │   │   ├── TabNav.jsx
│   │   │   └── Header.jsx
│   │   ├── players/
│   │   │   ├── PlayerCard.jsx
│   │   │   ├── PlayerForm.jsx
│   │   │   ├── PlayerList.jsx
│   │   │   └── PlayerStats.jsx
│   │   ├── teams/
│   │   │   ├── TeamCard.jsx
│   │   │   ├── TeamGenerator.jsx
│   │   │   └── ManualTeamBuilder.jsx
│   │   ├── live/
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── ScoringGrid.jsx
│   │   │   ├── GreenieTracker.jsx
│   │   │   ├── SkinsGame.jsx
│   │   │   ├── MoneySettlement.jsx
│   │   │   └── LiveSubNav.jsx
│   │   ├── history/
│   │   │   ├── RoundCard.jsx
│   │   │   ├── RoundDetail.jsx
│   │   │   └── HistoryFilters.jsx
│   │   └── settings/
│   │       ├── PayoutSettings.jsx
│   │       ├── HoleInOnePot.jsx
│   │       └── AdminPanel.jsx
│   ├── context/
│   │   └── LeagueContext.jsx       # Global state (replaces 80+ useState)
│   ├── hooks/
│   │   ├── useLeague.js            # League data operations
│   │   ├── useRealtime.js          # Supabase subscriptions
│   │   └── useLocalStorage.js      # Admin state persistence
│   ├── lib/
│   │   ├── supabase.js
│   │   └── courseData.js           # Gunpowder scorecard
│   ├── pages/
│   │   ├── PlayersPage.jsx
│   │   ├── GeneratePage.jsx
│   │   ├── TeamsPage.jsx
│   │   ├── LivePage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── ScorecardPage.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/
│   │   ├── teamGeneration.js       # Team balancing algorithm
│   │   ├── scoring.js              # Score calculations
│   │   ├── money.js                # Settlement calculations
│   │   └── formatters.js           # Display helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                   # Original styles preserved
├── .env
├── package.json
└── vite.config.js
```

---

## Migration Phases

### Phase 1: Foundation (COMPLETE)
- [x] Vite + React project setup
- [x] Supabase client configured with anon key
- [x] GitHub Actions deployment workflow
- [x] Original file copied to `/legacy/`

### Phase 2: Core Infrastructure - COMPLETE
- [x] Extract CSS from original into `index.css`
- [x] Create `LeagueContext` for global state
- [x] Create `courseData.js` with Gunpowder scorecard
- [x] Set up tab-based navigation (matching original)
- [x] Implement Supabase data loading/saving

### Phase 3: Feature Migration (in order)

#### 3.1 League Setup Screen - COMPLETE
- [x] Create/join league flow
- [x] League code display/copy

#### 3.2 Players Tab - COMPLETE
- [x] Player list with filters (active/inactive/all)
- [x] Add player form with PIN protection
- [x] Edit player modal
- [x] Player stats view with date filtering
- [x] Delete player with PIN confirmation

#### 3.3 Generate Tab - COMPLETE
- [x] Player selection for round
- [x] Team generation algorithm
- [x] Skill balancing display
- [x] Save teams functionality
- [x] Manual team creation
- [x] Pairing requests

#### 3.4 Teams Tab - COMPLETE
- [x] Generated teams display
- [x] Team reordering
- [x] Start round button

#### 3.5 Live Tab - COMPLETE
- [x] Sub-navigation (Leaderboard/Scoring/Greenies/Skins/Manage)
- [x] Leaderboard with front/back/overall views
- [x] Score entry with number buttons
- [x] Greenie tracking for par 3s
- [x] Finish round with PIN
- [x] Real-time sync across devices
- [x] Skins game setup and calculation with carryovers
- [x] DNF (Did Not Finish) handling with payment options
- [x] Late player addition with payment status

#### 3.6 History Tab - COMPLETE
- [x] Round list display
- [x] Round detail view modal
- [x] Delete round with PIN

#### 3.7 Scorecard Tab - COMPLETE
- [x] Course scorecard display
- [x] Yardage/par/handicap info

#### 3.8 Settings Tab - COMPLETE
- [x] Admin login/logout
- [x] Payout format configuration
- [x] Hole-in-one pot management
- [x] League settings (leave league)

### Phase 4: Polish - COMPLETE
- [x] Error boundaries (ErrorBoundary component with recovery options)
- [x] Loading states (save indicator, toast notifications, loading spinners)
- [x] Mobile responsiveness (touch-friendly, responsive breakpoints, iOS support)
- [x] PWA capabilities (manifest.json, service worker, offline support)

---

## Key Functions to Extract

### Team Generation (`generateTeams`)
~175 lines - complex algorithm for balanced team creation based on skill ratings

### Score Calculations
- `calculateTeamScore()` - 9-hole team scores
- `calculateSkins()` - Skins game winner determination
- `calculateSettlement()` - Money owed calculations

### Real-time Sync
- Supabase channel subscription for live updates
- Conflict resolution for simultaneous edits

---

## State Management Strategy

The original has ~80 `useState` calls. Recommendation:

1. **LeagueContext** - Core data (players, teams, history, liveRound)
2. **UI State** - Keep local to components (modals, form inputs)
3. **Persist to Supabase** - On every meaningful change (like original)

---

## Files Ready for Development

| File | Status |
|------|--------|
| `package.json` | Ready |
| `vite.config.js` | Ready |
| `.env` | Created with Supabase key |
| `src/lib/supabase.js` | Ready |
| `src/hooks/useSupabase.js` | Ready |
| GitHub Actions workflow | Ready |
| Original HTML | Copied to `/legacy/` |

---

## Next Step Recommendations

1. **Quick Win:** Start with `ScorecardPage` - simplest, just displays static data
2. **Then:** `PlayersPage` - establishes data patterns
3. **Then:** Build out remaining features in dependency order

Would you like me to start implementing specific components?
