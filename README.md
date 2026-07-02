# UchiNihon - Backend API

A robust RESTful API backend for the **UchiNihon** platform, an application dedicated to finding abandoned Japanese homes (known as *Akiya*) across Japan.

This backend provides comprehensive authentication, user management, property saving features, and integrates with the official Japanese **e-Stat API** to fetch real housing statistics data.

---

## 📖 Consumer Usage & Features

The API acts as the core data provider for any UchiNihon frontend (web, mobile, or third-party). 

### Key Capabilities
- **Authentication:** Secure user registration and login using JWT (JSON Web Tokens).
- **Property Management:** Endpoints to view properties, and allow users to save their favorite listings.
- **e-Stat Integration:** Directly interfaces with the Japanese government's e-Stat statistics API to fetch real, authoritative housing data. This allows the platform to automatically synchronize and populate property listings with accurate statistics.

### Public Endpoints Overview
*All routes are prefixed with `/api`.*

- `POST /api/signup` - Register a new user
- `POST /api/signin` - Authenticate and receive a JWT
- `GET /api/properties/...` - Retrieve property listings
- `POST /api/estat/sync` - Sync housing data from e-Stat (Requires e-Stat credentials)

For full e-Stat integration details, please refer to the `ESTAT_INTEGRATION.md` and `ESTAT_SETUP.md` files in this repository.

---

## 💻 For Outsider Developers

Welcome! If you are looking to contribute, fork, or run your own instance of the UchiNihon backend, here is everything you need to know.

### Tech Stack
- **Runtime:** [Node.js](https://nodejs.org/) (v18+ recommended)
- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) via Mongoose
- **Authentication:** JWT & bcryptjs
- **Data Fetching:** node-fetch (for external e-Stat API calls)

### Architecture
The project follows an MVC-like pattern adapted for an API:
- `controllers/` - Core business logic for handling requests.
- `models/` - Mongoose schemas (Users, Properties, EstatCredentials).
- `routes/` - Express route definitions mapping endpoints to controllers.
- `middlewares/` - Custom middleware (e.g., JWT auth verification).
- `utils/` - Helpers, error definitions, and the custom `estatClient.js`.

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Noa-GH/UchiNihon-backend.git
   cd UchiNihon-backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```
   *Required Variables:*
   - `PORT`: Server port (default 3001)
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secure string for signing tokens
   - `CORS_ORIGIN`: Your frontend URL (e.g., `http://localhost:5173`)

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:3001` (or your configured port).

### e-Stat Setup
To fully utilize the housing data sync, you will need to register for an application ID at [e-Stat](https://www.e-stat.go.jp/). Once obtained, you can authenticate via the `/api/estat/auth` endpoint. See `ESTAT_SETUP.md` for a comprehensive guide.

### License
GPL-3.0-only
