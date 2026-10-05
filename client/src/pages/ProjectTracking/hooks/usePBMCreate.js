import axios from 'axios'
import { useQueryClient, useMutation} from '@tanstack/react-query'
import useAuth from '../../../hooks/useAuth'
import { API_URL } from '../../../config/api'

//update tasks in the project board in MongoDB
const usePBMCreate = ({projectId, cards}) => {
    const queryClient = useQueryClient()
    const { user } = useAuth() // Get current user
    
    const updateProjectBoard = async () => {
        try {
          console.log("Sending project board data:", { projectId, cards }," to ", API_URL);
          console.log("Current user for creation:", user); // Debug log
          const response = await axios.post(`${API_URL}/projects/tracking`, {
            projectId:projectId,            tasks: cards.map(card => ({
              ...card,
              createdBy: card.createdBy || user?.email || user?.name || user?.username || 'Unknown User'
            })),
            createdBy: user?.email || user?.name || user?.username || 'Unknown User'
          },{
            headers:{
                'Content-Type': 'application/json',
            }
          });
      
          console.log("Response from server:", response.data);
          return response;
        } catch (error) {
          console.error("Error while creating project board:", error.response?.data || error.message);
          throw error; // re-throw so that react-query's onError still works
        }
      };
    return useMutation({
        mutationFn: updateProjectBoard,
        onSuccess: (data) => {
            console.log("Project board create successfully from usePBMCreate.js",data)
            queryClient.invalidateQueries()
           
          },
        onError: (error) => {
        console.error("Failed to create project board:", error.response?.data || error.message);
        },
          
    })
}
 
export default usePBMCreate;
