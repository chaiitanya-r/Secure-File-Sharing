# Secure File Sharing & Access Control

End-to-end encrypted MERN stack that enforces per-file ACLs, hybrid crypto (AES‑256‑GCM + RSA‑OAEP), JWT-authenticated APIs, and a client that never stores private keys unencrypted.

## Architecture

- **Backend** (`backend/`, Express + MongoDB + GridFS)
  - `src/security/crypto.ts` – AES-256-GCM helpers, RSA-OAEP, password-based private key encryption.
  - `src/models/*.ts` – `User` (role-based) and `File` (per-file ACL storing user-specific encrypted AES keys plus server-wrapped key).
  - `src/controllers/*.ts` – registration/login, hybrid encrypted upload/download/share logic.
  - `src/security/keyWrap.ts` – wraps file AES keys with a server master secret so they can be re-encrypted for new recipients without exposing plaintext.
  - `tests/` – Jest + mongodb-memory-server integration tests covering auth + ACL flows.
- **Frontend** (`frontend/`, Vite + React + TypeScript)
  - Uses Fetch + JWT for API calls.
  - WebCrypto (PBKDF2 + AES-GCM + RSA-OAEP) decrypts the user’s private key in-browser once they re-enter their password, then decrypts per-file AES keys and file payloads locally.
  - UI surfaces upload, file list, share modal, download/decrypt button, and key-unlock prompt.

```
├── backend
│   ├── src
│   │   ├── app.ts               # Express app wiring, rate limits, routers
│   │   ├── controllers          # Auth + file flows
│   │   ├── middleware           # JWT guard, validation, error handler
│   │   ├── models               # User + File schemas (ACL, key wrap metadata)
│   │   ├── routes               # /api/auth, /api/files
│   │   ├── security             # Crypto primitives, JWT helpers, rate limiting
│   │   └── storage/gridfs.ts    # GridFS bucket factory
│   ├── tests                    # Jest integration tests (auth, ACL, encryption)
│   └── package.json
└── frontend
    ├── src
    │   ├── api                  # Typed API client
    │   ├── components           # Login, upload, list, share modal, unlock modal
    │   ├── contexts             # Auth provider storing JWT + encrypted key payload
    │   ├── hooks/usePrivateKey  # WebCrypto unlock helper
    │   ├── lib/crypto.ts        # Browser crypto helpers (PBKDF2/AES/RSA)
    │   └── App.tsx              # Dashboard orchestration
    └── package.json
```

## Running Locally

### Backend

```bash
cd backend
cp env.example .env         # create and edit your secrets
npm install
npm run dev                 # ts-node-dev hot reload

# type-check + build + run tests
npm run build
npm test
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (GridFS enabled) |
| `PORT` | API port (default `4000`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing secret + TTL |
| `KEY_WRAP_SECRET` | 256-bit (base64 or raw) secret used to wrap per-file AES keys for server-side re-encryption |
| `CORS_ORIGIN` | Allowed frontend origin |

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:4000" > .env
npm run dev
npm run build # production bundle
```

The frontend stores the JWT + encrypted private key in `localStorage`, but the decrypted private key (WebCrypto `CryptoKey`) only lives in memory and is cleared on logout/lock.

## Security Guarantees

| Layer | Guarantee |
| --- | --- |
| Hybrid encryption | Each upload creates a fresh 256-bit AES key (`crypto.randomBytes(32)`), encrypts the file with AES-256-GCM, and stores the ciphertext in GridFS alongside IV + auth tag metadata. |
| Key distribution | AES keys are RSA-OAEP encrypted per-user (owner + explicit sharees). Keys are additionally wrapped by the server (`KEY_WRAP_SECRET`) so owners can grant new users without re-uploading plaintext. |
| Private key handling | RSA private keys are generated at registration, encrypted using AES-256-GCM with a PBKDF2-derived key (150k iterations, SHA-512), and stored as ciphertext + salt + IV only. |
| Frontend crypto | Users must re-enter their password to decrypt their private key locally. WebCrypto handles PBKDF2, AES-GCM, and RSA-OAEP, and decrypted AES keys/files never leave the browser. |
| RBAC + ACL | Routes enforce JWT auth + role checks; per-file ACL ensures only owners/admins can share; download/metadata endpoints verify the caller has an ACL entry. |
| API security | Joi validation on input, centralized error handling, rate limits on `/api/auth/login` and `/api/files/upload`, Helmet, CORS, compression, JSON limits, and JWT middleware on all `/api/files/*` routes. |

### Threat & Vulnerability Notes

- **XSS**: Frontend avoids dangerously setting HTML and minimizes third-party libs. JWT stored in memory/localStorage; for stronger XSS posture consider HttpOnly cookies + CSP.
- **CSRF**: APIs require Authorization headers (bearer tokens) and default CORS `credentials: true` can be tightened by setting `CORS_ORIGIN`. Since auth is header-based, CSRF risk is low.
- **Rate limiting**: Login + upload endpoints are throttled (20 and 50 per 15 minutes). Extend to other sensitive routes as needed.
- **Path traversal / storage**: Files are routed through GridFS, filenames are never used for filesystem writes, and download headers sanitize names via `encodeURIComponent`.
- **Input validation**: All auth and share payloads validated with Joi; file IDs validated via ObjectId guard before hitting Mongo.

Residual risks / future hardening ideas:

- Bring your own KMS/HSM for `KEY_WRAP_SECRET`.
- Add audit logs + anomaly detection on sharing/downloading.
- Extend test coverage to rate-limit + error branches, add e2e Cypress tests.
- Consider WebAuthn or hardware-backed keys for stronger client auth.

## Testing

- `backend`: `npm test` – spins up an in-memory MongoDB, exercises register/login, upload, sharing, ACL enforcement, and verifies unique encrypted AES keys.
- `frontend`: `npm run build` ensures type safety; add Playwright/Cypress for UI + crypto regression tests.

## Operational Checklist

- MongoDB (with GridFS) reachable via `MONGO_URI`.
- Backend `.env` with strong `JWT_SECRET` and `KEY_WRAP_SECRET`.
- Frontend `.env` `VITE_API_BASE_URL` pointing to backend.
- Run `npm run build` (both apps) + `npm test` before deployment.

## API Cheat Sheet

| Route | Description | Auth |
| --- | --- | --- |
| `POST /api/auth/register` | Creates user, RSA keypair, encrypted private key payload. | Public |
| `POST /api/auth/login` | Returns JWT + encrypted private key data for client-side decryption. | Public |
| `GET /api/auth/me` | Returns profile + RSA public key. | JWT |
| `POST /api/files/upload` | Memory-based upload → AES-256-GCM encrypt → GridFS + ACL entry for owner. | JWT |
| `GET /api/files` | Lists files owned or shared with caller. | JWT |
| `GET /api/files/:id` | Returns metadata + caller’s encrypted AES key. | JWT + ACL |
| `GET /api/files/:id/download` | Streams encrypted file + AES metadata headers. | JWT + ACL |
| `POST /api/files/:id/share` | Owner/admin only: encrypts AES key for another user (by email or id). | JWT + ACL |

## Frontend UX

- Login form → on success, dashboard renders.
- Modal forces users to “Unlock” their private key (PBKDF2 + AES decrypt) before downloads; they can “Lock private key” anytime.
- Upload card wraps a file input; `multer` limit prevents >25 MB.
- File table shows owner/shared status, download progress indicator, and share buttons (owner only).
- Share modal accepts email, calls backend share route, and displays success/error state.

---

Please review `README`, `backend/.env.example`, and component comments before deploying to production. Contributions (e.g., audit logging, metrics, front-end tests) welcome!


