import { env } from '$env/dynamic/public';

export type NotificationStatus = {
	configured: boolean;
	vapidPublicKey?: string;
	activeDeviceCount: number;
	currentDeviceSubscribed: boolean;
};

export type NotificationActionResult = {
	success: boolean;
	message: string;
	activeDeviceCount?: number;
	currentDeviceSubscribed?: boolean;
};

export type NotificationDeliverySummary = {
	success: boolean;
	message: string;
	totalDevices: number;
	successCount: number;
	failureCount: number;
	skippedCount?: number;
};

export type BroadcastSummary = {
	users: number;
	devices: number;
};

export type DeviceInfo = {
	browserName?: string;
	browserVersion?: string;
	osName?: string;
	isMobile: boolean;
};

const DEVICE_ID_KEY = 'scoutscluj-notification-device-id';

export const getApiBaseUrl = () => env.PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const notificationApiFetch = (path: string, init?: RequestInit) =>
	fetch(`${getApiBaseUrl()}${path}`, {
		...init,
		credentials: 'include',
		headers: {
			...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
			...init?.headers
		}
	});

export const isWebPushSupported = () =>
	'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const getOrCreateDeviceId = () => {
	let deviceId = localStorage.getItem(DEVICE_ID_KEY);
	if (!deviceId) {
		deviceId = crypto.randomUUID();
		localStorage.setItem(DEVICE_ID_KEY, deviceId);
	}

	return deviceId;
};

export const getDeviceInfo = (): DeviceInfo => {
	const userAgent = navigator.userAgent;
	const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent
	);
	const browserName = userAgent.includes('Firefox')
		? 'Firefox'
		: userAgent.includes('Edg')
			? 'Edge'
			: userAgent.includes('Chrome')
				? 'Chrome'
				: userAgent.includes('Safari')
					? 'Safari'
					: undefined;
	const osName = userAgent.includes('Android')
		? 'Android'
		: /iPhone|iPad|iPod/.test(userAgent)
			? 'iOS'
			: userAgent.includes('Windows')
				? 'Windows'
				: userAgent.includes('Mac')
					? 'macOS'
					: userAgent.includes('Linux')
						? 'Linux'
						: undefined;

	return { browserName, osName, isMobile };
};

export const urlBase64ToUint8Array = (base64String: string) => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; i += 1) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
};

export const readApiMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: string | string[]; error?: string };
		if (Array.isArray(body.message)) {
			return body.message.join(' ');
		}

		return body.message ?? body.error ?? 'Operațiunea nu a reușit.';
	} catch {
		return 'Operațiunea nu a reușit.';
	}
};
