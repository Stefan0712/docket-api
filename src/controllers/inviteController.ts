import { checkPermission, GroupAction } from "../utilities/permissions";
import Group from "../models/Group";
import Invite, { IInvite } from '../models/Invite';
import { Group as IGroup, GroupMember } from '../models/models';
import User from "../models/User";
import crypto from 'crypto'; // built-in module for token generation
import { Request, Response } from 'express';





// Looks up invite details for a confirmation screen.
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

// Validates the invite token and adds the authenticated user to the group.
export const acceptInvite = async (req, res) => {
    const { token } = req.body;
    const joiningUserId = req.user.id; 

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
      const group: IGroup | null = await Group.findById(invite.groupId);
      if (!group) {
        // Delete the invite if the group no longer exists
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

      const newMember: GroupMember = {
        userId: joiningUserId.toString(),
        username: joiningUser.username,
        role: 'member',
        joinedAt: new Date(),
        isPinned: false,
        notificationPreferences: {
          ASSIGNMENT: false,
          MENTION: false,
          GROUP: true,
          REMINDER: true,
          POLL: true,
        }
      };

      group.members.push(newMember);
      await group.save();

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

// Helper function to generate a URL-safe, random token
const generateSecureToken = (length: number = 20): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Generates a unique, shareable invite link token for a specific group.
export const generateInviteToken = async (req, res) => {
  const { groupId } = req.params;
  const currentUserId = req.user.id; 
  
  // Configuration
  const expirationHours = 48; 
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000); 
  const maxUses = 1; 
  try {
    // Check if the user has the right permissions
    const group = await Group.findById(groupId)
      .select('members ownerId settings') 
      .lean();
    // Check if the group exists
    if (!group) return res.status(404).json({ message: 'Group not found' });
    //Check the role
    if (!checkPermission(group, req.user.id, GroupAction.MODERATE_CONTENT)) {
      return res.status(404).json({ message: "You are not authorized to invite other users" })
    }

    
    // Generate token and save to db
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
    
    // Send the token 
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