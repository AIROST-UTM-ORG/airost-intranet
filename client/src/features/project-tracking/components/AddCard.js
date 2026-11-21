import React, { useState } from "react";
import { FiPlus} from "react-icons/fi";
import { motion } from "framer-motion";
import usePBMUpdate from "../hooks/usePBMRefresh";
import useFetchUsers from "../../../hooks/useFetchUsers";
import Datepicker from "react-tailwindcss-datepicker"; 
import { useForm } from "react-hook-form";
import usePBMCreate from "../hooks/usePBMCreate";
import {v4 as uuidv4} from 'uuid'

const AddCard = ({ column, setCards, addNewCard, user }) => {
    const [adding, setAdding] = useState(false);
    const[task_id,setTaskId]=useState(uuidv4())
    const [dueDate, setDueDate] = useState({
        startDate: null,
        endDate: null,
    });
    const users = useFetchUsers();
    const createCard = usePBMCreate({projectId: user.projectId, cards: []});
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
      } = useForm({
        defaultValues:{
            title: '',
            description: "",
            assignee: "no_assignee",
            priority: "low",
        }
      })
      
    const onSubmit = async (data) => {
        try{
            if (!data.title.trim().length) return;
            
            const newCard = {
                column,
                title: data.title.trim(),
                assignee: data.assignee,
                createdBy: user.email,
                description: data.description,
                priority: data.priority,
                dueDate: dueDate.startDate ?? new Date(),
                task_id: task_id,
            };
            
            setCards((pv) => [...pv, newCard]);
            addNewCard()
            setDueDate({
                startDate: null,
                endDate: null,
            })
            console.log("New card added from AddCard.js: ", newCard.title);
            setAdding(false);
            reset();
        }
        catch(err){
            console.error("Error adding card: ", err);
        }
      }
    
    return (
        <>
        {adding ? (
            <motion.form layout onSubmit={handleSubmit(onSubmit)}>
            <div className="w-full rounded border border-violet-400 bg-violet-400/20 p-3 
                    text-sm text-neutral-50 placeholder-violet-300 focus:outline-0
                    grid grid-cols-3 gap-3">
                <input type="text"
                    {...register("title",{required: true})}
                    autoFocus
                    placeholder="Add new task..."
                    className="input input-bordered w-full max-w-xs input-xs bg-neutral-800 col-span-3"
                />
                <textarea 
                    {...register("description")}
                    className="textarea textarea-bordered textarea-xs col-span-3 bg-neutral-800" 
                    placeholder="Description">
                </textarea>
                <div className="h-min col-span-3">    
                        <Datepicker 
                            asSingle={true} 
                            useRange={false}
                            value={dueDate} 
                            onChange={(newValue) => {
                                setDueDate(newValue); 
                            }} 
                            inputClassName="text-xs w-full bg-neutral-800 text-white focus:outline-none pl-2.5"
                            calendarContainerClassName="mt-2 z-50 shadow-lg rounded-lg border bg-white"
                            containerClassName="relative"
                            popoverDirection="down"
                        /> 
                    </div>
                    <select
                        {...register("priority")}
                        className="select select-bordered select-xs w-full max-w-xs bg-neutral-800 col-span-3"
                        placeholder="Priority">
                        <option value="low" disabled selected hidden>Task Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <select
                        {...register("assignee")}
                        className="select select-bordered select-xs w-full max-w-xs bg-neutral-800 col-span-3">
                            <option value="no_assignee">No assignee</option>
                            {users.data.map(user => {
                                return (<option value={user.email}>{user.name}</option>)
                            })}
                    </select>
                <div className="mt-1.5 flex items-center justify-end gap-1.5 col-span-3">
                    <button
                    onClick={() => setAdding(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
                    >
                    Close
                    </button>
                    <button
                    type="submit"
                    className="btn btn-xs"
                    >
                    <span>Add</span>
                    <FiPlus />
                    </button>
                </div>
            </div>
            </motion.form>
        ) : (
            <motion.button
            layout
            onClick={() => {
                setTaskId(uuidv4())
                setAdding(true) 
            }}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
            >
            <span>Add card</span>
            <FiPlus />
            </motion.button>
        )}
        </>
    );
    };

export default AddCard;