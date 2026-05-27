'use client';
import { useCallback, useEffect, useState } from 'react';
const DEFAULT_SETTINGS = {
    enabled: true,
    position: 'center',
};
const STORAGE_KEY = 'checklab-notification-settings';
const NOTIFICATION_SETTINGS_CHANGE_EVENT = 'checklab:notification-settings-change';
const SUPPORTED_NOTIFICATION_POSITIONS = new Set([
    'center',
    'top',
    'bottom-right',
    'bottom-right-small',
]);
export function useNotificationSettings() {
    const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        setSettingsState(readStoredNotificationSettings());
        setIsLoaded(true);
        const handleStorage = (event) => {
            if (event.key !== STORAGE_KEY) {
                return;
            }
            setSettingsState(sanitizeNotificationSettings(parseStoredSettings(event.newValue)));
        };
        const handleSettingsChange = (event) => {
            setSettingsState(sanitizeNotificationSettings(event.detail));
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener(NOTIFICATION_SETTINGS_CHANGE_EVENT, handleSettingsChange);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(NOTIFICATION_SETTINGS_CHANGE_EVENT, handleSettingsChange);
        };
    }, []);
    const updateSettings = useCallback((newSettings) => {
        setSettingsState((prev) => {
            const updated = sanitizeNotificationSettings({ ...prev, ...newSettings });
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            }
            catch (error) {
                console.warn('Failed to save notification settings:', error);
            }
            window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_CHANGE_EVENT, { detail: updated }));
            return updated;
        });
    }, []);
    return { settings, updateSettings, isLoaded };
}

function readStoredNotificationSettings() {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS;
    }
    return sanitizeNotificationSettings(parseStoredSettings(window.localStorage.getItem(STORAGE_KEY)));
}

function parseStoredSettings(value) {
    if (!value) {
        return DEFAULT_SETTINGS;
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        console.warn('Failed to load notification settings:', error);
        return DEFAULT_SETTINGS;
    }
}

function sanitizeNotificationSettings(settings) {
    const candidate = settings && typeof settings === 'object' ? settings : {};
    return {
        enabled: typeof candidate.enabled === 'boolean'
            ? candidate.enabled
            : DEFAULT_SETTINGS.enabled,
        position: SUPPORTED_NOTIFICATION_POSITIONS.has(candidate.position)
            ? candidate.position
            : DEFAULT_SETTINGS.position,
    };
}
