import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setValue,setTitle } from "app/store";


export default function CardTitle({value,id}){
    const [details,setDetail]=useState(value)
    const [isEditing, setIsEditing] = useState(false);
    const dispatch=useDispatch();
    
     const handleKeyDown=(e)=>{
        if(e.key==="Enter"){
            dispatch(setTitle({id,title:details})) //Write to redux store 
            setIsEditing(false);
            e.preventDefault()
        }
        //console.log(details)
    }

    const handleBlur=()=>{
        dispatch(setTitle({id,title:details})) //Write to redux store 
        setIsEditing(false);
        //console.log("Modal close")
    }

    return (
        <>
        {
            isEditing===true?
            (
                <input
                type="text"
                id={id}
                value={details}
                autoFocus
                onChange={(e)=>{
                    setDetail(e.target.value)
                    // dispatch(setTitle({id,title:e.target.value})) //Write to redux store 

                }} //dispatch(setValue(e.target))
                style={{color: "white"}}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="font-bold text-lg bg-neutral-800"
                
                />
            )
            : <h3 className="font-bold text-lg" onClick={()=>setIsEditing(true)}>{details}</h3> 
        }
        </>
    )
}