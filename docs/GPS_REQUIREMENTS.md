# Course Mapping & GPS Yardage Tool - Requirements

## Overview
Build a Site Owner-only Course Mapping tool that allows me to map GPS coordinates for Gunpowder Golf Course while playing or anytime I'm at the course. The mapped data will power a GPS distance feature showing "X yards to green" from the player's current location.

---

## Access Control

### Site Owner (PIN: 3494)
- Separate from admin role - this is a level above admin
- Only the site owner can access the Course Mapping tool
- PIN entry required to access mapping functionality
- Consider adding a "Site Owner" button in Settings (hidden or subtle) that prompts for PIN
- Once authenticated, stays authenticated for the session (don't require PIN repeatedly)

### Access Levels

| Feature | Regular User | Admin | Site Owner (PIN: 3494) |
|---------|--------------|-------|------------------------|
| View GPS Yardages | ✅ | ✅ | ✅ |
| Course Mapping Tool | ❌ | ❌ | ✅ |
| Admin Features | ❌ | ✅ | ✅ |

### Site Owner Access UI
- In Settings, add a subtle link or icon (e.g., small 🔧 or "Advanced" at the bottom)
- Tapping it prompts: "Enter Site Owner PIN"
- Correct PIN (3494) → unlocks Course Mapping section
- Wrong PIN → "Invalid PIN" (no hints, no lockout needed for now)
- Optional: Remember site owner status in localStorage so you don't have to re-enter each visit

---

## Usage Modes

The mapping tool and GPS yardage feature should work in two modes:

### Mode 1: During a Live Round
- Auto-detect current hole from scoring context
- Mapping and GPS yardage integrated into the round experience
- Manual hole override always available

### Mode 2: Standalone (No Active Round)
- Accessible anytime from a dedicated "GPS" tab (visible to all users)
- Site Owner sees additional "Course Mapping" button/section within GPS tab
- Manual hole selection required (no auto-detection without live round)
- Useful for: practice rounds, walking the course, mapping before league starts

---

## Navigation

### Add a new "GPS" tab (visible to all users):
```
[Players] [Check-In] [Teams] [Live] [GPS] [History] [Settings]
```

### GPS Tab Contents

**For Regular Users & Admins:**
- GPS Yardage display (once course is mapped)
- Hole selector dropdown
- Distance to green (front/center/back if mapped)
- "No mapping data available" message if not yet mapped
- Toggle for "Simple View" (watch-friendly mode)

**For Site Owner (after PIN verified):**
- Everything above, PLUS:
- "📍 Course Mapping" button that opens mapping interface

---

## Watch-Friendly / Simple View Mode

Add a toggle in the GPS tab: "Simple View" or "Watch Mode"

### When enabled:
- **Extra-large fonts** (yardage number should be massive - 72px+)
- **Minimal UI** - hide everything except essentials
- **High contrast** colors for outdoor visibility
- **Big tap targets** for hole navigation (< Prev / Next >)
- **No scrolling required** - everything fits on one screen
- **Auto-refresh GPS** every 3-5 seconds (no manual refresh button needed)
- Remember the toggle preference in localStorage

### Simple View - GPS Mode:
```
┌─────────────────────────────────────┐
│            HOLE 7                   │
│                                     │
│                                     │
│             187                     │
│            YARDS                    │
│                                     │
│                                     │
│      Front: 181  |  Back: 193       │
│                                     │
│                                     │
│     [◀ PREV]         [NEXT ▶]       │
│                                     │
│          [Exit Simple View]         │
└─────────────────────────────────────┘
```

### Simple View - Quick Score Entry (optional enhancement):
```
┌─────────────────────────────────────┐
│         HOLE 7 • PAR 4              │
│                                     │
│                                     │
│              [ 5 ]                  │
│                                     │
│                                     │
│        [ − ]       [ + ]            │
│                                     │
│                                     │
│     [◀ PREV]         [NEXT ▶]       │
│                                     │
│     [GPS]              [Exit]       │
└─────────────────────────────────────┘
```

### Simple View Features:
- Swipe left/right to change holes (if easy to implement)
- Tap center area to toggle between GPS yardage and score entry
- Button to exit back to full view
- Works well on:
  - Wear OS watch browsers
  - Phones mounted on golf carts
  - Quick glances while playing

---

## Core Mapping Functionality

### 1. Mapping Interface

**Hole Selection:**
- If in a live round → default to current hole being scored
- If standalone → default to Hole 1 or last hole viewed
- Always show a **dropdown to manually select any hole (1-18)** - user can override at any time
- Large, prominent display of currently selected hole: "Mapping: HOLE 7"

**Point Types (show as expandable/collapsible sections):**

*Minimum Required (always visible):*
- Green Center

*Expanded Options (collapsed by default, toggle to show):*
- Green Front
- Green Back
- Tee Box (could have multiple: Blue, White, Gold, Red)
- Bunkers (allow multiple per hole)
- Water Hazards (allow multiple per hole)
- 150 Yard Marker
- 100 Yard Marker
- Layup/Landing Zone

### 2. Mapping Workflow
1. User selects hole (auto-detected or manual)
2. User selects point type (e.g., "Green Center")
3. User taps "Drop Pin" or "Save Current Location"
4. **Confirmation dialog appears:**
   - "Save this location as HOLE 7 - GREEN CENTER?"
   - Shows coordinates: 39.0849, -76.9196
   - Shows accuracy if available from GPS
   - [Cancel] [Save] buttons
5. On save, update progress indicator

### 3. Progress Tracking
- Visual checklist showing all 18 holes
- Status per hole:
  - ✅ Complete (green center mapped)
  - 🟡 Partial (some expanded points mapped, but not green center)
  - ⬜ Not started
- Progress bar: "6/18 holes mapped"
- Ability to see what's mapped per hole (tap hole to see details)

### 4. Edit/Delete Existing Points
- Tap any mapped hole to view its data points
- Edit button to re-map a point (stand at new location, save)
- Delete button with confirmation
- "Undo Last" button for quick mistake correction

### 5. Validation & Safeguards
- If a point is >300 yards from the previous hole's green, show warning: "This location seems far from Hole X. Are you sure this is Hole Y?"
- Prevent duplicate mappings without explicit confirmation: "Hole 7 Green Center already exists. Replace it?"
- Show GPS accuracy indicator (if phone provides it) - warn if accuracy is poor (>10 meters)

---

## Data Structure

Store in Supabase under the league data:

```javascript
courseMapping: {
  courseName: "Gunpowder Golf Course",
  lastUpdated: "2026-01-19T12:00:00Z",
  mappedBy: "siteOwner",
  holes: [
    {
      number: 1,
      greenCenter: { lat: 39.0849, lng: -76.9196, mappedAt: "2026-01-19T12:00:00Z" },
      greenFront: null,  // null until mapped
      greenBack: null,
      teeBoxes: [],      // array for multiple tees
      hazards: [],       // array of { type: "bunker"|"water", lat, lng, name? }
      markers: []        // array of { type: "150"|"100"|"layup", lat, lng }
    },
    // ... holes 2-18
  ]
}
```

---

## UI Layouts

### GPS Tab - Normal View (All Users):
```
┌─────────────────────────────────────┐
│  📍 GPS Yardage      [Simple View]  │
├─────────────────────────────────────┤
│  Hole: [ 7 ▼ ]                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │         187                 │    │
│  │     yards to center         │    │
│  │                             │    │
│  │   Front: 181  |  Back: 193  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  GPS Accuracy: ±3m ✓                │
│  Last updated: 2 sec ago            │
│                                     │
│  [🔄 Refresh Location]              │
│                                     │
│  ─────────────────────────────────  │
│  [📍 Course Mapping] ← Site Owner   │
└─────────────────────────────────────┘
```

### GPS Tab - Simple/Watch View:
```
┌─────────────────────────────────────┐
│            HOLE 7                   │
│                                     │
│             187                     │
│            YARDS                    │
│                                     │
│      Front: 181  |  Back: 193       │
│                                     │
│     [◀ PREV]         [NEXT ▶]       │
│                                     │
│          [Exit Simple View]         │
└─────────────────────────────────────┘
```

### Site Owner Access (in Settings - alternative entry point):
```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│  ... normal settings ...            │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [🔧 Site Owner]  ← subtle/small    │
└─────────────────────────────────────┘
```

### PIN Entry Dialog:
```
┌─────────────────────────────────────┐
│  Site Owner Access                  │
│                                     │
│  Enter PIN: [____]                  │
│                                     │
│  [Cancel]              [Submit]     │
└─────────────────────────────────────┘
```

### Main Mapping Screen (after PIN verified):
```
┌─────────────────────────────────────┐
│  📍 COURSE MAPPING                  │
├─────────────────────────────────────┤
│  Mode: [ Standalone ▼ ]             │
│  (or "Live Round - Hole 7" if active)│
│                                     │
│  Hole: [ 7 ▼ ]  ← dropdown override │
│                                     │
│  ┌─ Required ──────────────────┐    │
│  │ 🟢 Green Center    [Mapped] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─ Expanded ▼ ────────────────┐    │
│  │ ○ Green Front               │    │
│  │ ○ Green Back                │    │
│  │ ○ Tee Box                   │    │
│  │ + Add Hazard                │    │
│  │ + Add Marker                │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ 📍 Drop Pin at My Location ]     │
│                                     │
│  ── Progress ──────────────────     │
│  [■■■■■■□□□□□□□□□□□□] 6/18          │
│                                     │
│  [View All Mapped Points]           │
└─────────────────────────────────────┘
```

### Confirmation Dialog:
```
┌─────────────────────────────────────┐
│  Save this location as              │
│  HOLE 7 - GREEN CENTER?             │
│                                     │
│  📍 39.08492, -76.91961             │
│  Accuracy: ±3 meters ✓              │
│                                     │
│  [Cancel]              [✓ Save]     │
└─────────────────────────────────────┘
```

---

## GPS Distance Feature (For All Users)

### Availability:
- Works during live rounds OR standalone from GPS tab
- No login required to view yardages (if course is mapped)

### Features:
- Use browser Geolocation API to get user's current position
- Calculate distance to green center using Haversine formula
- Display: "187 yards to center"
- If front/back mapped: "181 front | 187 center | 193 back"
- Auto-detect current hole based on proximity to mapped points (optional enhancement)
- Manual hole selector always available
- Auto-refresh location every few seconds (with manual refresh button in normal view)

### When Course Not Mapped:
```
┌─────────────────────────────────────┐
│  📍 GPS Yardage                     │
├─────────────────────────────────────┤
│                                     │
│  Course mapping not available yet.  │
│                                     │
│  GPS yardages will appear here      │
│  once the course has been mapped.   │
│                                     │
└─────────────────────────────────────┘
```

---

## Technical Notes

- Use `navigator.geolocation.watchPosition()` for continuous updates in Simple View
- Use `getCurrentPosition()` with manual refresh in Normal View
- Request high accuracy: `{ enableHighAccuracy: true }`
- Haversine formula for distance calculation (returns yards)
- Store coordinates with 6 decimal precision (±0.1 meter accuracy)
- Cache course mapping data locally since it rarely changes
- Site Owner PIN (3494) can be hardcoded or stored in environment config
- GPS tab should work offline if mapping data is cached
- Simple View should prevent screen sleep if possible (`navigator.wakeLock` API)

---

## Security Note

- The PIN is basic obscurity, not true security - fine for this use case
- Don't expose the PIN in client-side code if possible (validate server-side or at least don't make it obvious)
- Mapping data itself is not sensitive - just the ability to edit it

---

## Future Expandability

Structure the code so it could potentially:
- Support multiple courses (not just Gunpowder)
- Export mapping data as JSON
- Import mapping data from file
- Share/publish mappings for other leagues to use
- Native Wear OS app that syncs with this data
- Apple Watch companion app
