import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	GeolocationDeniedError,
	GeolocationTimeoutError,
	GeolocationUnavailableError
} from './errors.js';
import { getBrowserLocation } from './geolocation.js';
import { browserTimezone } from './timezone.js';

/** W3C GeolocationPositionError codes (no DOM in Vitest node env). */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

type GeolocationMock = {
	getCurrentPosition: ReturnType<typeof vi.fn>;
};

function mockGeolocation(impl: GeolocationMock | undefined) {
	vi.stubGlobal('navigator', {
		geolocation: impl
	});
}

describe('getBrowserLocation', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('resolves to a Location from a successful fix', async () => {
		mockGeolocation({
			getCurrentPosition: vi.fn((success) => {
				success({
					coords: { latitude: 52.52, longitude: 13.405, accuracy: 10 }
				} as GeolocationPosition);
			})
		});

		await expect(getBrowserLocation()).resolves.toEqual({
			name: 'My location',
			latitude: 52.52,
			longitude: 13.405,
			timezone: browserTimezone()
		});
	});

	it('rejects with GeolocationDeniedError', async () => {
		mockGeolocation({
			getCurrentPosition: vi.fn((_success, error) => {
				error({ code: PERMISSION_DENIED } as GeolocationPositionError);
			})
		});

		await expect(getBrowserLocation()).rejects.toBeInstanceOf(GeolocationDeniedError);
	});

	it('rejects with GeolocationUnavailableError when API missing', async () => {
		mockGeolocation(undefined);

		await expect(getBrowserLocation()).rejects.toBeInstanceOf(GeolocationUnavailableError);
	});

	it('rejects with GeolocationTimeoutError', async () => {
		mockGeolocation({
			getCurrentPosition: vi.fn((_success, error) => {
				error({ code: TIMEOUT } as GeolocationPositionError);
			})
		});

		await expect(getBrowserLocation()).rejects.toBeInstanceOf(GeolocationTimeoutError);
	});

	it('rejects with GeolocationUnavailableError for position unavailable', async () => {
		mockGeolocation({
			getCurrentPosition: vi.fn((_success, error) => {
				error({ code: POSITION_UNAVAILABLE } as GeolocationPositionError);
			})
		});

		await expect(getBrowserLocation()).rejects.toBeInstanceOf(GeolocationUnavailableError);
	});
});
