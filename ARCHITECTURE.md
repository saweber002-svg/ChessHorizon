# Chess Horizon Architecture

This document provides a comprehensive overview of the high-level architecture, data flow, and core components of the Chess Horizon opening trainer. The application is designed to merge serious chess study with an immersive fantasy narrative, utilizing modern web technologies to deliver a high-performance 3D experience.

## Core Philosophy and Technology Stack

Chess Horizon is built as a **frontend-first React application**, prioritizing immediate responsiveness and immersive 3D visuals. The architecture is centered around a static site model that can be easily deployed to modern edge hosting platforms like Vercel or Netlify. While the core experience is functional entirely client-side, it supports optional backend synchronization through Supabase for users who wish to persist their progress across multiple devices.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 19 + Vite | Core application structure and build pipeline |
| **Language** | TypeScript | Type safety and maintainable codebase |
| **3D Engine** | Three.js + R3F | Rendering the immersive fantasy world atlas |
| **Chess Logic** | chess.js | Move validation and game state management |
| **Styling** | Tailwind CSS | Utility-first responsive design and components |
| **State** | React Context API | Managing progress, authentication, and user settings |

## The 3D Atlas and Coordinate System

The centerpiece of the user experience is the **3D World Map**, implemented in `src/pages/WorldMap.tsx`. This component serves as the primary navigation hub, where players explore a fantasy representation of Europe. The 3D scene is powered by React Three Fiber and utilizes a complex coordinate mapping system to ensure that interactive markers align perfectly with the underlying geometry of the `world-atlas.glb` model.

The marker placement logic employs a hybrid approach. It first attempts to **live extract** coordinates by traversing the GLB scene graph for specific named nodes, such as "Italy" or "Spain". If live extraction is disabled or fails, the system falls back to **manual overrides** defined in `src/data/mapLocations.ts`. For older assets, a legacy percent-based coordinate system remains available to ensure backward compatibility. This multi-layered approach guarantees that markers remain accurately positioned even as the underlying 3D models are refined.

## Opening Drills and Progression Logic

The educational heart of the app lies in its opening and drill system. All drill data is stored as static JSON files in the `public/drill-data/` directory, which are fetched on-demand by the `drillLoader.ts` utility. This loader normalizes various JSON formats into standardized `DrillPack` and `DrillLine` interfaces, allowing the `DrillSession.tsx` player to handle both main-line opening variations and specialized tactical puzzles through a unified interface.

To ensure a smooth transition between different drill types (e.g., from a main-line completion to a tactical pack), `DrillSession.tsx` implements an explicit state-reset hook that clears move history, star ratings, and completion status whenever the `drillFileId` changes. This prevents UI "ghosting" where a completed screen from a previous drill might persist into a new session. Additionally, the tactical practice loop is managed by an internal `selectTactic` handler that allows jumping between puzzles within the same pack without re-triggering a full page navigation.

| Component | Responsibility |
| :--- | :--- |
| **DrillRegistry** | Catalogs all available drill files and their metadata |
| **DrillLoader** | Handles asynchronous fetching and normalization of drill data |
| **ChessBoard** | An interactive component for move input and visual feedback |
| **ProgressContext** | Tracks mastered moves, star counts, and daily streaks |

User progression is gamified through a **Prestige System** that tracks mastery at both the move and variation level. Following a streak-based model, players earn prestige tiers—ranging from **Novice** to **Master**—by achieving consecutive 3-star completions on specific moves. This progression is managed by the `ProgressContext`, which persists data to LocalStorage and synchronizes with Supabase. The **Trophy Board** (available in both 2D and 3D) serves as a visual gallery of these achievements, showcasing variation mastery and earned prestige badges.
