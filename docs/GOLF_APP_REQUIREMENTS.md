# Gunpowder Golf App - Major Expansion Requirements

## Overview

Transform the existing Gunpowder Big Boy's Golf league app into a multi-league platform that supports:
- Multiple independent leagues
- Individual round tracking (non-league play)
- Multiple competition formats
- User authentication and profiles

The current Big Boy's League functionality becomes a reusable "Big Boys Format" template.

---

## Table of Contents

1. [Architecture Changes](#1-architecture-changes)
2. [User Authentication](#2-user-authentication)
3. [League Management](#3-league-management)
4. [Format Templates](#4-format-templates)
5. [Big Boys Format (Default Template)](#5-big-boys-format-default-template)
6. [Additional Formats](#6-additional-formats)
7. [Handicap System](#7-handicap-system)
8. [Individual Play](#8-individual-play)
9. [Side Games](#9-side-games)
10. [Test League Isolation](#10-test-league-isolation)
11. [Data Model Changes](#11-data-model-changes)
12. [Migration Strategy](#12-migration-strategy)
13. [Push Notifications](#13-push-notifications)

---

## 1. Architecture Changes

### Current State
- Single "Live" round (global state)
- One league, one leaderboard
- All players see the same thing

### Target State
- Multiple concurrent rounds across different leagues
- Users can belong to multiple leagues
- Each league has independent settings, players, rounds
- Individual rounds exist outside any league

### Key Principle
**The current Big Boy's League functionality must remain exactly as-is.** New features are opt-in. Existing edge case logic (DNF handling, late players, 3-player teams, 2-team match play) is preserved and becomes part of the "Big Boys Format" template.

---

## 2. User Authentication

### Sign-Up/Login Methods

| Method | Implementation |
|--------|----------------|
| Google | OAuth 2.0 |
| Apple | Sign in with Apple |
| Email/Password | Standard auth with verification |

### Account States

| State | Description |
|-------|-------------|
| **Full Account** | Authenticated user with profile |
| **Ghost Player** | Name only, no account - admin can add scores for them |
| **Claimed Profile** | Ghost player who later creates account and claims their history |

### Claim Profile Flow

```
┌─────────────────────────────────────────┐
│ CLAIM YOUR PROFILE                      │
├─────────────────────────────────────────┤
│ We found a player matching your info:   │
│                                         │
│ Name: Mark Dixon                        │
│ League: Big Boy's Golf                  │
│ Rounds: 24                              │
│ Handicap: 12.4                          │
│                                         │
│ Is this you?                            │
│                                         │
│ [ Yes, Claim This Profile ]             │
│ [ No, Create New Profile ]              │
└─────────────────────────────────────────┘
```

### Ghost Player Rules
- Admin adds name only (no account required)
- Ghost can have scores entered by admin or teammates
- Handicap still calculated
- If ghost creates account later, they can claim profile and all history transfers

---

## 3. League Management

### League Creation Wizard

**Step 1: Basic Info**
- League name
- League code (auto-generated, editable) for joining
- Primary course (manual entry initially, database later)

**Step 2: Format Selection**
- Big Boys Format ⭐ (recommended/default)
- Best Ball - Simple
- Scramble
- Individual Stroke Play
- Custom (configure manually)

**Step 3: Handicap Settings**
- Use handicaps: Yes/No
- Handicap type: Index (manual), Course (app-calculated), League (this league only)
- Max hole score: Net double bogey / Fixed max / No max

**Step 4: Side Games**
- Enable/disable: Skins, Greenies, Nassau, Wolf, etc.
- Configure amounts for each

**Step 5: Membership Settings**
- Join methods: League code, Invite link, QR code, Email invite only
- Discoverability: Public (searchable) / Private (code/link only) / Hidden (invite only)
- Approval: Auto-approve / Admin approval required

**Step 6: Review & Create**
- Summary of all settings
- Option to add self as player (not just admin)
- Option to add co-owners during creation

**Quick Create Option**
- For experienced users
- Uses Big Boys Format defaults
- Skips wizard, goes straight to dashboard

### After Creation
- Redirect to League Dashboard (not Add Players)

### League Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, can delete league, transfer ownership |
| **Co-Owner** | Full admin + can add other co-owners (but not remove) |
| **Admin** | Manage players, rounds, settings |
| **Player** | View, score for self/teammates |

### Ownership Transfer
- Owner initiates transfer
- If multiple co-owners exist, requires vote
- 7-day waiting period
- Audit logged

### League Protection

| Protection | Implementation |
|------------|----------------|
| Soft delete | 30-day recovery window |
| Audit log | Track all admin actions |
| Backups | Automatic, restorable |

### Joining a League

**Methods:**
1. **League Code** - Enter code (e.g., "BIGBOYS")
2. **Invite Link** - Click link, goes to join page
3. **QR Code** - Scan at in-person events
4. **Email Invite** - Admin sends to specific email
5. **Request to Join** - For public/discoverable leagues

**Join Settings (per league):**
```
┌─────────────────────────────────────────┐
│ LEAGUE JOIN SETTINGS                    │
├─────────────────────────────────────────┤
│ How can people join?                    │
│ ☑ League code: BIGBOYS [ Regenerate ]   │
│ ☑ Invite link                           │
│ ☑ QR code                               │
│ ☐ Email invite only                     │
│                                         │
│ Discoverability:                        │
│   ○ Public (searchable)                 │
│   ● Private (code/link only)            │
│   ○ Hidden (invite only)                │
│                                         │
│ Approval required?                      │
│   ○ Auto-approve anyone with code       │
│   ● Admin approval required             │
└─────────────────────────────────────────┘
```

### League Visibility (for Course Handicap sharing)

| Setting | Who Can See This League |
|---------|------------------------|
| Public | All leagues at same course |
| Private | Only leagues admin explicitly shares with |
| Hidden | No one (test leagues) |

---

## 4. Format Templates

### Template System

Templates are reusable league configurations. Site Owner (PIN: 3494) can create/edit templates.

```
┌─────────────────────────────────────────┐
│ FORMAT TEMPLATES                        │
├─────────────────────────────────────────┤
│ Big Boys Format            [ Edit ] ⭐  │
│ Best Ball - Simple         [ Edit ]     │
│ Scramble                   [ Edit ]     │
│ Individual Stroke Play     [ Edit ]     │
│ Retirees Format            [ Edit ]     │
│                                         │
│ [ + Create New Format ]                 │
└─────────────────────────────────────────┘

⭐ = Default/Recommended
```

### Template Contents
Each template defines:
- Team size and structure
- Scoring method
- Handicap usage
- Competition structure (Front 9/Back 9/Overall)
- Side games included vs optional
- Payout structure (defaults)
- Special rules (3-player adjustments, match play rules, etc.)
- DNF/late player handling

### In-App Descriptions
Each format must have a user-facing explanation:
```
[ℹ️ How does Big Boys Format work?]
→ Opens modal with rules explanation
```

---

## 5. Big Boys Format (Default Template)

This is the current league's battle-tested configuration, now available as a reusable template.

### Team Scoring Rules

| Rule | Description |
|------|-------------|
| **Handicap** | ❌ None (gross scores) |
| **Minimum per hole** | Must count 1 best score |
| **Under par bonus** | Count ALL scores that are under par on a hole |
| **Score display** | Relative to par (-2, E, +1) not stroke totals |

### Scoring Examples

| Hole | Par | Player Scores | Team Result | Why |
|:----:|:---:|---------------|:-----------:|-----|
| 5 | 4 | 3, 4, 3, 5 | -2 | Two birdies, both count |
| 6 | 4 | 5, 4, 5, 6 | E | Only best (par) counts |
| 7 | 5 | 3, 4, 5, 5 | -3 | Eagle + birdie both count |
| 8 | 3 | 4, 4, 5, 4 | +1 | Best is bogey |

### Competition Structure

| # Teams | Format | Competitions |
|:-------:|--------|--------------|
| 3+ teams | Stroke play (lowest team total) | Front 9, Back 9 |
| 2 teams | Match play (holes won) | Front 9, Back 9, Overall |

### Max Score Cap

| Player Status | Max Score |
|--------------|-----------|
| Average ≤ 82 OR Skill ≥ 7 | Par + 2 (double bogey) |
| Average > 82 OR Skill < 7 | Par + 3 (triple bogey) |

**Display:** When score exceeds max, show `capped/actual` (e.g., `6/9`)

### Included Features

| Feature | Status |
|---------|:------:|
| Greenies | ✅ Included |
| Hole-in-One pot | ✅ Included |
| Skins | Optional add-on |
| DNF handling | ✅ Full support |
| Late player handling | ✅ Full support |
| 3-player team rules | ✅ Built in |
| 2-team match play | ✅ Built in |

### DNF (Did Not Finish) Handling

When marking a player DNF:
```
┌─────────────────────────────────────────┐
│ MARK PLAYER AS DNF                      │
├─────────────────────────────────────────┤
│ Player: Bob Williams                    │
│                                         │
│ Include existing scores in team total?  │
│   ● Yes - count holes already played    │
│   ○ No - remove all scores              │
│                                         │
│ Payment status:                         │
│   ○ Paid in full                        │
│   ● Partial refund                      │
│   ○ No payment due                      │
│                                         │
│ Did player complete any par 3s?         │
│   ☑ Hole 3   ☑ Hole 8   ☐ Hole 12       │
│   (For greenie eligibility)             │
│                                         │
│ [ Cancel ]            [ Confirm DNF ]   │
└─────────────────────────────────────────┘
```

### Late Player Handling

```
┌─────────────────────────────────────────┐
│ ADD LATE PLAYER                         │
├─────────────────────────────────────────┤
│ Player: Mike Johnson                    │
│                                         │
│ Joining as:                             │
│   ○ Full round (starting late)          │
│   ● Back 9 only                         │
│   ○ Just playing (no competition)       │
│                                         │
│ Payment:                                │
│   ○ Full entry fee                      │
│   ● Half entry fee (back 9)             │
│   ○ No entry fee                        │
│                                         │
│ [ Cancel ]              [ Add Player ]  │
└─────────────────────────────────────────┘
```

### 3-Player Team Adjustment

| Adjustment | Value |
|------------|-------|
| Starting bonus per 9 | None (Big Boys format doesn't use this) |

Note: Big Boys format uses gross scoring with "count all under par + best" which naturally handles 3-player teams without handicap adjustments.

### Skins During League Round

When skins is added as side game to a league round:
- Greenies are NOT included in skins (already part of league format)
- Skins operates independently alongside team competition
- Same payout structure as Quick Skins

### Payout Structure

Payouts are format-specific with defaults that can be adjusted per round:

```
┌─────────────────────────────────────────┐
│ PAYOUT SETTINGS                         │
├─────────────────────────────────────────┤
│ Use default payouts from Big Boys Format│
│   ● Yes (recommended)                   │
│   ○ No, customize for this round        │
│                                         │
│ [If customizing, show payout fields]    │
│                                         │
│ ☐ Save as new default for future rounds │
└─────────────────────────────────────────┘
```

---

## 6. Additional Formats

### Best Ball - Simple
- 4-player teams
- Count 1 best score per hole
- With or without handicaps
- Front 9 / Back 9 / Overall

### Scramble
- 4-player teams
- Everyone hits, pick best shot, all play from there
- Repeat until holed
- Optional: Handicap adjustment (10% of combined team handicap)

### 2 Best Balls with Handicap (Retirees Format)

| Setting | Value |
|---------|-------|
| Team size | 4 players (normally) |
| Scoring | 2 lowest NET scores per hole |
| Handicaps | ✅ Yes |

**3-Player Team Adjustments:**
- Starting bonus: -2 per 9 (2 under par)
- Handicap boost: +2 strokes per player

**Mid-Round Team Changes:**
- If 3-man picks up 4th at turn: Adjustments apply to front 9 only, back 9 normal
- If 4-man loses player at turn: Back 9 gets the adjustments

```
┌─────────────────────────────────────────┐
│ 2 BEST BALLS SETTINGS                   │
├─────────────────────────────────────────┤
│ # of scores to count:    [ 2 ▼]         │
│ Use handicaps:           [ON]           │
├─────────────────────────────────────────┤
│ SHORT-HANDED TEAM RULES (3 players)     │
│ Starting bonus per 9:    [ -2 ▼]        │
│ Extra handicap strokes:  [ +2 ▼]        │
│ Apply adjustments:       [Per 9 ▼]      │
└─────────────────────────────────────────┘
```

### Individual Stroke Play
- No teams
- Total strokes wins
- With or without handicaps
- Optional: Flights/divisions

### Stableford (Points-Based)

| Result | Points |
|--------|:------:|
| Double bogey or worse | 0 |
| Bogey | 1 |
| Par | 2 |
| Birdie | 3 |
| Eagle | 4 |
| Albatross | 5 |

- Highest points wins
- Modified Stableford option (different point values)

### Match Play
- Head-to-head holes
- Win hole = 1 point, tie = 0.5 each
- Bracket tournament option

---

## 7. Handicap System

### Handicap Types

| Type | Source | Use Case |
|------|--------|----------|
| **Handicap Index** | Manual entry (GHIN/WHS) | Players who maintain official handicap |
| **Course Handicap** | App-calculated from rounds at this course | Most accurate for specific course |
| **League Handicap** | App-calculated from this league's rounds only | League-specific, independent |

### League Handicap Setting

```
┌─────────────────────────────────────────┐
│ HANDICAP SETTINGS                       │
├─────────────────────────────────────────┤
│ Use handicaps in competition?           │
│   ● Yes                                 │
│   ○ No (gross scores only)              │
│                                         │
│ Handicap type:                          │
│   ○ Handicap Index (manual entry)       │
│   ● Course Handicap (app-calculated)    │
│   ○ League Handicap (this league only)  │
└─────────────────────────────────────────┘
```

### Handicap Calculation (WHS/GHIN Formula)

**Differential Formula:**
```
Differential = (Score - Course Rating) × (113 / Slope Rating)
```

**Handicap Index:**
- Use best 8 of last 20 differentials
- Average them
- Multiply by 0.96

### Max Hole Score for Handicap

| Option | Description |
|--------|-------------|
| Net Double Bogey | Par + 2 + handicap strokes on hole (recommended) |
| Fixed Max | Always cap at X (e.g., 8) |
| No Max | Use actual scores |

### Handicap Caps (Sandbagger Protection)

**Soft Cap:**
- Triggers when handicap rises more than 3.0 above Low Index
- Reduces increases by 50%

**Hard Cap:**
- Absolute maximum: Low Index + 5.0
- Cannot exceed regardless of scores

**Low Index:**
- Tracked over rolling 12-month period
- Lowest handicap achieved in that window

**Cap Activation:**
- Caps apply after 10 rounds (configurable)
- New players exempt until they have history

**Per-Player Exemptions:**
```
┌─────────────────────────────────────────┐
│ PLAYER: Bob Williams                    │
│ HANDICAP ADJUSTMENTS                    │
├─────────────────────────────────────────┤
│ Calculated Index: 24.0                  │
│ Low Index: 12.0                         │
│ Cap Status: HARD CAP APPLIED            │
│ Display Index: 17.0                     │
├─────────────────────────────────────────┤
│ ☑ Waive soft/hard caps for this player  │
│                                         │
│ Reason: [ Knee surgery recovery    ]    │
│                                         │
│ ● Waive caps indefinitely               │
│ ○ Waive caps until: [ ________ ]        │
│ ○ Reset Low Index to current (24.0)     │
└─────────────────────────────────────────┘
```

### Handicap Pause (Winter/Seasonal)

```
┌─────────────────────────────────────────┐
│ HANDICAP PAUSE SETTINGS                 │
├─────────────────────────────────────────┤
│ ☑ Enable seasonal pause                 │
│                                         │
│ Pause period:                           │
│   From: [ December 1  ▼]                │
│   To:   [ March 15    ▼]                │
│                                         │
│ Rounds during pause:                    │
│   ○ Exclude from handicap calculation   │
│   ● Include but don't update until      │
│     pause ends (batch update)           │
│                                         │
│ Grace period after pause: [ 2 ] rounds  │
└─────────────────────────────────────────┘
```

**Scope:** League-specific settings (each league controls their own pause)

### Course Handicap Sources

Each league can select which other leagues' rounds to include in Course Handicap calculation:

```
┌─────────────────────────────────────────┐
│ COURSE HANDICAP SETTINGS                │
│ Big Boy's League @ Gunpowder            │
├─────────────────────────────────────────┤
│ Include rounds from:                    │
│   ☑ Big Boy's League (required)         │
│   ☑ Senior League                       │
│   ☐ Sunday Fun League                   │
│   ☐ Individual rounds                   │
└─────────────────────────────────────────┘
```

This protects handicap integrity - leagues can exclude casual leagues that give gimmies, etc.

### 9-Hole Round Support

WHS allows combining two 9-hole scores:

```
┌─────────────────────────────────────────┐
│ SAVE ROUND                              │
├─────────────────────────────────────────┤
│ Round type:                             │
│   ● 18 holes                            │
│   ○ 9 holes (front)                     │
│   ○ 9 holes (back)                      │
│                                         │
│ (9-hole rounds will be combined with    │
│ another 9 for handicap calculation)     │
└─────────────────────────────────────────┘
```

---

## 8. Individual Play

### Purpose
Allow users to track personal rounds outside of league play.

### Features
- Score tracking (same interface as league)
- Optional stat tracking (FIR, GIR, putts)
- GPS yardages (when course is mapped)
- No team features
- No handicap display (just actual scores)

### Saving Individual Round

```
┌─────────────────────────────────────────┐
│ SAVE ROUND                              │
├─────────────────────────────────────────┤
│ Gunpowder Golf Course                   │
│ February 1, 2026                        │
│ Score: 87                               │
├─────────────────────────────────────────┤
│ Include in handicap calculation?        │
│   ● Yes                                 │
│   ○ No - practice/casual round          │
│                                         │
│ [ Discard Round ]  [ Save Round ]       │
└─────────────────────────────────────────┘
```

### Which Handicap Affected

| Handicap Type | Affected by Individual Rounds? |
|---------------|:------------------------------:|
| Course Handicap | ✅ Yes (if same course, and league includes individual rounds) |
| League Handicap | ❌ No (league rounds only) |
| Handicap Index | ❌ No (manual/external) |

### Stat Tracking (Optional)

- Only for yourself, not teammates
- User can enable/disable
- Standard stats: FIR, GIR, putts, penalties, up-and-downs

---

## 9. Side Games

### Games Available

| Game | Description | Settings |
|------|-------------|----------|
| **Skins** | Win hole outright = win skin | $ per skin, carryover option |
| **Greenies** | Closest to pin on par 3s | $ per greenie, which holes |
| **Nassau** | 3 bets: front 9, back 9, overall | $ per bet, press rules |
| **Wolf** | Rotating wolf picks partner or goes alone | Points/$, lone wolf multiplier |
| **Bingo Bango Bongo** | 3 points: first on, closest when all on, first in | $ per point |
| **Stableford** | Points for results (par=2, birdie=3, etc.) | Point values |

### Phase 1 (Core) - Implement First
- Skins ✅ (already have)
- Greenies ✅ (already have)
- Nassau
- Stableford

### Phase 2 (Popular)
- Wolf
- Bingo Bango Bongo
- Match Play brackets

### Phase 3 (Advanced)
- Vegas
- Dots/Garbage/Junk

### Side Game Configuration

```
┌─────────────────────────────────────────┐
│ SIDE GAMES                              │
├─────────────────────────────────────────┤
│ ☑ Skins         $[ 2 ] per skin         │
│   [ℹ️ How skins work]                   │
│                                         │
│ ☑ Greenies      $[ 1 ] per greenie      │
│   [ℹ️ How greenies work]                │
│                                         │
│ ☐ Nassau        $[ 5 ] per bet          │
│   [ℹ️ How Nassau works]                 │
│                                         │
│ [ + Browse More Games ]                 │
└─────────────────────────────────────────┘
```

### Quick Skins (Standalone)

Separate from league play:
- No teams
- Greenies optional (can be included since not part of league format)
- Doesn't affect handicap
- Can start anytime

### League Skins vs Quick Skins

| Feature | League Skins | Quick Skins |
|---------|:------------:|:-----------:|
| Greenies included | ❌ (already in league) | ✅ Optional |
| Teams playing | ✅ | ❌ |
| Affects handicap | ✅ (league round does) | ❌ |

---

## 10. Test League Isolation

### Purpose
Allow testing of features without affecting production data.

### Test League Flag

```
┌─────────────────────────────────────────┐
│ CLONE LEAGUE                            │
├─────────────────────────────────────────┤
│ Source: Big Boy's League                │
│                                         │
│ New league name: [ Big Boy's (TEST) ]   │
│                                         │
│ ☑ Mark as TEST league                   │
│                                         │
│ Clone options:                          │
│   ☑ Players (names, defaults)           │
│   ☑ Current handicaps (as test start)   │
│   ☐ Round history                       │
│   ☐ Payout history                      │
│   ☑ League settings                     │
│                                         │
│ ⚠️ Test leagues:                        │
│   • Do NOT affect player handicaps      │
│   • Are hidden from other leagues       │
│   • Can be deleted immediately          │
│                                         │
│ [ Clone as TEST League ]                │
└─────────────────────────────────────────┘
```

### Isolation Rules

| Data Direction | Allowed? |
|----------------|:--------:|
| Test reads from production | ✅ Yes (for realistic testing) |
| Test writes to production | ❌ Never |
| Production reads from test | ❌ Never |
| Production sees test exists | ❌ Never |

### Test-Only Handicaps

Test leagues maintain isolated handicap data:

```
PRODUCTION DATA (real):
  Player: Mark Dixon
  Course Handicap: 12.4
  League Handicap: 11.8

TEST DATA (isolated):
  Player: Mark Dixon (in Big Boy's TEST)
  Test Course Handicap: 14.2
  Test League Handicap: 13.5
```

Changes in test league only affect test handicaps.

### Visual Indicator

```
┌─────────────────────────────────────────┐
│ ⚠️ TEST MODE - Big Boy's (TEST)         │
│ Scores will not affect handicaps        │
├─────────────────────────────────────────┤
```

### Test League Deletion

```
┌─────────────────────────────────────────┐
│ DELETE TEST LEAGUE                      │
├─────────────────────────────────────────┤
│ Delete "Big Boy's (TEST)"?              │
│                                         │
│ This will permanently delete:           │
│   • All test rounds                     │
│   • All test handicap data              │
│   • All test settings                   │
│                                         │
│ Production data is NOT affected.        │
│                                         │
│ [ Cancel ]    [ Delete Immediately ]    │
└─────────────────────────────────────────┘
```

No 30-day waiting period for test leagues.

---

## 11. Data Model Changes

### New Tables Needed

```sql
-- Users (authentication)
users
  - id
  - email
  - auth_provider (google, apple, email)
  - created_at

-- User profiles
profiles
  - id
  - user_id (nullable for ghost players)
  - name
  - default_tees
  - created_at

-- Leagues
leagues
  - id
  - name
  - code (unique, for joining)
  - format_template_id
  - course_id
  - is_test (boolean)
  - visibility (public, private, hidden)
  - join_approval_required (boolean)
  - created_at

-- League membership
league_members
  - id
  - league_id
  - profile_id
  - role (owner, co_owner, admin, player)
  - tee_preference
  - joined_at

-- Format templates
format_templates
  - id
  - name
  - description
  - settings (JSON)
  - is_default (boolean)
  - created_by (site_owner only)

-- Handicaps (per league type)
handicaps
  - id
  - profile_id
  - league_id (null for course handicap)
  - type (index, course, league)
  - value
  - low_index
  - is_test (boolean)
  - updated_at

-- Rounds (individual and league)
rounds
  - id
  - profile_id
  - league_id (null for individual)
  - course_id
  - date
  - score
  - is_9_hole (boolean)
  - which_9 (front, back)
  - include_in_handicap (boolean)
  - is_test (boolean)

-- And updates to existing tables...
```

### Tee Tracking

```sql
-- Per-player-per-league tee defaults
tee_preferences
  - id
  - profile_id
  - league_id
  - tee_id
  - effective_date
```

### Tee Policies

```
┌─────────────────────────────────────────┐
│ TEE POLICY                              │
├─────────────────────────────────────────┤
│   ○ Same tees for everyone              │
│   ○ By handicap (0-10 back, 11+ middle) │
│   ○ By age (65+ forward tees)           │
│   ● Admin assigns per player            │
│   ○ Player choice                       │
└─────────────────────────────────────────┘
```

---

## 12. Migration Strategy

### Phase 1: Foundation
1. Add user authentication
2. Create profiles table (link existing players as ghost profiles)
3. Add leagues table (current setup becomes "Big Boy's League")
4. Add format_templates table (current logic becomes "Big Boys Format")

### Phase 2: Multi-League
1. Add league_members junction table
2. Update rounds to reference league_id
3. Add league switching in UI
4. Add league creation wizard

### Phase 3: Individual Play
1. Allow rounds with null league_id
2. Add individual round saving flow
3. Add personal stats tracking

### Phase 4: Enhanced Features
1. Additional format templates
2. Additional side games
3. Course handicap source selection
4. Test league isolation

### Key Principle
**Existing Big Boy's League data migrates automatically.** No manual intervention required. Current players become ghost profiles that can be claimed later.

---

## Scoring Permissions

### Who Can Score

| Scenario | Allowed |
|----------|:-------:|
| Player scores for self | ✅ |
| Teammate scores for teammate | ✅ |
| Admin scores for anyone | ✅ |
| Non-teammate scores for player | ❌ |

### Score Conflicts

When a score is changed or conflicts:
- Team captain (lowest handicap on team) gets notified
- Captain enters correct score to resolve

---

## 13. Push Notifications

### Implementation: PWA Push Notifications

Use PWA push notifications (free, no App Store required):

| Platform | Support |
|----------|---------|
| Android | ✅ Full support |
| iOS | ✅ Supported since iOS 16.4 (user must install to home screen first) |

### Standard Notifications

| Event | Who Gets It | Example |
|-------|-------------|---------|
| Round starting soon | Checked-in players | "Tee time in 30 minutes!" |
| Scores posted | League members | "Round 12 results are in" |
| You got a greenie | Individual | "Nice shot! Greenie on #8" |
| Join request | Admins | "Mike Smith wants to join" |
| Score conflict | Team captain | "Score dispute on hole 5" |
| Ownership transfer | All co-owners | "Ownership transfer initiated" |

### Fun Notifications (League-Wide)

| Trigger | Example Message |
|---------|-----------------|
| First birdie of the day | "🔥 Mark opens with a birdie on #1!" |
| Eagle | "🦅 EAGLE ALERT: Steve just eagled #7!" |
| Hole-in-one | "🚨 ACE! Bob got a hole-in-one on #12!" |
| Back-to-back birdies | "Mike is heating up - 2 birdies in a row!" |
| Team takes the lead | "Team 3 just grabbed the lead at -4" |

### Player Nicknames (Admin Only)

```
┌─────────────────────────────────────────┐
│ PLAYER SETTINGS (Admin Only)            │
├─────────────────────────────────────────┤
│ Player: Greg Peppers                    │
│                                         │
│ Nickname: [ The Legend          ]       │
│                                         │
│ Display name as:                        │
│   ○ Greg Peppers                        │
│   ● Greg "The Legend" Peppers           │
│   ○ The Legend                          │
└─────────────────────────────────────────┘
```

Nicknames can be used in notifications via `{nickname}` variable.

### Player-Specific Custom Notifications (Admin Setup)

Admins can create custom notification templates for specific players:

```
┌─────────────────────────────────────────┐
│ CUSTOM PLAYER NOTIFICATIONS             │
├─────────────────────────────────────────┤
│ Player: Greg Peppers                    │
│                                         │
│ Trigger: [ Birdie or better      ▼]     │
│                                         │
│ Messages (rotates randomly):            │
│ ┌─────────────────────────────────────┐ │
│ │ 1. You won't believe this, but     │ │
│ │    {nickname} actually got a       │ │
│ │    birdie on hole {hole}!          │ │
│ ├─────────────────────────────────────┤ │
│ │ 2. Check the weather - {nickname}  │ │
│ │    just birdied. Hell froze over.  │ │
│ ├─────────────────────────────────────┤ │
│ │ 3. Witnesses needed: {nickname}    │ │
│ │    claims he made birdie on #{hole}│ │
│ └─────────────────────────────────────┘ │
│ [ + Add Another Message ]               │
│                                         │
│ ☑ Active                                │
│ [ Save ]                                │
└─────────────────────────────────────────┘
```

### Available Triggers

| Trigger | Description |
|---------|-------------|
| Birdie or better | Any score under par |
| Eagle or better | -2 or better on a hole |
| Hole-in-one | Ace |
| First birdie in X rounds | Drought breaker |
| Worst score of the day | Highest single hole score |
| Best round ever | Personal best |
| Sandbagger alert | Beats handicap by X strokes |
| Streak | X birdies in a round |
| Team takes lead | Team moves to first place |

### Message Variables

| Variable | Replaced With |
|----------|---------------|
| `{player}` | Player full name |
| `{nickname}` | Player nickname (or name if none) |
| `{hole}` | Hole number |
| `{score}` | The score |
| `{par}` | Hole par |
| `{team}` | Team name/number |
| `{course}` | Course name |

### Example Custom Setups

**The Sandbagger:**
```
Player: Bob Williams
Trigger: Beats handicap by 5+ strokes
Messages:
- "🚨 SANDBAG ALERT: {nickname} shot {score}. Handicap committee notified."
```

**The Drought Breaker:**
```
Player: Tom (hasn't birdied in weeks)
Trigger: First birdie in 5+ rounds
Messages:
- "THE DROUGHT IS OVER! {nickname} finally got a birdie!"
- "It's been 84 years... {nickname} made birdie."
```

### Manual Push Notifications (Admin)

```
┌─────────────────────────────────────────┐
│ SEND NOTIFICATION                       │
├─────────────────────────────────────────┤
│ To:                                     │
│   ● All league members                  │
│   ○ Checked-in players only             │
│   ○ Select players...                   │
│                                         │
│ Message:                                │
│ ┌─────────────────────────────────────┐ │
│ │ Reminder: $20 entry fee due before │ │
│ │ tee time. Venmo @MarkDixon         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Send:                                   │
│   ● Now                                 │
│   ○ Schedule: [ Date ] [ Time ]         │
│                                         │
│ [ Cancel ]              [ Send ]        │
└─────────────────────────────────────────┘
```

**Use Cases:**
- Payment reminders
- Weather delays
- Location changes
- Post-round meetups
- Cancellations
- Any custom announcement

### Notification Settings

```
┌─────────────────────────────────────────┐
│ NOTIFICATION SETTINGS                   │
├─────────────────────────────────────────┤
│ Fun notifications:                      │
│   ● On (send to all league members)     │
│   ○ Off (standard notifications only)   │
│                                         │
│ Frequency limit:                        │
│   [ 1 ] per player per round max        │
│   (prevents spam if someone goes off)   │
│                                         │
│ Quiet hours:                            │
│   No notifications before [ 6:00 AM ]   │
│   No notifications after [ 10:00 PM ]   │
└─────────────────────────────────────────┘
```

### Extensibility

Store triggers as configurable data (not hardcoded) so new triggers can be added over time without major code changes. Admin can request new triggers for future updates.

### Test League Exception
Test leagues do NOT send notifications.

---

## Summary of Edge Cases Preserved

| Edge Case | Handling |
|-----------|----------|
| 3-player team | Format-specific rules (Big Boys: no adjustment, Retirees: -2 start + 2 extra strokes) |
| 2-team match play | Holes won (front, back, overall) |
| DNF mid-round | Include/exclude scores option, payment status, par 3 completion tracking |
| Late player | Full/Back 9/Just Playing options with payment tiers |
| Player loses 4th at turn | Per-9 adjustment application |
| Score exceeds max | Display capped/actual, use capped for calculations |
| Test league sees production | ✅ Can read, ❌ Cannot write |
| Production sees test | ❌ Never |

---

## Implementation Notes for Claude Code

1. **Preserve existing functionality** - Big Boy's League works exactly as it does today
2. **Feature flags** - New features can be toggled per league
3. **Supabase** - Continue using for data storage
4. **React** - Continue with existing React architecture
5. **Mobile-first** - All new UI must work on mobile
6. **PWA ready** - Structure for potential native app wrapper later

### File Structure Suggestion

```
/src
  /components
    /auth          # Login, signup, claim profile
    /leagues       # League management, creation wizard
    /formats       # Format templates, configuration
    /scoring       # Existing + enhanced scoring
    /handicaps     # Handicap display, calculations
    /individual    # Individual round tracking
    /sidegames     # Skins, greenies, etc.
  /hooks
    /useAuth
    /useLeague
    /useHandicap
  /contexts
    /AuthContext
    /LeagueContext
  /utils
    /handicapCalc  # WHS/GHIN formulas
    /formatRules   # Format-specific logic
```

---

## Questions for Implementation

1. Should the league switcher be in the header or a dedicated screen?
2. What's the maximum number of leagues a user can belong to?
3. Should there be a "Home" screen showing all leagues, or default to most recent?
4. For PWA: Do we need offline scoring capability?

---

*Document version: 1.0*
*Last updated: February 1, 2026*
*Based on conversation with Mark Dixon*
