/**
 * The story introduction video (scope §8; Scott's rulings, 2026-10-23).
 *
 * Shown UNSKIPPABLE on the player's first entry to the atlas; on end it
 * transitions into Italy's interior with only Giuoco Piano selectable.
 * It never re-triggers on entry; it can be rewatched (skippable) from
 * the Coaching Pavilion.
 *
 * SINGLE CONFIGURABLE SOURCE: Scott is finalizing the asset in
 * parallel — the final file drops in at public/video/intro.mp4 with no
 * code change. Until it lands, IntroVideo's load-error fallback keeps
 * entry un-blockable.
 */
export const INTRO_VIDEO_SRC = `${import.meta.env.BASE_URL}video/intro.mp4`;
