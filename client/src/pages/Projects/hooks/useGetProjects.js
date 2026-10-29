import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../../../config/api';

const useGetProjects = () => {
    const getProjects = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/projects`);
          return res.data;
        } catch (err) {
          throw new Error("Failed to fetch projects");
        }
      };
      
    return useQuery({
        queryKey: ["projects"],
        queryFn: getProjects,
    });
};
 
export default useGetProjects;
