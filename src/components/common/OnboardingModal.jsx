import { useState } from 'react';

const STEPS = [
  {
    id: 1,
    emoji: '📍',
    title: 'Find a Spot',
    colour: 'teal',
    description:
      'Browse the interactive map to discover available parking bays near you. Tap any green marker to view details — capacity, pricing, and live availability — then hit "Reserve" to claim your spot.',
    tip: 'Use the location button to jump to your current position instantly.',
  },
  {
    id: 2,
    emoji: '⏱️',
    title: 'Reserve & Time',
    colour: 'indigo',
    description:
      'Pick your arrival date and how long you plan to stay. The app calculates the cost in real-time. You can book as little as 30 minutes or reserve for an entire day — flexibility is built in.',
    tip: 'Need extra time? Extend your booking directly from the Bookings tab.',
  },
  {
    id: 3,
    emoji: '💳',
    title: 'Easy Payment',
    colour: 'amber',
    description:
      'Pay securely via M-Pesa STK Push. Enter your Safaricom number, confirm the prompt on your phone, and your booking is locked in within seconds. No cash, no queues.',
    tip: 'Ensure your M-Pesa account has sufficient funds before confirming.',
  },
  {
    id: 4,
    emoji: '🧭',
    title: 'Navigate',
    colour: 'green',
    description:
      'Once booked, tap "Navigate" to open turn-by-turn directions to your parking bay. Show the attendant your unique QR code on arrival to check in — it\'s that simple.',
    tip: 'Your QR code lives in the Bookings tab, even offline.',
  },
];

const COLOUR_MAP = {
  teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',   text: 'text-teal-600 dark:text-teal-400',   dot: 'bg-teal-500',   ring: 'ring-teal-400',   btn: 'bg-teal-500 hover:bg-teal-600' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', ring: 'ring-indigo-400', btn: 'bg-indigo-500 hover:bg-indigo-600' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500',  ring: 'ring-amber-400',  btn: 'bg-amber-500 hover:bg-amber-600' },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500',  ring: 'ring-green-400',  btn: 'bg-green-500 hover:bg-green-600' },
};

export default function OnboardingModal({ onClose }) {
  const [current, setCurrent] = useState(0);
  const step   = STEPS[current];
  const colour = COLOUR_MAP[step.colour];
  const isLast = current === STEPS.length - 1;

  function next() {
    if (isLast) { onClose(); return; }
    setCurrent((c) => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ParkEase Kenya onboarding tutorial"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close tutorial"
          className="absolute top-4 right-4 z-10 w-8 h-8 min-h-0 rounded-full flex items-center justify-center bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Coloured hero area */}
        <div className={`${colour.bg} px-6 pt-10 pb-8 flex flex-col items-center text-center transition-colors duration-300`}>
          <div className="text-6xl mb-4 leading-none select-none">{step.emoji}</div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${colour.text}`}>
            Step {step.id} of {STEPS.length}
          </p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-0 leading-tight">
            {step.title}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {step.description}
          </p>

          {/* Tip block */}
          <div className="mt-4 flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
            <span className="text-base leading-none mt-0.5">💡</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.tip}</p>
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              id={`onboarding-dot-${i}`}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 min-h-0 ${
                i === current
                  ? `w-6 h-2 ${colour.dot}`
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 px-6 pb-6 pt-2">
          {current > 0 ? (
            <button
              id="onboarding-prev"
              onClick={prev}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-0"
            >
              Back
            </button>
          ) : (
            <button
              id="onboarding-skip"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-0"
            >
              Skip
            </button>
          )}
          <button
            id="onboarding-next"
            onClick={next}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 min-h-0 ${colour.btn}`}
          >
            {isLast ? '🎉 Get Started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
