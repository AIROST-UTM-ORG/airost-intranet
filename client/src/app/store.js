import { configureStore, createSlice } from "@reduxjs/toolkit";

//Create a slice for shared state
const sharedSlice=createSlice({
    name:"shared",
    initialState:{
       cards:{}
    },
    reducers:{
        setTitle:(state,action)=>{
            const {id,title}=action.payload;
            //If the card does not exist, create it with default values
            if(!state.cards[id]){
                state.cards[id]={title:"",description:"",date:"",priority:"",asignee:"",id}
            };
            state.cards[id].title=title;
        },
        setDescription:(state,action)=>{
            const {id,description}=action.payload;
            if(!state.cards[id]){
                state.cards[id]={title:"",description:"",date:"",priority:"",asignee:"",id}
            };
            state.cards[id].description=description;
        },
        setDate:(state,action)=>{ 
            const {id,date}=action.payload;
            if(!state.cards[id]){
                state.cards[id]={title:"",description:"",date:"",priority:"",asignee:"",id}
            };
            state.cards[id].date=date;
        },
        setPriority:(state,action)=>{
            const {id,priority}=action.payload;
            if(!state.cards[id]){
                state.cards[id]={title:"",description:"",date:"",priority:"",asignee:"",id}
            };
            state.cards[id].priority=priority;
        },
        setAssignee:(state,action)=>{
            const {id,assignee}=action.payload;
            if(!state.cards[id]){
                state.cards[id]={title:"",description:"",date:"",priority:"",asignee:"",id}
            };
            state.cards[id].assignee=assignee;
        },
        setCard:(state,action)=>{
            const {id,title,description,date,assignee}=action.payload;
            state.cards[id]={id,title,description,date,assignee}
        }
    }
});

//export the action so that we can update state
export const {setTitle,setDescription,setDate,setCard,setPriority,setAssignee}=sharedSlice.actions;

//Create Redux Store
const store=configureStore({
    reducer:{
        shared:sharedSlice.reducer
    }
}); 

export default store