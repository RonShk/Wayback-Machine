import { Router, Request, Response } from 'express';
import { ArchiveController } from '../controllers/ArchiveController.ts';

const router = Router();
const archiveController = new ArchiveController();

// Archive routes
router.post('/url', archiveController.archiveUrl);
router.get('/status/:id', archiveController.getArchiveStatus);
router.get('/list', archiveController.listArchives);

// Versioning routes
router.post('/rearchive', archiveController.reArchiveUrl);
router.get('/versions', archiveController.getArchiveVersions);

// Viewer routes - specific routes must come BEFORE the catch-all
router.get('/view/:id/pages', archiveController.getArchivePages);
router.get('/view/:id', archiveController.viewArchive);

// Handle all other requests with middleware that checks the path
router.use('/view/:id', (req, res, next) => {
  // Check if this is exactly /view/:id or /view/:id/pages
  const viewPath = `/api/archives/view/${req.params.id}`;
  const fullPath = req.originalUrl || req.url;
  
  // Skip if this is exactly the base view path (handled above)
  if (fullPath === viewPath || fullPath === `${viewPath}/`) {
    return next();
  }
  // Skip if this is the pages endpoint (handled above)  
  if (fullPath === `${viewPath}/pages`) {
    return next();
  }
  
  // Otherwise, handle as archived resource
  archiveController.getArchivedResource(req, res);
});

export default router;