# Gunpowder Golf App - Implementation Progress

*Last updated: February 8, 2026*

---

## What's Been Built (Completed)

### Phase 1: Auth Foundation
- Google OAuth via Supabase
- Profile system (create/claim ghost profiles)
- `AuthContext` with login/logout flow
- `profiles`, `league_members`, `format_templates` tables (6 SQL migrations)
- Existing league code access still works (skippedAuth state)
- PIN-based admin (1234) and site owner (3494) auth preserved

### Section 5: Big Boys Format (Default Template)
- Already existed as the original app — preserved as-is

### Section 6: Additional Formats (deployed)
- `src/utils/formatScoring.js` — central scoring utility
- 10 formats: bigboys, bestball, scramble, retirees, stroke, stroke_net, stableford, matchplay, skins, track
- Net scoring via WHS hole allocation (`getNetStrokes()`)
- `getLeaderboardData()` dispatches to correct format
- CasualGameSetup: 9 formats with format-specific settings UI, scramble team naming
- Per-round format override for league rounds (FormatOverrideSelector in GeneratePage)
- Zero regression on existing Big Boys behavior

### Section 7: Handicap System (deployed)
- `round_history` table as central store for all round types
- Three scopes: true (all rounds), league (by source_id), gunpowder (by course_name)
- `recalculateAndStoreHandicap()` runs after every round finish
- Backfill migration populates round_history from existing league scoreHistory
- IndividualRoundSetup pre-fills handicap from `profile.handicap_index`
- **Phase 4A enhancements:** WHS 0.96 multiplier, soft/hard caps (sandbagger protection), cap exemptions
- **Phase 4B leftovers:** GHIN override, max hole score, freeze batch mode, 9-hole round support

### Section 8: Individual Play
- Individual round tracking outside league play
- Score tracking with same interface as league rounds

### Section 9: Side Games
- **Skins** — full implementation with carryovers, multipliers, greenies sub-game, settlement, guest players
- **Greenies** — closest to pin on par 3s, with carryover option
- **Nassau** — just deployed (Feb 8, 2026):
  - Pairwise match play: every pair of opted-in players has independent front 9, back 9, overall bets
  - Manual press: player can press when losing a segment (new bet for remaining holes)
  - Settings: bet amount per segment, optional handicaps (net strokes per hole)
  - Full UI: setup modal, player management, pair selector, hole-by-hole grid, press buttons, match summary, settlement
  - CasualGameSetup integration: Nassau toggle + settings for non-skins formats
  - LivePage: Nassau tab alongside Skins, cleanup on all exit paths
  - Files: `src/utils/nassauCalculations.js`, `src/components/NassauTracker.jsx`

### Section 10: Test League Isolation (deployed)
- `cloneLeagueToTest()` strips profileId, sets `isTestLeague` flag
- Test leagues skip round_history saves and backfill migrations
- TESTBIGBOYS patched in Supabase

### Casual Games (deployed)
- Standalone casual game creation flow
- 9 format options with settings
- Skins, greenies, and now Nassau as side games
- Round history saving with handicap tracking

---

## What's Left To Do

### Section 9: Remaining Side Games

**Phase 1 Core (next up):**
- [ ] **Stableford as side game** — currently exists as a format but not as a standalone side game overlay. The requirements doc lists it as Phase 1 Core alongside Skins/Greenies/Nassau.

**Phase 2 Popular:**
- [ ] **Wolf** — rotating wolf picks partner or goes alone, points/$ system, lone wolf multiplier
- [ ] **Bingo Bango Bongo** — 3 points per hole: first on green, closest when all on, first in hole

**Phase 3 Advanced:**
- [ ] **Vegas** — team scoring with number concatenation
- [ ] **Dots/Garbage/Junk** — various bonus point categories

### Section 3: League Management (not started)
- [ ] League creation wizard (5-step: info, format, handicap, side games, membership)
- [ ] League roles (owner, co-owner, admin, player)
- [ ] Join methods (code, invite link, QR code, email invite)
- [ ] League switching in UI
- [ ] League visibility/discoverability settings
- [ ] Ownership transfer flow

### Section 2: Auth Enhancements
- [ ] Apple Sign-In (Google OAuth is done)
- [ ] Email/password auth
- [ ] Score conflict resolution (team captain)

### Section 4: Format Templates
- [ ] Site owner template management UI
- [ ] Template CRUD (create, edit, delete)
- [ ] Template selection in league creation wizard

### Section 7: Handicap Enhancements (deferred items)
- [ ] Cross-league handicap sources (requires multi-league)
- [ ] Course handicap source selection per league

### Section 13: Push Notifications (not started)
- [ ] PWA push notification infrastructure
- [ ] Standard notifications (round starting, scores posted, join requests)
- [ ] Fun notifications (birdies, eagles, streaks, lead changes)
- [ ] Player nicknames
- [ ] Custom per-player notification templates
- [ ] Manual admin push notifications
- [ ] Notification settings (quiet hours, frequency limits)

### Infrastructure / Polish
- [ ] Chunk size optimization (build warning — 901 kB, pre-existing)
- [ ] Offline scoring capability (PWA)
- [ ] League switcher UI design decision (header vs dedicated screen)

---

## Architecture Notes

- All league data stored as JSONB blob in `leagues` table (Supabase)
- Side games (skins, nassau) stored in the same JSONB blob — no SQL migrations needed
- SkinsTracker is defined inside LivePage.jsx (~5700 lines); NassauTracker is a separate file
- Supabase free tier has intermittent query hangs on newer tables — use timeouts and `.limit(1)` workarounds
- Deploy: `npx gh-pages -d dist` from project root
- GitHub Pages base path: `/gunpowder-golf/`

---

## Quick Reference: Key Files

| Area | File(s) |
|------|---------|
| App context | `src/context/LeagueContext.jsx`, `src/context/AuthContext.jsx` |
| Main live page | `src/pages/LivePage.jsx` (~7400 lines, includes SkinsTracker) |
| Nassau | `src/utils/nassauCalculations.js`, `src/components/NassauTracker.jsx` |
| Formats | `src/utils/formatScoring.js` |
| Handicaps | `src/utils/handicapCalculation.js` |
| Round history | `src/lib/roundHistoryService.js` |
| Course data | `src/lib/courseData.js` |
| Casual games | `src/components/CasualGameSetup.jsx` |
| SQL migrations | `supabase/migrations/` (6 total, all applied) |
| Data migrations | `src/lib/migrations/` (3 total) |
| Requirements | `docs/GOLF_APP_REQUIREMENTS.md` |
