import { Response } from 'express';
import { NotificationModel } from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { lastSyncTime } = req.query;

    let query: any = { recipientId: userId };

    if (lastSyncTime && typeof lastSyncTime === 'string') {
      const date = new Date(lastSyncTime);
      if (!isNaN(date.getTime())) {
        query.createdAt = { $gt: date };
      }
    }

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await NotificationModel.deleteOne({ 
      _id: id, 
      recipientId: req.user.id 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting notification' });
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    await NotificationModel.deleteMany({ recipientId: req.user.id });

    res.status(200).json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear All Error:', error);
    res.status(500).json({ message: 'Server error clearing notifications' });
  }
};