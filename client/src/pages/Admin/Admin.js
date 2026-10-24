import { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.css';
import { FaCheck } from "react-icons/fa6";
import { API_URL } from "../../config/api";

const Admin = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [position, setPosition] = useState("");
    const [users, setUsers]  = useState([]);

    useEffect(() => {
        getUsers();
    }, []);

    const getUsers = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/users`, { withCredentials: true });
            setUsers(res.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const approveUser = async (user) => {
        try {
            const response = await axios.post(`${API_URL}/admin/users/verified`, {
                name: user.name,
                email: user.email,
                position: "member"
            }, { withCredentials: true });
            
            if (response.data.createStatus === "success") {
                getUsers();
            }
        } catch (error) {
            console.error("Error approving user:", error);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
  
        try {
            const response = await axios.post(`${API_URL}/admin/users/verified`, {
                name: name,
                email: email,
                position: position,
            }, { withCredentials: true });
            
            if (response.data.createStatus === "success") {
                setName("");
                setEmail("");
                setPosition("");
                getUsers();
                const modal = document.getElementById('add-user-modal');
                if (modal && typeof modal.close === 'function') {
                    modal.close();
                }
            }
        } catch (error) {
            console.error("Error creating verified user:", error);
        }
    };

    return (
    <div className='admin-page container'>
        <div className="col">
            <div className="flex flex-row justify-between items-center mt-3 p-5">
                <h1 className='font-bold text-3xl'>Users</h1>
                <button className="btn btn-primary" onClick={()=>document.getElementById('add-user-modal').showModal()}>Create verified user</button>
            </div>
            <dialog id="add-user-modal" className="modal">
                <div className='modal-box flex flex-col'>
                    <h1 className='font-bold'>Add New Users</h1>
                            <form className="form" id='userForm' onSubmit={handleSubmit}>
                                <div className="subtitle">Enter info for verified users</div>
                                    <input 
                                        id="name" className="form-control input input-bordered w-full my-2"
                                        required type="text" placeholder="Name"  value={name}
                                        onChange={(e) => {setName(e.target.value)}}/>
                                    <input 
                                        id="email" className="form-control input input-bordered w-full  my-2" 
                                        required type="text" placeholder="Email" value={email}
                                        onChange={(e) => {setEmail(e.target.value)}}/>
                                <select className="select select-bordered w-full my-2" value={position} onChange={(e) => {setPosition(e.target.value)}}>
                                    <option value="">Select position</option>
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </form>
                        <button type="submit" form='userForm' className="btn btn-neutral my-2">Create</button>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
                </dialog>
                <div>
                    <table className='table table-zebra m-5'>
                        <thead>
                            <tr>
                                <th></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Position</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                users.map(
                                    (user,index) => {
                                        return <tr key={user._id || index}>
                                            <td><img src={user.photo} alt="Profile"/></td>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.position}</td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center h-full w-full">
                                                    {user.verified 
                                                        ? <FaCheck className="text-success" />
                                                        : <button 
                                                            className="btn btn-sm btn-success w-full text-white"
                                                            onClick={() => approveUser(user)}
                                                          >
                                                            Approve
                                                          </button>
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    }
                                )
                            }
                        </tbody>
                    </table>
                </div>
        </div>
    </div>
        
     );
}
 
export default Admin;
