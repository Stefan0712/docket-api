import ActivityLog from '../models/ActivityLog';

export const logActivity = async (input: any): Promise<void> => {
    try {
        if (!input.groupId || !input.authorId) {
            console.error('logActivity: Missing crucial IDs. Aborting.');
            return;
        }

        console.log(input)
        const logEntry = new ActivityLog(input);
        const savedLog = await logEntry.save();


    } catch (error) {
        console.error('CRITICAL: logActivity failed:', error);
    }
};