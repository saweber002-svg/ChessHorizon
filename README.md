# Chess Horizon

## Immersive Gamified Chess Opening Trainer Web App

Chess Horizon is an immersive, story-driven web application designed to help players learn and practice chess openings through a gamified experience. Players navigate a 3D world map, unlock and practice openings tied to historical chess locations, and engage with a prestige system. The vision is to combine serious opening study with gamification and beautiful 3D visuals, making it feel premium and stream-friendly.

## Tech Stack

*   **Frontend Framework:** React.js (with Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with Shadcn UI components)
*   **3D Graphics:** Three.js, React Three Fiber, `@react-three/drei`
*   **Routing:** Wouter
*   **State Management:** React Context API
*   **Chess Logic:** `chess.js`
*   **Animations:** Framer Motion
*   **Optional Backend:** Supabase (for authentication and progress synchronization)

## Quick Start

To get the Chess Horizon app up and running locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd chess-horizon
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables (Optional):**
    If you plan to use Supabase for authentication and progress synchronization, create a `.env` file in the project root and add your Supabase credentials:
    ```
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```
    *Note: The application is designed to function without Supabase credentials, disabling auth and progress sync gracefully.*

4.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:3000` (or another port if 3000 is in use).

5.  **Build for Production:**
    ```bash
    npm run build
    ```
    This will create a `dist` directory containing the optimized production build of the application.

## Project Documentation

*   [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level architecture, data flow, and key components.
*   [FEATURES.md](./FEATURES.md) - Current implemented features versus planned features.
*   [DEPLOYMENT.md](./DEPLOYMENT.md) - Exact steps to build and deploy (local + production).
*   [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Snapshot of current state, recent content overhaul (3-4 move tactics), and next priorities.
*   [REVISION_WORKFLOW.md](./REVISION_WORKFLOW.md) - Documenting how to handle future changes.
