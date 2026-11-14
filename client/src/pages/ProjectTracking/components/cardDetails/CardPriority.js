import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setValue,setPriority } from "app/store";
import consts from "../../../../consts/consts";

export default function CardPriority({value,id}){
    const [priority,setPriorityValue]=useState(value||"low")
    const [isEditing, setIsEditing] = useState(false);
    const dispatch=useDispatch();
    const priorityConsts = consts.priorityConsts;
    
    
     const handleKeyDown=(e)=>{
        if(e.key==="Enter"){
            dispatch(setPriority({id,priority:priority})) //Write to redux store 
            setIsEditing(false);
            e.preventDefault()
        }
        //console.log(priority)
    }

    const handleBlur=()=>{
        dispatch(setPriority({id,priority:priority})) //Write to redux store 
        setIsEditing(false);
    }

    return (
        <>
        {
            isEditing===true?
            (
                <select
                        //{...register("priority")}
                        //bg-neutral-800 
                        className={`select select-bordered select-xs w-full max-w-xs col-span-3 ${priorityConsts[priority]?.bgColor|| "bg-gray-500"}`}
                        value={priority}
                        onChange={(priority)=>
                        {   setPriorityValue(priority.target.value)
                            dispatch(setPriority({id,priority:priority.target.value}))
                            setIsEditing(false);
                        console.log("Change priority to: "+priority.target.value)
                    }
                    
                        } 
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder="Priority">
                        <option value="" disabled selected hidden>Task Priority</option>
                        <option className="bg-neutral-800 " value="low">Low</option>
                        <option className="bg-neutral-800 " value="medium">Medium</option>
                        <option className="bg-neutral-800 " value="high">High</option>
                </select>
                
            )
            : <p className={`text-xs w-min text-neutral-100 rounded-lg p-1 ${priorityConsts[priority]?.bgColor|| "bg-gray-500"}`} onClick={()=>setIsEditing(true)}>
            {priorityConsts[priority]?.text} {/*Priority*/}
        </p>
        }
        </>
    )
}