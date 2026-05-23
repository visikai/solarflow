import {
	GeolocationDeniedError,
	GeolocationUnavailableError,
	GeolocationTimeoutError
} from './errors.js';
import { browserTimezone } from './timezone.js';
import type { Location } from './types.js';

const DEFAULT_OPTIONS: PositionOptions = {
	enableHighAccuracy: false,
	timeout: 10_000,
	maximumAge: 60_000
};

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			reject(new GeolocationUnavailableError());
			return;
		}

		navigator.geolocation.getCurrentPosition(
			resolve,
			(err) => {
				switch (err.code) {
					case 1: // PERMISSION_DENIED
						reject(new GeolocationDeniedError());
						break;
					case 2: // POSITION_UNAVAILABLE
						reject(new GeolocationUnavailableError());
						break;
					case 3: // TIMEOUT
						reject(new GeolocationTimeoutError());
						break;
					default:
						reject(new GeolocationUnavailableError());
				}
			},
			{ ...DEFAULT_OPTIONS, ...options }
		);
	});
}

/** Browser Geolocation API → `Location` using the device timezone (no tz-lookup). */
export async function getBrowserLocation(options?: PositionOptions): Promise<Location> {
	const { coords } = await getCurrentPosition(options);
	return {
		name: 'My location',
		latitude: coords.latitude,
		longitude: coords.longitude,
		timezone: browserTimezone()
	};
}
