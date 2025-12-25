import express from 'express';
import { 
  createPoll, 
  getGroupPolls, 
  getPollById, 
  votePoll, 
  addPollOption, 
  deletePoll 
} from '../controllers/pollController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.get('/group/:groupId', getGroupPolls);
router.post('/', createPoll);
router.get('/:id', getPollById);
router.delete('/:id', deletePoll);
router.post('/vote', votePoll);
router.post('/option', addPollOption);

export default router;