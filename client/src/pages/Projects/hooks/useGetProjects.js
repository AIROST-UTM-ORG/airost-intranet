import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../shared/api/client';

const useGetProjects = () => {
    const getProjects = async () => {
        try {
          const res = await apiClient.get('/projects');
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
