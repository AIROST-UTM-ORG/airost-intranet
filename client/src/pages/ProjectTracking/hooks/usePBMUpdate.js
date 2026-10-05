import axios from 'axios'
import { useQueryClient, useMutation} from '@tanstack/react-query'
import useAuth from '../../../hooks/useAuth'
import { API_URL } from '../../../config/api'

const usePBMUpdate = ({projectId, cards}) => {    
    const queryClient = useQueryClient()
    const { user } = useAuth()
      const updateProjectBoard = async () => {
        try{
            console.log("Sending pending update data to backend")
            console.log("Current user:", user) // Debug log to see user structure
            const response=await axios.put(`${API_URL}/projects/update`,{
                projectId:projectId,
                tasks: cards, //should be only a single task (not a whole array)
                changedBy: user?.email || user?.name || user?.username || 'Unknown User'
            },{
                headers:{
                    'Content-Type': 'application/json',
                }
            })
            return response 
        } catch(err) {
            console.error("Error while updating project board:", err.response?.data || err.message);
            throw err; // re-throw so that react-query's onError still works
        }
    }
      return useMutation({
        mutationFn: updateProjectBoard,
        onSuccess: (data) => {
            // Update cache directly instead of invalidating to prevent modal close
            queryClient.setQueryData(["projectBoard"], (oldData) => {
                if (!oldData) return oldData;
                // Update the specific task in the cached data
                const updatedTasks = oldData.tasks.map(task => 
                    task.task_id === cards.task_id ? cards : task
                );
                return { ...oldData, tasks: updatedTasks };
            });
            
            // Still invalidate task history to show updates
            queryClient.invalidateQueries(['taskHistory', cards.task_id]);
            console.log("Project board updated successfully", data);
          },
          onError:(err)=>{
            console.error("Failed to update project board:", err.response?.data || err.message);
          }
    })
}
 
export default usePBMUpdate;
