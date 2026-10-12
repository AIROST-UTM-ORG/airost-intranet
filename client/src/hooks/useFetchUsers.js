import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config/api';

const useFetchUsers = () => {
  const getUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`);
      return res.data || [];
    } catch (err) {
      console.error("Error fetching users:", err);
      throw err;
    }
  };

  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
};

export default useFetchUsers;