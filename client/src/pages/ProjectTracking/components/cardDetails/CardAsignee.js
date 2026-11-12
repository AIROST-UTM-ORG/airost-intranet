import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAssignee } from "app/store";
import consts from "../../../../consts/consts";
import useFetchUsers from "../../../../hooks/useFetchUsers";
import { BsPersonCircle } from "react-icons/bs";

export default function CardAsignee({value,id}){
    const [assigneeValue,setAssigneeValue]=useState(value)
    const [isEditing, setIsEditing] = useState(false);
    const dispatch=useDispatch();
    const users = useFetchUsers();
    
         const handleKeyDown=(e)=>{
            if(e.key==="Enter"){
                dispatch(setAssignee({id,assignee:assigneeValue})) //Write to redux store 
                setIsEditing(false);
                e.preventDefault()
            }
            //console.log(details)
        }

        const handleBlur=()=>{
            dispatch(setAssignee({id,assignee:assigneeValue})) //Write to redux store 
            setIsEditing(false);
        }
    
    return (
        <>
        {
            isEditing===true?
            (
                <select
                    className="select select-bordered select-xs w-full max-w-xs bg-neutral-800 col-span-3"
                    onChange={(selectedAssignee)=>
                        { 
                            setAssigneeValue(selectedAssignee.target.value);
                            dispatch(setAssignee({id,assignee:selectedAssignee.target.value}))
                            setIsEditing(false);
                            //console.log(selectedAssignee.target.value)
                        }
                    
                        }
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown} 
                    
                    >
                        <option value="no_assignee">{assigneeValue}</option>
                        {users.data?.map(user => (
                        <option key={user.email} value={user.email}>
                            {user.name}
                        </option>
                        ))}

                </select>
            )
            : <p className="text-xs text-neutral-400 flex flex-row gap-1 items-center" onClick={()=>setIsEditing(true)}><BsPersonCircle/>{assigneeValue}</p> 
        }
        </>
    )
}