import { BsPersonCircle } from "react-icons/bs";
import { IoMdCreate } from "react-icons/io";
import moment from "moment/moment";
import consts from "../../../consts/consts";
import { useState, useEffect } from "react";
import CardTitle from "./cardDetails/CardTitle";
import CardDescription from "./cardDetails/CardDescription";
import { useSelector } from "react-redux";
import CardDueDate from "./cardDetails/CardDueDate";
import CardPriority from "./cardDetails/CardPriority";
import CardAsignee from "./cardDetails/CardAsignee";
import ActivityTimeline from "./ActivityTimeline";


const CardDetailsModal = ({card}) => {
    const [activeTab, setActiveTab] = useState('details');
    const [activityKey, setActivityKey] = useState(0); // Key to force re-mount
    const priorityConsts = consts.priorityConsts;

    // Handle tab switching and force ActivityTimeline to re-mount
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'activity') {
            // Force re-mount of ActivityTimeline by changing key
            setActivityKey(prev => prev + 1);
        }
    };

    // Reset to details tab when card changes
    useEffect(() => {
        setActiveTab('details');
        setActivityKey(0);
    }, [card._id]);
    
    return ( 
    <dialog id={`card-modal-${card._id}`} className="modal">
        <div className="modal-box bg-neutral-800 flex flex-col gap-1 max-w-4xl w-full">
            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-600 mb-4">
                <button 
                    className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'details' 
                            ? 'text-blue-400 border-b-2 border-blue-400' 
                            : 'text-gray-400 hover:text-gray-300'
                    }`}                    onClick={() => handleTabChange('details')}
                >
                    Details
                </button>
                <button 
                    className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'activity' 
                            ? 'text-blue-400 border-b-2 border-blue-400' 
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => handleTabChange('activity')}                >
                    History
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' ? (
                <div className="flex flex-col gap-1">
                    <CardTitle value={card.title} id={card._id}/> 
                    <CardDescription value={card.description} id={card._id}/>
                    <div className="flex flex-row gap-1">
                        <CardDueDate value={card.dueDate} id={card._id}/>
                        <CardPriority value={card.priority} id={card._id}/>
                    </div>
                    <CardAsignee value={card.assignee} id={card._id}/> 
                    {/*Assignee*/}
                    <p className="text-xs text-neutral-400 flex flex-row gap-1 items-center"><IoMdCreate/>{card.createdBy}</p>
                    {/*Created By (No need to eidt)*/}

                    {/*Save Button*/}

                    {/*Cancel Button*/}
                </div>            ) : (
                <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-3">Activity History</h3>
                    <ActivityTimeline key={activityKey} taskId={card.task_id} />
                </div>
            )}
        </div>
        <form method="dialog" className="modal-backdrop">
            <button>close</button>
        </form>
    </dialog> 
);
}
 
export default CardDetailsModal;