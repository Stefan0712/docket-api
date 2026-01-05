const express = require('express');
import { 
  getNotifications, 
  deleteNotification, 
  clearAllNotifications
} from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.delete('/clear-all', clearAllNotifications);
router.delete('/:id', deleteNotification);

export default router;