import { useQuery } from '@tanstack/react-query';
import apiClient from '../shared/api/client';

const useFetchUsers = () => {
    const getUsers = async () => {
        const res = await apiClient.get('/user/users');
        return res.data;
    };
    return useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });
};

export default useFetchUsers;
