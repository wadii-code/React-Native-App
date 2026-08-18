export function generateId(prefix) {
  const raw = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${raw}` : raw;
}
