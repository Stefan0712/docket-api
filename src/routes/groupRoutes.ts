import express from 'express';
import { 
  createGroup, 
  getMyGroups, 
  getGroupById, 
  addMember, 
  leaveGroup 
} from '../controllers/groupController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createGroup)
  .get(getMyGroups);

router.get('/:id', getGroupById);
router.post('/:id/invite', addMember);
router.delete('/:id/leave', leaveGroup);

export default router;