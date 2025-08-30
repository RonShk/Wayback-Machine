import { Router } from 'express';
import archiveRoutes from './archiveRoutes.ts';

const router = Router();

// Mount route modules
router.use('/archives', archiveRoutes);

export default router;
