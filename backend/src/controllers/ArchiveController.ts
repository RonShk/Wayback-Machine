import { Request, Response } from 'express';
import { ArchiveService } from '../services/ArchiveService.ts';

export class ArchiveController {
  private archiveService: ArchiveService;

  constructor() {
    this.archiveService = new ArchiveService();
  }

  archiveUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;
      
      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const result = await this.archiveService.createArchive(url);
      res.json(result);
    } catch (error) {
      console.error('Archive creation failed:', error);
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
}
