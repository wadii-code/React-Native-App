import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateState, backfillActivities } from './domain/schema';

/* The original todo-only save file. It is never deleted and never written to
 * again after migration, so an older build of the app would still find its
 * data exactly where it left it. */
const LEGACY_TASKS_KEY = '@tasks_v1';
const LEGACY_BACKUP_KEY = '@tasks_v1_backup';

const STATE_KEY = '@productivity_os_v2';
const THEME_KEY = '@theme_mode';

/**
 * Loads the unified state, migrating the legacy task list on first run.
 * Migration is additive: legacy tasks are copied forward, the raw legacy JSON
 * is backed up verbatim, and nothing is removed.
 */
export async function loadAppState() {
  let stateRaw = null;
  let legacyRaw = null;
  try {
    const pairs = await AsyncStorage.multiGet([STATE_KEY, LEGACY_TASKS_KEY]);
    for (const [key, value] of pairs) {
      if (key === STATE_KEY) stateRaw = value;
      if (key === LEGACY_TASKS_KEY) legacyRaw = value;
    }
  } catch {
    // fall through to defaults
  }

  let parsedState = null;
  let legacyTasks = null;
  try {
    parsedState = stateRaw ? JSON.parse(stateRaw) : null;
  } catch {
    parsedState = null;
  }
  try {
    legacyTasks = legacyRaw ? JSON.parse(legacyRaw) : null;
  } catch {
    legacyTasks = null;
  }

  const firstMigration = !parsedState && Array.isArray(legacyTasks);
  if (firstMigration) {
    try {
      const existingBackup = await AsyncStorage.getItem(LEGACY_BACKUP_KEY);
      if (!existingBackup) await AsyncStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw);
    } catch {
      // a missing backup must never block the app from starting
    }
  }

  let state = migrateState(parsedState, legacyTasks);
  if (firstMigration) state = backfillActivities(state);
  return { state, migrated: firstMigration };
}

export async function saveAppState(state) {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export async function exportStateJson(state) {
  return JSON.stringify(state, null, 2);
}

/* ----------------------------------------------------- legacy task access
 * Kept so any older code path (and the pre-migration backup flow) still works. */

export async function loadTasks() {
  try {
    const json = await AsyncStorage.getItem(LEGACY_TASKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(LEGACY_TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

/* ---------------------------------------------------------------- theme */

export async function loadTheme() {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
    return 'system';
  } catch {
    return 'system';
  }
}

export async function saveTheme(mode) {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {}
}
