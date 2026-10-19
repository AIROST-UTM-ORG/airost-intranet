import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config/api';

const useFetchUsers = () => {
    const getUsers = async () => {
        return axios.get(`${API_URL}/admin/users`)
        .then(res => res.data)
        .catch(err => console.log(err));
    };
    return useQuery({
        queryKey: ["users"],
        queryFn: getUsers,
    });
};

export default useFetchUsers;
