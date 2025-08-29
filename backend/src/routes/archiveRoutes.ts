import { Router } from 'express';
import { ArchiveController } from '../controllers/ArchiveController.ts';

const router = Router();
const archiveController = new ArchiveController();

// Archive routes
router.post('/url', archiveController.archiveUrl);
router.get('/status/:id', archiveController.getArchiveStatus);
router.get('/list', archiveController.listArchives);

export default router;
