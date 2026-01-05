import mongoose from "mongoose";
import { INotification, INotificationMetadata, NotificationModel } from "../models/Notification";

interface CreateNotificationParams {
  recipientId: string | mongoose.Types.ObjectId;
  authorId?: string | mongoose.Types.ObjectId;
  groupId?: string | mongoose.Types.ObjectId;
  category: 'ASSIGNMENT' | 'MENTION' | 'GROUP' | 'REMINDER';
  message: string;
  metadata?: INotificationMetadata;
}

// Generates and saves a new notification to the database.
export const createNotification = async (params: CreateNotificationParams): Promise<INotification> => {
  try {
    const notification = new NotificationModel({
      recipientId: params.recipientId,
      authorId: params.authorId,
      groupId: params.groupId,
      category: params.category,
      message: params.message,
      metadata: params.metadata || {}, 
      isRead: false,
    });

    const savedNotification = await notification.save();
    return savedNotification;
  } catch (error) {
    console.error('Error generating notification:', error);
    throw new Error('Could not create notification');
  }
};