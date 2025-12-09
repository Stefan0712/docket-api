import mongoose, { Schema, Document } from 'mongoose';

export interface IShoppingList extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  color: string;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShoppingListSchema: Schema = new Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      default: '' 
    },
        userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    groupId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Group', 
      default: null 
    },
        color: { 
      type: String, 
      default: '#4D96FF'
    },
    isPinned: { 
      type: Boolean, 
      default: false 
    },
    isDeleted: { 
      type: Boolean, 
      default: false 
    }
  },
  { 
    timestamps: true 
  }
);

ShoppingListSchema.index({ userId: 1, updatedAt: 1 });
ShoppingListSchema.index({ groupId: 1 });

export default mongoose.model<IShoppingList>('ShoppingList', ShoppingListSchema);