# FlareLab Architecture Research Document

> **Version:** 1.0
> **Date:** January 2, 2026
> **Authors:** Product & Engineering Team
> **Status:** Research Complete - Ready for Architecture Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Personas & Roles](#user-personas--roles)
3. [Sports Hierarchy & Data Model](#sports-hierarchy--data-model)
4. [Campaign Types & Workflows](#campaign-types--workflows)
5. [Role-Based Access Control](#role-based-access-control)
6. [Content Deliverables](#content-deliverables)
7. [UI/UX Recommendations](#uiux-recommendations)
8. [Technical Architecture](#technical-architecture)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Appendix: Sports League Data](#appendix-sports-league-data)

---

## Executive Summary

### Current State
FlareLab currently supports a single campaign type: **Matchup** (Home Team vs Away Team). The data hierarchy is flat: `Sport → Team → Players`. This limits the platform's ability to serve diverse user types and campaign needs.

### Proposed Evolution
Transform FlareLab into a comprehensive **Sports Content Campaign Platform** that:
- Supports multiple campaign types (Matchup, Player Spotlight, Team Moments, Events, Broadcast)
- Implements proper sports hierarchy (Sport → League → Conference/Division → Team → Players)
- Provides role-based experiences for different user types
- Scales to support professional, college, and international sports

### Key Insights
1. **Matchup content is only ~30-40%** of what sports marketing teams actually produce
2. **Terminology differs significantly** between pro sports ("League") and college sports ("Conference")
3. **Most users work in ONE context** - either pro OR college, rarely both
4. **Broadcasters are the only cross-context users** and need the most flexible interface

---

## User Personas & Roles

### Primary User Types

| User Type | Organization Example | Primary Focus | Daily Content Volume |
|-----------|---------------------|---------------|---------------------|
| **Team Marketing** | Dallas Cowboys, LA Lakers | Their team's brand, players, fans | 50-100 assets/week |
| **League Office** | NFL HQ, NBA HQ | League-wide narratives, marquee matchups | 100-200 assets/week |
| **College Athletics** | Alabama Athletics, Ohio State | University brand, recruiting, multi-sport | 75-150 assets/week |
| **Conference Office** | SEC, Big Ten | Conference promotion, member teams | 50-100 assets/week |
| **Broadcaster** | ESPN, Fox Sports, NBC | Broadcast graphics, all sports coverage | 200-500 assets/week |
| **Agency** | Creative agencies | Client campaigns (any of above) | Varies by client |

### Detailed Persona Profiles

#### 1. Team Marketing Department
```
Role: Team Marketer
Organization: Single professional or college team
Examples: Dallas Cowboys Marketing, Lakers Digital Team

FOCUS:
- Their players only
- Home game promotion
- Fan engagement
- Ticket sales
- Merchandise

CONTENT TYPES:
- Game day hype (60%)
- Player spotlights (20%)
- Fan engagement (15%)
- Announcements (5%)

TONE: Team-centric, celebratory, "homer"

ACCESS NEEDS:
- Only their team's roster
- Only their brand assets
- Historical content library
```

#### 2. League Office
```
Role: League Marketing
Organization: Professional league headquarters
Examples: NFL Communications, NBA Marketing

FOCUS:
- League brand
- Marquee matchups (primetime games)
- Star players across all teams
- Playoff narratives
- Rule changes, initiatives

CONTENT TYPES:
- Matchup promotion (40%)
- Player features (25%)
- League events (20%)
- Announcements (15%)

TONE: Neutral, balanced, league-brand focused

ACCESS NEEDS:
- All teams in their league
- All players
- League branding assets
- Cross-team content
```

#### 3. College Athletics Department
```
Role: College Sports Marketing
Organization: University athletic department
Examples: Alabama Athletics, Michigan Sports

FOCUS:
- University brand (not just one sport)
- Multiple sports (football, basketball, baseball, etc.)
- Recruiting appeal
- Alumni engagement
- Academic-athletic balance

CONTENT TYPES:
- Game day (40%)
- Recruiting (20%)
- Multi-sport features (20%)
- Student-athlete stories (15%)
- Academic/graduation (5%)

TONE: School spirit, tradition, pride

ACCESS NEEDS:
- All sports at their university
- All student-athletes
- University branding
- Conference affiliations
```

#### 4. Broadcaster
```
Role: Broadcast Graphics/Marketing
Organization: TV network, streaming service
Examples: ESPN Graphics, Fox Sports Production

FOCUS:
- Broadcast-quality graphics
- Multiple sports/leagues daily
- Quick turnaround
- Template-based production
- Live game support

CONTENT TYPES:
- Pre-game packages (25%)
- In-game graphics (30%)
- Post-game (15%)
- Promotional (20%)
- Studio shows (10%)

TONE: Informative, exciting, balanced

ACCESS NEEDS:
- ALL leagues (pro and college)
- ALL teams
- ALL players
- Broadcast-specific templates
- Quick-access workflows
```

---

## Sports Hierarchy & Data Model

### The Terminology Problem

| Concept | Professional Sports | College Sports | International |
|---------|-------------------|----------------|---------------|
| **Governing Body** | The League (NFL, NBA) | NCAA | FIFA, UEFA |
| **Primary Organization** | League | Conference (SEC, Big Ten) | League (Premier League) |
| **Sub-grouping** | Conference (AFC/NFC) | Division (SEC East/West) | None (single table) |
| **Further Sub-group** | Division (AFC East) | None | None |
| **Team Grouping** | Division (4 teams) | Conference (14-18 teams) | League (20 teams) |

**Key Insight:** "Conference" means different things:
- **Pro Sports:** A sub-group within a league (AFC is part of NFL)
- **College Sports:** THE primary competitive organization (SEC is the organizing body)

### Proposed Data Hierarchy

```
Level (Pro/College/International)
└── Sport
    └── League (Pro) / Conference (College) / Competition (Intl)
        └── Conference (Pro only) / Division (College only)
            └── Division (Pro only)
                └── Team
                    └── Players
```

### Data Models

#### Sport
```typescript
interface Sport {
  id: string;                      // 'football', 'basketball', 'hockey'
  name: string;                    // 'Football', 'Basketball', 'Ice Hockey'
  icon: string;                    // Emoji or icon identifier
  type: 'team' | 'individual';     // Team sports vs Golf/Tennis/MMA

  // Available in these contexts
  levels: ('professional' | 'college' | 'international')[];
}
```

#### League
```typescript
interface League {
  id: string;                      // 'nfl', 'nba', 'sec', 'premier-league'
  sportId: string;

  name: string;                    // 'National Football League', 'Southeastern Conference'
  shortName: string;               // 'NFL', 'SEC'

  // Classification
  level: 'professional' | 'college' | 'international';
  country: string;                 // 'USA', 'UK', 'Global'

  // Structure type (affects UI rendering)
  structure: 'conference-division' | 'conference-only' | 'division-only' | 'single-table' | 'weight-class';

  // Terminology configuration (UI uses this)
  terminology: {
    primaryGrouping: string;       // 'Conference' for NFL, 'Division' for SEC, null for Premier League
    secondaryGrouping: string;     // 'Division' for NFL, null for SEC
  };

  // Metadata
  logo?: string;
  season: string;                  // '2025-26'
  teamsCount: number;
  playersCount: number;

  // For European soccer
  hasPromotionRelegation?: boolean;
  promotionSpots?: number;
  relegationSpots?: number;
}
```

#### Conference (For US Sports)
```typescript
interface Conference {
  id: string;                      // 'afc', 'nfc', 'eastern', 'western'
  leagueId: string;

  name: string;                    // 'American Football Conference'
  shortName: string;               // 'AFC'

  // Structure
  hasDivisions: boolean;
  divisions?: Division[];
  teams?: string[];                // Direct team refs if no divisions
}
```

#### Division
```typescript
interface Division {
  id: string;                      // 'afc-east', 'sec-east'
  conferenceId?: string;           // Optional - some leagues have divisions without conferences
  leagueId: string;

  name: string;                    // 'AFC East', 'SEC East'
  shortName: string;               // 'East'

  teams: string[];                 // Team IDs
}
```

#### Team (Enhanced)
```typescript
interface Team {
  teamId: string;

  // Hierarchy links
  sportId: string;
  leagueId: string;
  conferenceId?: string;
  divisionId?: string;

  // Identity
  name: string;                    // 'Patriots'
  fullName: string;                // 'New England Patriots'
  nickname?: string;               // 'Pats'

  // Location
  city: string;                    // 'Foxborough'
  market: string;                  // 'New England' (broadcast market name)
  state?: string;
  country: string;

  // College-specific
  university?: string;             // 'University of Alabama'
  mascot?: string;                 // 'Crimson Tide'

  // Abbreviation
  abbreviation: string;            // 'NE', 'ALA'

  // Branding
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };

  logo: {
    primary: string;               // Main logo URL
    alternate?: string;            // Secondary logo
    wordmark?: string;             // Text-based logo
  };

  jersey: {
    home: string;
    away: string;
    alternate?: string;
  };

  // Venue
  stadium: {
    name: string;
    capacity: number;
    location: string;
    surface?: string;              // 'Grass', 'Turf'
  };

  // Metadata
  founded: number;
  championships?: number;

  // Roster
  players: Player[];
}
```

#### Player (Enhanced)
```typescript
interface Player {
  playerId: string;
  teamId: string;

  // Identity
  name: string;
  firstName: string;
  lastName: string;

  // On-field
  jerseyNumber: string;
  position: string;
  positionGroup?: string;          // 'Offense', 'Defense', 'Special Teams'

  // Physical
  height?: string;
  weight?: number;

  // Background
  birthDate?: string;
  age?: number;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;

  // College (for pro players)
  college?: string;

  // Sport-specific
  shootsCatches?: string;          // Hockey
  bats?: string;                   // Baseball
  throws?: string;                 // Baseball

  // Images (extensible)
  images: {
    headshot?: string;             // Standard headshot
    headshotLeft?: string;         // Left profile
    headshotRight?: string;        // Right profile
    action?: string;               // Action shot
    posed?: string;                // Full body posed
    celebration?: string;          // Celebration shot
  };

  // Status
  status: 'active' | 'injured' | 'inactive' | 'retired';
  injuryStatus?: string;

  // Career highlights (for spotlights)
  careerHighlights?: {
    type: string;                  // 'All-Star', 'MVP', 'Championship'
    year: number;
    description: string;
  }[];
}
```

---

## Campaign Types & Workflows

### Campaign Categories Overview

| Category | Description | Current Support | Priority |
|----------|-------------|-----------------|----------|
| **Matchup** | Game day, Home vs Away | ✅ Implemented | - |
| **Player Spotlight** | Individual player focus | ❌ Not supported | High |
| **Team Moments** | Team celebrations, milestones | ❌ Not supported | High |
| **Events** | Draft, All-Star, Trade Deadline | ❌ Not supported | Medium |
| **Broadcast Packages** | TV/streaming graphics | ❌ Not supported | High (Revenue) |
| **Always-On** | Ongoing engagement content | ❌ Not supported | Medium |

### Detailed Campaign Type Specifications

#### 1. Matchup Campaigns (Current)

**Sub-types:**
| Type | Description | Context Needed |
|------|-------------|----------------|
| Regular Season | Standard game | Teams, Date, Time, Venue |
| Rivalry | Historic rivalry | Teams, Rivalry history, Series record |
| Playoff | Postseason | Teams, Series info, Stakes, Round |
| Championship | Finals/Super Bowl | Teams, Championship details |
| All-Star | Exhibition | Selected players, Event details |

**Workflow (7 stages):**
```
1. Context Brief
   - Select Home Team
   - Select Away Team
   - Add Context Pills (Rivalry, Playoff, Division, etc.)
   - Set Campaign Goal

2. Concept Gallery
   - AI generates themes based on both teams
   - Categories: Home Team, Away Team, Rivalry, Posed, Broadcast

3. Casting Call
   - Select players from both rosters
   - AI suggests key matchups

4. High-Fidelity Capture
   - Generate player composite images

5. Text Studio
   - Add text overlays
   - Stats, headlines, broadcast text

6. Kinetic Activation
   - Add motion/animation

7. Export
   - Multiple formats and sizes
```

#### 2. Player Spotlight Campaigns (NEW)

**Sub-types:**
| Type | Description | Context Needed |
|------|-------------|----------------|
| Player of Week/Month | Performance recognition | Player, Stats, Timeframe |
| Milestone | Career achievement | Player, Milestone (100 goals, 1000 points) |
| Award Winner | MVP, All-Star, ROTY | Player, Award, Season |
| New Signing | Contract/FA signing | Player, Contract details, Welcome message |
| Draft Pick | Rookie introduction | Player, Pick #, College, Position |
| Trade Welcome | Acquired player | Player, Previous team, Trade details |
| Return | Back from injury | Player, Injury context, Return timeline |
| Retirement | Career tribute | Player, Career stats, Highlights |
| Birthday | Personal celebration | Player, Fun facts, Career moments |

**Workflow (6 stages):**
```
1. Player Selection
   - Search/browse players
   - Select spotlight type

2. Spotlight Context
   - Add achievement details
   - Stats to highlight
   - Milestone specifics

3. Theme Generation
   - AI generates player-focused themes
   - Individual glory vs team context options

4. Image Generation
   - Player-centric compositions
   - Achievement-specific styling

5. Text Studio
   - Stats overlays
   - Achievement text
   - Quotes

6. Animation & Export
   - Motion effects
   - Multiple formats
```

#### 3. Team Moment Campaigns (NEW)

**Sub-types:**
| Type | Description | Context Needed |
|------|-------------|----------------|
| Season Kickoff | New season hype | Team, Season, Key storylines |
| Schedule Release | Full season reveal | Team, Schedule, Marquee games |
| Jersey Reveal | New uniform debut | Team, Jersey images, Design story |
| Playoff Clinch | Made playoffs | Team, Clinch scenario, Standings |
| Division Title | Won division | Team, Record, Key wins |
| Conference Title | Won conference | Team, Playoff path |
| Championship | Won it all! | Team, Finals recap, MVP |
| Franchise Milestone | Anniversary, records | Team, Historical context |
| Coaching/Staff | New hire, departure | Person, Role, Background |

**Workflow (6 stages):**
```
1. Team & Moment Selection
   - Select team
   - Select moment type

2. Moment Context
   - Details of achievement
   - Historical significance
   - Key contributors

3. Featured Players (Optional)
   - Select players to highlight
   - Or team-only content

4. Theme Generation
   - Celebration themes
   - Historical/legacy themes

5. Image & Text
   - Team compositions
   - Achievement graphics

6. Animation & Export
```

#### 4. Event Campaigns (NEW)

**Sub-types:**
| Type | Scope | Content Focus |
|------|-------|---------------|
| Draft Night | League-wide | All picks, trades, reactions |
| Free Agency | League-wide | Signings, tracker, analysis |
| Trade Deadline | League-wide | Trades, winners/losers |
| All-Star Weekend | League-wide | Skills competition, game, events |
| Awards Show | League-wide | All award winners |
| Rivalry Week | Conference (College) | Multiple rivalry matchups |
| Bowl Season | College Football | All bowl games |
| March Madness | College Basketball | Tournament bracket, games |

**Workflow (5 stages):**
```
1. Event Selection
   - Select event type
   - Set scope (full event vs specific moment)

2. Event Context
   - Date, location
   - Key storylines

3. Content Planning
   - What graphics needed
   - Template selection

4. Batch Generation
   - Generate multiple assets
   - Consistent styling

5. Review & Export
```

#### 5. Broadcast Package Campaigns (NEW)

**Sub-types:**
| Type | Usage | Key Deliverables |
|------|-------|------------------|
| Pre-Game Package | Before broadcast | Show open, matchup graphic, key storylines |
| In-Game Graphics | During broadcast | Lower thirds, player cards, stat displays |
| Halftime Package | Intermission | Stats recap, second half preview |
| Post-Game Package | After broadcast | Final score, player of game, recap |
| Weekly Show | Recap/Preview | Multiple matchups, standings, rankings |
| Studio Package | Analysis shows | Topic cards, debate graphics, stat displays |

**Workflow (5 stages):**
```
1. Package Type Selection
   - Select package type
   - Select game/event

2. Graphics Checklist
   - What graphics needed
   - Quantities
   - Specifications

3. Template Configuration
   - Select templates
   - Set parameters

4. Batch Generation
   - Generate all graphics
   - Consistent package styling

5. Review & Export
   - Broadcast-ready formats
   - Quick revisions
```

### Campaign Template Data Model

```typescript
interface CampaignTemplate {
  id: string;

  // Classification
  category: 'matchup' | 'player-spotlight' | 'team-moment' | 'event' | 'broadcast' | 'custom';
  type: string;                    // Specific type within category

  // Display
  name: string;
  description: string;
  icon: string;

  // Access control
  allowedRoles: UserRole[];
  allowedLevels: ('professional' | 'college' | 'international')[];

  // Workflow definition
  stages: StageDefinition[];

  // Required inputs
  requiredInputs: InputDefinition[];
  optionalInputs: InputDefinition[];

  // AI configuration
  themePromptTemplate: string;
  imagePromptOverrides?: Record<string, string>;

  // Output configuration
  defaultOutputFormats: OutputFormat[];
  recommendedAspectRatios: string[];
}

interface StageDefinition {
  id: string;
  name: string;
  description: string;
  order: number;
  component: string;               // React component name
  isRequired: boolean;
  canSkip: boolean;
}
```

---

## Role-Based Access Control

### Access Matrix

#### Campaign Type Access

| Campaign Type | Team | League | College | Conference | Broadcaster | Agency |
|---------------|------|--------|---------|------------|-------------|--------|
| **Matchup - Regular** | ✅ Home focus | ✅ Neutral | ✅ Home focus | ✅ Any member | ✅ Any | ✅ |
| **Matchup - Playoff** | ✅ Home focus | ✅ Neutral | ✅ Home focus | ✅ Any member | ✅ Any | ✅ |
| **Player - Milestone** | ✅ Own players | ✅ Any player | ✅ Own athletes | ✅ Member athletes | ✅ Any | ✅ |
| **Player - Draft** | ✅ Own picks | ✅ All picks | ❌ | ❌ | ✅ All | ✅ |
| **Team - Championship** | ✅ Own team | ✅ Any team | ✅ Own teams | ✅ Member teams | ✅ Any | ✅ |
| **Event - Draft** | ⚠️ Own picks only | ✅ Full access | ❌ | ❌ | ✅ Full | ✅ |
| **Event - All-Star** | ⚠️ Own players | ✅ Full access | ❌ | ❌ | ✅ Full | ✅ |
| **Broadcast Package** | ❌ | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ✅ Full | ✅ |

#### Data Access

| Data | Team | League | College | Conference | Broadcaster | Agency |
|------|------|--------|---------|------------|-------------|--------|
| **Sports** | Own sport | Own sport | All sports | Own sport | All sports | All |
| **Leagues** | Own league | Own league | NCAA only | Own conference | All leagues | All |
| **Teams** | Own team | All in league | Own school | All members | All teams | All |
| **Players** | Own roster | All in league | Own athletes | All member athletes | All players | All |
| **Historical Data** | Own team | League-wide | Own school | Conference-wide | All | All |

### User Scoping Implementation

```typescript
interface UserScope {
  userId: string;
  organizationId: string;

  // Role determines base permissions
  role: 'team' | 'league' | 'college' | 'conference' | 'broadcaster' | 'agency';

  // Specific access grants
  access: {
    // What levels they can see
    levels: ('professional' | 'college' | 'international')[];

    // Specific entities they can access
    sportIds: string[] | '*';
    leagueIds: string[] | '*';
    conferenceIds: string[] | '*';
    teamIds: string[] | '*';

    // Campaign types they can create
    campaignCategories: CampaignCategory[] | '*';
    campaignTypes: string[] | '*';
  };

  // UI customization
  defaultView: 'team' | 'league' | 'full';
  defaultLeagueId?: string;
  defaultTeamId?: string;
  favoriteTeams?: string[];
  recentProjects?: string[];
}
```

---

## Content Deliverables

### Output Formats by Platform

#### Social Media (70% of content)
| Platform | Formats | Aspect Ratios | Specs |
|----------|---------|---------------|-------|
| Instagram Feed | Static, Carousel, Video | 1:1, 4:5 | 1080x1080, 1080x1350 |
| Instagram Story/Reels | Video, Static | 9:16 | 1080x1920 |
| TikTok | Video | 9:16 | 1080x1920 |
| Twitter/X | Static, Video, GIF | 16:9, 1:1 | 1200x675, 1200x1200 |
| Facebook | Static, Video | 16:9, 1:1 | 1200x630, 1200x1200 |
| YouTube Thumbnail | Static | 16:9 | 1280x720 |
| LinkedIn | Static | 1.91:1, 1:1 | 1200x627, 1200x1200 |

#### Broadcast (20% of content) - High Value
| Type | Resolution | Format | Notes |
|------|------------|--------|-------|
| Full-screen graphic | 1920x1080, 3840x2160 | PNG, ProRes | Alpha channel support |
| Lower third | 1920x1080 | PNG sequence, ProRes | Transparent background |
| Score bug | Various | PNG, ProRes | Template-based |
| LED ribbon board | 1920x96 (varies) | Video, Image seq | Ultra-wide format |
| Jumbotron | 1280x720 to 4K | Video | Venue-specific |
| Ticker/Crawl | 1920x80 (varies) | Video, Image seq | Scrolling text |

#### Print/OOH (10% of content)
| Type | Resolution | Format | Notes |
|------|------------|--------|-------|
| Poster | 300 DPI, various sizes | PDF, TIFF | CMYK color |
| Billboard | 300 DPI, 14'x48' standard | PDF, TIFF | Large format |
| Banner | 150-300 DPI | PDF, PNG | Event signage |
| Program cover | 300 DPI, 8.5x11 typical | PDF | Print-ready |

### Export Configuration Model

```typescript
interface ExportConfiguration {
  id: string;
  name: string;

  // Platform/use case
  platform: 'instagram' | 'twitter' | 'tiktok' | 'broadcast' | 'print' | 'custom';
  useCase: string;

  // Specifications
  width: number;
  height: number;
  aspectRatio: string;

  // Format
  format: 'png' | 'jpg' | 'gif' | 'mp4' | 'mov' | 'prores' | 'pdf';
  quality: number;                 // 1-100 for lossy formats

  // Video-specific
  fps?: number;
  duration?: number;
  codec?: string;

  // Color
  colorSpace: 'srgb' | 'p3' | 'cmyk';
  hasAlpha: boolean;

  // Presets
  isDefault: boolean;
  isRecommendedFor: CampaignCategory[];
}
```

---

## UI/UX Recommendations

### Home Dashboard by Role

#### Team User Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ 🏈 Dallas Cowboys                                    [Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QUICK ACTIONS                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ + New        │ │ 📊 Roster    │ │ 📁 Asset     │             │
│  │   Campaign   │ │    Manager   │ │    Library   │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  UPCOMING GAMES                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Sun, Jan 5   vs Eagles (Rivalry)        [Create Content]│    │
│  │ Sun, Jan 12  @ Giants                   [Create Content]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  RECENT CAMPAIGNS                                                │
│  • Cowboys vs Commanders - Game Day (Dec 29)                    │
│  • Dak Prescott - Player of Week                                │
│  • Season Ticket Push - Q1                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Broadcaster Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ 📺 ESPN Graphics                                     [Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Pro Sports ▼]  [College Sports ▼]  [International ▼]         │
│                                                                  │
│  QUICK ACCESS                                                    │
│  NFL | NBA | NHL | MLB | NCAA FB | NCAA BB | Premier League     │
│                                                                  │
│  TODAY'S BROADCASTS                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1:00 PM  NFL: Cowboys @ Eagles    [Pre-Game Package]   │    │
│  │ 4:00 PM  NFL: Chiefs @ Raiders    [Pre-Game Package]   │    │
│  │ 8:00 PM  NBA: Lakers @ Celtics    [Pre-Game Package]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  RECENT PROJECTS                     TEMPLATES                   │
│  • Cowboys vs Eagles Pre-Game        • NFL Game Day Package     │
│  • Lakers vs Celtics In-Game         • NBA Broadcast Graphics   │
│  • College Football Playoff          • College FB Playoff       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Campaign Creation Flow

#### Step 1: Category Selection
```
┌─────────────────────────────────────────────────────────────────┐
│ + CREATE NEW CAMPAIGN                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What are you creating?                                         │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ ⚔️          │ │ 👤          │ │ 🏆          │                │
│  │ MATCHUP     │ │ PLAYER      │ │ TEAM        │                │
│  │             │ │ SPOTLIGHT   │ │ MOMENT      │                │
│  │ Game day    │ │ Milestones  │ │ Celebrations│                │
│  │ Home vs Away│ │ Awards      │ │ Achievements│                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ 📅          │ │ 📺          │ │ 🎨          │                │
│  │ EVENT       │ │ BROADCAST   │ │ CUSTOM      │                │
│  │             │ │ PACKAGE     │ │             │                │
│  │ Draft, Trade│ │ TV graphics │ │ Build your  │                │
│  │ Deadline    │ │ packages    │ │ own         │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 2: Type Selection (Example: Player Spotlight)
```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 PLAYER SPOTLIGHT                              [← Back]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What type of spotlight?                                        │
│                                                                  │
│  RECOGNITION                                                     │
│  ┌──────────────────┐ ┌──────────────────┐                      │
│  │ 🏅 MILESTONE     │ │ 🏆 AWARD         │                      │
│  │ 100th goal,      │ │ MVP, All-Star,   │                      │
│  │ career record    │ │ Player of Week   │                      │
│  └──────────────────┘ └──────────────────┘                      │
│                                                                  │
│  ROSTER MOVES                                                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ ✍️ NEW SIGNING   │ │ 📋 DRAFT PICK    │ │ 🔄 TRADE         │ │
│  │ Contract,        │ │ Rookie intro     │ │ Welcome to       │ │
│  │ extension        │ │                  │ │ the team         │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
│  SPECIAL                                                         │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ 💪 RETURN        │ │ 👋 RETIREMENT    │ │ 🎂 BIRTHDAY      │ │
│  │ Back from injury │ │ Career tribute   │ │ Celebration      │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Team Management Hierarchy View

```
┌─────────────────────────────────────────────────────────────────┐
│ TEAM MANAGEMENT                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [🔍 Search teams, players...]                                  │
│                                                                  │
│  📁 Football                                                     │
│  ├── 📁 NFL (32 teams)                                          │
│  │   ├── 📁 AFC                                                 │
│  │   │   ├── 📁 East                                            │
│  │   │   │   ├── 🏈 Buffalo Bills (53 players)                  │
│  │   │   │   ├── 🏈 Miami Dolphins (53 players)                 │
│  │   │   │   ├── 🏈 New England Patriots (53 players)           │
│  │   │   │   └── 🏈 New York Jets (53 players)                  │
│  │   │   ├── 📁 North                                           │
│  │   │   ├── 📁 South                                           │
│  │   │   └── 📁 West                                            │
│  │   └── 📁 NFC                                                 │
│  │       └── ...                                                │
│  └── 📁 NCAA FBS (134 teams)                                    │
│      ├── 📁 SEC                                                 │
│      │   ├── 📁 East                                            │
│      │   │   ├── 🏈 Georgia Bulldogs                            │
│      │   │   ├── 🏈 Florida Gators                              │
│      │   │   └── ...                                            │
│      │   └── 📁 West                                            │
│      ├── 📁 Big Ten                                             │
│      └── ...                                                    │
│                                                                  │
│  📁 Basketball                                                   │
│  ├── 📁 NBA (30 teams)                                          │
│  ├── 📁 WNBA (16 teams)                                         │
│  └── 📁 NCAA D1 (361 teams)                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Database Structure (Firestore)

```
flarelab-db/
│
├── sports/
│   └── {sportId}/
│       ├── name, icon, type, levels
│       └── leagues: [leagueId, ...]
│
├── leagues/
│   └── {leagueId}/
│       ├── sportId, name, shortName, level, structure
│       ├── terminology: { primaryGrouping, secondaryGrouping }
│       └── metadata: { season, teamsCount, logo }
│
├── conferences/
│   └── {conferenceId}/
│       ├── leagueId, name, shortName
│       └── divisions: [divisionId, ...]
│
├── divisions/
│   └── {divisionId}/
│       ├── leagueId, conferenceId, name, shortName
│       └── teams: [teamId, ...]
│
├── teams/
│   └── {teamId}/
│       ├── sportId, leagueId, conferenceId, divisionId
│       ├── name, fullName, city, market, abbreviation
│       ├── colors, logo, jersey, stadium
│       └── players/ (subcollection)
│           └── {playerId}/
│               └── [player data]
│
├── campaign_templates/
│   └── {templateId}/
│       ├── category, type, name, description
│       ├── stages: [StageDefinition, ...]
│       ├── allowedRoles, allowedLevels
│       └── promptTemplates: { ... }
│
├── projects/
│   └── {projectId}/
│       ├── userId, organizationId
│       ├── campaignCategory, campaignType, templateId
│       ├── context: { ... } (varies by campaign type)
│       ├── stages/ (subcollection)
│       └── assets/ (subcollection)
│
└── organizations/
    └── {organizationId}/
        ├── name, type, role
        ├── scope: { levels, sportIds, leagueIds, teamIds }
        └── users/ (subcollection)
```

### API Structure

```
/api/flarelab/
│
├── /sports
│   ├── GET /                     # List all sports
│   └── GET /:sportId             # Get sport details with leagues
│
├── /leagues
│   ├── GET /                     # List all leagues (with filters)
│   ├── GET /:leagueId            # Get league with conferences/divisions
│   └── GET /:leagueId/teams      # Get all teams in league
│
├── /teams
│   ├── GET /                     # Search/filter teams
│   ├── GET /:teamId              # Get team details
│   ├── GET /:teamId/players      # Get team roster
│   └── PUT /:teamId              # Update team
│
├── /players
│   ├── GET /                     # Search players
│   ├── GET /:playerId            # Get player details
│   └── PUT /:playerId            # Update player
│
├── /campaigns
│   ├── GET /templates            # Get available campaign templates
│   ├── GET /templates/:id        # Get specific template
│   └── POST /                    # Create new campaign
│
├── /projects
│   ├── GET /                     # List user's projects
│   ├── POST /                    # Create project
│   ├── GET /:projectId           # Get project
│   ├── PUT /:projectId           # Update project
│   └── DELETE /:projectId        # Delete project
│
└── /generation
    ├── POST /themes              # Generate themes for campaign
    ├── POST /images              # Generate images
    └── POST /animation           # Generate animations
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Establish new data hierarchy without breaking existing functionality

- [ ] Add League model and API endpoints
- [ ] Update Team model with league/conference/division links
- [ ] Create database migration scripts
- [ ] Seed data for major leagues (NFL, NBA, NHL, MLB)
- [ ] Update Team Management UI with league filter
- [ ] Add breadcrumb navigation: Sport → League → Conference → Division → Team

**Deliverables:**
- New data model in place
- Existing matchup campaigns still work
- Team management shows hierarchy

### Phase 2: User Scoping (Weeks 3-4)
**Goal:** Implement role-based access and scoped experiences

- [ ] Add organization and user scope models
- [ ] Implement role-based dashboard views
- [ ] Add organization onboarding flow
- [ ] Create scoped team/player pickers
- [ ] Update authentication to include role/scope

**Deliverables:**
- Different dashboards per user type
- Scoped data access working
- Onboarding flow for new organizations

### Phase 3: Player Spotlight Campaigns (Weeks 5-6)
**Goal:** Launch second campaign type

- [ ] Create campaign template system
- [ ] Implement Player Spotlight workflow
- [ ] Create player-focused theme prompts
- [ ] Build spotlight-specific stage components
- [ ] Add player search/selection UI

**Deliverables:**
- Player Spotlight campaigns fully functional
- Template system in place for future campaigns

### Phase 4: Team Moment Campaigns (Weeks 7-8)
**Goal:** Launch third campaign type

- [ ] Implement Team Moment workflow
- [ ] Create team-focused theme prompts
- [ ] Build moment-specific stage components
- [ ] Add celebration/milestone templates

**Deliverables:**
- Team Moment campaigns fully functional

### Phase 5: Broadcast Packages (Weeks 9-11)
**Goal:** High-value broadcast offering

- [ ] Implement Broadcast Package workflow
- [ ] Create broadcast-specific templates
- [ ] Add batch generation capability
- [ ] Implement broadcast export formats (ProRes, etc.)
- [ ] Build template-based quick generation

**Deliverables:**
- Broadcast packages for pre-game, in-game, post-game
- Broadcast-ready export formats

### Phase 6: Events & Polish (Weeks 12-14)
**Goal:** Complete campaign ecosystem

- [ ] Implement Event campaigns
- [ ] Add Always-On/engagement templates
- [ ] Performance optimization
- [ ] User feedback incorporation
- [ ] Documentation and training materials

**Deliverables:**
- All campaign types available
- Production-ready platform

---

## Appendix: Sports League Data

### Major Professional Leagues (USA)

| League | Sport | Teams | Structure | Season |
|--------|-------|-------|-----------|--------|
| NFL | Football | 32 | 2 conf × 4 div × 4 teams | Sept-Feb |
| NBA | Basketball | 30 | 2 conf × 3 div × 5 teams | Oct-June |
| NHL | Hockey | 32 | 2 conf × 2 div × 8 teams | Oct-June |
| MLB | Baseball | 30 | 2 leagues × 3 div × 5 teams | Mar-Oct |
| MLS | Soccer | 30 | 2 conf × 15 teams | Feb-Nov |
| WNBA | Basketball | 16 | 2 conf × 8 teams | May-Oct |
| NWSL | Soccer | 16 | Single table | Feb-Nov |

### Major College Conferences (Football)

| Conference | Teams | Division Structure |
|------------|-------|-------------------|
| SEC | 16 | East/West (phasing out) |
| Big Ten | 18 | East/West |
| ACC | 17 | Atlantic/Coastal |
| Big 12 | 16 | No divisions |
| Pac-12 | 8 | Rebuilding |

### International Leagues

| League | Sport | Country | Teams | Structure |
|--------|-------|---------|-------|-----------|
| Premier League | Soccer | England | 20 | Single table |
| La Liga | Soccer | Spain | 20 | Single table |
| Bundesliga | Soccer | Germany | 18 | Single table |
| Serie A | Soccer | Italy | 20 | Single table |
| Ligue 1 | Soccer | France | 20 | Single table |

### Individual Sports

| Tour/Organization | Sport | Events/Year |
|-------------------|-------|-------------|
| PGA Tour | Golf | 45+ |
| LPGA Tour | Golf | 33 |
| ATP Tour | Tennis | 64 |
| WTA Tour | Tennis | 55+ |
| UFC | MMA | 40+ events |
| NASCAR Cup | Racing | 36 races |
| Formula 1 | Racing | 24 GPs |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2, 2026 | Product & Eng | Initial research document |

---

## Next Steps

1. **Review this document** with the full team
2. **Prioritize phases** based on business needs
3. **Create detailed technical specs** for Phase 1
4. **Begin implementation** of foundation work

---

*This document serves as the architectural blueprint for FlareLab's evolution from a matchup-only tool to a comprehensive sports content campaign platform.*
