import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'

/* ================================
   COLLAPSIBLE SECTION
   ================================ */
function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      marginBottom: '12px',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
          fontSize: '16px',
          fontWeight: '600',
          textAlign: 'left'
        }}
      >
        {title}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            width: 18, height: 18, flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ================================
   INFO ITEM
   ================================ */
function Item({ label, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{label}</div>
      <div>{children}</div>
    </div>
  )
}

/* ================================
   TAB SELECTOR (Players / Admins)
   ================================ */
function TabSelector({ active, onChange }) {
  const tabs = [
    { key: 'players', label: 'For Players' },
    { key: 'admins', label: 'For Admins' }
  ]
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '20px',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: '4px',
      border: '1px solid var(--color-border)'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            background: active === tab.key ? 'var(--color-primary)' : 'transparent',
            color: active === tab.key ? 'white' : 'var(--color-text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ================================
   PLAYER HELP CONTENT
   ================================ */
function PlayerHelp() {
  return (
    <>
      <Section title="Getting Started" defaultOpen={true}>
        <Item label="Creating an Account">
          Tap <strong>Sign Up</strong> on the login screen. You can register with an email and password, or sign in with Google. After signing up, you'll create a profile with your name.
        </Item>
        <Item label="Joining a League">
          There are three ways to join a league:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Invite Link</strong> — Tap a link shared by your league admin. It opens the app and auto-fills the league code.</li>
            <li><strong>QR Code</strong> — Scan the QR code your admin shares.</li>
            <li><strong>Browse Public Leagues</strong> — From My Leagues, scroll down to browse and request to join public leagues.</li>
          </ul>
          If the league requires approval, your request goes to the admin for review.
        </Item>
        <Item label="Switching Leagues">
          Tap the league name in the top-left corner to see your other leagues. Tap any league to switch to it, or tap <strong>All Leagues</strong> to see your full list.
        </Item>
        <Item label="Skipping Sign-In">
          You can use the app without an account by entering a league code directly. However, signing in lets you link your profile, switch between leagues, and track your personal round history across devices.
        </Item>
      </Section>

      <Section title="Navigating the App">
        <Item label="Main Tabs">
          The app has several tabs accessible from the bottom navigation (mobile) or top bar (desktop):
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Live</strong> — View and enter scores during an active round.</li>
            <li><strong>Teams</strong> — See team assignments for the current round.</li>
            <li><strong>Check-In</strong> — Check in for the next round (select your availability).</li>
            <li><strong>GPS</strong> — View yardage to the green (if enabled by admin).</li>
          </ul>
        </Item>
        <Item label="More Menu">
          Tap <strong>More</strong> on mobile to access additional pages:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Players</strong> — View the full player roster and handicaps.</li>
            <li><strong>History</strong> — View past round results, scores, and money settlements.</li>
            <li><strong>Scorecard</strong> — View the course layout (par, yardages by tee).</li>
            <li><strong>Settings</strong> — Account, notifications, and league settings.</li>
          </ul>
        </Item>
        <Item label="Next Round Banner">
          When an admin schedules the next round, a banner appears below the navigation showing the date, time, and any message.
        </Item>
      </Section>

      <Section title="Live Scoring">
        <Item label="Entering Scores">
          During a live round, go to the <strong>Live</strong> tab. Tap a player's cell for the current hole to open the score keypad. Enter the number of strokes and confirm. The leaderboard updates in real time.
        </Item>
        <Item label="Scoring Permissions">
          If your league admin has enabled scoring permissions, you can only enter scores for yourself and your teammates. Admins can always score for anyone.
        </Item>
        <Item label="Leaderboard">
          The leaderboard shows team standings with front 9, back 9, and overall scores. Scores are displayed relative to par (e.g., -2, E, +3).
        </Item>
        <Item label="Stat Tracking">
          If stat tracking is enabled for a round, the score keypad includes extra buttons:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>FIR</strong> — Fairway in Regulation (par 4+ holes only)</li>
            <li><strong>GIR</strong> — Green in Regulation</li>
            <li><strong>Putts</strong> — Number of putts (0–4)</li>
            <li><strong>Penalty</strong> — Penalty strokes (+/−)</li>
            <li><strong>Scramble</strong> — Scramble attempt (appears when GIR is missed)</li>
          </ul>
        </Item>
        <Item label="DNF (Did Not Finish)">
          If a player can't complete the round, an admin can mark them as DNF. Their scores stop counting toward team totals.
        </Item>
      </Section>

      <Section title="Side Games">
        <Item label="Greenies">
          On par 3 holes, the closest ball to the pin wins the greenie. The greenie tracker appears in the Live tab during a round. If no one wins a greenie, the pot may carry over to the next round depending on league settings.
        </Item>
        <Item label="Skins">
          Skins is a hole-by-hole betting game. Win a hole outright (lowest score with no ties) and you win the skin. Tied holes carry over to the next hole. View results in the Skins tab during live rounds.
        </Item>
        <Item label="Nassau">
          Nassau is a three-part bet: front 9, back 9, and overall 18. It's played as match play between pairs. Teams can "press" to start a new side bet during the round.
        </Item>
        <Item label="Wolf">
          Wolf is a 4-player rotation game. Each hole, one player is the "Wolf" and chooses a partner (or goes lone wolf) after watching tee shots. Points multiply based on the outcome.
        </Item>
      </Section>

      <Section title="Handicaps">
        <Item label="How Handicaps Work">
          Your handicap index is calculated automatically from your scoring history using a modified World Handicap System formula. It represents your potential scoring ability relative to par.
        </Item>
        <Item label="Handicap Sources">
          Your handicap can come from several sources depending on league settings:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Calculated</strong> — Auto-calculated from your round history in the league.</li>
            <li><strong>GHIN</strong> — Manually entered GHIN index that overrides the calculation.</li>
            <li><strong>Cross-League</strong> — Calculated from rounds across multiple leagues.</li>
            <li><strong>Manual</strong> — Set directly by an admin.</li>
          </ul>
        </Item>
        <Item label="Viewing Your Handicap">
          Your current handicap is shown on your player card on the Players page, displayed as both an index and a course handicap (adjusted for the course difficulty).
        </Item>
      </Section>

      <Section title="Round History & Stats">
        <Item label="League History">
          The <strong>History</strong> tab shows all past league rounds with winners, scores, and money settlements. Tap a round to expand and see full details.
        </Item>
        <Item label="Personal Round History">
          From My Leagues, tap <strong>Round History</strong> to see all your individual rounds across leagues. If you tracked stats, you'll see aggregate FIR%, GIR%, putts per hole, scramble %, and penalties.
        </Item>
        <Item label="Individual Rounds">
          You can play solo rounds outside of a league. From My Leagues, tap <strong>Individual Round</strong> to set up a personal round with optional stat tracking.
        </Item>
      </Section>

      <Section title="GPS Yardage">
        <Item label="Using GPS">
          When GPS is enabled by your admin, the <strong>GPS</strong> tab shows your distance to the green (front, center, back) using your phone's location. Select the hole you're on from the dropdown.
        </Item>
        <Item label="Accuracy">
          GPS accuracy depends on your device and conditions. The app displays an accuracy indicator so you know how reliable the distance reading is.
        </Item>
      </Section>

      <Section title="Notifications">
        <Item label="Enabling Push Notifications">
          Go to <strong>Settings → Account</strong> and toggle on push notifications. Your browser will ask for permission — tap Allow. You'll receive notifications for round events even when the app isn't open.
        </Item>
        <Item label="Notification Categories">
          You can control which types of notifications you receive:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Round Alerts</strong> — Round start, finish, check-in closing warnings.</li>
            <li><strong>Score Alerts</strong> — Birdies, eagles, hole-in-ones, lead changes.</li>
            <li><strong>Greenie Alerts</strong> — Greenie winners on par 3s.</li>
            <li><strong>Admin Messages</strong> — Announcements, custom messages from admins.</li>
          </ul>
        </Item>
        <Item label="Quiet Hours">
          Your admin may set quiet hours (e.g., 10 PM – 7 AM) during which automatic notifications are suppressed. Admin-triggered messages like announcements still come through.
        </Item>
      </Section>

      <Section title="Account & Profile">
        <Item label="Your Profile">
          Your profile includes your display name, email, nickname (optional), and handicap. Your profile is shared across all leagues you join.
        </Item>
        <Item label="Nicknames">
          If you have a nickname set, it appears in quotes on your player card (e.g., Greg "The Legend" Peppers). Short names on the leaderboard and scoring grid use your nickname or first name.
        </Item>
        <Item label="Forgot Password">
          On the login screen, tap <strong>Forgot Password?</strong> and enter your email. You'll receive a reset link. After clicking it, you'll be prompted to set a new password.
        </Item>
        <Item label="Signing Out">
          Tap the league name in the header, then tap <strong>Sign Out</strong>. Or go to Settings → Account.
        </Item>
      </Section>

      <Section title="Casual Games">
        <Item label="Starting a Casual Game">
          From My Leagues, tap <strong>Casual Game</strong>. Add players, pick a format, and optionally enable side games like skins. Casual games are standalone — they don't affect league standings or handicaps.
        </Item>
        <Item label="Quick Skins">
          For a fast skins-only game, set up a casual game with skins enabled. Track hole-by-hole results without full team scoring.
        </Item>
      </Section>
    </>
  )
}

/* ================================
   ADMIN HELP CONTENT
   ================================ */
function AdminHelp() {
  return (
    <>
      <Section title="Admin Access" defaultOpen={true}>
        <Item label="Logging In as Admin">
          Go to <strong>Settings → Account</strong> and enter the admin PIN in the Admin Login section. Once logged in, you'll see an "Admin" badge in the header and unlock all admin features.
        </Item>
        <Item label="Roles">
          There are three roles:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Owner</strong> — Full control including league deletion and ownership transfer.</li>
            <li><strong>Admin</strong> — Can manage rounds, players, and most settings.</li>
            <li><strong>Player</strong> — Standard access (scoring, viewing).</li>
          </ul>
          Roles are managed in Settings → League → Member Management.
        </Item>
      </Section>

      <Section title="Running a Round">
        <Item label="1. Set Up Check-In">
          Go to the <strong>Check-In</strong> tab. Select which players are playing by toggling them on. You can also set pairing requests (players who want to be on the same team).
        </Item>
        <Item label="2. Choose a Format">
          Select the round's scoring format from the format picker. Options include Big Boys (default), Best Ball, Scramble, Retirees, Stroke, Stableford, Match Play, Skins, and more. Each format has its own scoring rules.
        </Item>
        <Item label="3. Generate Teams">
          Tap <strong>Generate Teams</strong> to create balanced teams using the A-B-C-D flight system. The algorithm considers handicaps, avoids recent repeat pairings, and respects pairing requests. You can also create manual teams.
        </Item>
        <Item label="4. Adjust Teams">
          On the <strong>Teams</strong> tab, you can:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Tap a player then tap a player on another team to <strong>swap</strong> them.</li>
            <li>Tap <strong>+ Add Player</strong> on a team to add a late arrival.</li>
            <li>Reorder teams using the move buttons.</li>
          </ul>
        </Item>
        <Item label="5. Start the Round">
          Tap <strong>Start Round</strong> on the Teams page. This locks the teams and activates live scoring. A push notification is sent to all league members.
        </Item>
        <Item label="6. Live Scoring">
          Scores can be entered by anyone (or restricted to teammates if scoring permissions are enabled). The leaderboard, skins, and side game trackers update in real time.
        </Item>
        <Item label="7. Finish the Round">
          When all scores are in, tap <strong>Finish Round</strong> on the Live tab. This calculates final standings, money settlements, updates handicaps, and records the round in history.
        </Item>
      </Section>

      <Section title="Team Generation">
        <Item label="Flight System">
          Players are sorted by handicap into A (best), B, C, and D (highest handicap) flights. Teams are built by picking one player from each flight to ensure balanced competition.
        </Item>
        <Item label="Recency Checks">
          The algorithm avoids putting the same players together in back-to-back rounds (or 3 of the last 5). If conflicts are unavoidable, it picks the least-conflict option.
        </Item>
        <Item label="Pairing Requests">
          Players can be paired together by setting pairing requests on the Check-In page. Requested pairs from the same flight are placed as a unit.
        </Item>
        <Item label="Manual Teams">
          For full control, create teams manually. Manual teams are exempt from recency checks.
        </Item>
        <Item label="3 vs 4 Player Teams">
          The algorithm fills all teams to 3 first, then adds 4th players to the weakest teams. Late additions can make 5-player teams if needed.
        </Item>
      </Section>

      <Section title="Scoring Formats">
        <Item label="Big Boys (Default)">
          Team format — on each hole, only under-par scores count. If nobody is under par, the best score counts. Total is relative to par.
        </Item>
        <Item label="Best Ball">
          Take the lowest individual score on each hole for the team total.
        </Item>
        <Item label="Scramble">
          All players hit, pick the best ball, all play from there. Repeat until holed out. Enter the team score for each hole.
        </Item>
        <Item label="Retirees">
          Best 2 of 4 scores per hole (or 2 of 3 with a bonus for 3-player teams).
        </Item>
        <Item label="Stroke / Stroke Net">
          Total individual strokes. Net version subtracts handicap strokes.
        </Item>
        <Item label="Stableford">
          Points-based: 0 for double bogey+, 1 for bogey, 2 for par, 3 for birdie, 4 for eagle, 5 for albatross/hole-in-one.
        </Item>
        <Item label="Match Play">
          Hole-by-hole head-to-head. Win the hole = 1 point. Used in Nassau side games.
        </Item>
        <Item label="Skins">
          Win a hole outright (no ties) to claim the skin. Ties carry over.
        </Item>
        <Item label="Per-Round Format Override">
          You can change the scoring format for a single round without changing the league default. Use the format selector on the Check-In page.
        </Item>
      </Section>

      <Section title="Player Management">
        <Item label="Adding Players">
          Go to <strong>Players</strong> tab → <strong>+ Add Player</strong>. Search for an existing profile to link, or create a new player. Choose the handicap source (profile, league, manual, or none).
        </Item>
        <Item label="Editing Players">
          Tap a player card and then the edit button. Change their name, nickname, handicap, tee preference, or active/inactive status.
        </Item>
        <Item label="Player Nicknames">
          Set a nickname in the edit modal. It shows in quotes on the player card and is used as the short name on leaderboards and scoring grids.
        </Item>
        <Item label="Duplicate Prevention">
          The app warns you if a player with the same linked profile is already in the roster.
        </Item>
      </Section>

      <Section title="League Settings">
        <Item label="Settings Categories">
          Settings are organized into 6 categories:
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>Account</strong> — Sign in/out, admin login, notifications</li>
            <li><strong>Game Setup</strong> — Announcements, scoring rules, side games, permissions, notifications</li>
            <li><strong>League</strong> — League info, invites, members, join settings</li>
            <li><strong>Handicaps</strong> — Scope, mode, tees, caps, freeze periods</li>
            <li><strong>Payouts & Pots</strong> — Payout amounts, greenie carryover, HIO pot</li>
            <li><strong>Admin Tools</strong> — GPS toggle, audit log, course mapping (site owner only)</li>
          </ol>
        </Item>
      </Section>

      <Section title="Handicap Configuration">
        <Item label="Handicap Scope">
          Choose which rounds count toward handicap calculation:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>True</strong> — All rounds from all sources</li>
            <li><strong>Gunpowder</strong> — Only rounds played through the app</li>
            <li><strong>League</strong> — Only rounds within the current league</li>
          </ul>
        </Item>
        <Item label="Course Tees">
          Configure rating and slope for each tee (Gold, Blue, Red) in Settings → Handicaps. These values affect course handicap calculations.
        </Item>
        <Item label="Max Handicap Cap">
          Set a maximum handicap index. Players above the cap are capped at this value.
        </Item>
        <Item label="Freeze Period">
          Lock handicaps for a set period (e.g., during playoffs). Players keep their handicap from the freeze start date.
        </Item>
        <Item label="Cross-League Sources">
          Pull rounds from other leagues into handicap calculation. Choose "All" for all rounds or "Selected" to pick specific leagues.
        </Item>
        <Item label="GHIN Override">
          Players can have a GHIN index entered manually that overrides the calculated handicap.
        </Item>
      </Section>

      <Section title="Payouts & Money">
        <Item label="Payout Format">
          Configure how much each position pays out in Settings → Payouts: greenie per hole, front 9 winner, back 9 winner, and overall winner.
        </Item>
        <Item label="Greenie Carryover">
          Configure what happens to unclaimed greenies:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li><strong>When some greenies won</strong> — Leftover goes to last winner, first winner, split among winners, or HIO pot.</li>
            <li><strong>When no greenies won</strong> — Entire pot goes to HIO pot, splits evenly, or carries to next round.</li>
          </ul>
        </Item>
        <Item label="Hole-in-One Pot">
          A running pot that accumulates greenie carryover. Paid out when someone hits a hole-in-one.
        </Item>
      </Section>

      <Section title="Push Notifications">
        <Item label="Automatic Triggers">
          The app sends notifications automatically for:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Round started / finished</li>
            <li>Birdie, eagle, and hole-in-one (with custom messages if configured)</li>
            <li>Team takes the lead</li>
            <li>Greenie finalized</li>
          </ul>
        </Item>
        <Item label="Check-In Closing Warning">
          On the Check-In page, tap the clock icon to send a "Check-in closes in X minutes" warning. Choose from 1, 5, 10, 15, or 30 minutes.
        </Item>
        <Item label="Round Announcement">
          In Settings → Game Setup → Next Round Announcement, set the date/time/message then tap <strong>Notify Members</strong> to push it out.
        </Item>
        <Item label="Custom Notification">
          In Settings → Game Setup → Send Notification, type a custom message and send it to all league subscribers.
        </Item>
        <Item label="Custom Player Notifications (Trash Talk)">
          In Settings → Game Setup → Custom Player Notifications, set up personalized messages for specific players when they hit certain scores (birdie, eagle, bogey, etc.). Messages are picked randomly and can use {'{player}'} and {'{hole}'} placeholders.
        </Item>
        <Item label="Quiet Hours">
          In Settings → Game Setup → Quiet Hours, set a time range (e.g., 10 PM – 7 AM) when automatic notifications are suppressed. Admin-triggered messages still go through.
        </Item>
      </Section>

      <Section title="League Management">
        <Item label="Invite Players">
          In Settings → League → Invite, you can:
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Copy the invite link</li>
            <li>Download a QR code</li>
            <li>Copy a pre-formatted invite message to paste in a group chat</li>
          </ul>
        </Item>
        <Item label="Approve Join Requests">
          If approval is required, pending requests appear in Settings → League. Approve or deny each one.
        </Item>
        <Item label="Member Management">
          In Settings → League → Members, view all players with their linked/unlinked status. Change roles or remove members. Use filter tabs (All/Linked/Unlinked) and search to find players.
        </Item>
        <Item label="Join Settings">
          Control whether new members need admin approval and whether the league is public (browseable) or private (invite-only).
        </Item>
        <Item label="Ownership Transfer">
          League owners can initiate a transfer in Settings → League. There's a 7-day waiting period. If the league has co-owners, they must approve. The transfer can be cancelled during the waiting period.
        </Item>
        <Item label="Delete League">
          Only the league owner can delete a league. This is a soft delete — the data is preserved but the league is no longer accessible.
        </Item>
        <Item label="Test Leagues">
          Clone your league to a test league for experimentation. Test leagues strip profile links and are hidden from non-admin users. Notifications are suppressed in test leagues.
        </Item>
      </Section>

      <Section title="Manual Score Entry">
        <Item label="Manual Team Score">
          For formats like scramble where the team has one score, use "Manual Team Score." Choose "By 9" or "By Hole" mode. Enter scores as <strong>relative to par</strong> (e.g., -1, 0, +2), not gross strokes.
        </Item>
        <Item label="Manual Player Total">
          Use "Quick Score Entry" to enter a player's front 9 and back 9 totals without entering hole-by-hole. This counts as 18 holes for handicap purposes.
        </Item>
        <Item label="Bulk Score Import">
          Import scores for multiple players at once. Choose league round mode to count toward handicap, or casual mode. Select a tee for automatic rating/slope lookup.
        </Item>
      </Section>

      <Section title="Audit Log">
        <Item label="Viewing the Log">
          In Settings → Admin Tools → Audit Log, view a history of all admin actions: player edits, round starts/finishes, settings changes, role changes, and more. Search by keyword or filter by action type. The log keeps the most recent 200 entries.
        </Item>
      </Section>

      <Section title="Side Games Configuration">
        <Item label="Enabling Side Games">
          In Settings → Game Setup → Side Games, toggle skins, Nassau, and Wolf on or off. When enabled, their trackers appear during live rounds.
        </Item>
        <Item label="Nassau Settings">
          Nassau pairs are determined automatically based on team matchups. Players can press during the round to start additional bets.
        </Item>
        <Item label="Wolf Settings">
          Wolf uses a 4-player rotation. The wolf order rotates each hole. Options include blind wolf and lone wolf multipliers.
        </Item>
      </Section>
    </>
  )
}

/* ================================
   HELP PAGE
   ================================ */
function HelpPage() {
  const { isAdmin } = useLeague()
  const [activeTab, setActiveTab] = useState('players')

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Help</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Everything you need to know about using Gunpowder Golf.
      </p>

      <TabSelector active={activeTab} onChange={setActiveTab} />

      {activeTab === 'players' ? <PlayerHelp /> : <AdminHelp />}

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: '13px'
      }}>
        <div style={{ marginBottom: '4px' }}>Need more help?</div>
        <div>Contact your league admin or visit the Settings page.</div>
      </div>
    </div>
  )
}

export default HelpPage
