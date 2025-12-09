import mongoose, { Schema, Document } from 'mongoose';

export interface IVote {
  userId: mongoose.Types.ObjectId;
  answer: string;
}

export interface IPollOption {
  _id: string;
  text: string;
  votes: IVote[];
}

export interface IPoll extends Document {
  groupId: mongoose.Types.ObjectId;
  question: string;
  options: IPollOption[];
  createdAt: Date;
  updatedAt: Date;
}

const PollSchema: Schema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    question: { type: String, required: true, trim: true },
    options: [
      {
        text: { type: String, required: true },
        votes: [
          {
            userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            answer: { type: String, required: true }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

PollSchema.index({ groupId: 1 });

export default mongoose.model<IPoll>('Poll', PollSchema);