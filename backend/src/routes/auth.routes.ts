import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
  checkUsernameAvailability,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.get('/check-username', checkUsernameAvailability);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;
