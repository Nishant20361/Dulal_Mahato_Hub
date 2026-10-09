import { Router } from 'express';
import { getRecentActivity } from '../controllers/recent.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/', getRecentActivity);

export default router;
