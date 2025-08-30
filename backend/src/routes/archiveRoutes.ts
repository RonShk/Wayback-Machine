import { Router } from 'express';
import { ArchiveController } from '../controllers/ArchiveController.ts';

const router = Router();
const archiveController = new ArchiveController();

// Archive routes
router.post('/url', archiveController.archiveUrl);
router.get('/status/:id', archiveController.getArchiveStatus);
router.get('/list', archiveController.listArchives);

// Viewer routes
router.get('/view/:id', archiveController.viewArchive);
router.get('/view/:id/pages', archiveController.getArchivePages);
router.get('/view/:id/assets/:folder/:file', archiveController.getArchiveAsset);
router.get('/view/:id/assets/:file', archiveController.getArchiveAsset);

export default router;
