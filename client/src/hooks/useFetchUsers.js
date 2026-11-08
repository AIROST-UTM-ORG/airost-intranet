import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config/api';
const useFetchUsers = () => {
    const getUsers = async () => {
        const res = await axios.get(`${API_URL}/api/user/users`, { withCredentials: true });
        return res.data;
    };
    return useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });
};

export default useFetchUsers;
