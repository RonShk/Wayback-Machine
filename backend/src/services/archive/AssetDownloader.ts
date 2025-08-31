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
    
    let successCount = 0;
    let failedCount = 0;
    const failedAssets: string[] = [];
    
    for (const asset of assets) {
      try {
        // First, check if the URL exists to avoid unnecessary 404s
        const exists = await this.checkUrlExists(asset.url);
        if (!exists) {
          failedCount++;
          failedAssets.push(asset.url);
          
          // Only log missing important assets
          const isImportantAsset = asset.type === 'css' || asset.type === 'js';
          if (isImportantAsset && Math.random() < 0.1) { // Log 10% of missing important assets
            console.log(`⚠️ Asset does not exist: ${asset.url}`);
          }
          continue;
        }
        
        const localPath = this.generateLocalPathPreservingStructure(asset.url, archiveDir);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        
        await this.downloadFile(asset.url, localPath);
        
        // Store relative path for URL rewriting (relative to archive root)
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

  /**
   * Generate local path preserving the original URL structure
   */
  private generateLocalPathPreservingStructure(originalUrl: string, archiveDir: string): string {
    const urlObj = new URL(originalUrl);
    let urlPath = urlObj.pathname;
    
    // Remove leading slash
    if (urlPath.startsWith('/')) {
      urlPath = urlPath.substring(1);
    }
    
    // Handle empty path (root level files)
    if (!urlPath) {
      urlPath = 'index';
    }
    
    // Handle query parameters by creating a unique filename
    if (urlObj.search) {
      const queryHash = this.createUrlHash(originalUrl);
      const pathParts = urlPath.split('/');
      const filename = pathParts.pop() || 'file';
      const nameWithoutExt = path.parse(filename).name;
      const ext = path.parse(filename).ext || this.getDefaultExtension(originalUrl);
      pathParts.push(`${nameWithoutExt}-${queryHash}${ext}`);
      urlPath = pathParts.join('/');
    }
    
    // Ensure file has an extension
    if (!path.extname(urlPath)) {
      urlPath += this.getDefaultExtension(originalUrl);
    }
    
    return path.join(archiveDir, urlPath);
  }
  
  /**
   * Get default extension based on URL or content type
   */
  private getDefaultExtension(url: string): string {
    if (url.includes('css') || url.includes('stylesheet')) return '.css';
    if (url.includes('js') || url.includes('javascript')) return '.js';
    if (url.includes('png')) return '.png';
    if (url.includes('jpg') || url.includes('jpeg')) return '.jpg';
    if (url.includes('gif')) return '.gif';
    if (url.includes('svg')) return '.svg';
    if (url.includes('woff')) return '.woff';
    if (url.includes('woff2')) return '.woff2';
    if (url.includes('ttf')) return '.ttf';
    return '.bin'; // fallback
  }

  /**
   * Check if a URL exists without downloading the full content
   */
  private async checkUrlExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.ok;
    } catch {
      // If HEAD fails, try GET with a small range to minimize data transfer
      try {
        const response = await fetch(url, {
          headers: {
            'Range': 'bytes=0-0',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        return response.ok || response.status === 206; // 206 = Partial Content
      } catch {
        return false;
      }
    }
  }

  private async downloadFile(url: string, localPath: string): Promise<void> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
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
      model: '.glb',
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
      model: 'models',
      other: 'other'
    };
    
    return subdirs[type];
  }

  async savePageContent(url: string, html: string, archiveId: string, pagePath?: string): Promise<string> {
    const archiveDir = path.join(process.cwd(), 'archives', archiveId);
    
    // Use provided path or generate from URL
    const relativePath = pagePath || this.generatePagePath(url);
    const filePath = path.join(archiveDir, relativePath);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    await fs.writeFile(filePath, html, 'utf8');
    return relativePath;
  }

  private generatePagePath(url: string): string {
    const urlObj = new URL(url);
    let urlPath = urlObj.pathname;
    
    // Handle root path
    if (urlPath === '/' || urlPath === '') {
      return 'index.html';
    }
    
    // Remove leading slash
    if (urlPath.startsWith('/')) {
      urlPath = urlPath.substring(1);
    }
    
    // If path ends with slash, add index.html
    if (urlPath.endsWith('/')) {
      urlPath += 'index.html';
    }
    
    // If path doesn't have an extension, add .html
    if (!path.extname(urlPath)) {
      urlPath += '.html';
    }
    
    return urlPath;
  }
}
