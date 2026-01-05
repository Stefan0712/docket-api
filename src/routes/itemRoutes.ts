import express from 'express';
import { 
  createItem, 
  getItems, 
  updateItem, 
  deleteItem, 
  toggleCheck,
  togglePin,
  assignItem,
  getAssignedItems
} from '../controllers/itemController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/assigned', getAssignedItems);

router.route('/')
  .post(createItem)
  .get(getItems);

router.route('/:id')
  .patch(updateItem)
  .delete(deleteItem);


router.patch('/:id/toggleCheck', toggleCheck);
router.patch('/:id/togglePin', togglePin);
router.patch('/:id/assign', assignItem);


  
export default router;