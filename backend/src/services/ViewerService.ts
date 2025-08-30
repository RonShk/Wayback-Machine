import fs from 'fs/promises';
import path from 'path';
import { ArchiveService } from './ArchiveService.ts';

export class ViewerService {
  private archiveService: ArchiveService;

  constructor(archiveService?: ArchiveService) {
    this.archiveService = archiveService || new ArchiveService();
  }

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
      
      // Return the HTML with base tag and error suppression
      const baseTag = `<base href="/api/archives/view/${archiveId}/">`;
      const errorSuppressionScript = `
<script>
// Suppress chunk loading errors and other common archive errors
(function() {
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    // Suppress common chunk loading and asset errors
    if (message.includes('ChunkLoadError') || 
        message.includes('Loading chunk') || 
        message.includes('Failed to fetch') ||
        message.includes('404') ||
        message.includes('net::ERR_')) {
      return; // Don't log these errors
    }
    originalError.apply(console, args);
  };
  
  // Suppress unhandled promise rejections for chunk loading
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('ChunkLoadError') || 
         event.reason.message.includes('Loading chunk'))) {
      event.preventDefault();
    }
  });
})();
</script>`;
      
      let modifiedHtml = html;
      
      // Add base tag and error suppression after <head>
      if (modifiedHtml.includes('<head>')) {
        modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${baseTag}${errorSuppressionScript}`);
      }

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
        // Log missing assets but don't spam the console
        if (Math.random() < 0.01) { // Only log 1% of missing assets to avoid spam
          console.log(`📄 Missing asset: ${assetPath} for archive ${archiveId}`);
        }
        
        // Return a fallback for JavaScript files to prevent endless errors
        if (assetPath.endsWith('.js')) {
          return {
            data: Buffer.from('// Missing JavaScript chunk - archived version not available\nconsole.warn("Missing JS chunk:", "' + assetPath + '");'),
            contentType: 'application/javascript'
          };
        }
        
        // Return a fallback for CSS files
        if (assetPath.endsWith('.css')) {
          return {
            data: Buffer.from('/* Missing CSS file - archived version not available */'),
            contentType: 'text/css'
          };
        }
        
        // Return a fallback for 3D model files
        if (assetPath.endsWith('.glb') || assetPath.endsWith('.gltf')) {
          return {
            data: Buffer.from(''), // Empty buffer for missing 3D models
            contentType: 'model/gltf-binary'
          };
        }
        
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
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.obj': 'text/plain',
      '.fbx': 'application/octet-stream',
      '.dae': 'model/vnd.collada+xml',
      '.3ds': 'application/octet-stream',
      '.ply': 'application/octet-stream',
      '.stl': 'application/octet-stream',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
