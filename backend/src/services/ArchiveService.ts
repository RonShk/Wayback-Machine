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
  version?: number;
  originalUrl?: string; // For tracking the base URL across versions
}

export class ArchiveService {
  private crawler = new CrawlerService();
  private extractor = new AssetExtractor();
  private downloader = new AssetDownloader();
  private rewriter = new UrlRewriter();
  private archives = new Map<string, ArchiveMetadata>();
  private archivesFile = path.join(process.cwd(), 'data', 'archives.json');
  private initialized = false;

  async createArchive(url: string, isReArchive: boolean = false): Promise<{ id: string; status: string; message: string }> {
    console.log('got to create archive')
    await this.ensureInitialized();
    
    const archiveId = this.generateId();
    
    // Determine version number
    let version = 1;
    if (isReArchive) {
      const existingVersions = this.getArchiveVersions(url);
      version = existingVersions.length > 0 ? Math.max(...existingVersions.map(a => a.version || 1)) + 1 : 1;
    }
    
    const metadata: ArchiveMetadata = {
      id: archiveId,
      url,
      status: 'processing',
      createdAt: new Date().toISOString(),
      version,
      originalUrl: url,
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

    console.log("got after processArchive")
    
    return {
      id: archiveId,
      status: 'started',
      message: 'Archive process initiated'
    };
  }

  private async processArchive(archiveId: string, url: string): Promise<void> {
    console.log("got into process archive")
    const overallStartTime = Date.now();
    
    try {
      console.log(`\n🚀 [${new Date().toISOString()}] Starting archive process for: ${url}`);
      console.log(`📋 Archive ID: ${archiveId}`);
      
      // Step 1: Crawl website once to get ALL page data (URLs + HTML + links)
      const crawlStartTime = Date.now();
      console.log(`\n🔍 Step 1: Crawling website (single pass)...`);
      const pagesData = await this.crawler.crawlWebsite(url);
      console.log("got passed crawling website")
      const crawlDuration = Date.now() - crawlStartTime;
      console.log(`✅ Crawled ${pagesData.length} pages in ${crawlDuration}ms`);
      
      // Log page details
      pagesData.forEach((page, i) => {
        console.log(`   📄 Page ${i + 1}: ${page.url} (${page.html.length} chars, ${page.links.length} links)`);
      });
      
      // Step 2: Extract all assets from the crawled pages
      const extractStartTime = Date.now();
      console.log(`\n🔧 Step 2: Extracting assets from ${pagesData.length} pages...`);
      const assets = await this.extractor.extractAssetsFromPages(pagesData);
      const extractDuration = Date.now() - extractStartTime;
      console.log(`✅ Found ${assets.length} assets in ${extractDuration}ms`);
      
      // Log asset types
      const assetTypes = assets.reduce((acc, asset) => {
        const type = asset.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   📊 Asset breakdown:`, assetTypes);
      
      // Step 3: Download all assets
      const downloadStartTime = Date.now();
      console.log(`\n⬇️ Step 3: Downloading ${assets.length} assets...`);
      const urlMappings = await this.downloader.downloadAssets(assets, archiveId);
      const downloadDuration = Date.now() - downloadStartTime;
      console.log(`✅ Downloaded assets in ${downloadDuration}ms`);
      console.log(`   📁 Created ${urlMappings.size} URL mappings`);
      
      // Step 4: Rewrite URLs in HTML and CSS files
      const rewriteStartTime = Date.now();
      console.log(`\n✏️ Step 4: Rewriting URLs in ${pagesData.length} pages...`);
      await this.rewriter.rewriteUrls(pagesData, urlMappings, archiveId);
      const rewriteDuration = Date.now() - rewriteStartTime;
      console.log(`✅ URL rewriting completed in ${rewriteDuration}ms`);
      
      // Step 5: Save metadata and mark as completed
      console.log(`\n💾 Step 5: Saving archive metadata...`);
      const archive = this.archives.get(archiveId);
      if (archive) {
        archive.status = 'completed';
        archive.completedAt = new Date().toISOString();
        archive.pageCount = pagesData.length;
        archive.assetCount = assets.length;
        await this.saveArchives();
      }
      
      const totalDuration = Date.now() - overallStartTime;
      console.log(`\n🎉 Archive ${archiveId} completed successfully!`);
      console.log(`⏱️ Total time: ${totalDuration}ms (${Math.round(totalDuration/1000)}s)`);
      console.log(`📊 Performance breakdown:`);
      console.log(`   🔍 Crawling: ${crawlDuration}ms (${Math.round(crawlDuration/totalDuration*100)}%)`);
      console.log(`   🔧 Asset extraction: ${extractDuration}ms (${Math.round(extractDuration/totalDuration*100)}%)`);
      console.log(`   ⬇️ Asset download: ${downloadDuration}ms (${Math.round(downloadDuration/totalDuration*100)}%)`);
      console.log(`   ✏️ URL rewriting: ${rewriteDuration}ms (${Math.round(rewriteDuration/totalDuration*100)}%)`);
      
    } catch (error) {
      const totalDuration = Date.now() - overallStartTime;
      console.error(`\n❌ Archive ${archiveId} failed after ${totalDuration}ms:`, error);
      
      // Update archive status to failed
      const archive = this.archives.get(archiveId);
      if (archive) {
        archive.status = 'failed';
        archive.error = error instanceof Error ? error.message : 'Unknown error';
        await this.saveArchives();
      }
      
      throw error;
    }
  }

  async getArchiveStatus(id: string): Promise<ArchiveMetadata | null> {
    await this.ensureInitialized();
    const archive = this.archives.get(id);
    if (!archive) {
      console.log(`⚠️ Archive ${id} not found in memory. Available archives:`, Array.from(this.archives.keys()));
    }
    return archive || null;
  }

  async listArchives(): Promise<{ archives: ArchiveMetadata[]; total: number }> {
    await this.ensureInitialized();
    return {
      archives: Array.from(this.archives.values()),
      total: this.archives.size
    };
  }

  getArchiveVersions(url: string): ArchiveMetadata[] {
    const versions = Array.from(this.archives.values())
      .filter(archive => archive.originalUrl === url || archive.url === url)
      .sort((a, b) => (b.version || 1) - (a.version || 1)); // Sort by version descending
    return versions;
  }

  async getArchiveVersionsForUrl(url: string): Promise<{ versions: ArchiveMetadata[]; total: number }> {
    await this.ensureInitialized();
    const versions = this.getArchiveVersions(url);
    return {
      versions,
      total: versions.length
    };
  }

  async reArchiveUrl(url: string): Promise<{ id: string; status: string; message: string; version: number }> {
    const result = await this.createArchive(url, true);
    const archive = this.archives.get(result.id);
    return {
      ...result,
      version: archive?.version || 1
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

  // Force reload archives from file (useful for debugging)
  async reloadArchives(): Promise<void> {
    console.log('🔄 Force reloading archives from file...');
    await this.loadArchives();
    console.log(`📂 Reloaded ${this.archives.size} archives`);
  }
}

// Main function for direct testing
async function main() {
  console.log('🧪 Testing ArchiveService directly...');
  
  const archiveService = new ArchiveService();
  
  // Set the same limits as the working KD test
  archiveService.setCrawlerLimits(5, 25);
  
  const testUrl = 'https://ondemand.kdcollegeprep.com/';
  console.log(`📝 Testing with URL: ${testUrl}`);

  try {
    const result = await archiveService.createArchive(testUrl);
    console.log(`✅ Archive creation result:`, result);
    
    // Wait for the archive to complete
    console.log('⏳ Waiting for archive to complete...');
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = await archiveService.getArchiveStatus(result.id);
      attempts++;
      
      if (status?.status === 'completed') {
        console.log(`🎉 Archive completed successfully in ${attempts} seconds!`);
        console.log(`📋 Final status:`, status);
        break;
      } else if (status?.status === 'failed') {
        console.log(`❌ Archive failed:`, status.error);
        break;
      }
      
      if (attempts % 10 === 0) {
        console.log(`⏰ Still processing... (${attempts}s elapsed)`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log(`⏰ Timeout after ${maxAttempts} seconds`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

// Run main function if this file is executed directly
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Alternative: always run main if this is the entry point
if (process.argv[1]?.endsWith('ArchiveService.ts')) {
  main().catch(console.error);
}