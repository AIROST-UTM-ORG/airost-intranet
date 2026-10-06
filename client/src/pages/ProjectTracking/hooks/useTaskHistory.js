import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../../../config/api';

const useTaskHistory = (taskId) => {
    const fetchTaskHistory = async () => {
        if (!taskId) {
            throw new Error('Task ID is required');
        }
        
        try {
            const response = await axios.get(
                `${API_URL}/projects/tasks/${taskId}/history`,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
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
