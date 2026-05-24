export const SHOW_SEASON_MARKERS_KEY = 'solarflow.showSeasonMarkers.v1';

/** User preference for equinox/solstice lines on the year graph (default on). */
export function loadShowSeasonMarkers(): boolean {
	if (typeof localStorage === 'undefined') return true;

	try {
		const raw = localStorage.getItem(SHOW_SEASON_MARKERS_KEY);
		if (raw === '0' || raw === 'false') return false;
	} catch {
		// ignore storage errors
	}

	return true;
}

export function persistShowSeasonMarkers(show: boolean): void {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(SHOW_SEASON_MARKERS_KEY, show ? '1' : '0');
	} catch {
		// ignore storage errors
	}
}
