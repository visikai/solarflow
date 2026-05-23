export class PolarSunError extends Error {
	constructor(message = 'Scaling is undefined during polar day or polar night') {
		super(message);
		this.name = 'PolarSunError';
	}
}

export class GeolocationDeniedError extends Error {
	constructor(message = 'Geolocation permission denied') {
		super(message);
		this.name = 'GeolocationDeniedError';
	}
}

export class GeolocationUnavailableError extends Error {
	constructor(message = 'Geolocation position unavailable') {
		super(message);
		this.name = 'GeolocationUnavailableError';
	}
}

export class GeolocationTimeoutError extends Error {
	constructor(message = 'Geolocation request timed out') {
		super(message);
		this.name = 'GeolocationTimeoutError';
	}
}

export class GeocodeNetworkError extends Error {
	constructor(message = 'Geocoding request failed') {
		super(message);
		this.name = 'GeocodeNetworkError';
	}
}
