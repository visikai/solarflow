export class PolarSunError extends Error {
	constructor(message = 'Scaling is undefined during polar day or polar night') {
		super(message);
		this.name = 'PolarSunError';
	}
}
