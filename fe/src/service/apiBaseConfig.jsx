import { Capacitor } from '@capacitor/core';

const FE_ENV = import.meta.env.VITE_FE_ENV ?? 'development';
const isNative = Capacitor.isNativePlatform();

let API_BASE_URL = '';

if (FE_ENV === 'development') {
    // Local dev: different URLs for web vs Android emulator
    if (isNative) {
        API_BASE_URL = import.meta.env.VITE_API_BASE_DEV_MOBILE;
    } else {
        API_BASE_URL = import.meta.env.VITE_API_BASE_DEV_WEB;
    }
} else {
    API_BASE_URL = import.meta.env.VITE_API_BASE_PROD;
}

export { API_BASE_URL };
