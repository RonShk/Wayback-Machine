import { Router } from 'express';
import archiveRoutes from './archiveRoutes.ts';

const router = Router();

// Mount route modules
router.use('/archive', archiveRoutes);

export default router;
