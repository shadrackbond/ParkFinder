/**
 * notifications.js — App-wide notification helpers
 *
 * Provides small "ping" + optional browser notifications for key events
 * in the booking / payment / parking lifecycle.
 *
 * This module does NOT depend on React. You can:
 *  - Call the exported functions directly from services/components, and/or
 *  - Listen for the global `app:notification` CustomEvent in your UI layer
 *    to render toasts, banners, badges, etc.
 */

// ─── Config ────────────────────────────────────────────────────────────────

const DEFAULT_DURATION_MS = 5000;

// Gentle guard rails to avoid spamming users
const RATE_LIMIT_MS = 3000; // minimum gap for same logical notification
const BROWSER_NOTIFICATION_COOLDOWN_MS = 10000; // gap between browser popups

const NOTIFICATION_TYPES = {
	info: 'info',
	success: 'success',
	warning: 'warning',
	error: 'error',
};

// Keep lightweight, in‑memory tracking only (per tab)
const lastEmittedByKey = new Map();
let lastBrowserNotificationTime = 0;

// ─── Low‑level helpers (ping + browser Notification) ──────────────────────

function playPing(type = NOTIFICATION_TYPES.info) {
	try {
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) return;

		const ctx = new Ctx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);

		const now = ctx.currentTime;
		const baseFreq =
			type === NOTIFICATION_TYPES.success ? 880 :
			type === NOTIFICATION_TYPES.error ? 330 :
			type === NOTIFICATION_TYPES.warning ? 660 : 550;

		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.12);

		gain.gain.setValueAtTime(0.16, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

		osc.start(now);
		osc.stop(now + 0.4);
		osc.onended = () => ctx.close();
	} catch {
		// Audio not supported or user blocked it – fail silently.
	}
}

function maybeShowBrowserNotification(title, body, type) {
	if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

	const now = Date.now();
	if (now - lastBrowserNotificationTime < BROWSER_NOTIFICATION_COOLDOWN_MS) {
		// Too soon since the last browser popup – skip this one.
		return;
	}

	const show = () => {
		try {
			const icon =
				type === NOTIFICATION_TYPES.success
					? '/icons/success-96.png'
					: type === NOTIFICATION_TYPES.error
						? '/icons/error-96.png'
						: '/icons/info-96.png';
			new Notification(title, { body, icon });
			lastBrowserNotificationTime = Date.now();
		} catch {
			// Best-effort only.
		}
	};

	if (Notification.permission === 'granted') {
		show();
	} else if (Notification.permission === 'default') {
		Notification.requestPermission().then((perm) => {
			if (perm === 'granted') show();
		});
	}
}

function getDedupeKey(payload) {
	const baseKey = payload.key || 'generic';
	const meta = payload.meta || {};
	const instanceId =
		meta.bookingId ||
		meta.lotId ||
		meta.id ||
		'';
	// Include message so different messages for same booking are not merged.
	const msg = payload.message || '';
	return `${baseKey}:${instanceId}:${msg}`;
}

function shouldSuppressNotification(payload) {
	const now = Date.now();
	const dedupeKey = getDedupeKey(payload);
	const last = lastEmittedByKey.get(dedupeKey) || 0;
	if (now - last < RATE_LIMIT_MS) {
		return true;
	}
	lastEmittedByKey.set(dedupeKey, now);

	// Very lightweight pruning if this somehow grows large.
	if (lastEmittedByKey.size > 500) {
		lastEmittedByKey.clear();
	}

	return false;
}

function emitAppNotification({ key, title, message, type, meta }) {
	const payload = {
		key,
		title,
		message,
		type,
		meta: meta || {},
		timestamp: Date.now(),
	};

	// Gentle rate limiting so duplicate events in tight loops don't spam.
	if (shouldSuppressNotification(payload)) return;

	// Console for debugging during development.
	// eslint-disable-next-line no-console
	console.log('[Notification]', payload);

	if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
		window.dispatchEvent(new CustomEvent('app:notification', { detail: payload }));
	}

	playPing(type);
	maybeShowBrowserNotification(title, message, type);
}

// ─── Time helpers for booking-based reminders ─────────────────────────────

function getBookingStartDate(booking) {
	if (!booking) return null;
	const [year, month, day] = String(booking.date || '').split('-').map(Number);
	if (!year || !month || !day) return null;

	const [h, m] = String(booking.startTime || '00:00').split(':').map(Number);
	const d = new Date(year, month - 1, day, h || 0, m || 0, 0, 0);
	return d;
}

function scheduleAt(targetDate, cb) {
	const now = Date.now();
	const ts = targetDate?.getTime?.() ?? NaN;
	if (!Number.isFinite(ts)) return null;

	const delay = ts - now;
	if (delay <= 0) {
		// Already in the past — fire immediately instead of scheduling.
		cb();
		return null;
	}
	return setTimeout(cb, delay);
}

// ─── Public Notification Functions ────────────────────────────────────────

// 1) Booking lifecycle ------------------------------------------------------

export function notifyBookingCreated(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'booking_created',
		title: 'Parking booked',
		message: `Your booking at ${booking.lotName || 'the selected lot'} is being reserved.`,
		type: NOTIFICATION_TYPES.info,
		meta: { bookingId: booking.id, lotId: booking.lotId, date: booking.date },
	});
}

export function notifyBookingConfirmed(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'booking_confirmed',
		title: 'Booking confirmed',
		message: `Payment received. Your spot #${booking.spotNumber} is confirmed.`,
		type: NOTIFICATION_TYPES.success,
		meta: { bookingId: booking.id, lotId: booking.lotId },
	});
}

export function notifyBookingCancelled(booking, reason) {
	emitAppNotification({
		key: 'booking_cancelled',
		title: 'Booking cancelled',
		message: reason || 'Your booking has been cancelled.',
		type: NOTIFICATION_TYPES.warning,
		meta: { bookingId: booking?.id || null },
	});
}

export function notifyHistoryCleared(count) {
	if (!count) return;
	emitAppNotification({
		key: 'history_cleared',
		title: 'History cleared',
		message: `${count} past bookings were hidden from your history.`,
		type: NOTIFICATION_TYPES.info,
		meta: { count },
	});
}

// 2) Payment events ---------------------------------------------------------

export function notifyPaymentInitiated(amount) {
	emitAppNotification({
		key: 'payment_initiated',
		title: 'Payment initiated',
		message: `STK push sent. Approve KES ${amount} on your phone.`,
		type: NOTIFICATION_TYPES.info,
		meta: { amount },
	});
}

export function notifyPaymentSuccess(amount) {
	emitAppNotification({
		key: 'payment_success',
		title: 'Payment successful',
		message: `You paid KES ${amount}.`,
		type: NOTIFICATION_TYPES.success,
		meta: { amount },
	});
}

export function notifyPaymentFailed(reason) {
	emitAppNotification({
		key: 'payment_failed',
		title: 'Payment failed',
		message: reason || 'Payment failed or was cancelled. Please try again.',
		type: NOTIFICATION_TYPES.error,
	});
}

// 3) Check‑in / Check‑out + QR --------------------------------------------

export function notifyCheckInSuccess(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'checkin_success',
		title: 'Check‑in successful',
		message: `You are now checked into spot #${booking.spotNumber || ''}.`,
		type: NOTIFICATION_TYPES.success,
		meta: { bookingId: booking.id },
	});
}

export function notifyCheckOutSuccess(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'checkout_success',
		title: 'Check‑out successful',
		message: `Checked out of spot #${booking.spotNumber || ''}. Safe travels!`,
		type: NOTIFICATION_TYPES.success,
		meta: { bookingId: booking.id },
	});
}

export function notifyQrError(message) {
	emitAppNotification({
		key: 'qr_error',
		title: 'QR scan error',
		message: message || 'Could not validate that QR code.',
		type: NOTIFICATION_TYPES.error,
	});
}

// 4) Time‑based reminders ---------------------------------------------------

/**
 * Schedule a reminder N minutes before the booking start time.
 * Returns a timeout ID you can clear with clearTimeout().
 */
export function schedulePreCheckInNotification(booking, minutesBefore = 15) {
	const start = getBookingStartDate(booking);
	if (!start) return null;

	const target = new Date(start.getTime() - minutesBefore * 60 * 1000);
	return scheduleAt(target, () => {
		emitAppNotification({
			key: 'pre_checkin',
			title: 'Upcoming parking session',
			message: `You have a booking starting in ${minutesBefore} minutes.`,
			type: NOTIFICATION_TYPES.info,
			meta: { bookingId: booking.id },
		});
	});
}

/**
 * Simple reminder close to the booking end time (e.g. to avoid overstay).
 */
export function schedulePreCheckoutNotification(booking, minutesBeforeEnd = 10) {
	if (!booking || !booking.endTime) return null;

	const [year, month, day] = String(booking.date || '').split('-').map(Number);
	const [h, m] = String(booking.endTime || '00:00').split(':').map(Number);
	const end = new Date(year, month - 1, day, h || 0, m || 0, 0, 0);

	const target = new Date(end.getTime() - minutesBeforeEnd * 60 * 1000);
	return scheduleAt(target, () => {
		emitAppNotification({
			key: 'pre_checkout',
			title: 'Session ending soon',
			message: `Your parking session ends in ${minutesBeforeEnd} minutes.`,
			type: NOTIFICATION_TYPES.warning,
			meta: { bookingId: booking.id },
		});
	});
}

// 5) Provider‑side events ---------------------------------------------------

export function notifyProviderNewBooking(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'provider_new_booking',
		title: 'New booking received',
		message: `New booking for spot #${booking.spotNumber || ''} at your lot.`,
		type: NOTIFICATION_TYPES.info,
		meta: { bookingId: booking.id, lotId: booking.lotId },
	});
}

export function notifyProviderOverstay(booking) {
	if (!booking) return;
	emitAppNotification({
		key: 'provider_overstay',
		title: 'Overstay detected',
		message: `Booking ${booking.id} is past its end time.`,
		type: NOTIFICATION_TYPES.warning,
		meta: { bookingId: booking.id },
	});
}

// 6) Generic error / info ---------------------------------------------------

export function notifySystemError(message) {
	emitAppNotification({
		key: 'system_error',
		title: 'Something went wrong',
		message: message || 'An unexpected error occurred. Please try again.',
		type: NOTIFICATION_TYPES.error,
	});
}

export function notifyInfo(title, message, meta) {
	emitAppNotification({
		key: 'info',
		title,
		message,
		type: NOTIFICATION_TYPES.info,
		meta,
	});
}

// Convenience: default export with all helpers in one object

const Notifications = {
	notifyBookingCreated,
	notifyBookingConfirmed,
	notifyBookingCancelled,
	notifyHistoryCleared,
	notifyPaymentInitiated,
	notifyPaymentSuccess,
	notifyPaymentFailed,
	notifyCheckInSuccess,
	notifyCheckOutSuccess,
	notifyQrError,
	schedulePreCheckInNotification,
	schedulePreCheckoutNotification,
	notifyProviderNewBooking,
	notifyProviderOverstay,
	notifySystemError,
	notifyInfo,
};

export default Notifications;

