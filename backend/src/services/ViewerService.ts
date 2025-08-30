import fs from 'fs/promises';
import path from 'path';
import { ArchiveService } from './ArchiveService.ts';

export class ViewerService {
  private archiveService = new ArchiveService();

  /**
   * Get the main HTML page for an archived website
   */
  async getArchivedPage(archiveId: string, pagePath?: string): Promise<{ html: string; contentType: string } | null> {
    try {
      // Verify archive exists and is completed
      const archive = await this.archiveService.getArchiveStatus(archiveId);
      if (!archive || archive.status !== 'completed') {
        return null;
      }

      const archiveDir = path.join(process.cwd(), 'archives', archiveId);
      const pagesDir = path.join(archiveDir, 'pages');

      // If no specific page requested, try to find index page
      let targetFile: string;
      if (!pagePath) {
        // Look for index.html or the first available HTML file
        const files = await fs.readdir(pagesDir);
        const indexFile = files.find(f => f === 'index.html') || files.find(f => f.endsWith('.html'));
        if (!indexFile) {
          return null;
        }
        targetFile = path.join(pagesDir, indexFile);
      } else {
        targetFile = path.join(pagesDir, pagePath);
      }

      // Check if file exists
      try {
        await fs.access(targetFile);
      } catch {
        return null;
      }

      const html = await fs.readFile(targetFile, 'utf8');
      
      // Inject base tag and viewer scripts to handle navigation
      const modifiedHtml = this.injectViewerEnhancements(html, archiveId);

      return {
        html: modifiedHtml,
        contentType: 'text/html'
      };
    } catch (error) {
      console.error('Failed to get archived page:', error);
      return null;
    }
  }

  /**
   * Get an asset file (CSS, JS, images, etc.) from an archived website
   */
  async getArchivedAsset(archiveId: string, assetPath: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      // Verify archive exists and is completed
      const archive = await this.archiveService.getArchiveStatus(archiveId);
      if (!archive || archive.status !== 'completed') {
        return null;
      }

      const archiveDir = path.join(process.cwd(), 'archives', archiveId);
      const assetFile = path.join(archiveDir, 'assets', assetPath);

      // Security check: ensure the path is within the archive directory
      const resolvedPath = path.resolve(assetFile);
      const archivePath = path.resolve(archiveDir);
      if (!resolvedPath.startsWith(archivePath)) {
        return null;
      }

      // Check if file exists
      try {
        await fs.access(assetFile);
      } catch {
        return null;
      }

      const data = await fs.readFile(assetFile);
      const contentType = this.getContentType(assetPath);

      return { data, contentType };
    } catch (error) {
      console.error('Failed to get archived asset:', error);
      return null;
    }
  }

  /**
   * List all available pages in an archive
   */
  async getArchivePages(archiveId: string): Promise<string[] | null> {
    try {
      const archive = await this.archiveService.getArchiveStatus(archiveId);
      if (!archive || archive.status !== 'completed') {
        return null;
      }

      const pagesDir = path.join(process.cwd(), 'archives', archiveId, 'pages');
      const files = await fs.readdir(pagesDir);
      
      return files.filter(f => f.endsWith('.html'));
    } catch (error) {
      console.error('Failed to list archive pages:', error);
      return null;
    }
  }

  /**
   * Inject viewer enhancements into the HTML
   */
  private injectViewerEnhancements(html: string, archiveId: string): string {
    // Add base tag to ensure relative URLs work correctly for assets
    const baseTag = `<base href="/api/archives/view/${archiveId}/assets/">`;
    
    // Add viewer notification banner
    const viewerBanner = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #1f2937;
        color: white;
        padding: 8px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        📸 Archived Snapshot • 
        <a href="/search" style="color: #60a5fa; text-decoration: none;" target="_parent">← Back to Archives</a>
      </div>
      <div style="height: 40px;"></div>
    `;

    // Inject the enhancements into the HTML
    let modifiedHtml = html;
    
    // Add base tag after <head>
    if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${baseTag}`);
    }
    
    // Add banner after <body>
    if (modifiedHtml.includes('<body>')) {
      modifiedHtml = modifiedHtml.replace('<body>', `<body>\n${viewerBanner}`);
    } else if (modifiedHtml.includes('<body ')) {
      modifiedHtml = modifiedHtml.replace(/(<body[^>]*>)/, `$1\n${viewerBanner}`);
    }

    return modifiedHtml;
  }

  /**
   * Get appropriate content type for file extension
   */
  private getContentType(filePath: string): string {
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
      '.eot': 'application/vnd.ms-fontobject',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
