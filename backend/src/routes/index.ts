import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import foldersRoutes from './folders.routes';
import filesRoutes from './files.routes';
import notesRoutes from './notes.routes';
import trashRoutes from './trash.routes';
import searchRoutes from './search.routes';
import recentRoutes from './recent.routes';
import usersRoutes from './users.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/folders', foldersRoutes);
router.use('/files', filesRoutes);
router.use('/notes', notesRoutes);
router.use('/trash', trashRoutes);
router.use('/search', searchRoutes);
router.use('/recent', recentRoutes);
router.use('/users', usersRoutes);

export default router;
