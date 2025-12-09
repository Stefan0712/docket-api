import mongoose, { Schema, Document } from 'mongoose';

export type ActivityCategory = 'GROUP' | 'CONTENT' | 'INTERACTION';

export interface IActivityLog extends Document {
  groupId: mongoose.Types.ObjectId;
  createdAt: Date;
  category: ActivityCategory;
  
  message: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;

  metadata?: {
    listId?: string;
    itemId?: string;
    noteId?: string;
    pollId?: string;
  };
}

const ActivityLogSchema: Schema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true }, 
    category: { 
      type: String, 
      enum: ['GROUP', 'CONTENT', 'INTERACTION'], 
      required: true 
    },
    message: { type: String, required: true },
    metadata: {
      listId: String,
      itemId: String,
      noteId: String,
      pollId: String
    }
  },
  { timestamps: true }
);
ActivityLogSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);