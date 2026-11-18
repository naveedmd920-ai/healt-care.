# Project Overview — Rural Health Connect

- **Project Name**: Rural Health Connect
- **Tagline**: Healthcare for Every Village
- **Team**: Team Elite
- **Institution**: Sreenidhi Institute of Science and Technology (SNIST), Yamnampet, Ghatkesar
- **Domain**: HealthTech / Telemedicine

## Architecture Summary

The application uses a unified full-stack TypeScript architecture served on Port 3000:
- **Frontend (`src/`)**: React 19, Vite, Tailwind CSS v4, React Router, Axios, Lucide icons, and Leaflet (OpenStreetMap).
- **Backend (`backend/`)**: Express.js REST API, JWT authentication (`jsonwebtoken`), password hashing (`bcryptjs`), Zod request validation, rate limiting (`express-rate-limit`), and WebSocket WebRTC signaling (`ws`).
- **Database (`database/` & `backend/config/`)**: Dual-driver SQL engine supporting MySQL 8.0 (`mysql2`) via `DB_CLIENT=mysql` and zero-config embedded SQLite (`better-sqlite3`) locally with identical normalized relational tables, foreign keys, unique slot locks, and ACID transactions.
