import { Router } from 'express';
import {
  listNotes,
  createNote,
  getNote,
  updateNote,
  togglePinNote,
  trashNote,
} from '../controllers/notes.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listNotes);
router.post('/', createNote);
router.get('/:id', getNote);
router.put('/:id', updateNote);
router.patch('/:id/pin', togglePinNote);
router.delete('/:id', trashNote);

export default router;
