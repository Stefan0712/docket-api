import { Request, Response } from 'express';
import User, { IUser } from '../models/User';

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { username, avatarUrl } = req.body;
    const userId = (req as any).user.id;
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        username, 
        avatarUrl 
      }, 
      { new: true, runValidators: true }
    ).select('-password');
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(updatedUser);

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }
    const currentUserId = (req as any).user.id;

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: currentUserId } 
    })
    .select('username email avatarUrl _id')
    .limit(10);

    res.status(200).json(users);

  } catch (error) {
    console.error('Search User Error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
};