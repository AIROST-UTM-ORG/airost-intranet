import React, { useEffect } from 'react';
import moment from 'moment';
import { BsPersonCircle, BsClock } from 'react-icons/bs';
import { IoMdCreate, IoMdRefresh } from 'react-icons/io';
import { MdEdit, MdDelete } from 'react-icons/md';
import useTaskHistory from '../hooks/useTaskHistory';

const ActivityTimeline = ({ taskId }) => {
    const { data: history, isLoading, error, refetch } = useTaskHistory(taskId);

    // Always refetch when component mounts or taskId changes
    useEffect(() => {
        if (taskId) {
            refetch();
        }
    }, [taskId, refetch]);

    const getChangeIcon = (changeType, field) => {
        switch (changeType) {
            case 'created':
                return <IoMdCreate className="text-green-500" />;
            case 'updated':
                return <MdEdit className="text-blue-500" />;
            case 'deleted':
                return <MdDelete className="text-red-500" />;
            default:
                return <IoMdRefresh className="text-gray-500" />;
        }
    };

    const getFieldColor = (field) => {
        switch (field) {
            case 'column':
                return 'text-purple-400';
            case 'assignee':
                return 'text-blue-400';
            case 'priority':
                return 'text-orange-400';
            case 'dueDate':
                return 'text-yellow-400';
            case 'title':
                return 'text-green-400';
            case 'description':
                return 'text-cyan-400';
            default:
                return 'text-gray-400';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="loading loading-spinner loading-sm"></div>
                <span className="ml-2 text-sm text-gray-400">Loading activity...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-400 text-sm">Error loading activity history</p>
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-gray-400 text-sm">No activity recorded yet</p>
            </div>
        );
    }

    return (
        <div className="max-h-80 overflow-y-auto">
            <div className="space-y-3">
                {history.map((entry, index) => (
                    <div key={entry._id} className="flex items-start space-x-3">
                        {/* Timeline indicator */}
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-neutral-700 rounded-full border-2 border-neutral-600">
                                {getChangeIcon(entry.changeType, entry.field)}
                            </div>
                            {index < history.length - 1 && (
                                <div className="w-px h-6 bg-neutral-600 mt-2"></div>
                            )}
                        </div>

                        {/* Activity content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <BsPersonCircle className="text-gray-400 text-sm flex-shrink-0" />
                                <span className="text-sm text-gray-300 font-medium">
                                    {entry.changedBy}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getFieldColor(entry.field)} bg-opacity-20`}>
                                    {entry.field === 'task_created' ? 'created' : 
                                     entry.field === 'task_deleted' ? 'deleted' : entry.field}
                                </span>
                            </div>
                            
                            <p className="text-sm text-gray-400 mb-2">
                                {entry.changeDescription}
                            </p>
                            
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <BsClock />
                                <span>{moment(entry.timestamp).fromNow()}</span>
                                <span>•</span>
                                <span>{moment(entry.timestamp).format('MMM DD, YYYY HH:mm')}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityTimeline;
