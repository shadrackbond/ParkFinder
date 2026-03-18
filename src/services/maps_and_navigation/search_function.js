// search_function.js
// Google Maps / Places helper utilities for search + nearby parking.

const PLACES_SCRIPT_ID = 'google-maps-places-script';

function loadGoogleMapsPlaces(apiKey) {
	return new Promise((resolve) => {
		if (typeof window === 'undefined') {
			resolve();
			return;
		}

		if (window.google?.maps?.places) {
			resolve();
			return;
		}

		const existing = document.getElementById(PLACES_SCRIPT_ID);
		if (existing) {
			if (window.google?.maps?.places) {
				resolve();
			} else {
				existing.addEventListener('load', () => resolve());
			}
			return;
		}

		const script = document.createElement('script');
		script.id = PLACES_SCRIPT_ID;
		// Use the standard loader; no loading=async to keep
		// constructor-based APIs like google.maps.Map stable.
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		document.body.appendChild(script);
	});
}

export async function initAutocompleteService(apiKey) {
	await loadGoogleMapsPlaces(apiKey);
	if (!window.google?.maps?.places) return null;
	return new window.google.maps.places.AutocompleteService();
}

export function fetchPlaceSuggestions(service, input, country = 'ke') {
	if (!service || !input.trim()) return Promise.resolve([]);

	return new Promise((resolve) => {
		service.getPlacePredictions(
			{ input, componentRestrictions: { country } },
			(predictions, status) => {
				if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
					resolve([]);
				} else {
					resolve(predictions);
				}
			}
		);
	});
}

export async function resolveDestinationAndNearbyParking(apiKey, suggestion) {
	await loadGoogleMapsPlaces(apiKey);
	if (!window.google?.maps?.places) return { destination: null, webParking: [] };

	const dummyMap = document.createElement('div');
	const service = new window.google.maps.places.PlacesService(dummyMap);

	const place = await new Promise((resolve) => {
		service.getDetails(
			{ placeId: suggestion.place_id, fields: ['geometry', 'name', 'formatted_address'] },
			(p, status) => {
				if (status !== window.google.maps.places.PlacesServiceStatus.OK || !p?.geometry?.location) {
					resolve(null);
				} else {
					resolve(p);
				}
			}
		);
	});

	if (!place) return { destination: null, webParking: [] };

	const loc = place.geometry.location;
	const destination = {
		lat: loc.lat(),
		lng: loc.lng(),
		name: place.name || suggestion.description,
		address: place.formatted_address || suggestion.description,
	};

	const nearbyService = new window.google.maps.places.PlacesService(dummyMap);

	const results = await new Promise((resolve) => {
		nearbyService.nearbySearch(
			{
				location: loc,
				radius: 1000,
				type: 'parking',
			},
			(res, status) => {
				if (status !== window.google.maps.places.PlacesServiceStatus.OK || !res) {
					resolve([]);
				} else {
					resolve(res);
				}
			}
		);
	});

	const webParking = results.map((r) => {
		const rLoc = r.geometry?.location;
		const primaryPhoto = r.photos && r.photos.length > 0
			? r.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 })
			: '';

		return {
			id: r.place_id,
			isExternal: true,
			name: r.name,
			address: r.vicinity || r.formatted_address || destination.address,
			imageUrl: primaryPhoto,
			lotImages: r.photos
				? r.photos.map((p) => p.getUrl({ maxWidth: 800, maxHeight: 600 }))
				: [],
			rating: r.rating || null,
			availableSpots: r.user_ratings_total || null,
			hourlyRate: null,
			location: rLoc ? { lat: rLoc.lat(), lng: rLoc.lng() } : null,
			googlePlaceId: r.place_id,
		};
	});

	return { destination, webParking };
}

export function buildExternalBookingUrl(spot) {
	if (!spot?.isExternal || !spot.location) return null;
	return `https://www.google.com/maps/dir/?api=1&destination=${spot.location.lat},${spot.location.lng}`;
}

