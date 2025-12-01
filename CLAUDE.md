# Pixology Project Context

## Overview
Pixology is a creative content generation platform with two main products: **StoryLab** and **GameLab**. Both use a multi-stage workflow approach to guide users through content creation.

## Products

### StoryLab
Marketing video generation workflow for creating promotional content.

**6-Stage Workflow:**
1. **Campaign Details** - Define campaign name, brand, and goals
2. **Personas** - Create/select target audience personas (supports real personas with photo uploads)
3. **Narratives** - AI-generated story narratives based on personas
4. **Storyboard** - Visual storyboard generation with scenes
5. **Screenplay** - Detailed screenplay with dialogue and directions
6. **Generate Video** - Final video generation and export

**Key Files:**
- `src/features/storylab/pages/StorylabPage.tsx` - Main page
- `src/features/storylab/components/WorkflowView.tsx` - Workflow navigation
- `src/features/storylab/components/stages/` - Stage components
- `api/products/storylab/` - Backend routes and services

### GameLab
Sports-focused content creation for generating team/player promotional materials.

**6-Stage Workflow:**
1. **Context Brief** (Setup Project) - Select home/away teams, context pills (Playoff Intensity, Rivalry, etc.), campaign goal
2. **Concept Gallery** (Generate Themes) - AI-generates visual themes in categories: Home Team, Away Team, Rivalry, Posed, Broadcast
3. **Casting Call** (Suggest Players) - AI recommends players for themes, user can customize selections
4. **High-Fidelity Capture** (Create Images) - Generate high-quality player images with themes
5. **Kinetic Activation** (Animate Videos) - Apply motion effects (Loop, Slow Zoom, Action Pan)
6. **Polish & Download** (Export) - Final export in ProRes 4444 or H.264

**Key Files:**
- `src/features/gamelab/pages/GameLabPage.tsx` - Main page with routing
- `src/features/gamelab/components/WorkflowView.tsx` - Workflow navigation
- `src/features/gamelab/components/stages/` - Stage components
- `src/features/gamelab/types/project.types.ts` - All type definitions
- `api/products/gamelab/` - Backend routes and services

### Team Management (GameLab Feature)
Manage sports teams and player rosters used in GameLab projects.

**Navigation:** Sports → Teams → Players

**Key Components:**
- `src/features/gamelab/components/team-management/TeamManagement.tsx` - Main container with navigation
- `src/features/gamelab/components/team-management/SportsListView.tsx` - List of sports
- `src/features/gamelab/components/team-management/TeamsListView.tsx` - Teams for a sport
- `src/features/gamelab/components/team-management/PlayersListView.tsx` - Players grid view
- `src/features/gamelab/components/team-management/EditPlayerPage.tsx` - Player edit page (extensible images)

**Player Image System (Extensible):**
Currently supports headshots, designed to support multiple image types:
- Headshots: straight, left, right profiles
- Medium shots (upper body)
- Long shots (full body)
- Action shots
- Jersey variants: home, away, alternate

**Types:** `src/shared/services/teamsService.ts` - Player, Team, Sport interfaces

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Node.js Express API
- **Database:** Firebase Firestore (separate DBs: pixology-storylab, pixology-gamelab)
- **Storage:** Google Cloud Storage (GCS) for assets
- **AI:** Gemini for text generation, Imagen for image generation

## Project Structure
```
src/
  features/
    storylab/     # StoryLab product
    gamelab/      # GameLab product
    landing/      # Landing page
    login/        # Authentication
  shared/
    components/   # Shared UI components
    services/     # API services
    contexts/     # React contexts (Auth)

api/
  products/
    storylab/     # StoryLab backend
    gamelab/      # GameLab backend
  core/           # Shared backend services
  services/       # Common services (AI, storage)
```

## Common Patterns
- Stage components receive project data and callbacks for updates
- Services use class-based pattern with auth token from sessionStorage
- Dark theme UI (#0a0a0a background, green-500 accent)
- Two-column layouts common for edit screens (content left, form right)
