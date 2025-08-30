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

// Viewer routes
router.get('/view/:id', archiveController.viewArchive);
router.get('/view/:id/pages', archiveController.getArchivePages);
// Handle direct page access (e.g., /view/123/_dashboard_.html)
router.get('/view/:id/:page', archiveController.viewArchive);
// Handle nested asset paths (e.g., /assets/css/style.css, /assets/js/script.js, /assets/images/logo.png)
router.get('/view/:id/assets/:folder/:file', archiveController.getArchiveAsset);
router.get('/view/:id/assets/:file', archiveController.getArchiveAsset);
// Handle deeply nested asset paths (e.g., /assets/fonts/subfolder/font.woff)
router.get('/view/:id/assets/:folder/:subfolder/:file', archiveController.getArchiveAsset);

// Note: Removed wildcard routes as they cause Express routing issues
// Fallback handling is done in the ArchiveController instead

export default router;
