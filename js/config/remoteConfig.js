const RULES = {
  gravity: ['GRAVITY', 1000, 3200], spawnInterval: ['SPAWN_INTERVAL', 2, 8],
  minimumSpawnInterval: ['MIN_SPAWN_INTERVAL', 1.8, 4], tossPowerMultiplier: ['TOSS_POWER_MULTIPLIER', 0.6, 1.3],
  comboWindow: ['COMBO_WINDOW', 0.6, 1.8], maxIngredientCount: ['MAX_INGREDIENTS', 10, 30, true]
};
export function validateRemoteConfig(remote, current) {
  const patch = {};
  if (!remote || typeof remote !== 'object') return patch;
  for (const name of Object.keys(RULES)) {
    const [key, min, max, integer] = RULES[name], value = remote[name];
    if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) patch[key] = value;
  }
  const spawn = patch.SPAWN_INTERVAL === undefined ? current.SPAWN_INTERVAL : patch.SPAWN_INTERVAL;
  const minimum = patch.MIN_SPAWN_INTERVAL === undefined ? current.MIN_SPAWN_INTERVAL : patch.MIN_SPAWN_INTERVAL;
  if (minimum > spawn) patch.MIN_SPAWN_INTERVAL = spawn;
  return patch;
}
