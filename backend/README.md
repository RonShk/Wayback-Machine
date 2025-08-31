# Backend - Wayback Machine Clone

The backend is a Node.js/TypeScript API server that handles web crawling, asset extraction, and serves archived content. It uses Playwright for web crawling and provides RESTful endpoints for the frontend.

## Architecture

The backend follows a modular architecture with clear separation of concerns:

```
src/
├── controllers/           # HTTP request handlers
├── routes/               # API route definitions  
├── services/             # Business logic layer
│   ├── archive/          # Archive-related services
│   └── ArchiveService.ts # Main orchestration service
└── tests/               # Test files
```

## Core Services

### ArchiveService
**File**: `src/services/ArchiveService.ts`

The main orchestration service that coordinates the entire archiving process.

**Key Methods**:
- `createArchive(url: string)` - Initiates the archiving process
- `getArchiveStatus(id: string)` - Returns archive processing status
- `listArchives()` - Returns all archived sites
- `reArchiveUrl(url: string)` - Creates a new version of an existing archive

**Process Flow**:
1. **Crawling**: Uses CrawlerService to discover and crawl pages
2. **Asset Extraction**: Uses AssetExtractor to find all referenced assets
3. **Asset Downloading**: Uses AssetDownloader to save assets locally
4. **URL Rewriting**: Uses UrlRewriter to update links for offline viewing
5. **Metadata Storage**: Saves archive information to JSON file

### CrawlerService
**File**: `src/services/archive/CrawlerService.ts`

Handles website crawling using Playwright browser automation.

**Key Features**:
- Configurable depth and page limits
- Same-domain crawling only
- Link discovery and following
- HTML content extraction
- Page path generation for file structure

**Configuration**:
- `maxDepth`: Maximum crawling depth (default: 5)
- `maxPages`: Maximum pages to crawl (default: 25)

### AssetExtractor
**File**: `src/services/archive/AssetExtractor.ts`

Extracts asset references from HTML, CSS, and JavaScript files.

**Supported Asset Types**:
- **CSS**: Stylesheets from `<link>` tags and `@import` statements
- **JavaScript**: Scripts from `<script>` tags and dynamic imports
- **Images**: From `<img>` tags, CSS backgrounds, and favicons
- **Fonts**: Web fonts (WOFF, WOFF2, TTF)
- **Models**: 3D models (GLB, GLTF, OBJ)

**Extraction Methods**:
- HTML parsing with Cheerio
- CSS URL pattern matching
- JavaScript asset reference detection
- External file content analysis

### AssetDownloader
**File**: `src/services/archive/AssetDownloader.ts`

Downloads and organizes assets while preserving URL structure.

**Key Features**:
- Preserves original URL path structure
- Handles query parameters with URL hashing
- URL existence validation before download
- Progress tracking and error handling
- Smart retry logic for failed downloads

**File Organization**:
- Maintains original directory structure
- Generates unique filenames for conflicts
- Creates URL mappings for rewriting

### UrlRewriter
**File**: `src/services/archive/UrlRewriter.ts`

Rewrites URLs in HTML and CSS files to work with archived content.

**Rewriting Scope**:
- HTML links (`<a>`, `<link>`, `<script>`, `<img>`)
- CSS url() references
- JavaScript imports and fetch calls
- Form actions and iframe sources

**URL Resolution**:
- Converts absolute URLs to relative paths
- Handles same-domain vs external links
- Preserves fragment identifiers (#anchors)
- Updates asset references to local files

### ViewerService
**File**: `src/services/ViewerService.ts`

Serves archived content with proper MIME types and content handling.

**Key Features**:
- File system access to archived content
- MIME type detection
- Content preprocessing for HTML/CSS
- Asset serving with caching headers

## Controllers

### ArchiveController
**File**: `src/controllers/ArchiveController.ts`

Handles all HTTP requests and coordinates service calls.

**Endpoints**:
- `POST /api/archives/url` - Create new archive
- `GET /api/archives/list` - List all archives
- `GET /api/archives/status/:id` - Get archive status
- `GET /api/archives/view/:id/*` - Serve archived content
- `POST /api/archives/re-archive` - Create new version
- `GET /api/archives/versions` - Get archive versions

## Data Storage

### Archives Metadata
**File**: `data/archives.json`

Stores archive metadata in JSON format:
```json
[
  [
    "archive_id", 
    {
      "id": "mezs3zaf4619tl6xspp",
      "url": "https://example.com",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:35:00.000Z",
      "pageCount": 25,
      "assetCount": 150,
      "version": 1,
      "originalUrl": "https://example.com"
    }
  ]
]
```

### Archive Files
**Directory**: `archives/`

Each archive gets its own directory with preserved URL structure:
```
archives/
└── mezs3zaf4619tl6xspp/
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    ├── images/
    │   └── logo.png
    └── about/
        └── index.html
```

## API Reference

### Create Archive
```http
POST /api/archives/url
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### Get Archive Status
```http
GET /api/archives/status/mezs3zaf4619tl6xspp
```

### List Archives
```http
GET /api/archives/list
```

### View Archive
```http
GET /api/archives/view/mezs3zaf4619tl6xspp/
GET /api/archives/view/mezs3zaf4619tl6xspp/about/
```

## Configuration

### Environment Variables
Create a `.env` file:
```
PORT=3001
NODE_ENV=development
```

### Crawler Limits
Modify in `ArchiveController.ts`:
```typescript
this.archiveService.setCrawlerLimits(maxDepth, maxPages);
```

## Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Manual Testing Scripts
```bash
npm run test:visual        # Visual regression tests
npm run test-website       # Test any website
```

## Error Handling

The backend implements comprehensive error handling:

1. **Validation**: URL validation and required field checks
2. **Network Errors**: Retry logic for failed downloads
3. **File System**: Graceful handling of disk space and permissions
4. **Browser Automation**: Playwright timeout and crash recovery
5. **Memory Management**: Cleanup of temporary resources

## Performance Optimizations

1. **Concurrent Downloads**: Parallel asset downloading
2. **Smart Caching**: Avoid re-downloading existing files
3. **Selective Crawling**: Same-domain restriction
4. **Resource Limits**: Configurable page and depth limits
5. **Cleanup**: Automatic browser resource cleanup

## Logging

The backend uses structured console logging:
- `🚀` - Process start
- `✅` - Success operations
- `❌` - Errors
- `⚠️` - Warnings
- `🔍` - Discovery/crawling
- `📥` - Downloads
- `✏️` - URL rewriting
- `💾` - File operations

## Monitoring Archive Progress

Archives process asynchronously. Monitor progress through:
1. Real-time console logs
2. Archive status endpoint
3. File system inspection
4. Performance timing logs

The archiving process provides detailed timing breakdowns for performance analysis and optimization.
