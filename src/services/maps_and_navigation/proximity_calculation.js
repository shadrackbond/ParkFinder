// proximity_calculation.js
// Helpers to calculate driving distance and duration from the user
// to one or more parking spots, using the Google Maps JS Distance Matrix.

const PLACES_SCRIPT_ID = 'google-maps-places-script';

function ensureGoogleMapsLoaded(apiKey) {
	return new Promise((resolve) => {
		if (typeof window === 'undefined') {
			resolve();
			return;
		}

		if (window.google?.maps) {
			resolve();
			return;
		}

		const existing = document.getElementById(PLACES_SCRIPT_ID);
		if (existing) {
			if (window.google?.maps) {
				resolve();
			} else {
				existing.addEventListener('load', () => resolve());
			}
			return;
		}

		const script = document.createElement('script');
		script.id = PLACES_SCRIPT_ID;
		// Use the standard loader; no loading=async so DistanceMatrixService
		// and other constructor APIs are available in google.maps.
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		document.body.appendChild(script);
	});
}

// origin: { lat, lng }
// spots: array of parking objects that contain a location { lat, lng } and id
// Returns an object keyed by spot.id -> { distanceText, distanceValue, durationText, durationValue }
export async function calculateDrivingMetrics(origin, spots, apiKey) {
	if (!origin || !spots || spots.length === 0 || !apiKey) return {};

	await ensureGoogleMapsLoaded(apiKey);
	if (!window.google?.maps || !window.google.maps.DistanceMatrixService) {
		return {};
	}

	const validSpots = spots.filter(
		(spot) => spot.location && typeof spot.location.lat === 'number' && typeof spot.location.lng === 'number'
	);
	if (validSpots.length === 0) return {};

	const destinations = validSpots.map((spot) => ({ lat: spot.location.lat, lng: spot.location.lng }));

	const service = new window.google.maps.DistanceMatrixService();

	const response = await new Promise((resolve, reject) => {
		service.getDistanceMatrix(
			{
				origins: [origin],
				destinations,
				travelMode: window.google.maps.TravelMode.DRIVING,
				unitSystem: window.google.maps.UnitSystem.METRIC,
			},
			(result, status) => {
				if (status !== 'OK' || !result) {
					reject(new Error(`DistanceMatrix failed with status ${status}`));
				} else {
					resolve(result);
				}
			}
		);
	});

	const row = response.rows && response.rows[0];
	if (!row || !row.elements) return {};

	const metricsById = {};
	row.elements.forEach((el, index) => {
		const spot = validSpots[index];
		if (!spot || el.status !== 'OK') return;
		metricsById[spot.id] = {
			distanceText: el.distance?.text || null,
			distanceValue: el.distance?.value || null,
			durationText: el.duration?.text || null,
			durationValue: el.duration?.value || null,
		};
	});

	return metricsById;
}

