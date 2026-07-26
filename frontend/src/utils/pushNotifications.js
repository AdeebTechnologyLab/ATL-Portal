import api from '../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Base64 to Uint8Array converter required by VAPID specifications
 */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

/**
 * Request notification permissions and subscribe to push service
 */
export const subscribeToPushNotifications = async () => {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications are not supported by the browser.');
            return false;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.warn('VITE_VAPID_PUBLIC_KEY is not defined in environment.');
            return false;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission not granted.');
            return false;
        }

        // Register service worker if not already registered
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Wait until service worker is active
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            // Send existing subscription to backend just in case it's not saved
            await api.post('/user-notifications/subscribe', existingSubscription);
            return true;
        }

        // Subscribe new
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Send subscription to backend
        await api.post('/user-notifications/subscribe', subscription);
        console.log('Successfully subscribed to push notifications');

        return true;
    } catch (error) {
        console.error('Error in push notification subscription:', error);
        return false;
    }
};

