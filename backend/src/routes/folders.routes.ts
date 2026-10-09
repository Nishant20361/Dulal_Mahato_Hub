import { Router } from 'express';
import {
  listFolders,
  createFolder,
  getFolder,
  renameFolder,
  moveFolder,
  trashFolder,
} from '../controllers/folders.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listFolders);
router.post('/', createFolder);
router.get('/:id', getFolder);
router.patch('/:id', renameFolder);
router.post('/:id/move', moveFolder);
router.delete('/:id', trashFolder);

export default router;
