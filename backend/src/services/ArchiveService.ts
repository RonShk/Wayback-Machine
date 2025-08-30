import { CrawlerService } from './archive/CrawlerService.ts';
import { AssetExtractor } from './archive/AssetExtractor.ts';
import { AssetDownloader } from './archive/AssetDownloader.ts';
import { UrlRewriter } from './archive/UrlRewriter.ts';
import fs from 'fs/promises';
import path from 'path';

interface ArchiveMetadata {
  id: string;
  url: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  pageCount?: number;
  assetCount?: number;
  totalSize?: number;
}

export class ArchiveService {
  private crawler = new CrawlerService();
  private extractor = new AssetExtractor();
  private downloader = new AssetDownloader();
  private rewriter = new UrlRewriter();
  private archives = new Map<string, ArchiveMetadata>();
  private archivesFile = path.join(process.cwd(), 'data', 'archives.json');
  private initialized = false;

  async createArchive(url: string): Promise<{ id: string; status: string; message: string }> {
    await this.ensureInitialized();
    
    const archiveId = this.generateId();
    const metadata: ArchiveMetadata = {
      id: archiveId,
      url,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };
    
    this.archives.set(archiveId, metadata);
    await this.saveArchives();
    
    // Start archiving process asynchronously
    this.processArchive(archiveId, url).catch(error => {
      console.error(`Archive ${archiveId} failed:`, error);
      const archive = this.archives.get(archiveId);
      if (archive) {
        archive.status = 'failed';
        archive.error = error.message;
        this.saveArchives();
      }
    });
    
    return {
      id: archiveId,
      status: 'started',
      message: 'Archive process initiated'
    };
  }

  private async processArchive(archiveId: string, url: string): Promise<void> {
    try {
      console.log(`🚀 Starting archive process for: ${url}`);
      
      // Step 1: Crawl website once to get ALL page data (URLs + HTML + links)
      console.log(`🔍 Crawling website (single pass)...`);
      const pagesData = await this.crawler.crawlWebsite(url);
      console.log(`Crawled ${pagesData.length} pages with complete data`);
      
      // Step 2: Extract all assets from the crawled pages
      console.log(`🔧 Extracting assets...`);
      const assets = await this.extractor.extractAssetsFromPages(pagesData);
      console.log(`Found ${assets.length} assets to download`);
      
      // Step 3: Download all assets
      console.log(`⬇️ Downloading assets...`);
      const urlMappings = await this.downloader.downloadAssets(assets, archiveId);
      
      // Step 4: Rewrite URLs in HTML and CSS files
      console.log(`✏️ Rewriting URLs...`);
      await this.rewriter.rewriteUrls(pagesData, urlMappings, archiveId);
      
      // Step 5: Save metadata and mark as completed
      const archive = this.archives.get(archiveId);
      if (archive) {
        archive.status = 'completed';
        archive.completedAt = new Date().toISOString();
        archive.pageCount = pagesData.length;
        archive.assetCount = assets.length;
        await this.saveArchives();
      }
      
      console.log(`✅ Archive ${archiveId} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Archive ${archiveId} failed:`, error);
      throw error;
    }
  }

  async getArchiveStatus(id: string): Promise<ArchiveMetadata | null> {
    await this.ensureInitialized();
    return this.archives.get(id) || null;
  }

  async listArchives(): Promise<{ archives: ArchiveMetadata[]; total: number }> {
    await this.ensureInitialized();
    return {
      archives: Array.from(this.archives.values()),
      total: this.archives.size
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadArchives();
      this.initialized = true;
    }
  }

  private async loadArchives(): Promise<void> {
    try {
      const data = await fs.readFile(this.archivesFile, 'utf8');
      const archivesArray = JSON.parse(data);
      this.archives = new Map(archivesArray);
      console.log(`📂 Loaded ${this.archives.size} archives from storage`);
    } catch (error) {
      console.log('📂 No existing archives file found, starting fresh');
      this.archives = new Map();
    }
  }

  private async saveArchives(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.archivesFile), { recursive: true });
      const archivesArray = Array.from(this.archives.entries());
      await fs.writeFile(this.archivesFile, JSON.stringify(archivesArray, null, 2));
    } catch (error) {
      console.error('Failed to save archives:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async getArchiveSnapshot(id: string): Promise<{ html: string; baseUrl: string } | null> {
    await this.ensureInitialized();
    
    const archive = this.archives.get(id);
    if (!archive || archive.status !== 'completed') {
      return null;
    }
    
    try {
      const archiveDir = path.join(process.cwd(), 'archives', id);
      const pagesDir = path.join(archiveDir, 'pages');
      
      // Find the main page (usually index.html or the first page)
      const pageFiles = await fs.readdir(pagesDir);
      let mainPageFile = pageFiles.find(file => file === 'index.html') || pageFiles[0];
      
      if (!mainPageFile) {
        throw new Error('No pages found in archive');
      }
      
      const mainPagePath = path.join(pagesDir, mainPageFile);
      const html = await fs.readFile(mainPagePath, 'utf8');
      
      return {
        html,
        baseUrl: `/api/archives/${id}/assets`
      };
    } catch (error) {
      console.error(`Failed to get archive snapshot ${id}:`, error);
      return null;
    }
  }

  async getArchiveAsset(id: string, assetPath: string): Promise<{ content: Buffer; mimeType: string } | null> {
    await this.ensureInitialized();
    
    const archive = this.archives.get(id);
    if (!archive || archive.status !== 'completed') {
      return null;
    }
    
    try {
      const archiveDir = path.join(process.cwd(), 'archives', id);
      const fullAssetPath = path.join(archiveDir, 'assets', assetPath);
      
      // Security check: ensure the path is within the archive directory
      if (!fullAssetPath.startsWith(archiveDir)) {
        throw new Error('Invalid asset path');
      }
      
      const content = await fs.readFile(fullAssetPath);
      const mimeType = this.getMimeType(assetPath);
      
      return { content, mimeType };
    } catch (error) {
      console.error(`Failed to get archive asset ${id}/${assetPath}:`, error);
      return null;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Configuration methods
  setCrawlerLimits(maxDepth: number, maxPages: number): void {
    this.crawler.setLimits(maxDepth, maxPages);
  }
}