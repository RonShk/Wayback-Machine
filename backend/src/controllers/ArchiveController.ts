import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService.ts';
import { ViewerService } from '../services/ViewerService.ts';

export class ArchiveController {
  private archiveService: ArchiveService;
  private viewerService: ViewerService;

  constructor() {
    this.archiveService = new ArchiveService();
    this.viewerService = new ViewerService(this.archiveService); // Pass the same instance
    
    // Set crawler limits for comprehensive archiving
    this.archiveService.setCrawlerLimits(500, 1000); // depth=500, maxPages=1000 for thorough archiving
    console.log('🎛️ ArchiveController initialized with crawler limits: depth=500, maxPages=1000');
  }

  archiveUrl = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
      const { url } = req.body;
      console.log(`🚀 [${new Date().toISOString()}] Archive request received for: ${url}`);
      
      if (!url) {
        console.log('❌ Archive request rejected: No URL provided');
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      console.log(`📝 Creating archive for: ${url}`);
      console.log(`🎛️ Using ArchiveController with service instance:`, !!this.archiveService);
      const result = await this.archiveService.createArchive(url);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Archive creation initiated in ${duration}ms. ID: ${result.id}`);
      
      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Archive creation failed after ${duration}ms:`, error);
      res.status(500).json({ error: 'Failed to create archive' });
    }
  };

  getArchiveStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await this.archiveService.getArchiveStatus(id);
      
      if (!status) {
        res.status(404).json({ error: 'Archive not found' });
        return;
      }

      res.json(status);
    } catch (error) {
      console.error('Failed to get archive status:', error);
      res.status(500).json({ error: 'Failed to get archive status' });
    }
  };

  listArchives = async (req: Request, res: Response): Promise<void> => {
    try {
      const archives = await this.archiveService.listArchives();
      res.json(archives);
    } catch (error) {
      console.error('Failed to list archives:', error);
      res.status(500).json({ error: 'Failed to list archives' });
    }
  };

  // Viewer endpoints
  viewArchive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, page: urlPage } = req.params;
      const { page: queryPage } = req.query;
      
      // Use page from URL path if available, otherwise use query parameter
      const pagePath = urlPage || queryPage as string;
      
      const result = await this.viewerService.getArchivedPage(id, pagePath);
      
      if (!result) {
        res.status(404).json({ error: 'Archive or page not found' });
        return;
      }

      res.setHeader('Content-Type', result.contentType);
      res.send(result.html);
    } catch (error) {
      console.error('Failed to view archive:', error);
      res.status(500).json({ error: 'Failed to view archive' });
    }
  };

  getArchivedResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Extract the resource path from the URL
      const fullPath = req.originalUrl || req.url;
      const viewPrefix = `/api/archives/view/${id}/`;
      let resourcePath = '';
      
      if (fullPath.startsWith(viewPrefix)) {
        resourcePath = fullPath.substring(viewPrefix.length);
      } else {
        // Fallback: try to extract from path
        const pathParts = req.path.split('/');
        const viewIndex = pathParts.findIndex(part => part === 'view');
        if (viewIndex >= 0 && pathParts[viewIndex + 2]) {
          resourcePath = pathParts.slice(viewIndex + 2).join('/');
        }
      }
      
      // Handle empty path
      if (!resourcePath) {
        res.status(400).json({ error: 'Invalid resource path' });
        return;
      }
      
      // Only log resource requests occasionally to avoid spam
      if (Math.random() < 0.05) { // Log 5% of resource requests
        console.log(`🎯 Serving resource: ${resourcePath} for archive ${id}`);
      }
      
      // First, try to serve as an HTML page
      if (resourcePath.endsWith('.html') || resourcePath.endsWith('/') || !resourcePath.includes('.')) {
        const pageResult = await this.viewerService.getArchivedPage(id, resourcePath);
        if (pageResult) {
          res.setHeader('Content-Type', pageResult.contentType);
          res.send(pageResult.html);
          return;
        }
      }
      
      // Otherwise, try to serve as an asset
      const assetResult = await this.viewerService.getArchivedAsset(id, resourcePath);
      
      if (!assetResult) {
        // For missing assets, return empty content with appropriate type instead of 404
        const ext = resourcePath.split('.').pop()?.toLowerCase();
        if (ext === 'js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.send('// Missing JavaScript file - archived version not available');
          return;
        } else if (ext === 'css') {
          res.setHeader('Content-Type', 'text/css');
          res.send('/* Missing CSS file - archived version not available */');
          return;
        } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
          // Return a 1x1 transparent PNG for missing images
          res.setHeader('Content-Type', 'image/png');
          res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
          return;
        } else if (['glb', 'gltf', 'obj', 'fbx', 'dae', '3ds', 'ply', 'stl'].includes(ext || '')) {
          // Return empty content for missing 3D model files
          res.setHeader('Content-Type', ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json');
          res.send(Buffer.alloc(0));
          return;
        }
        
        // Only log missing non-JS/CSS assets occasionally
        if (Math.random() < 0.01) {
          console.log(`❌ Resource not found: ${resourcePath}`);
        }
        res.status(404).json({ error: 'Resource not found' });
        return;
      }

      res.setHeader('Content-Type', assetResult.contentType);
      res.send(assetResult.data);
    } catch (error) {
      console.error('Failed to get archived resource:', error);
      res.status(500).json({ error: 'Failed to get archived resource' });
    }
  };

  getArchivePages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const pages = await this.viewerService.getArchivePages(id);
      
      if (!pages) {
        res.status(404).json({ error: 'Archive not found' });
        return;
      }

      res.json({ pages });
    } catch (error) {
      console.error('Failed to get archive pages:', error);
      res.status(500).json({ error: 'Failed to get archive pages' });
    }
  };

  // Versioning endpoints
  reArchiveUrl = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
      const { url } = req.body;
      console.log(`🔄 [${new Date().toISOString()}] Re-archive request received for: ${url}`);
      
      if (!url) {
        console.log('❌ Re-archive request rejected: No URL provided');
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      console.log(`📝 Re-archiving URL: ${url}`);
      const result = await this.archiveService.reArchiveUrl(url);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Re-archive creation initiated in ${duration}ms. ID: ${result.id}, Version: ${result.version}`);
      
      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Re-archive creation failed after ${duration}ms:`, error);
      res.status(500).json({ error: 'Failed to re-archive URL' });
    }
  };

  getArchiveVersions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL parameter is required' });
        return;
      }

      const versions = await this.archiveService.getArchiveVersionsForUrl(url);
      res.json(versions);
    } catch (error) {
      console.error('Failed to get archive versions:', error);
      res.status(500).json({ error: 'Failed to get archive versions' });
    }
  };
}
