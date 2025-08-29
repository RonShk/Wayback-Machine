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

  // Configuration methods
  setCrawlerLimits(maxDepth: number, maxPages: number): void {
    this.crawler.setLimits(maxDepth, maxPages);
  }
}