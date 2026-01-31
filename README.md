# ParkEase Kenya 🚗

A modern parking management application for Kenya built with React, Tailwind CSS, and Firebase.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS v3
- **Backend**: Firebase (Authentication, Firestore)
- **State Management**: React Context

## Project Structure
```
src/
├── components/     # Reusable UI components
│   ├── common/    # Shared components (BottomNav, SearchBar)
│   └── home/      # Home page components (ParkingCard, QuickActions)
├── context/        # React Context providers (Auth)
├── pages/          # Route pages (Home, Login, Profile, Bookings)
├── config/         # Firebase configuration
└── assets/         # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/shadrackbond/ParkFinder.git
cd ParkFinder

# Install dependencies
npm install

# Setup environment variables
# Copy the .env file with Firebase keys (ask the team for keys)

# Start development server
npm run dev
```

### Environment Variables
Create a `.env` file in the root directory with:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=parkease-kenya.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=parkease-kenya
VITE_FIREBASE_STORAGE_BUCKET=parkease-kenya.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=43856234470
VITE_FIREBASE_APP_ID=1:43856234470:web:a4ad7352d763eb93663827
```

## Team Members
DM your Gmail to @shadrackbond to get Firebase Console access.
