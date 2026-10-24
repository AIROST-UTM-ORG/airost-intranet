import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config/api';

const useFetchUsers = () => {
    const getUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`, { withCredentials: true });
            return res.data || [];
        } catch (err) {
            console.error("Failed to fetch users:", err);
            return [];
        }
    };
    return useQuery({
        queryKey: ["users"],
        queryFn: getUsers,
    });
};
 
export default useFetchUsers;
