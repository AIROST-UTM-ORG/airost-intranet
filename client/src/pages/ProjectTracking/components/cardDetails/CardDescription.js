import { Card } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setDescription, setTitle } from "app/store";

//Description
export default function CardDescription({value,id}){

    const [details,setDetail]=useState(value)
    const [isEditing, setIsEditing] = useState(false);
    const dispatch=useDispatch();
    //console.log(value)

    const handleKeyDown=(e)=>{
        if(e.key==="Enter"){
            dispatch(setDescription({id,description:details}))
            setIsEditing(false);
            e.preventDefault()
        }
        //console.log(details)
    }

    const handleBlur=()=>{
        dispatch(setDescription({id,description:details}))
        setIsEditing(false);
    }

    return (
        <>
        {
            isEditing===true?
            (
                <input
                type="text"
                value={details}
                autoFocus
                onChange={(e)=>{setDetail(e.target.value)}}
                style={{color: "white"}}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="border focus:border-none focus:outline-none py-4 text-base bg-neutral-800 border-gray-300 "
                //foucs:border-none foucs:outline-none
                />
            )
            : <h3 className="py-4" onClick={()=>setIsEditing(true)}>{details}</h3> 
        }
        </>
    )
}