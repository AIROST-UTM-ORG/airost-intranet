import React, { useState }from "react";
import {FiTrash}  from "react-icons/fi";
import { FaFire } from "react-icons/fa";
import { Button, message, Space, Modal } from 'antd';
import usePBMRefresh from "../hooks/usePBMRefresh";
import "../../../App.css"

const BurnBarrel = ({ setCards, cards, projectId, user }) => {
    const [active, setActive] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const projectBoardMutation = usePBMRefresh({projectId: projectId, cards: cards});

    const handleDragOver = (e) => {
        e.preventDefault();
        setActive(true);
    };
    
    const handleDragLeave = () => {
        setActive(false);
    };
    
    const handleDragEnd = (e) => {
        const cardId = e.dataTransfer.getData("cardId");
        const selectedCard = cards.find((c) => c._id == cardId);
        console.log("selectedCard: ",selectedCard)
        console.log("user: ",user)
        const userIsCreator = selectedCard?.createdBy !== user?.email; 
        if(userIsCreator && !user.positions?.includes("admin")){
            errorDeleteNotification();
            setActive(false);
            return;
        }
        
        // Instead of deleting immediately, show confirmation modal
        setCardToDelete(selectedCard);
        setConfirmDeleteModalOpen(true);
        setActive(false);
    };

    const confirmDelete = () => {
        if (cardToDelete) {
            setCards((pv) => pv.filter((c) => c._id !== cardToDelete._id)); //Keep all cards except the one that match the condition (delete card)
            projectBoardMutation.mutate();
            successDeleteNotification();
            setConfirmDeleteModalOpen(false);
            setCardToDelete(null);
        }
    };

    const cancelDelete = () => {
        setConfirmDeleteModalOpen(false);
        setCardToDelete(null);
    };

    const errorDeleteNotification = () => {
        messageApi.open({
          type: 'error',
          content: 'Only creator or admin can delete this',
        });
    };

    const successDeleteNotification = () => {
        messageApi.open({
          type: 'success',
          content: 'Task deleted successfully',
        });
    };
    
    return (
        <>
            {contextHolder}
            <div
            onDrop={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl ${
                active
                ? "border-red-800 bg-red-800/20 text-red-500"
                : "border-neutral-500 bg-neutral-500/20 text-neutral-500"
            }`}
            >
            {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
            </div>

            <Modal
                title="Confirm Delete"
                open={confirmDeleteModalOpen}
                onOk={confirmDelete}
                onCancel={cancelDelete}
                okText="Delete"
                cancelText="Cancel"
                closeIcon={false}
                okButtonProps={{ danger: true, className:"pr-5 pl-1" }}
                cancelButtonProps={{ className:"pr-5 pl-1" }}>
                <p>Are you sure you want to delete this task?</p>
                {cardToDelete && (
                    <div className="border rounded bg-gray-50">
                        <p><strong>{cardToDelete.title}</strong></p>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default BurnBarrel;
