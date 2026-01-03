# Firebase Authentication Setup Guide

## Prerequisites

- Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- Both frontend (React/Vite) and backend (FastAPI) folders

## Step 1: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Configure the OAuth consent screen if needed

## Step 2: Get Firebase Web Config

1. In Firebase Console, go to **Project Settings**
2. Scroll to "Your apps" → Click Web app icon (`</>`）
3. Copy the firebaseConfig object
4. Create `.env` file in `frontend/`:

```env
VITE_FIREBASE_API_KEY=<your_apiKey>
VITE_FIREBASE_AUTH_DOMAIN=<your_authDomain>
VITE_FIREBASE_PROJECT_ID=<your_projectId>
VITE_FIREBASE_STORAGE_BUCKET=<your_storageBucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_messagingSenderId>
VITE_FIREBASE_APP_ID=<your_appId>
VITE_API_BASE_URL=http://localhost:9000
```

## Step 3: Get Firebase Admin SDK Credentials

1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file as `service-account.json` in the `backend/` folder

```
backend/
├── service-account.json  ← Place the file here
├── app/
├── requirements.txt
└── ...
```

4. Create `.env` file in `backend/`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
API_HOST=127.0.0.1
API_PORT=9000
```

## Step 4: Run the Application

### Terminal 1 - Backend API
```bash
cd backend
pip install -r requirements.txt
python -m app.main
```
API runs on `http://127.0.0.1:9000`

### Terminal 2 - Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173`

## Step 5: Test Authentication

1. Visit `http://localhost:5173`
2. Click "Sign in with Google"
3. Complete Google sign-in
4. User profile should appear with logout button

## Troubleshooting

### Backend throws "FIREBASE_SERVICE_ACCOUNT_PATH not set"
- Check `.env` file exists in `backend/` with correct path
- Verify `service-account.json` file is present

### "Google Sign-in failed" on frontend
- Verify Firebase config in `frontend/.env` is correct
- Check Firebase Console has Google auth enabled
- Clear browser cookies and try again

### CORS error from frontend to backend
- Ensure backend is running on `http://127.0.0.1:9000`
- Frontend defaults to this URL, but check `VITE_API_BASE_URL` in `.env`

### "Token verification failed" in API
- Ensure service account JSON is valid
- Check Firebase project ID matches in both config files

## Architecture

```
Frontend (React + Firebase SDK)
    ↓
    Sign in with Google → Get ID Token
    ↓
    POST /auth/login (with ID token)
    ↓
Backend (FastAPI + Firebase Admin SDK)
    ↓
    Verify ID token with Firebase
    ↓
    Return user info (no DB, no custom JWT)
```
