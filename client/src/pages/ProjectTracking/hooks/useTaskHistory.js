import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../shared/api/client';

const useTaskHistory = (taskId) => {
    const fetchTaskHistory = async () => {
        if (!taskId) {
            throw new Error('Task ID is required');
        }
        
        try {
            const response = await apiClient.get(`/projects/tasks/${taskId}/history`);
            return response.data;
        } catch (error) {
            console.error('Error fetching task history:', error.response?.data || error.message);
            throw error;
        }
    };

    return useQuery({
        queryKey: ['taskHistory', taskId],
        queryFn: fetchTaskHistory,
        enabled: !!taskId, // Only run query if taskId exists
        staleTime: 0, // Always consider data stale to enable fresh fetches
        cacheTime: 0, // Don't cache the data at all
        refetchOnWindowFocus: false,
        refetchOnMount: true // Always refetch when component mounts
    });
};

export default useTaskHistory;
