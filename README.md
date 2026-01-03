# Meeting Intelligence Platform Architecture Plan

## Surfaces
- Web application (React + Vite, Tailwind CSS, Firebase Auth/Firestore, WebSocket client).
- Chrome extension (Manifest v3, Meet DOM content scripts, background service worker, Firebase Auth, WebSocket client).

## Backend & Services
- FastAPI backend with WebSocket server, Firebase Admin SDK.
- Deepgram streaming STT for low-latency PCM transcripts (interim + final).
- Gemini for action-item extraction, reasoning, task inference, meeting Q&A.
- Integrations: GitHub API, Slack API, Google Calendar API.

## Authentication & Identity
- Firebase Auth only; users identified by Firebase UID + verified email.
- No local/static users; backend re-verifies roles/org context on each request.

## Organization & Team Model
- Users must belong to an organization (collections: organizations, org_members).
- Org creation assigns ORG_ADMIN; join via six-digit joinCode.
- Organizations contain teams (collections: teams, team_members).
- Team roles: MANAGER or EMPLOYEE (mutually exclusive per team, but user can join multiple teams with different roles).

## Website Responsibilities
- Org creation/join, team management, role assignment.
- Role-based dashboards (Admin, Manager, Employee).
- Task management UI and integration setup.
- Historical data review.

## Chrome Extension Responsibilities
- Detect Google Meet sessions.
- Capture tab audio (with consent) and stream PCM to backend via WebSocket.
- Read live captions + speaker labels from DOM.
- Display live transcript, AI insights, in-meeting chatbot.

## Meeting Flow
1. Extension detects Meet and user starts capture.
2. Tab audio streamed through WebSocket to backend.
3. Backend forwards audio to Deepgram; receives interim/final transcripts.
4. Only final transcripts enter per-meeting sliding-window buffer (30�60s, clean sentences).
5. Gemini runs on buffered transcripts for action items / reasoning.

## Task System
- Gemini suggestions require MANAGER approval before becoming tasks.
- Task types: GitHub issues (after approval) and internal dashboard/calendar tasks.
- Employees receive/execute tasks; managers approve/edit/reject.

## Integrations
- GitHub: issues created post-approval, mirrored in dashboard.
- Slack: slash commands (e.g., /assign), notifications, task creation pipeline.
- Google Calendar: sync deadlines and reminders.

## Security & Constraints
- No static data; everything validated server-side.
- Firebase Security Rules enforced; backend double-checks org/team roles.
- Gemini never auto-acts humans approve tasks.
- System must remain modular, scalable, deployable, hackathon-ready, and aligned with production best practices.

## Org Flow Setup
- Backend
	- Provide `FIREBASE_SERVICE_ACCOUNT_PATH` env var that points to a Firebase Admin service-account JSON with Firestore access.
	- Enable Firestore in Native mode; the `organizations` and `org_members` collections are created automatically by the new endpoints (no composite indexes needed yet).
	- Deploy FastAPI so that `/org/create` and `/org/join` are reachable at the base URL you expose to the frontend.
- Frontend
	- Set `VITE_API_BASE_URL` to the FastAPI deployment origin (e.g., `http://localhost:9000`).
	- Run `npm install` to ensure `react-router-dom` is available for the new organization pages.
	- Users must sign in through Firebase Auth before creating or joining an organization; make sure the providers you need (e.g., Google) stay enabled in the Firebase console.

## User Context API
- Endpoint: `GET /me/context`
- Requires Firebase ID token; backend verifies and resolves:
	- Organization membership (ID + role: `ORG_ADMIN` or `MEMBER`).
	- Organization metadata (name, description, join code exposed only to admins).
	- Team memberships with per-team roles plus resolved teammates.
	- Organization roster (admins only) and full team directory for dashboards.
- Frontend uses this single payload to render all dashboards; no role inference happens client-side beyond choosing the correct route from the returned context.

## Dashboards
- `/dashboard/admin`: Organization overview (name, join code, team list, roster, links to management/settings placeholders).
- `/dashboard/manager`: Highlights teams the user manages plus placeholder tiles for tasks and meetings.
- `/dashboard/employee`: Personal view with membership list and placeholders for tasks/calendar integrations.
- `/dashboard`: Smart redirect that loads context then routes to the correct dashboard (`ORG_ADMIN` → admin, managers → manager, everyone else → employee).
