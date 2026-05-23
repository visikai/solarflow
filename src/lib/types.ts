export interface Location {
	name: string;
	latitude: number;
	longitude: number;
	timezone: string;
}

export interface SunEvents {
	date: Date;
	sunrise: Date;
	solarNoon: Date;
	sunset: Date;
	/** Sunrise on the calendar day after `date`. */
	nextSunrise: Date;
	/** Sunset on the calendar day before `date` (starts the pre-dawn night segment). */
	previousSunset: Date;
	polar: 'day' | 'night' | null;
}

export interface ScalingConfig {
	scaledSunriseHour: number;
	scaledSunsetHour: number;
}

export const DEFAULT_SCALING: ScalingConfig = {
	scaledSunriseHour: 6,
	scaledSunsetHour: 18
};
