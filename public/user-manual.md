# Gunpowder Golf — User Manual

---

## Table of Contents

### Part 1: For Players
1. [Getting Started](#getting-started)
2. [Navigating the App](#navigating-the-app)
3. [Live Scoring](#live-scoring)
4. [Side Games](#side-games)
5. [Handicaps](#handicaps)
6. [Round History & Stats](#round-history--stats)
7. [GPS Yardage](#gps-yardage)
8. [Push Notifications](#push-notifications)
9. [Account & Profile](#account--profile)
10. [Casual Games & Individual Rounds](#casual-games--individual-rounds)

### Part 2: For Admins
11. [Admin Access](#admin-access)
12. [Running a Round](#running-a-round)
13. [Team Generation](#team-generation)
14. [Scoring Formats](#scoring-formats)
15. [Player Management](#player-management)
16. [League Settings](#league-settings)
17. [Handicap Configuration](#handicap-configuration)
18. [Payouts & Money](#payouts--money)
19. [Push Notifications (Admin)](#push-notifications-admin)
20. [League Management](#league-management)
21. [Manual Score Entry](#manual-score-entry)
22. [Side Games Configuration](#side-games-configuration)
23. [Audit Log](#audit-log)

---

# Part 1: For Players

---

## Getting Started

### Creating an Account

Tap **Sign Up** on the login screen. You can register with:

- **Email and password** — Enter your email and choose a password (6+ characters).
- **Google sign-in** — Tap "Sign in with Google" to use your Google account.

After signing up, you'll create a profile with your display name.

### Joining a League

There are three ways to join:

1. **Invite Link** — Tap a link shared by your league admin. The app opens and auto-fills the league code.
2. **QR Code** — Scan the QR code your admin shares (from a poster, text, etc.).
3. **Browse Public Leagues** — From the My Leagues screen, scroll down to "Browse Public Leagues," search by name, and tap "Request to Join."

If the league requires approval, your request is sent to the admin for review. You'll be added once approved.

### Switching Leagues

Tap the **league name** in the top-left corner of the header. A dropdown shows your other leagues with role badges (Owner, Admin, Player). Tap any league to switch. Tap **All Leagues** to return to the full league selection screen.

### Using Without an Account

You can skip sign-in and enter a league code directly. This works for viewing and scoring, but you won't be able to:

- Switch between leagues
- Track personal round history across devices
- Link your profile to a player record
- Receive push notifications

---

## Navigating the App

### Main Tabs (Mobile)

The bottom navigation bar has these tabs:

| Tab | What It Does |
|-----|-------------|
| **Live** | View and enter scores during an active round |
| **Teams** | See team assignments for the current round |
| **Check-In** | Select your availability for the next round |
| **GPS** | View yardage to the green (if enabled) |
| **More** | Access additional pages (see below) |

### More Menu

Tap **More** to open a bottom sheet with:

- **Players** — Full player roster with handicaps
- **History** — Past round results, scores, and money
- **Scorecard** — Course layout (par and yardages by tee)
- **Settings** — Account, notifications, and league configuration
- **Help** — This user manual

### Desktop Navigation

On desktop, all tabs are shown in a horizontal bar at the top: Players, Check-In, Teams, Live, GPS, History, Scorecard, Settings, Help.

### Next Round Banner

When an admin schedules the next round, a banner appears below the navigation showing the date, time, and any custom message (e.g., "Shotgun start, bring your A-game").

### Header

- **League name** (top-left) — Tap to switch leagues or sign out.
- **Admin badge** — Shows when you're logged in as admin.
- **Save indicator** — A small dot appears when data is saving (yellow = saving, red = error).

---

## Live Scoring

### Entering Scores

1. Go to the **Live** tab during an active round.
2. Tap the cell for a player on the current hole.
3. The score keypad appears — tap the number of strokes.
4. Confirm your entry.

The leaderboard updates in real time as scores are entered.

### Scoring Permissions

If your admin has enabled scoring permissions:

- You can score for **yourself** and **your teammates**.
- You **cannot** score for players on other teams.
- Admins can always score for anyone.

Attempting to score for a restricted player shows a red notification.

### Leaderboard

The leaderboard shows team standings with:

- Front 9, back 9, and overall scores
- Scores displayed relative to par (e.g., -2, E, +3)
- The current leader highlighted

### Stat Tracking

If the admin enables stat tracking for a round, the score keypad includes extra inputs:

| Stat | Description |
|------|-------------|
| **FIR** | Fairway in Regulation (par 4+ holes only) |
| **GIR** | Green in Regulation |
| **Putts** | Number of putts taken (0–4) |
| **Penalty** | Penalty strokes (+ to add, − to remove) |
| **Scramble** | Scramble attempt (appears when GIR is missed) |

Stats are saved with your round and viewable in your personal round history.

### DNF (Did Not Finish)

If a player can't complete the round, an admin can mark them as DNF. Their scores stop counting toward the team total for remaining holes.

---

## Side Games

### Greenies

On par 3 holes, the player whose ball lands closest to the pin (and on the green) wins the greenie. During a round:

- The greenie tracker shows each par 3 hole.
- An admin marks which player won (or if nobody hit the green).
- Unclaimed greenies may carry over depending on league settings.

### Skins

Skins is a hole-by-hole betting game:

- Win a hole outright (lowest score, no ties) to win the skin.
- If two or more players tie, the skin carries over to the next hole.
- Results appear in the **Skins** tab during live rounds.

### Nassau

Nassau splits the round into three separate bets:

- **Front 9** — Match play for holes 1–9
- **Back 9** — Match play for holes 10–18
- **Overall** — Match play for all 18 holes

Teams are paired automatically. During the round, a team can **press** to start a new side bet for the remaining holes.

### Wolf

Wolf is a 4-player rotation game:

- Each hole, one player is the "Wolf" (rotation order).
- After watching tee shots, the Wolf chooses a partner or goes **lone wolf**.
- **Blind Wolf** — Declared before anyone tees off (higher risk, higher reward).
- Points multiply based on the outcome (lone wolf and blind wolf earn more).

---

## Handicaps

### How Handicaps Work

Your handicap index is calculated automatically from your scoring history using a modified World Handicap System (WHS) formula with a 0.96 multiplier. It represents your potential scoring ability relative to par.

A lower handicap means you're a better golfer. A 0 handicap means you shoot around par; a 20 handicap means you typically shoot about 20 over par.

### Course Handicap

Your **handicap index** is converted to a **course handicap** based on the course's rating and slope. The course handicap determines how many strokes you receive on specific holes.

### Where to See Your Handicap

Your current handicap appears on your player card on the **Players** page, showing both:

- **Index** — Your raw handicap number
- **Course HCP** — Adjusted for the course you're playing

### Handicap Sources

Your handicap can come from:

- **Calculated** — Auto-calculated from your scoring rounds.
- **GHIN** — A manually entered official GHIN index.
- **Cross-League** — Calculated from rounds across multiple leagues.
- **Manual** — Set directly by an admin.

---

## Round History & Stats

### League History

The **History** tab shows all past league rounds:

- Round date and format
- Winning team and scores
- Front 9 / back 9 / overall breakdown
- Money settlements (who owes whom)
- Greenie and skins results

Tap a round to expand and see the full scorecard.

### Personal Round History

From the My Leagues screen, tap **Round History** to see all your individual rounds across leagues. If you've been tracking stats, you'll see aggregates:

- **FIR%** — Percentage of fairways hit
- **GIR%** — Percentage of greens in regulation
- **Putts/Hole** — Average putts per hole
- **Scramble%** — Percentage of successful scrambles
- **Penalties** — Total penalty strokes

Each round can be expanded to see hole-by-hole stats.

---

## GPS Yardage

### Using GPS

When GPS is enabled by your admin:

1. Go to the **GPS** tab.
2. Select the hole you're on from the dropdown.
3. The app shows your distance to the green:
   - **Front** — Front edge of the green
   - **Center** — Center of the green
   - **Back** — Back edge of the green

### Accuracy

GPS accuracy depends on your device and conditions (weather, obstructions). The app displays an accuracy indicator. For best results:

- Enable location services on your device.
- Allow the app to access your location when prompted.
- Stand still for a moment for the most accurate reading.

---

## Push Notifications

### Enabling Notifications

1. Go to **Settings → Account**.
2. Toggle on **Push Notifications**.
3. Your browser will ask for permission — tap **Allow**.

You'll receive notifications for round events even when the app isn't open.

### Notification Categories

You can choose which types of notifications you receive:

| Category | What It Includes |
|----------|-----------------|
| **Round Alerts** | Round start, finish, check-in closing warnings |
| **Score Alerts** | Birdies, eagles, hole-in-ones, team lead changes |
| **Greenie Alerts** | Greenie winners on par 3 holes |
| **Admin Messages** | Announcements, custom messages from admins |

Toggle each category on/off in Settings → Account → Notification Preferences.

### Quiet Hours

Your admin may configure quiet hours (e.g., 10 PM – 7 AM). During quiet hours, automatic notifications (score alerts, round events) are suppressed. Admin-triggered messages like announcements and custom notifications still come through.

---

## Account & Profile

### Your Profile

Your profile includes:

- **Display Name** — Your name as shown to other players.
- **Email** — Used for sign-in and password recovery.
- **Nickname** (optional) — Shows in quotes on your player card (e.g., Greg "The Legend" Peppers). Used as your short name on leaderboards and scoring grids.

Your profile is shared across all leagues you join.

### Duplicate Names

If two players in the league share the same first name, the app automatically adds a last initial for disambiguation (e.g., "Mike D." and "Mike S.").

### Forgot Password

1. On the login screen, tap **Forgot Password?**
2. Enter your email address.
3. Check your email for a reset link.
4. Click the link — the app opens and prompts you to set a new password (6+ characters).

### Signing Out

Tap the league name in the header → **Sign Out**. Or go to Settings → Account → Sign Out.

---

## Casual Games & Individual Rounds

### Casual Games

From the My Leagues screen, tap **Casual Game** to start a standalone round:

1. Add players (from your contacts or new entries).
2. Pick a scoring format (skins, stroke, best ball, etc.).
3. Optionally enable side games.
4. Start playing!

Casual games don't affect league standings or handicaps.

### Individual Rounds

From the My Leagues screen, tap **Individual Round** to play a solo round:

1. Select the course tee.
2. Optionally enable stat tracking (FIR, GIR, putts, etc.).
3. Score hole by hole.
4. View your round summary at the end.

Individual rounds can count toward your handicap depending on league settings.

---

# Part 2: For Admins

---

## Admin Access

### Logging In

Go to **Settings → Account** and enter the admin PIN in the **Admin Login** section. Once logged in, an "Admin" badge appears in the header.

### Roles

| Role | Access Level |
|------|-------------|
| **Owner** | Full control — delete league, transfer ownership, everything below |
| **Admin** | Manage rounds, players, most settings |
| **Player** | Standard access — view and score |

Roles are managed in Settings → League → Member Management.

---

## Running a Round

Running a league round is a 7-step process:

### Step 1: Set Up Check-In

Go to the **Check-In** tab. Toggle on the players who are available for the round. You can also set **pairing requests** — players who want to be on the same team.

### Step 2: Choose a Format

Select the scoring format from the format picker at the top of the Check-In page. This can differ from the league default for a single round (per-round format override).

### Step 3: Generate Teams

Tap **Generate Teams**. The algorithm:

- Sorts players into A/B/C/D flights by handicap.
- Builds balanced teams by picking one from each flight.
- Checks recency to avoid repeat pairings.
- Respects pairing requests.
- Randomizes within flights for variety.

### Step 4: Adjust Teams

On the **Teams** tab:

- **Swap players** — Tap a player, then tap a player on another team.
- **Add late player** — Tap "+ Add Player" on a team card.
- **Reorder teams** — Use the move buttons.

### Step 5: Start the Round

Tap **Start Round** on the Teams page. This:

- Locks the team assignments.
- Activates live scoring.
- Sends a push notification to all league members.

### Step 6: Live Scoring

Scores are entered on the **Live** tab. If scoring permissions are enabled, players can only score for themselves and teammates. Admins can always score for anyone.

The leaderboard, skins tracker, and side game panels update in real time.

### Step 7: Finish the Round

When all scores are entered, tap **Finish Round**. This:

- Calculates final standings and winners.
- Computes money settlements.
- Updates player handicaps.
- Records the round in league history.
- Stores teammate history for recency checks.
- Sends a "Round finished" notification.

---

## Team Generation

### Flight System

Players are sorted by handicap into four flights:

| Flight | Description |
|--------|-------------|
| **A** | Lowest handicaps (best players) |
| **B** | Below-average handicaps |
| **C** | Above-average handicaps |
| **D** | Highest handicaps |

Teams are built by taking one player from each flight.

### Team Sizing

- All teams are filled to 3 players first.
- 4th players are added to the weakest teams.
- Late additions can create 5-player teams.

### Recency Checks

The algorithm tracks the last 5 rounds of teammate history:

- Avoids putting the same two players together in 2+ consecutive rounds.
- Avoids 3+ of the last 5 rounds together.
- Falls back gracefully when conflicts are unavoidable (picks least-conflict option).
- After initial generation, a swap phase tries to resolve remaining conflicts.

### Pairing Requests

Players can request to be paired together. Same-flight pairs are placed as a unit. Pairing requests are exempt from recency checks.

### Manual Teams

Create teams manually for full control. Manual teams bypass all flight and recency logic.

---

## Scoring Formats

| Format | Description |
|--------|-------------|
| **Big Boys** (default) | Team format — only under-par scores count per hole. If nobody is under par, the best score counts. |
| **Best Ball** | Lowest individual score on each hole counts for the team. |
| **Scramble** | All players hit, pick the best, all play from there. Enter one team score per hole. |
| **Retirees** | Best 2 of 4 scores per hole. 3-player teams use 2 of 3 with a scoring bonus. |
| **Stroke** | Total individual gross strokes. |
| **Stroke Net** | Total strokes minus handicap allowance. |
| **Stableford** | Points per hole: 0 (double bogey+), 1 (bogey), 2 (par), 3 (birdie), 4 (eagle), 5 (ace/albatross). |
| **Match Play** | Hole-by-hole head-to-head. Win the hole = 1 point. |
| **Skins** | Win a hole outright to claim the skin. Ties carry over. |
| **Track** | Stat tracking mode — FIR, GIR, putts, penalties, scramble. |

### Per-Round Override

Change the format for a single round using the format selector on the Check-In page. This doesn't change the league default.

---

## Player Management

### Adding Players

Go to **Players → + Add Player**:

1. Search for an existing profile to link (auto-populates name, email, handicap).
2. Or enter player details manually.
3. Choose the handicap source: Profile, League, Manual, or None.

The app prevents adding duplicate profiles.

### Editing Players

Tap a player card → edit button. You can change:

- Name and nickname
- Handicap index and source
- Tee preference (Gold, Blue, Red)
- Active/inactive status

### Nicknames

Set a nickname in the edit modal. The nickname:

- Shows in quotes on the full player card: Greg "The Legend" Peppers
- Is used as the short display name on leaderboards and scoring grids
- Supports first-name disambiguation (e.g., "Mike D." when there are two Mikes)

---

## League Settings

Settings are organized into 6 categories:

### 1. Account
- Sign in/out options
- Admin PIN login/logout
- Push notification preferences
- Profile linking

### 2. Game Setup
- **Next Round Announcement** — Set date, time, and message. Push notify members.
- **Round Settings** — Default starting hole.
- **Team Scoring Rules** — Max score, DQ rules, X handling.
- **Side Games** — Enable/disable skins, Nassau, Wolf.
- **Scoring Permissions** — Restrict scoring to self/teammates.
- **Custom Player Notifications** — Trash talk messages per player per trigger.
- **Quiet Hours** — Suppress auto-notifications during set hours.
- **Send Notification** — Broadcast a custom message to all subscribers.

### 3. League
- League code and invite tools (link, QR, message)
- Pending join request approval
- Member management (roles, remove, linked/unlinked status)
- Join settings (approval required, public/private visibility)
- Ownership transfer (7-day waiting period)
- League deletion (soft delete, owner only)
- Clone to test league

### 4. Handicaps
- Handicap scope (True / Gunpowder / League)
- Handicap mode (auto or manual)
- Course tees (rating and slope for Gold, Blue, Red)
- Max handicap cap
- Freeze period
- Cross-league handicap sources
- GHIN override

### 5. Payouts & Pots
- Payout amounts (greenie/hole, front 9, back 9, overall)
- Greenie carryover rules
- Hole-in-one pot balance

### 6. Admin Tools (Site Owner Only)
- GPS yardage toggle
- Audit log viewer
- Profile management
- Data migrations
- Course mapping tool

---

## Handicap Configuration

### Scope

Choose which rounds count toward handicap calculation:

- **True** — All rounds from all sources
- **Gunpowder** — Only rounds played through the app
- **League** — Only rounds within the current league

### Course Tees

Configure rating and slope for each tee in Settings → Handicaps:

| Tee | Default Rating | Default Slope |
|-----|---------------|---------------|
| Gold | 67.3 | 110 |
| Blue | 63.5 | 100 |
| Red | 64.8 | 105 |

These values affect course handicap calculations for each player based on their tee preference.

### Max Handicap Cap

Set a maximum handicap index. Any player whose calculated handicap exceeds this value is capped.

### Freeze Period

Lock all handicaps at their current values for a set period (useful during playoffs or tournaments). Players keep their handicap from the freeze start date until it expires.

### Cross-League Sources

Pull rounds from other leagues into the handicap calculation:

- **All** — Include rounds from all leagues (default).
- **Selected** — Choose specific leagues to include.
- Toggle whether to include individual rounds and casual rounds.
- Tap **Recalculate** to refresh all player handicaps after changing settings.

### GHIN Override

Players can have an official GHIN index entered that overrides the calculated value.

---

## Payouts & Money

### Payout Format

Configure amounts in Settings → Payouts:

- **Greenie per hole** — Amount for each greenie win
- **Front 9** — Payout for front 9 winner
- **Back 9** — Payout for back 9 winner
- **Overall** — Payout for overall winner

### Greenie Carryover

Configure what happens to unclaimed greenies:

**When some greenies are won:**
- Last winner gets the leftover
- First winner gets the leftover
- Split among all winners
- Leftover goes to the HIO pot

**When no greenies are won:**
- Entire pot goes to the HIO pot
- Split evenly among all players
- Carry the pot to the next round

### Hole-in-One Pot

A running pot that accumulates from greenie carryovers. The balance is tracked in Settings → Payouts. When someone hits a hole-in-one, they claim the pot.

### Money Settlements

After finishing a round, the app calculates who owes whom. View settlement details in the round's history entry.

---

## Push Notifications (Admin)

### Automatic Notifications

These fire automatically during gameplay:

| Event | Category | Quiet Hours |
|-------|----------|-------------|
| Round started | Round Alerts | Respected |
| Round finished | Round Alerts | Respected |
| Birdie / Eagle / HIO | Score Alerts | Respected |
| Bogey / Double / Worse (custom only) | Score Alerts | Respected |
| Team takes the lead | Score Alerts | Respected |
| Greenie finalized | Greenie Alerts | Respected |
| Check-in closing warning | Round Alerts | **Bypassed** |
| Round announcement | Admin Messages | **Bypassed** |
| Custom message | Admin Messages | **Bypassed** |
| Join request | Admin Messages | No check |

### Check-In Closing Warning

On the Check-In page, tap the clock icon to send a closing warning. Choose a time interval:

- 1 minute
- 5 minutes
- 10 minutes
- 15 minutes
- 30 minutes

This bypasses quiet hours since it's admin-triggered.

### Round Announcement

In Settings → Game Setup → Next Round Announcement:

1. Set the date and time.
2. Add an optional message.
3. Tap **Notify Members** to send a push notification with the announcement details.

### Custom Notification

In Settings → Game Setup → Send Notification:

1. Type your message.
2. Tap **Send**.

The message goes to all league subscribers with push notifications enabled.

### Custom Player Notifications (Trash Talk)

In Settings → Game Setup → Custom Player Notifications:

1. Select a player.
2. Choose a trigger: Hole-in-One, Eagle, Birdie, Bogey, Double Bogey, or Triple Bogey+.
3. Add one or more custom messages.

Messages support placeholders:
- `{player}` — Replaced with the player's name
- `{hole}` — Replaced with the hole number

When the trigger fires, a random message from the list is sent. Birdie/eagle/ace have default messages; bogey and worse **only fire when custom messages are configured** (to avoid spamming bad scores).

### Quiet Hours

In Settings → Game Setup → Quiet Hours:

1. Toggle quiet hours on.
2. Set start time (e.g., 10 PM) and end time (e.g., 7 AM).

During quiet hours, automatic notifications are suppressed. Admin-triggered notifications (announcements, custom messages, check-in warnings) bypass quiet hours.

### Test League Protection

All notifications are automatically suppressed in test leagues.

---

## League Management

### Inviting Players

In Settings → League → Invite:

- **Copy Link** — Copy the invite URL to share via text/email.
- **Download QR** — Save a QR code image to share.
- **Copy Invite Message** — Copy a pre-formatted invitation message with the link and code.

### Approving Join Requests

If approval is required (Settings → League → Join Settings), pending requests appear in Settings → League. Review and approve or deny each request.

### Member Management

In Settings → League → Members:

- View all players with linked/unlinked profile status.
- Filter by All / Linked / Unlinked tabs.
- Search by name.
- Change player roles (Owner, Admin, Player).
- Remove members.

Pagination shows 10 members per page.

### Join Settings

- **Require Approval** — New members need admin approval.
- **Visibility** — Public (browseable in "Browse Public Leagues") or Private (invite-only).

### Ownership Transfer

1. Go to Settings → League.
2. Initiate a transfer to another member.
3. A 7-day waiting period begins.
4. If the league has co-owners, they must approve the transfer.
5. After 7 days (or when all co-owners approve), the transfer completes.
6. The transfer can be cancelled during the waiting period.

A status banner shows the countdown and approval status.

### Deleting a League

Only the league owner can delete. This is a **soft delete** — the league data is preserved in the database but is no longer accessible to members.

### Test Leagues

Clone your production league to a test league for experimentation:

- Test leagues strip profile links (no real player data affected).
- Hidden from non-admin users in the league list.
- All push notifications are suppressed.
- Marked with an `is_test` flag.

---

## Manual Score Entry

### Manual Team Score

For formats like scramble where the team has one combined score:

1. Tap "Manual Team Score" on the Live tab.
2. Choose **By 9** (front/back totals) or **By Hole** (hole-by-hole).
3. Enter scores as **relative to par** (e.g., -1 for one under, 0 for par, +2 for two over).

The app converts these to gross scores for display.

### Manual Player Total (Quick Score Entry)

For entering a player's total without hole-by-hole detail:

1. Expand "Quick Score Entry" on the Live tab.
2. Enter front 9 and back 9 gross totals.
3. This counts as 18 holes for handicap calculation.

### Bulk Score Import

Import scores for multiple players at once:

1. Choose **League Round** (counts toward handicap/standings) or **Casual** mode.
2. Select a tee for automatic rating/slope lookup (Gold, Blue, Red, or custom).
3. Enter scores and confirm.

---

## Side Games Configuration

### Enabling/Disabling

In Settings → Game Setup → Side Games, toggle each game:

- **Skins** — Hole-by-hole individual betting
- **Nassau** — Front/back/overall match play betting
- **Wolf** — 4-player rotation game

When enabled, the corresponding tracker appears during live rounds.

### Nassau

Nassau pairs are determined automatically based on team matchups. During the round, teams can **press** to start additional side bets.

### Wolf

Wolf uses a 4-player rotation:

- The wolf order rotates each hole.
- The wolf can choose a partner after watching tee shots.
- **Lone Wolf** — Play alone against the other three (2x points).
- **Blind Wolf** — Declared before tee shots (3x points).

---

## Audit Log

In Settings → Admin Tools → Audit Log:

- View a chronological history of all admin actions.
- **Search** by keyword.
- **Filter** by action type (player edits, round events, settings changes, role changes).
- Expand entries to see full details.
- Timestamps shown as relative time ("2 hours ago").
- The log keeps the most recent **200 entries**.

Action types tracked:

- Player added / removed / edited
- Settings changed
- Round started / finished
- Role changed
- League joined / left
- Ownership transfer events

---

*Gunpowder Golf — Built for golf leagues that take their fun seriously.*
