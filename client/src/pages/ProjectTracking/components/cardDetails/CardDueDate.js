import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {setDate } from "app/store";
import Datepicker from "react-tailwindcss-datepicker";
import moment from "moment";

export default function CardDueDate({value,id}){
    const [duedate,setDuedate]=useState({
        startDate:value,
        endDate:value
    })
    const [isEditing, setIsEditing] = useState(false);
    const dispatch=useDispatch();
    const [showPicker,setShowPicker]=useState(false)
    
     const handleKeyDown=(e)=>{
        if(e.key==="Enter"){
            dispatch(setDate({id,date:duedate})) //Write to redux store 
            setShowPicker(false)
            setIsEditing(false);
            e.preventDefault()
        }
    }

    const handleBlur=()=>{
        dispatch(setDate({id,date:duedate})) //Write to redux 
        // store 
        setShowPicker(false)
        setIsEditing(false);
    }

    return (
        <>
        {
            
            isEditing===true?
            (
        
                // setShowPicker(true),
                <Datepicker 
                asSingle={true} 
                useRange={false}
                show={showPicker}
                value={duedate} 
                id={id}
                onChange={(newDate) => {
                    setDuedate(newDate); 
                    setShowPicker(false);
                    dispatch(setDate({id,date:newDate.startDate})) //Write to redux store 
                    console.log('newDate', newDate);
                    
                }} 
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                inputClassName="text-xs w-full bg-neutral-800 text-white focus:outline-none"
                calendarContainerClassName="mt-2 z-50 shadow-lg rounded-lg border bg-white"
                containerClassName="relative"
                popoverDirection="down"
                /> 
            
            )
            :<p className={"text-xs w-min text-neutral-100 rounded-lg p-1 bg-neutral-900 text-neutral-400"} onClick={()=>{
                setShowPicker(true)
                setIsEditing(true)}}>
            {moment(duedate?.startDate).format("DD/MM/YYYY")} {/*Due Date*/}
            </p>
        }
        </>
    )
}