import { Router } from 'express';
import {
  listFiles,
  uploadFile,
  getFileContent,
  downloadFile,
  renameFile,
  moveFile,
  trashFile,
  upload,
} from '../controllers/files.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Streaming endpoint allows token in query param for HTML5 video/audio/iframe previews
router.get('/:id/content', optionalAuth, getFileContent);

// All other endpoints require full auth
router.use(requireAuth);

router.get('/', listFiles);
router.post('/upload', upload.array('files'), uploadFile);
router.get('/:id/download', downloadFile);
router.patch('/:id', renameFile);
router.post('/:id/move', moveFile);
router.delete('/:id', trashFile);

export default router;
