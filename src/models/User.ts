import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  googleId?: string; 
  createdAt: Date;
  updatedAt: Date;
}
const UserSchema: Schema = new Schema(
  {
    username: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String,
      required: function(this: any) { return !this.googleId; } 
    },
    avatarUrl: { 
      type: String, 
      default: '' 
    },
    googleId: { 
      type: String, 
      unique: true, 
      sparse: true 
    }
  },
  { 
    timestamps: true
  }
);
export default mongoose.model<IUser>('User', UserSchema);