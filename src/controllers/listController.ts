import { Request, Response } from 'express';
import ShoppingList, { IShoppingList } from '../models/ShoppingList';
import { AuthRequest } from '../middleware/authMiddleware';

export const createList = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, color, groupId, isPinned } = req.body;
    
    const newList = await ShoppingList.create({
      userId: req.user.id,
      name,
      description,
      color,
      groupId: groupId || null,
      isPinned: isPinned || false,
      isDeleted: false
    });

    res.status(201).json(newList);

  } catch (error) {
    console.error('Create List Error:', error);
    res.status(500).json({ message: 'Server error creating list' });
  }
};

export const getLists = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { since, groupId } = req.query;

    // Build the query
    // Must belong to this user
    const query: any = { userId };

    // Filter by specific Group
    if (groupId) {
      query.groupId = groupId;
    }

    // 3. SYNC LOGIC
    if (since) {
      query.updatedAt = { $gt: new Date(since as string) };
    } else {
      query.isDeleted = false;
    }

    const lists = await ShoppingList.find(query).sort({ updatedAt: -1 });

    res.status(200).json(lists);

  } catch (error) {
    console.error('Get Lists Error:', error);
    res.status(500).json({ message: 'Server error fetching lists' });
  }
};


export const getListById = async (req: AuthRequest, res: Response) => {
  try {
    const list = await ShoppingList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }

    if (list.userId.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Not authorized to view this list' });
    }

    res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateList = async (req: AuthRequest, res: Response) => {
  try {
    const list = await ShoppingList.findById(req.params.id);

    if (!list) return res.status(404).json({ message: 'List not found' });

    // Security Check
    if (list.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update fields
    const updatedList = await ShoppingList.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } 
    );

    res.status(200).json(updatedList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating list' });
  }
};

export const deleteList = async (req: AuthRequest, res: Response) => {
  try {
    const list = await ShoppingList.findById(req.params.id);

    if (!list) return res.status(404).json({ message: 'List not found' });

    if (list.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    list.isDeleted = true;
    await list.save();

    res.status(200).json({ message: 'List removed', id: list._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting list' });
  }
};