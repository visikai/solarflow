/** Parse `<input type="time">` value (HH:MM) to decimal hours. */
export function parseTimeInput(value: string): number {
	const [h, m] = value.split(':').map(Number);
	return h + (m || 0) / 60;
}

/** Format decimal hours for `<input type="time">` (HH:MM). */
export function formatTimeInput(decimalHours: number): string {
	const wrapped = ((decimalHours % 24) + 24) % 24;
	const totalMinutes = Math.round(wrapped * 60) % (24 * 60);
	const h = Math.floor(totalMinutes / 60);
	const m = totalMinutes % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
