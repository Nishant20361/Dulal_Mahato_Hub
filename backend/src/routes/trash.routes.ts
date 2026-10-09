import { Router } from 'express';
import {
  listTrash,
  restoreItem,
  deletePermanently,
  emptyTrash,
} from '../controllers/trash.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listTrash);
router.post('/restore', restoreItem);
router.delete('/empty', emptyTrash);
router.delete('/:type/:id', deletePermanently);

export default router;
