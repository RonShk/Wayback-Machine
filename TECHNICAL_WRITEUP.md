# Technical Writeup - Wayback Machine Clone

## Current Architecture

**Stack**: Node.js + TypeScript + React + Playwright
- **Storage**: JSON files + file system (simple, no DB setup)
- **Crawling**: Playwright for modern web apps
- **Processing**: Async with status polling
- **File Structure**: Preserves original URL paths

**Key Limitations**:
- Single-threaded processing
- No database (limited querying)
- Full re-crawl for versions (no incremental updates)
- Local file storage only

## What I'd Change for Production

### 1. Replace JSON with Database
- **PostgreSQL** for metadata, search, and relationships
- Proper indexing for fast queries
- ACID transactions for consistency

### 2. Add Job Queue System
- **Redis/RabbitMQ** for distributed processing
- Multiple worker processes
- Retry logic with exponential backoff
- Priority queues for urgent archives

### 3. Incremental Archiving
- Compare with previous versions
- Only download changed content
- Reuse unchanged assets
- Much faster re-archiving

### 4. Better Crawling
- Wait for JavaScript to load dynamic content
- Handle authentication (login forms)
- Respect robots.txt and rate limits
- Parallel crawling with worker pools

### 5. Object Storage
- **AWS S3/MinIO** instead of local files
- Unlimited storage capacity
- Built-in redundancy and backups
- CDN integration for fast serving

## Production Architecture

### Infrastructure
- **Load Balancer**: Nginx for SSL termination and routing
- **API Servers**: 3+ Node.js instances behind load balancer
- **Worker Processes**: 5+ dedicated crawler workers
- **Database**: PostgreSQL with read replicas
- **Queue**: Redis for job management
- **Storage**: S3/MinIO for archive files
- **Monitoring**: Prometheus + Grafana

### Security & Performance
- Rate limiting (10 archives per IP per 15 minutes)
- Input validation to prevent SSRF attacks
- Content Security Policy headers
- Database connection pooling
- CDN for serving archived content
- Health checks for all services

## Cost Estimates

| Scale | Archives/Month | Monthly Cost |
|-------|----------------|--------------|
| Small | 1-100 | $30-60 |
| Medium | 1K-10K | $400-1,150 |
| Large | 100K+ | $2,500-10,500 |

**Cost Breakdown**:
- Compute: VPS/cloud instances for API and workers
- Storage: Object storage for archived files
- Database: Managed PostgreSQL
- CDN: Global content delivery
- Monitoring: Observability tools
