import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Group as IGroup } from '../models/models';
import ShoppingListItem from '../models/ShoppingListItem';
import ShoppingList from '../models/ShoppingList';
import Poll from '../models/Poll';
import Note from '../models/Note';
import Group from '../models/Group';
import mongoose from 'mongoose';
import { checkPermission, GroupAction } from '../utilities/permissions';

// Create a new group
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, icon, color, isPinned } = req.body;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const newGroup: IGroup = await Group.create({
      name,
      description,
      authorId: userId,
      icon,
      color,
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
          isPinned: true,
          notificationPreferences: {
            ASSIGNMENT: false,
            MENTION: false,
            GROUP: true,
            REMINDER: true,
            POLL: true,
          }
        }
      ]
    });

    res.status(201).json(newGroup);

  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ message: 'Server error creating group' });
  }
};

// Get all groups that the user is a member of
export const getMyGroups = async (req: AuthRequest, res: Response) => {
  try {
    const groups = await Group.find({
      'members.userId': req.user.id
    }).lean();
    const groupIds = groups.map(group => group._id);
    const listCounts = await ShoppingList.aggregate([
      { $match: { groupId: { $in: groupIds } }},
      { $group: { _id: '$groupId', listCount: { $sum: 1 }}}
    ]);
    const noteCounts = await Note.aggregate([
        { $match: { groupId: { $in: groupIds } } },
        { $group: { _id: '$groupId', noteCount: { $sum: 1 } } }
    ]);
    const pollCounts = await Poll.aggregate([
        { $match: { groupId: { $in: groupIds } } },
        { $group: { _id: '$groupId', pollCount: { $sum: 1 } } }
    ]);
    const listsMap = new Map(listCounts.map(item => [item._id.toString(), item.listCount]));
    const notesMap = new Map(noteCounts.map(item => [item._id.toString(), item.noteCount]));
    const pollsMap = new Map(pollCounts.map(item => [item._id.toString(), item.pollCount]));

    const finalGroups = groups.map(group => {
      const id = group._id.toString();

      return {
        ...group,
        listCount: listsMap.get(id) || 0,
        noteCount: notesMap.get(id) || 0,
        pollCount: pollsMap.get(id) || 0,
        memberCount: group.members.length
      };
    });
    res.status(200).json(finalGroups);
  } catch (error) {
    console.error('Get Groups Error:', error);
    res.status(500).json({ message: 'Server error fetching groups' });
  }
};

interface IPopulatedMember {
  role: "owner" | "moderator" | "member";
  userId: {
    _id: string;
    username: string;
  } 
}

// Get a specific group
export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [listCount, noteCount, pollCount] = await Promise.all([
      ShoppingList.countDocuments({ groupId: id }),
      Note.countDocuments({ groupId: id }),
      Poll.countDocuments({ groupId: id })
    ]);

    const populatedGroup = await Group.findById(id).populate('members.userId', 'username').lean(); 

    if (!populatedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isMember = (populatedGroup.members as unknown as IPopulatedMember[]).some((m) => m.userId._id.toString() === req.user.id);

    // Allow user to see the group only if it is a member
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    // Return group data with the formatted members array
    const finalGroup = {
      ...populatedGroup,
      listCount,
      noteCount,
      pollCount,
      members: (populatedGroup.members as unknown as IPopulatedMember[]).map(member => ({
        userId: member.userId._id, 
        username: member.userId.username, 
        role: member.role 
      }))
    };
    res.status(200).json(finalGroup);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
      return res.status(400).json({ message: 'You cannot leave since you are the only one left. Delete the group instead' });
    }

    await group.save();
    res.status(200).json({ message: 'You have left the group' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error leaving group' });
  }
};
// export const kickUser = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { targetUserId } = req.body;
    
//     const group: IGroup | null = await Group.findById(id);
//     if (!group) return res.status(404).json({ message: 'Group not found' });

//     const 

//     await group.save();
//     res.status(200).json({ message: 'You have left the group' });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error leaving group' });
//   }
// };

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!checkPermission(group, req.user.id, GroupAction.MANAGE_GROUP)) {
      return res.status(403).json({ message: 'You do not have the right permissions to delete this group' });
    }
        
    const listsToDelete = await ShoppingList.find({ groupId: group._id.toString() }).select('_id');
    
    const listIds = listsToDelete.map(list => list._id.toString());
    
    // Permanently delete all lists associated with this group
    const listDeletionResult = await ShoppingList.deleteMany({ groupId: group._id.toString() });
        
    let itemDeletionResult = { deletedCount: 0 };
    
    if (listIds.length > 0) {
      itemDeletionResult = await ShoppingListItem.deleteMany({
        listId: { $in: listIds }
      });
    }

    await Poll.deleteMany({ groupId: group._id.toString() });
    await Note.deleteMany({ groupId: group._id.toString() });

    const groupDeletionResult = await Group.deleteOne({ _id: group._id.toString() });
    
    if (groupDeletionResult.deletedCount === 0) {
      return res.status(404).json({ message: 'Group not deleted (already missing).' });
    }

    res.status(200).json({
      message: 'Group, lists, and items permanently deleted.',
      groupDeleted: groupDeletionResult.deletedCount,
      listsDeleted: listDeletionResult.deletedCount,
      itemsDeleted: itemDeletionResult.deletedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting list' });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!checkPermission(group, req.user.id, GroupAction.MANAGE_GROUP)) {
      return res.status(403).json({ message: 'You do not have the right permissions to update this group' });
    }

    const { name, icon, description } = req.body;

    if (name) group.name = name;
    if (icon) group.icon = icon;
    if (description) group.description = description;

    const updatedGroup = await group.save();
     

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating group' });
  }
};
export const updateRole = async (req: AuthRequest, res: Response) => {
  try {
    const {targetUser, newRole} = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const validRoles = ['member', 'moderator', 'owner'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'That role does not exist' });
    }
    if (!checkPermission(group, req.user.id, GroupAction.MANAGE_GROUP)) {
      return res.status(403).json({ message: 'You do not have the right permissions to change role' });
    }

    group.members = group.members.map(member=>member.userId.toString() === targetUser ? {...member, role: newRole} : member)
    const updatedGroup = await group.save();

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating group' });
  }
};

