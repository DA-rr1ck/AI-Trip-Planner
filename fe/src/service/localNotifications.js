import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";

function hashToInt(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 1;
}

const NOTIF_ONCE_PREFIX = "notif_once:";
const TRIP_KEYS_PREFIX = "notif_keys:";

async function ensureLocalNotificationPermission() {
    if (!Capacitor.isNativePlatform()) return false;

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "granted") return true;

    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
}

async function rememberTripKey(tripId, key) {
    if (!tripId) return;

    const listKey = `${TRIP_KEYS_PREFIX}${tripId}`;
    const existing = await Preferences.get({ key: listKey });

    let keys = [];
    try {
        keys = existing.value ? JSON.parse(existing.value) : [];
        if (!Array.isArray(keys)) keys = [];
    } catch {
        keys = [];
    }

    if (!keys.includes(key)) {
        keys.push(key);
        await Preferences.set({ key: listKey, value: JSON.stringify(keys) });
    }
}

export async function notifyOnce({ key, title, body, extra = {} }) {
    if (!Capacitor.isNativePlatform()) return;

    const ok = await ensureLocalNotificationPermission();
    if (!ok) return;

    const storageKey = `${NOTIF_ONCE_PREFIX}${key}`;
    const seen = await Preferences.get({ key: storageKey });
    if (seen.value === "1") return;

    const id = hashToInt(key);

    await LocalNotifications.schedule({
        notifications: [
            {
                id,
                title,
                body,
                extra,
                schedule: { at: new Date(Date.now() + 250) },
            },
        ],
    });

    await Preferences.set({ key: storageKey, value: "1" });
    await rememberTripKey(extra?.tripId, key);
}

export async function clearTripNotificationFlags(tripId) {
    if (!Capacitor.isNativePlatform()) return;
    if (!tripId) return;

    const listKey = `${TRIP_KEYS_PREFIX}${tripId}`;
    const existing = await Preferences.get({ key: listKey });

    let keys = [];
    try {
        keys = existing.value ? JSON.parse(existing.value) : [];
        if (!Array.isArray(keys)) keys = [];
    } catch {
        keys = [];
    }

    for (const k of keys) {
        if (!k) continue;
        await Preferences.remove({ key: `${NOTIF_ONCE_PREFIX}${k}` });
    }

    await Preferences.remove({ key: listKey });
}
