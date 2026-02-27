# ByteVault

**Multi-device cloud-synced link manager.**

ByteVault is a lightweight but powerful Chrome Extension and backend service that allows you to seamlessly save, manage, and synchronize your web links across multiple devices.

## Features

- ☁️ **Cloud Synchronization**: Access your saved links instantly from any device.
- 🔒 **Secure & Private**: Protected via JWT authentication, rate limiting, and secure HTTP headers (Helmet).
- 🔌 **Chrome Extension**: Quick, easy access to your vault directly from your browser toolbar.
- 📊 **Dashboard Views**: Manage, search, and organize your saved links with a clean, modern interface.
- 📤 **Data Export**: Export your saved links and account data anytime.
- 🛡️ **Session Management**: Track and manage your active login sessions across devices.

## Tech Stack

**Extension (Frontend)**

- Manifest V3 Chrome Extension
- Vanilla JavaScript, HTML & Custom CSS
- Modern UI with intuitive state management

**Backend (API)**

- Node.js & Express
- PostgreSQL
- Zod (Verification), Helmet & Express Rate Limiter (Security)
- RESTful principles with JWT Authentication (Access & Refresh Tokens)

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL Database URL
- Google Chrome (or any Chromium-based browser)

### 1. Backend Setup

1. Open the `backend` directory:
    ```bash
    cd backend
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Set your environment variables in a `.env` file within the `backend` directory:
    ```ini
    PORT=5252
    NODE_ENV=development
    DATABASE_URL=postgresql://your_db_url
    JWT_ACCESS_SECRET=your_access_secret
    JWT_REFRESH_SECRET=your_refresh_secret
    JWT_ACCESS_EXPIRES_IN=1h
    JWT_REFRESH_EXPIRES_IN=7d
    FRONTEND_URL=chrome-extension://<your_extension_id>
    ```
4. Start the server:
    ```bash
    npm run dev
    ```
    _The API server will run on `http://localhost:5252`._

### 2. Extension Setup

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click on the **Load unpacked** button and select the `extension` directory from this repository.
4. Pin the ByteVault extension to your toolbar and click the icon to get started!

_(Optional)_ Once the extension is loaded, copy its ID from your Chrome Extensions page and update the `FRONTEND_URL` in your backend `.env` file for enhanced security via CORS, then restart the server.

## Structure

```text
ByteVault/
├── backend/                  # REST API built with Express & PostgreSQL
└── extension/                # Chrome Extension built with Manifest V3
```

## Authors

- **Ankit Barik** - [@ankitkumarbarik](https://github.com/ankitkumarbarik)
- **Mohammed Hasanfatta** - [@hasanfattamd](https://github.com/hasanfattamd)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
