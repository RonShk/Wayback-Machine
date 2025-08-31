# Wayback Machine Clone

A modern web archiving tool that captures and preserves websites for future access. Built with TypeScript, Node.js, React, and Playwright, this application allows you to archive websites and view them later, similar to the Internet Archive's Wayback Machine.

## Features

- **Web Crawling**: Automatically crawls websites up to a configurable depth
- **Asset Preservation**: Downloads and stores CSS, JavaScript, images, and other assets
- **URL Rewriting**: Rewrites links to work with the archived content
- **Version Control**: Supports multiple versions of the same website
- **Modern UI**: Clean, responsive React interface
- **Real-time Status**: Track archiving progress in real-time

## Prerequisites

- Node.js 18+ and npm

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Wayback-Machine
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

## Running the Application

### Development Mode

1. **Start the Backend** (Terminal 1):
```bash
cd backend
npm run dev
```
The API server will start on `http://localhost:3001`

2. **Start the Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```
The web interface will be available at `http://localhost:5173`


## Usage

1. Open the web interface at `http://localhost:5173`
2. Enter a website URL (e.g., `https://example.com`)
3. Click "Archive Now" to start the archiving process
4. Go to the "Search Archives" page to view your archived sites
5. Click on any archive to view the preserved website

## API Endpoints

- `POST /api/archives/url` - Create a new archive
- `GET /api/archives/list` - List all archives
- `GET /api/archives/status/:id` - Get archive status
- `GET /api/archives/:id/*` - Serve archived content


## Project Structure

```
Wayback-Machine/
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── tests/         # Test files
│   ├── data/             # Archive metadata
│   └── archives/         # Stored website archives
├── frontend/             # React web interface
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── assets/       # Static assets
└── README.md
```

## Troubleshooting

### Common Issues

1. **Archive fails to start**: Check that the URL is accessible and valid
2. **Frontend can't connect to backend**: Ensure backend is running on port 3001
3. **Playwright browser issues**: Run `npx playwright install` in the backend directory
4. **Out of disk space**: Archives are stored in `backend/archives/` - clean up old archives if needed

### Debugging

Enable debug logging by setting environment variables:
```bash
DEBUG=archive:* npm run dev  # Backend debugging
```

## License

MIT License - see LICENSE file for details
