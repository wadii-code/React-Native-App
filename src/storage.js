import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = '@tasks_v1';
const THEME_KEY = '@theme_mode';

export async function loadTasks() {
  try {
    const json = await AsyncStorage.getItem(TASKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

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
