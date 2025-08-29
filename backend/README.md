# WebArchive Backend API

A Node.js/TypeScript backend for archiving web pages using Playwright.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── index.ts              # Main server entry point
├── routes/               # API route definitions
│   ├── index.ts          # Route aggregator
│   └── archiveRoutes.ts  # Archive-specific routes
├── controllers/          # Request handlers
│   └── ArchiveController.ts
└── services/             # Business logic
    └── ArchiveService.ts # Archive processing & storage
```

## 🛠 Architecture

**Flow**: Route → Controller → Service

1. **Routes** (`/routes/`): Define API endpoints and HTTP methods
2. **Controllers** (`/controllers/`): Handle HTTP requests/responses, validation
3. **Services** (`/services/`): Business logic, data processing, external integrations

## 📡 API Endpoints

### Archive Management
- `POST /api/archive/url` - Create new archive
  ```json
  { "url": "https://example.com" }
  ```
- `GET /api/archive/list` - List all archives
- `GET /api/archive/status/:id` - Get archive status

## 💾 Data Storage

Archives are persisted to `data/archives.json` with the following features:

- **Automatic Loading**: Archives are loaded on first service access
- **Real-time Saving**: Every create/update operation saves to file
- **Crash Recovery**: Archives survive server restarts
- **JSON Format**: Human-readable storage format

### Archive Data Structure
```json
{
  "id": "unique-archive-id",
  "url": "https://example.com",
  "status": "completed|processing|failed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:01:00.000Z",
  "title": "Page Title",
  "screenshotSize": 12345,
  "contentSize": 67890,
  "error": null
}
```

## 🎭 Playwright Integration

Each archive process:
1. Launches headless Chromium browser
2. Navigates to target URL
3. Waits for network idle
4. Captures screenshot
5. Extracts page content and metadata
6. Updates archive status

## 🔧 Development Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run tests (not implemented yet)

## 📋 TODO

- [ ] Add database integration (PostgreSQL/SQLite)
- [ ] Implement file storage for screenshots/content
- [ ] Add authentication/authorization
- [ ] Rate limiting and queue management
- [ ] Archive scheduling/automation
- [ ] Search and filtering endpoints