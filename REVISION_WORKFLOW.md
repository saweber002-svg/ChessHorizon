# Chess Horizon Revision Workflow

This document establishes the professional workflow for handling future changes, feature additions, and maintenance tasks within the Chess Horizon project. Adhering to this process ensures consistency, performance, and the preservation of the project's immersive fantasy theme.

## The PIV Loop Mindset

All significant changes to the codebase must follow the **Plan → Implement → Validate** (PIV) loop. This structured approach minimizes technical debt and prevents regressions in the complex 3D and chess logic systems.

### 1. Analysis and Planning
Before modifying any code, conduct a thorough analysis of the request.
- **Identify Impact:** Determine which files, 3D components, or data layers will be affected.
- **Propose a Plan:** Create a clear proposal outlining the changes, potential risks, and estimated steps.
- **User Confirmation:** For non-trivial changes, wait for confirmation from the project lead before proceeding.

### 2. Implementation Standards
Implementation should prioritize clean, modular, and well-documented code.
- **Modular Design:** Keep 3D scene logic separate from UI components and chess state management.
- **Performance First:** Always consider the impact on 3D rendering and mobile responsiveness.
- **Immersive Theme:** Ensure all new features align with the "Clearing" kingdom aesthetic and fantasy narrative.
- **Chess Accuracy:** Maintain strict adherence to correct chess opening data and validation logic.

### 3. Validation and Documentation
Every change must be validated and documented to maintain the integrity of the project.
- **Manual Testing:** Verify changes across different devices and browsers, focusing on 3D performance.
- **Update Documentation:** Reflect all architectural or feature changes in the relevant `.md` files.
- **Code Comments:** Use clear, descriptive comments to explain complex logic, especially in 3D coordinate mapping and move validation.

## Workflow Summary Table

| Step | Action | Deliverable |
| :--- | :--- | :--- |
| **Analyze** | Read files, assess risks, and understand UX impact. | Internal Analysis |
| **Propose** | Draft a structured plan for the user. | `PLAN_*.md` or Message |
| **Implement** | Write clean, modular code following the plan. | Code Changes |
| **Validate** | Test functionality and performance. | Validation Report |
| **Document** | Update project docs and status. | Updated `.md` files |

## Handling 3D Atlas Revisions
When working with the 3D atlas, special care must be taken to maintain coordinate alignment.
- **Use the Debug Panel:** Leverage the built-in Atlas debug panel to tune marker positions.
- **Safe Extraction:** Prefer the `SafeTargetedKingdomExtractor` for identifying new node centers in updated GLB files.
- **Single Source of Truth:** All atlas tuning must be centralized in `ATLAS_CONFIG` within `src/data/mapLocations.ts`.
