import fs from 'fs/promises';
import path from 'path';
import { Asset } from './AssetExtractor.ts';

export class AssetDownloader {
  
  async downloadAssets(assets: Asset[], archiveId: string): Promise<Map<string, string>> {
    console.log(`📥 Starting download of ${assets.length} assets for archive ${archiveId}`);
    
    // Log all CSS assets being downloaded
    const cssAssets = assets.filter(asset => asset.type === 'css');
    console.log(`🎨 CSS Assets to download (${cssAssets.length}):`);
    cssAssets.forEach((asset, i) => {
      console.log(`   ${i + 1}. ${asset.url}`);
    });
    
    const downloadStartTime = Date.now();
    
    const urlMappings = new Map<string, string>();
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    
    // Create directory structure
    await this.createDirectoryStructure(archiveDir);
    
    let successCount = 0;
    let failedCount = 0;
    const failedAssets: string[] = [];
    
    for (const asset of assets) {
      try {
        const localPath = this.generateLocalPath(asset.url, asset.type, archiveDir);
        await this.downloadFile(asset.url, localPath);
        
        // Store relative path for URL rewriting
        const relativePath = path.relative(archiveDir, localPath);
        urlMappings.set(asset.url, relativePath);
        
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`📥 Downloaded ${successCount}/${assets.length} assets...`);
        }
      } catch (error: any) {
        failedCount++;
        failedAssets.push(asset.url);
        
        // Only show detailed error for non-403 errors or if it's an important asset
        const isImportantAsset = asset.type === 'css' || asset.type === 'js';
        const is403Error = error?.message?.includes('403') || error?.message?.includes('Forbidden');
        
        if (!is403Error || isImportantAsset) {
          console.warn(`❌ Failed to download ${asset.url}:`, error?.message || error);
        }
      }
    }
    
    // Summary report
    const downloadDuration = Date.now() - downloadStartTime;
    console.log(`\n📊 Download Summary (${downloadDuration}ms):`);
    console.log(`   ✅ Successfully downloaded: ${successCount}/${assets.length} assets`);
    console.log(`   ❌ Failed downloads: ${failedCount}/${assets.length} assets`);
    console.log(`   ⚡ Average download time: ${Math.round(downloadDuration / assets.length)}ms per asset`);
    
    // Log CSS mappings specifically
    const cssUrlMappings = Array.from(urlMappings.entries()).filter(([url]) => 
      cssAssets.some(asset => asset.url === url)
    );
    console.log(`\n🎨 CSS URL Mappings (${cssUrlMappings.length}):`);
    cssUrlMappings.forEach(([originalUrl, localPath]) => {
      console.log(`   ${originalUrl} -> ${localPath}`);
    });
    
    if (failedCount > 0) {
      const criticalFailures = failedAssets.filter(url => 
        assets.find(a => a.url === url)?.type === 'css' || 
        assets.find(a => a.url === url)?.type === 'js'
      );
      
      if (criticalFailures.length > 0) {
        console.warn(`⚠️  Critical asset failures (CSS/JS): ${criticalFailures.length}`);
        criticalFailures.forEach(url => console.warn(`   - ${url}`));
      }
      
      const protectedAssets = failedAssets.filter(url => !criticalFailures.includes(url));
      if (protectedAssets.length > 0) {
        console.log(`🔒 Protected/inaccessible assets (normal): ${protectedAssets.length}`);
      }
    }
    
    return urlMappings;
  }

  private async createDirectoryStructure(archiveDir: string): Promise<void> {
    const dirs = [
      path.join(archiveDir, 'pages'),
      path.join(archiveDir, 'assets', 'css'),
      path.join(archiveDir, 'assets', 'js'),
      path.join(archiveDir, 'assets', 'images'),
      path.join(archiveDir, 'assets', 'fonts'),
      path.join(archiveDir, 'assets', 'other')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async downloadFile(url: string, localPath: string): Promise<void> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    await fs.writeFile(localPath, Buffer.from(buffer));
  }

  private generateLocalPath(originalUrl: string, type: Asset['type'], archiveDir: string): string {
    const urlObj = new URL(originalUrl);
    let filename = path.basename(urlObj.pathname) || 'index';
    
    // Handle duplicate filenames by including part of the path or query params
    if (filename === 'style.css' || filename === 'index.css' || filename === 'main.css') {
      // Create a unique filename using URL hash to avoid conflicts
      const urlHash = this.createUrlHash(originalUrl);
      const nameWithoutExt = path.parse(filename).name;
      const ext = path.parse(filename).ext || '.css';
      filename = `${nameWithoutExt}-${urlHash}${ext}`;
    }
    
    // Ensure filename has proper extension
    const finalFilename = this.ensureExtension(filename, type);
    
    // Generate path based on asset type
    const subdir = this.getSubdirectory(type);
    
    return path.join(archiveDir, 'assets', subdir, finalFilename);
  }

  private createUrlHash(url: string): string {
    // Create a short hash from the full URL to ensure uniqueness
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  private ensureExtension(filename: string, type: Asset['type']): string {
    const hasExtension = filename.includes('.');
    
    if (hasExtension) return filename;
    
    const defaultExtensions = {
      css: '.css',
      js: '.js',
      image: '.png',
      font: '.woff2',
      other: '.bin'
    };
    
    return filename + defaultExtensions[type];
  }

  private getSubdirectory(type: Asset['type']): string {
    const subdirs = {
      css: 'css',
      js: 'js',
      image: 'images',
      font: 'fonts',
      other: 'other'
    };
    
    return subdirs[type];
  }

  async savePageContent(url: string, html: string, archiveId: string): Promise<string> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    const pagesDir = path.join(archiveDir, 'pages');
    
    // Generate filename from URL
    const filename = this.generatePageFilename(url);
    const filePath = path.join(pagesDir, filename);
    
    await fs.writeFile(filePath, html, 'utf8');
    return path.relative(archiveDir, filePath);
  }

  private generatePageFilename(url: string): string {
    const urlObj = new URL(url);
    let filename = urlObj.pathname.replace(/\//g, '_');
    
    if (!filename || filename === '_') {
      filename = 'index';
    }
    
    return filename.endsWith('.html') ? filename : `${filename}.html`;
  }
}
