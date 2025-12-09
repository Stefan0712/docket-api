import { Request, Response } from 'express';
import Group, { IGroup, IGroupMember } from '../models/Group';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import mongoose from 'mongoose';


export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    // Automatically add the Creator as the first Member (Owner)
    const newGroup = await Group.create({
      name,
      description,
      authorId: req.user.id,
      members: [
        {
          userId: req.user.id,
          role: 'owner',
          joinedAt: new Date()
        }
      ]
    });

    res.status(201).json(newGroup);

  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

export const getMyGroups = async (req: AuthRequest, res: Response) => {
  try {
    const groups = await Group.find({
      'members.userId': req.user.id
    })
    .sort({ updatedAt: -1 });

    res.status(200).json(groups);

  } catch (error) {
    console.error('Get Groups Error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch Group
    const group: IGroup | null = await Group.findById(id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Security Check
    const isMember = group.members.some(
      (m) => m.userId.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    // Populate Member Details (Username, Avatar)
    await group.populate('members.userId', 'username avatarUrl email');

    res.status(200).json(group);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Group ID
    const { email } = req.body; // User to invite

    // Find Group
    const group: IGroup | null = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Check Permissions
    const currentUserMember = group.members.find(
      (m) => m.userId.toString() === req.user.id
    );
    
    if (!currentUserMember || currentUserMember.role === 'member') {
       return res.status(403).json({ message: 'Only admins can invite members' });
    }

    // Find the User to Add
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Check if already a member
    const alreadyInGroup = group.members.some(
      (m) => m.userId.toString() === userToAdd._id.toString()
    );
    if (alreadyInGroup) {
      return res.status(400).json({ message: 'User is already in this group' });
    }

    // Add them
    group.members.push({
      userId: userToAdd._id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    // await NotificationService.createInviteNotification(...)

    res.status(200).json(group);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding member' });
  }
};

export const leaveGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const group: IGroup | null = await Group.findById(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Filter out the current user
    const initialCount = group.members.length;
    group.members = group.members.filter(
      (m) => m.userId.toString() !== req.user.id
    );

    if (group.members.length === initialCount) {
       return res.status(400).json({ message: 'You are not in this group' });
    }

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Group deleted as last member left' });
    }

    await group.save();
    res.status(200).json({ message: 'You have left the group' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error leaving group' });
  }
};