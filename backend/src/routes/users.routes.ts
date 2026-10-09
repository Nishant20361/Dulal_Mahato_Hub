import { Router } from 'express';
import {
  updateProfile,
  changePassword,
  getStorageUsage,
} from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);
router.get('/storage', getStorageUsage);

export default router;
