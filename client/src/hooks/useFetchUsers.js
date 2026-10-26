import { useQuery} from '@tanstack/react-query'
import axios from 'axios'
const useFetchUsers = () => {
    const getUsers = async () => {
        return axios.get(`${process.env.REACT_APP_API_URL}/api/user/filter`)
        .then(res => res.data)
        .catch(err => console.log(err))
    }
    return useQuery({
        queryKey:["users", "filter"],
        queryFn: getUsers,
    })
}
 
export default useFetchUsers;
