import { Group, GroupMember } from "src/models/models";


export enum GroupAction {
  // Deleting the group, Changing the group name/icon
  MANAGE_GROUP = 'MANAGE_GROUP',
  // Kicking members, Promoting members
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  // Deleting ANYONE'S poll, item, or note
  MODERATE_CONTENT = 'MODERATE_CONTENT',
  // Deleting/Editing YOUR OWN item, poll, or note
  MODIFY_OWN_RESOURCE = 'MODIFY_OWN_RESOURCE',
  // creating items, viewing the group
  CREATE_AND_VIEW = 'CREATE_AND_VIEW',
}


const ROLE_HIERARCHY = {
  owner: 3,
  moderator: 2,
  member: 1
};

/**
 * @param group - The full group object (we need the members list)
 * @param userId - The ID of the user trying to do something
 * @param action - What are they trying to do?
 * @param resourceAuthorId - (Optional) Who owns the item they are touching?
 */

interface IPermissionContext {
  members: GroupMember[];
  ownerId?: string;
  settings?: any;   // For future
}


export const checkPermission = (
  group: IPermissionContext,
  userId: string,
  action: GroupAction,
  resourceAuthorId?: string
): boolean => {

  // Find the member inside the group
  const member = group.members.find(m => m.userId.toString() === userId.toString());

  // Check if the user is a member of the group
  if (!member) return false;

  const userRole = member.role; // 'owner' | 'moderator' | 'member'
  
  // If it's owner, then it can do anything
  if (userRole === 'owner') return true;


  // Check for role
  switch (action) {
    
    //Only Owners can do this
    case GroupAction.MANAGE_GROUP:
      return false; 

    // Moderators or higher can do this
    case GroupAction.MANAGE_MEMBERS:
    case GroupAction.MODERATE_CONTENT:
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.moderator;

    // Modifying a specific Item/Poll
    case GroupAction.MODIFY_OWN_RESOURCE:
      // If they are a moderator, they can edit anything
      if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.moderator) return true;
      
      // If they are a simple member, they must own the resource
      if (resourceAuthorId && resourceAuthorId.toString() === userId.toString()) {
        return true;
      }
      return false;

    // Basic access (Create/View)
    case GroupAction.CREATE_AND_VIEW:
      return true; // As long as they are a member (checked at top), they pass

    default:
      return false;
  }
};