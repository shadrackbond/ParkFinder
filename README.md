# ParkEase Kenya 🚗🇰🇪

**Smart Parking Made Simple** — A mobile-first web application that connects **drivers** looking for parking in Nairobi with **parking lot providers** who have available spaces.

---

## What Is ParkEase?

ParkEase Kenya solves a real problem: finding parking in Nairobi is stressful, time-consuming, and unpredictable. This app creates a marketplace where:

- **Customers** browse available parking lots, view photos & rates, book a spot, and pay via M-Pesa
- **Providers** (e.g. malls, office towers, private lots) list their parking facility, set pricing, and manage occupancy
- **Admins** approve new provider applications, manage users, and view platform analytics

Think of it like **Airbnb for parking** — but built specifically for Kenya, with M-Pesa integration and a mobile-first design.

---

## Who Is This For?

| Role | Description |
|------|-------------|
| 🚗 **Customers** | Drivers in Nairobi looking for available, affordable parking near their destination |
| 🏢 **Providers** | Buildings, malls, or private lot owners who want to list their parking spaces and earn revenue |
| 🔑 **Admins** | Platform managers who approve providers and monitor the system |

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | Frontend framework (component-based UI) |
| **Vite** | Dev server & build tool (fast hot reload) |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **Firebase Auth** | User authentication (email/password signup & login) |
| **Cloud Firestore** | NoSQL database (stores users, bookings, lot data) |
| **Zustand** | Lightweight state management (parking lot feed) |
| **React Router v6** | Client-side routing & role-based navigation |
| **Lucide React** | Icon library |
| **react-qr-code** | QR code generation for booking tickets |

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/           # AdminSidebar, ApprovalCard
│   ├── booking/         # BookingCard, QRTicket
│   ├── common/          # BottomNav, RoleRoute
│   ├── map/             # ParkingMap (placeholder)
│   └── provider/        # ProviderNav, LotCard
├── config/
│   └── firebase.js      # Firebase initialization
├── context/
│   └── AuthContext.jsx   # Auth state (login, signup, roles, profile)
├── hooks/               # Custom React hooks
│   ├── useBookings.js   # Fetches user bookings from Firestore
│   └── useParkingLots.js# Fetches parking lots from Firestore
├── pages/               # Full-page components (one per route)
│   ├── admin/           # AdminDashboard, ApprovalQueue, UserManager
│   ├── provider/        # ProviderDashboard, LotManager, QRScanner
│   ├── Home.jsx         # Customer home (browse parking lots)
│   ├── Bookings.jsx     # Customer bookings list
│   ├── Wallet.jsx       # Payment history (renamed to "History")
│   ├── Profile.jsx      # Profile + edit (works for all roles)
│   ├── Login.jsx        # Login / signup with role selection
│   └── ProviderRegister.jsx # Provider business registration
├── services/            # Backend logic / Firestore queries
│   ├── adminService.js  # Admin operations (approve, reject, stats)
│   ├── bookingService.js# Create, cancel, fetch bookings
│   ├── parkingService.js# Fetch parking lots from Firestore
│   ├── paymentService.js# M-Pesa integration (placeholder)
│   ├── qrService.js     # QR code generation & validation (placeholder)
│   └── userService.js   # User profile CRUD
└── store/
    └── useParkingStore.js # Zustand store for parking lot state
```

### How It Works (Data Flow)

1. **Auth**: `AuthContext.jsx` wraps the entire app. On signup, it creates a Firebase Auth user + a Firestore document in the `users` collection with their `role` (`customer` / `provider`) and `status` (`active` / `pending`)
2. **Routing**: `App.jsx` uses `RoleRoute` guards. Customers see customer pages, providers see provider pages, admins see admin pages. Wrong role = redirect
3. **Data**: Service files (`parkingService.js`, `bookingService.js`, etc.) query Firestore directly. Hooks (`useParkingLots`, `useBookings`) call services and manage loading/error state
4. **State**: `useParkingStore` (Zustand) holds the parking lot feed. Components subscribe for reactive updates

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** installed
- A **Firebase project** with Auth + Firestore enabled
- A `.env` file in the project root (see below)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_ORG/parkease-kenya.git
cd parkease-kenya

# 2. Install dependencies
npm install

# 3. Create your .env file (see Environment Variables below)

# 4. Start the dev server
npm run dev
```

The app runs at **http://localhost:5173**

### Environment Variables

Create a `.env` file in the project root with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> ⚠️ **Never commit `.env` to Git.** It's already in `.gitignore`. Ask the team lead for the Firebase credentials.

### Creating the Admin Account

1. Sign up in the app as a regular customer
2. Go to **Firebase Console → Firestore → `users` collection**
3. Find your user document and edit: `role` → `"admin"`, `status` → `"active"`
4. Log out and log back in

---

## What Has Been Done ✅

### 1. Full 3-Role Authentication System
- **Customer signup/login** with username, email, password
- **Provider signup** with business details (name, location, phone, contact name) and image upload
- **Provider approval workflow** — new providers land in "pending" state, admin must approve before their dashboard activates
- **Admin role** — set manually in Firestore, gets access to admin dashboard
- Username is stored as `displayName` via Firebase `updateProfile()` and used everywhere (never shows email)

### 2. Complete UI for All 3 Roles (Light Mode, Teal/Indigo Theme)
- **Customer pages**: Home (browse lots with image grids), Bookings, Payment History, Profile
- **Provider pages**: Dashboard (stats + lot preview), My Lot (setup/edit with multi-image gallery), QR Scanner, Profile
- **Admin pages**: Dashboard (real stats from Firestore), Approval Queue (approve/reject providers), User Manager (search + filter)
- **Mobile-first responsive design**: safe-area insets for iPhone notch, 44px touch targets, viewport-fit-cover

### 3. Dynamic Data (No Placeholders)
- **Home page** queries Firestore for active approved providers — shows their parking lots with all images in a mosaic grid
- **Bookings page** queries Firestore `bookings` collection — shows empty state when no bookings
- **Payment History** derives transactions from real bookings data
- **Admin Dashboard** counts real users, providers, pending approvals from Firestore

### 4. Provider Image Gallery
- Providers can upload up to **4 images** per lot via file upload or URL paste
- Images are compressed client-side (max 800px, JPEG 70%) and stored as `lotImages` array in Firestore
- Customer Home page displays all images in a mosaic grid (1 image = full, 2 = side-by-side, 3 = 1+2, 4 = 2×2)

### 5. What's NOT Yet Implemented (This Is Where You Come In)
All backend/logic service files have `// TODO (Teammate Hole)` comments marking exactly what needs to be built. The UI is ready — it just needs the logic wired up.

---

## Teammate Tasks 📋

Below are **8 tasks** that need to be completed. Each team member (we are 5 total, lead has done the above) should pick **2 tasks**. Each task is a self-contained piece of work.

---

### Task 1: 💳 M-Pesa Payment Integration
**File**: `src/services/paymentService.js`  
**Branch name**: `feature/mpesa-payment`

**What to do**:
1. Integrate the **Safaricom Daraja API** (M-Pesa STK Push) to allow customers to pay for parking
2. Implement `initiateMpesaPayment(phone, amount)` — triggers an STK push to the customer's phone
3. Implement `checkPaymentStatus(checkoutRequestId)` — polls Daraja API for payment confirmation
4. Implement `processRefund(transactionId, amount)` — handles refund on booking cancellation
5. Store payment records in Firestore `payments` collection
6. Wire up the "Book" button on the Home page → opens a booking modal → calls `initiateMpesaPayment` → on success, creates a booking via `bookingService.createBooking()`

**Helpful links**:
- [Daraja API docs](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- You'll need a Safaricom developer sandbox account for testing
- The STK Push needs a **backend** (Firebase Cloud Function) because the Daraja API requires a server-side secret key

---

### Task 2: 📅 Booking System Logic
**File**: `src/services/bookingService.js` + new Cloud Function  
**Branch name**: `feature/booking-system`

**What to do**:
1. Write a **Firebase Cloud Function** called `createBooking` that:
   - Validates the requested time slot is available
   - Calculates total price from lot's hourly rate × duration
   - Generates a unique QR code string
   - Writes the booking to Firestore `bookings` collection
   - Decrements the provider's `availableSpots` count (use a Firestore transaction for atomicity)
2. Write a `cancelBooking` Cloud Function that reverses the above
3. Update `src/services/bookingService.js` to call these Cloud Functions using `httpsCallable`
4. Add a **Booking Modal** component that appears when a customer clicks "Book" on a lot — lets them pick start time, duration, and confirms the price

**Key fields for a booking document**:
```
{ userId, lotId, lotName, spotNumber, startTime, endTime, status, totalPrice, paymentStatus, qrCode, createdAt }
```

---

### Task 3: 📷 QR Code Check-In / Check-Out System
**Files**: `src/services/qrService.js`, `src/pages/provider/QRScanner.jsx`  
**Branch name**: `feature/qr-scanner`

**What to do**:
1. Install `html5-qrcode` package: `npm install html5-qrcode`
2. In `QRScanner.jsx`, initialize the camera scanner using `Html5Qrcode` class
3. When a QR code is scanned, call `validateQRCode(qrString)` which should:
   - Look up the booking in Firestore by the QR code string
   - Verify the booking is `active` and matches the current provider's lot
   - Update the booking status to `checked-in` or `completed` depending on flow
4. Show a success/failure result on screen after scanning
5. Implement a manual entry option (type QR code string) for cases where the camera doesn't work

**Libraries**: [html5-qrcode docs](https://github.com/mebjas/html5-qrcode)

---

### Task 4: 🗺️ Google Maps Integration
**Files**: `src/components/map/ParkingMap.jsx`, `src/pages/Home.jsx`  
**Branch name**: `feature/google-maps`

**What to do**:
1. Install `@react-google-maps/api`: `npm install @react-google-maps/api`
2. Get a **Google Maps API key** from Google Cloud Console (enable Maps JavaScript API + Places API)
3. Replace the placeholder `ParkingMap.jsx` with a real Google Map centered on Nairobi
4. Show **markers** for each approved provider (use their `businessLocation` — you may need to geocode addresses to lat/lng)
5. When a customer clicks a marker, show the lot card with images, rate, and a Book button
6. Add **geolocation** — use `navigator.geolocation` to center the map on the user's current location
7. Add a search box that uses Google Places Autocomplete for finding locations

**Environment variable to add**: `VITE_GOOGLE_MAPS_API_KEY`

---

### Task 5: 🔔 Notifications & Real-Time Updates
**Files**: `src/hooks/useParkingLots.js`, `src/hooks/useBookings.js`, new notifications system  
**Branch name**: `feature/notifications`

**What to do**:
1. Replace `getDocs` calls in hooks with `onSnapshot` listeners for **real-time updates** (when a provider updates their lot, customers see it instantly)
2. Create a `notifications` collection in Firestore
3. Build a **Notifications page/modal** accessible from the bell icon on the Home page
4. Send notifications when:
   - Provider is approved/rejected (notify the provider)
   - Booking is confirmed (notify customer + provider)
   - Booking is cancelled (notify provider)
   - Payment is received (notify provider)
5. Show unread notification count as a badge on the bell icon

---

### Task 6: 🔒 Firestore Security Rules & Cloud Functions
**File**: `firestore.rules` (new), `functions/` directory (new)  
**Branch name**: `feature/security-rules`

**What to do**:
1. Write **Firestore Security Rules** that enforce:
   - Users can only read/write their own profile
   - Only admins can update another user's `role` or `status`
   - Bookings can only be created by authenticated users
   - Bookings can only be read by the booking owner or the lot provider
   - Provider data is readable by all authenticated users (for the Home page)
2. Set up **Firebase Cloud Functions** project (`firebase init functions`)
3. Move sensitive operations to Cloud Functions:
   - `approveProvider` — only callable by admins
   - `createBooking` — atomic spot validation
   - `processPayment` — M-Pesa callback handler
4. Deploy rules: `firebase deploy --only firestore:rules`

---

### Task 7: 📊 Analytics Dashboard & Provider Revenue
**Files**: `src/services/adminService.js`, `src/pages/admin/AdminDashboard.jsx`, new `src/pages/provider/Revenue.jsx`  
**Branch name**: `feature/analytics`

**What to do**:
1. Build a **Provider Revenue page** showing:
   - Total earnings (sum of completed booking prices)
   - Earnings graph by day/week/month (use a chart library like `recharts`)
   - Recent transactions list
   - Occupancy rate over time
2. Enhance the **Admin Dashboard** with:
   - Real platform statistics (revenue, growth rate, most popular lots)
   - Charts for bookings over time
   - Provider performance rankings
3. Add the Revenue page to `ProviderNav` and wire up routing in `App.jsx`

**Chart library**: `npm install recharts`

---

### Task 8: 🧪 Testing & Deployment
**Branch name**: `feature/testing-deployment`

**What to do**:
1. Write **unit tests** for service functions using Vitest:
   - `userService` — creating profiles, updating status
   - `bookingService` — creating, cancelling bookings
   - `adminService` — approving/rejecting providers
2. Write **component tests** using React Testing Library:
   - Login form validation
   - Role-based routing (customer can't access admin pages)
   - Booking card renders correctly
3. Set up **CI/CD** with GitHub Actions:
   - Run tests on every PR
   - Auto-deploy to Vercel/Firebase Hosting on merge to `main`
4. Add **error boundaries** and a global error page
5. Run Lighthouse audit and fix any performance/accessibility issues

**Setup**: `npm install -D vitest @testing-library/react @testing-library/jest-dom`

---

## Git Workflow 🌿

### Golden Rule: **Nobody works on `main` directly.**

### Step 1: Pick Your Tasks
Each team member picks 2 tasks from the list above and tells the group.

### Step 2: Create Your Branch
```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/mpesa-payment
```

### Step 3: Do Your Work
Commit often with clear messages:
```bash
git add .
git commit -m "feat: add STK Push integration in paymentService"
git commit -m "feat: add booking modal with price calculation"
```

### Step 4: Push & Create a Pull Request
```bash
git push origin feature/mpesa-payment
```
Then go to GitHub → your branch → click **"Create Pull Request"**. Write a description of what you did.

### Step 5: Code Review & Merge
- At least **1 other team member** must review and approve the PR
- Once approved, click **"Merge Pull Request"** on GitHub
- Delete the branch after merging

### Step 6: Stay Updated
Before starting new work each day:
```bash
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
```

---

## How to Resolve Merge Conflicts 🔀

Merge conflicts happen when two people edit the same file. **Don't panic** — they're normal and easy to fix.

### When You See a Conflict

After running `git merge main`, if you see:
```
CONFLICT (content): Merge conflict in src/services/bookingService.js
Automatic merge failed; fix conflicts and then commit the result.
```

### How to Fix It

1. Open the conflicted file. You'll see markers like this:
```
<<<<<<< HEAD
// Your code (from your branch)
const result = await createBooking(data);
=======
// Their code (from main)
const result = await bookingService.create(data);
>>>>>>> main
```

2. **Decide which version to keep** (or combine both). Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`):
```
// Keep the version that makes sense
const result = await createBooking(data);
```

3. Save the file, then:
```bash
git add .
git commit -m "fix: resolve merge conflict in bookingService"
```

### Tips to Avoid Conflicts
- **Pull from main frequently** (at least once a day)
- **Don't edit files outside your task** — stick to your assigned files
- **Communicate with teammates** if you need to touch a shared file like `App.jsx`

---

## 🔐 Security Rules — READ THIS CAREFULLY

These rules are **mandatory**. Breaking them can expose our Firebase project, API keys, and user data. If in doubt, **ask the group chat before pushing**.

### 1. Never Commit Secrets or API Keys

The `.env` file contains Firebase credentials and must **never** be pushed to GitHub.

```
⛔ NEVER do this:
git add .env
git commit -m "added env file"

✅ Instead, .env is already in .gitignore — it will be ignored automatically.
```

**Before every push**, double-check:
```bash
git status
```
If you see `.env` or any file with keys/secrets listed, **stop and remove it**:
```bash
git reset HEAD .env
```

**What counts as a secret** (never hardcode these anywhere):
- Firebase API keys, project IDs, auth domains
- Safaricom/Daraja API consumer key & secret
- Google Maps API keys
- Any password, token, or private key

### 2. Use Environment Variables for ALL Keys

All API keys must go through environment variables, never hardcoded in source files:

```javascript
// ⛔ WRONG — hardcoded key exposed in source code
const apiKey = "AIzaSyD8f7g3h2j1k0l9m8n7o6p5";

// ✅ CORRECT — read from .env file
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

If you need to add a new API key (e.g. Google Maps, Daraja):
1. Add it to your local `.env` file: `VITE_GOOGLE_MAPS_API_KEY=your_key_here`
2. Access it in code via `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
3. Tell the team the variable name so they can add it to their own `.env` files
4. **Never** put the actual key value in the README, Slack, or any committed file

### 3. Firestore Security Rules

Our database is currently in **test mode** (anyone can read/write). This is fine for development but **must be locked down before deployment**. Task 6 covers this, but here are the basics:

```
// ⛔ DANGEROUS — test mode (current state)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

// ✅ SAFE — production rules (what we need)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### 4. Sensitive Operations Must Use Cloud Functions

Some operations should **never** run on the client (browser) because users could manipulate them. These must be moved to Firebase Cloud Functions (server-side):

| Operation | Why it's dangerous client-side |
|-----------|-------------------------------|
| Approving a provider | User could approve themselves |
| Changing user roles | User could make themselves admin |
| Processing payments | User could fake a payment confirmation |
| Updating spot availability | User could set fake availability |

The service files have `// TODO` comments marking which functions need to move to Cloud Functions.

### 5. Git & GitHub Security

- **Never commit**: `.env`, `serviceAccountKey.json`, `firebase-debug.log`, `node_modules/`
- **Check `.gitignore`** — make sure it includes all of the above (it already does, don't remove lines from it)
- If you accidentally commit a secret:
  1. **Immediately** rotate the key in Firebase Console / Google Cloud
  2. Remove the file: `git rm --cached .env`
  3. Force push to overwrite history: `git push --force` (coordinate with team first)
  4. Tell the group chat so everyone pulls the latest

### 6. Pre-Push Security Checklist

Run through this **every time** before you push:

- [ ] `git status` — no `.env`, no key files, no `serviceAccountKey.json`
- [ ] No hardcoded API keys or secrets in any `.js` / `.jsx` file
- [ ] No `console.log()` statements printing sensitive data (tokens, passwords, user data)
- [ ] No `allow read, write: if true` in any Firestore rules you wrote
- [ ] All new API keys use `import.meta.env.VITE_*` pattern

---

## Useful Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server (localhost:5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npx firebase deploy` | Deploy to Firebase Hosting |
| `npx firebase deploy --only functions` | Deploy only Cloud Functions |
| `npx firebase deploy --only firestore:rules` | Deploy only security rules |

---

## Questions?

If you're stuck on a task, check the **`// TODO (Teammate Hole)`** comments in the service files — they have detailed instructions for what to implement. If you're still stuck, message the group chat.

**Happy coding! 🛠️**