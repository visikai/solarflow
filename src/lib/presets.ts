import type { Location } from './types.js';

/** Curated cities spanning latitudes and hemispheres (static IANA timezones). */
export const PRESETS: readonly Location[] = [
	{ name: 'Alert, Nunavut', latitude: 82.5018, longitude: -62.3481, timezone: 'America/Iqaluit' },
	{ name: 'Longyearbyen', latitude: 78.2232, longitude: 15.6267, timezone: 'Arctic/Longyearbyen' },
	{ name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' },
	{ name: 'Reykjavík', latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik' },
	{ name: 'Nuuk', latitude: 64.1835, longitude: -51.7216, timezone: 'America/Godthab' },
	{ name: 'Anchorage', latitude: 61.2181, longitude: -149.9003, timezone: 'America/Anchorage' },
	{ name: 'Stockholm', latitude: 59.3293, longitude: 18.0686, timezone: 'Europe/Stockholm' },
	{ name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883, timezone: 'Europe/London' },
	{ name: 'Berlin', latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin' },
	{ name: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
	{ name: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
	{ name: 'Madrid', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
	{ name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
	{ name: 'Cairo', latitude: 30.0444, longitude: 31.2357, timezone: 'Africa/Cairo' },
	{ name: 'Honolulu', latitude: 21.3069, longitude: -157.8583, timezone: 'Pacific/Honolulu' },
	{ name: 'Mumbai', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Calcutta' },
	{ name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
	{ name: 'Lagos', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos' },
	{ name: 'Jakarta', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
	{ name: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
	{ name: 'Nairobi', latitude: -1.2921, longitude: 36.8219, timezone: 'Africa/Nairobi' },
	{ name: 'Quito', latitude: -0.1807, longitude: -78.4678, timezone: 'America/Guayaquil' },
	{ name: 'Lima', latitude: -12.0464, longitude: -77.0428, timezone: 'America/Lima' },
	{ name: 'São Paulo', latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo' },
	{ name: 'Cape Town', latitude: -33.9249, longitude: 18.4241, timezone: 'Africa/Johannesburg' },
	{ name: 'Perth', latitude: -31.9505, longitude: 115.8605, timezone: 'Australia/Perth' },
	{ name: 'Sydney', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
	{ name: 'Auckland', latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland' },
	{
		name: 'Ushuaia',
		latitude: -54.8019,
		longitude: -68.303,
		timezone: 'America/Argentina/Ushuaia'
	},
	{
		name: 'McMurdo Station',
		latitude: -77.846,
		longitude: 166.6683,
		timezone: 'Antarctica/McMurdo'
	}
] as const;
