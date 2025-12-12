import { Request, Response } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import Invite, { IInvite } from '../models/Invite';
import crypto from 'crypto'; // built-in module for token generation
import { GroupMember, Group as IGroup } from '../models/models';
import ShoppingListItem from '../models/ShoppingListItem';
import ShoppingList from '../models/ShoppingList';


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
          joinedAt: new Date(),
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

interface IPopulatedMember {
    role: "owner" | "moderator" | "member";
    userId: {
        _id: string;
        username: string;
    } 
}

export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const populatedGroup = await Group.findById(id).populate('members.userId', 'username').lean(); 

    if (!populatedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = (populatedGroup.members as unknown as IPopulatedMember[]).some((m) => m.userId._id.toString() === req.user.id);

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    const finalGroup = {
      ...populatedGroup,
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




// Helper function to generate a URL-safe, random token
const generateSecureToken = (length: number = 20): string => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

 // Generates a unique, shareable invite link token for a specific group.
 // POST /api/groups/:groupId/invite/generate
export const generateInviteToken = async (req, res) => {
  
    // Get IDs and expiration setting
    const { groupId } = req.params;
    console.log(`Group id: ${groupId}`)
    // Assuming you have middleware that attaches the authenticated user's ID to the request
    const currentUserId = req.user.id; 

    console.log(currentUserId)
    
    // Configuration
    const expirationHours = 48; 
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000); 
    const maxUses = 1; 
    try {
        // Make sure the user is an owner/member of the group
        const group: IGroup | null = await Group.findById(groupId);

        if (!group) {
            res.status(404).json({ message: 'Group not found.' });
            return;
        }

        // Check if the current user is a member or admin
        const isMember = group.members.some(
            member => member.userId.toString() === currentUserId.toString() 
        );

        if (!isMember) {
            res.status(403).json({ message: 'Not authorized to generate invites for this group.' });
            return;
        }
        
        // Generate Token and save to db
        const token = generateSecureToken();
        
        const newInvite: IInvite = new Invite({
            token,
            groupId,
            createdBy: currentUserId,
            expiresAt,
            maxUses,
            usesCount: 0,
        });

        await newInvite.save();
        
        //  Only send the unique token 
        res.status(201).json({ 
            message: 'Invite token successfully generated.',
            token: newInvite.token,
            expiresAt: newInvite.expiresAt,
        });

    } catch (error) {
        console.error('Error generating invite token:', error);
        res.status(500).json({ message: 'Server error during token generation.' });
    }
};

// Validates the invite token and adds the authenticated user to the group.
// POST /api/groups/invite/accept
export const acceptInvite = async (req, res) => {
    // Get the token from the request body and the id of the user trying to join
    const { token } = req.body;
    const joiningUserId = req.user.id; // User ID from the JWT token

    if (!token) {
        res.status(400).json({ message: 'Invite token is required.' });
        return;
    }

    try {
        // Token validation
        const invite = await Invite.findOne({ token });

        if (!invite) {
            res.status(410).json({ message: 'Invite link is expired or invalid.' });
            return;
        }

        // Usage check
        if (invite.maxUses !== -1 && invite.usesCount >= invite.maxUses) {
            // Delete the invite since max uses have been reached
            await Invite.findByIdAndDelete(invite._id);
            res.status(410).json({ message: 'Invite link has reached its maximum usage limit.' });
            return;
        }

        // Group & Membership Update
        const group: IGroup | null = await Group.findById(invite.groupId);

        if (!group) {
            // If the group no longer exists, delete the invite
            await Invite.findByIdAndDelete(invite._id);
            res.status(404).json({ message: 'The linked group was not found.' });
            return;
        }
        // Create the member object
        const joiningUser = await User.findById(joiningUserId);
        if (!joiningUser) {
            res.status(500).json({ message: 'Could not find joining user details.' });
            return;
        }
        // Check if the user is already a member
        const isAlreadyMember = group.members.some(
            member => member.userId.toString() === joiningUserId.toString()
        );

        if (isAlreadyMember) {
            res.status(200).json({ 
                message: 'You are already a member of this group.',
                group: group 
            });
            return;
        }

        // CONSTRUCT THE NEW MEMBER OBJECT
        const newMember: GroupMember = {
            userId: joiningUserId.toString(),
            username: joiningUser.username,
            role: 'member',
            joinedAt: new Date()
        };

        // Add the new member object to the group's members array
        group.members.push(newMember);

        // Save the updated group
        await group.save();

        //Usage tracking and update
        invite.usesCount += 1;
        await invite.save();

        // Delete the invite if the usage is at its maximum
        if (invite.usesCount >= invite.maxUses) {
            await Invite.findByIdAndDelete(invite._id);
        }
        res.status(200).json({
            message: 'Successfully joined the group!',
            group: group
        });

    } catch (error) {
        console.error('Error accepting invite:', error);
        res.status(500).json({ message: 'Server error while processing invite.' });
    }
};


// Looks up invite details for a confirmation screen.
// GET /api/groups/invite/lookup?token=ABC-123

export const lookupInvite = async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string; 

  if (!token) {
    res.status(400).json({ message: 'Invite token is missing from query parameters.' });
    return;
  }
  try {
    // Find the invite
    const invite = await Invite.findOne({ token });

    if (!invite) {
      res.status(404).json({ message: 'Invite link is invalid, expired, or revoked.' });
      return;
    }

    // Find the group and inviter
    const [group, inviter] = await Promise.all([
      Group.findById(invite.groupId).select('name members'), // Only get name and members list
      User.findById(invite.createdBy).select('username') // Only need username
    ]);
    
    if (!group || !inviter) {
      // If either is missing, the link is effectively broken/stale
      res.status(404).json({ message: 'Associated group or inviter details not found.' });
      return;
    }

    // Status and Usage Checks
    const isExpired = invite.expiresAt.getTime() < Date.now();
    const usesExceeded = invite.usesCount >= invite.maxUses;
    
    if (isExpired || usesExceeded) {
      res.status(200).json({ 
        group: { name: group.name, memberCount: group.members.length },
        invitation: { isExpired: true, message: 'This invite has expired or reached maximum uses.' }
      });
      return;
    }

    res.status(200).json({
        group: {
            _id: group._id,
            name: group.name,
            memberCount: group.members.length,
        },
        invitation: {
            groupId: invite.groupId,
            createdBy: inviter.username,
            isExpired: false,
            maxUses: invite.maxUses,
            usesCount: invite.usesCount,
            token: invite.token
        },
        userIsAuthenticated: false 
    });

  } catch (error) {
    console.error('Error looking up invite:', error);
    res.status(500).json({ message: 'Server error during invite lookup.' });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ message: 'Group not found' });
    let isAuthorized;
    if (group.authorId.toString() === req.user.id) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
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

    // Security Check
    if (group.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update fields
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } 
    );

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating group' });
  }
};
