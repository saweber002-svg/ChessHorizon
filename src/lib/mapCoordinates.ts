/** Convert 2D atlas percentages (0–100) to world-map 3D coordinates. */
const MAP_X_MIN = -254.75;
const MAP_X_MAX = 254.73;
const MAP_Z_MIN = -183.94;
const MAP_Z_MAX = 183.88;
const MAP_Y = 16;

export function percentToWorld3D(xPercent: number, yPercent: number): [number, number, number] {
  const x = MAP_X_MIN + (xPercent / 100) * (MAP_X_MAX - MAP_X_MIN);
  const z = MAP_Z_MAX - (yPercent / 100) * (MAP_Z_MAX - MAP_Z_MIN);
  return [x, MAP_Y, z];
}

export const MAP_BOUNDS = {
  center: [0, MAP_Y, 0] as [number, number, number],
  size: [MAP_X_MAX - MAP_X_MIN, 40, MAP_Z_MAX - MAP_Z_MIN] as [number, number, number],
};
