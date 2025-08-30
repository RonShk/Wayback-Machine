import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService.ts';
import { ViewerService } from '../services/ViewerService.ts';

export class ArchiveController {
  private archiveService: ArchiveService;
  private viewerService: ViewerService;

  constructor() {
    this.archiveService = new ArchiveService();
    this.viewerService = new ViewerService();
    
    // Set crawler limits to match the working direct test
    this.archiveService.setCrawlerLimits(100, 100); // depth=5, maxPages=25 (same as direct test)
    console.log('🎛️ ArchiveController initialized with crawler limits: depth=5, maxPages=25');
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

  getArchiveAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, folder, subfolder, file } = req.params;
      
      // Build the asset path based on available parameters
      let assetPath: string;
      if (subfolder && file) {
        // Handle deeply nested paths: /assets/folder/subfolder/file
        assetPath = `${folder}/${subfolder}/${file}`;
      } else if (folder && file) {
        // Handle nested paths: /assets/folder/file
        assetPath = `${folder}/${file}`;
      } else if (folder) {
        // Handle direct file access: /assets/file (where folder is actually the file)
        assetPath = folder;
      } else {
        res.status(400).json({ error: 'Invalid asset path' });
        return;
      }
      
      console.log(`🎯 Serving asset: ${assetPath} for archive ${id}`);
      
      const result = await this.viewerService.getArchivedAsset(id, assetPath);
      
      if (!result) {
        console.log(`❌ Asset not found: ${assetPath}`);
        res.status(404).json({ error: 'Asset not found' });
        return;
      }

      res.setHeader('Content-Type', result.contentType);
      res.send(result.data);
    } catch (error) {
      console.error('Failed to get archive asset:', error);
      res.status(500).json({ error: 'Failed to get archive asset' });
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
}
