import { Request, Response } from 'express';
import Poll from '../models/Poll';
import Group from '../models/Group';
import { AuthRequest } from '../middleware/authMiddleware';

const isMember = async (groupId: string, userId: string) => {
    const group = await Group.findOne({ _id: groupId, 'members.userId': userId });
    return !!group;
};

export const createPoll = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, question, options } = req.body;

    if (!await isMember(groupId, req.user.id)) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    const formattedOptions = options.map((opt: string) => ({
        text: opt,
        votes: []
    }));

    const newPoll = await Poll.create({
      groupId,
      question,
      options: formattedOptions
    });

    res.status(201).json(newPoll);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating poll' });
  }
};

export const getPolls = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.query;

    if (!groupId) return res.status(400).json({ message: 'Group ID required' });

    if (!await isMember(groupId as string, req.user.id)) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    const polls = await Poll.find({ groupId })
      .sort({ createdAt: -1 });

    res.status(200).json(polls);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching polls' });
  }
};

export const vote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Poll ID
    const { optionId } = req.body;

    const poll = await Poll.findById(id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    if (!await isMember(poll.groupId.toString(), req.user.id)) {
        return res.status(403).json({ message: 'Not authorized to vote' });
    }

    // Clear Previous Votes
    poll.options.forEach(opt => {
        opt.votes = opt.votes.filter(v => v.userId.toString() !== req.user.id);
    });

    // Add New Vote
    const targetOption = poll.options.find(opt => opt._id.toString() === optionId);
    
    if (targetOption) {
        targetOption.votes.push({
            userId: req.user.id,
            answer: targetOption.text
        });
    } else {
        return res.status(404).json({ message: 'Option not found' });
    }

    await poll.save();
    res.status(200).json(poll);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error voting' });
  }
};

export const deletePoll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findById(id);
    
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    // Check permissions 
    if (!await isMember(poll.groupId.toString(), req.user.id)) {
         return res.status(403).json({ message: 'Not authorized' });
    }

    await poll.deleteOne();
    res.status(200).json({ message: 'Poll deleted' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting poll' });
  }
};