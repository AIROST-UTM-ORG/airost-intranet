import React, { useState } from "react";
import Column from "./Column";
import BurnBarrel from "./BurnBarrel";
import { useQuery } from '@tanstack/react-query';
import useFetchUsers from "../../../hooks/useFetchUsers";
import { useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import useGetProjects from "../../Projects/hooks/useGetProjects";
import apiClient from "../../../shared/api/client";

const Board = () => {
    const [cards, setCards] = useState([]);
    const {projectId} = useParams();
    const { user } = useAuth();

    const projectTitle = useGetProjects()?.data
        ?.find(project => String(project.projectId) === String(projectId))?.title;

    const getProjectBoard = async () => {
        return apiClient.get(`/projects/tracking/${projectId}`)
        .then(res => {
            setCards(res.data.tasks);
            return res.data;
        })
        .catch(err => console.log(err));
    };

    useQuery({
        queryKey:["projectBoard"],
        queryFn: getProjectBoard,
        enabled: !isNaN(projectId)
    });

    useFetchUsers();

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center">
            <div className="w-11/12 mb-3">
                <h1 className="text-4xl font-extrabold">{!!projectTitle ? projectTitle : ""}</h1>
            </div>
            <div className="h-5/6 w-11/12 rounded-lg bg-neutral-900 text-neutral-50">
                <div className="flex h-full w-full gap-3 p-12 overflow-scroll">
                <Column
                    title="Backlog"
                    column="backlog"
                    headingColor="text-neutral-500"
                    cards={cards}
                    setCards={setCards}
                    projectId={projectId}
                    user={user}
                />
                <Column
                    title="TODO"
                    column="todo"
                    headingColor="text-yellow-200"
                    cards={cards}
                    setCards={setCards}
                    projectId={projectId}
                    user={user}
                />
                <Column
                    title="In progress"
                    column="doing"
                    headingColor="text-blue-200"
                    cards={cards}
                    setCards={setCards}
                    projectId={projectId}
                    user={user}
                />
                <Column
                    title="Done"
                    column="done"
                    headingColor="text-emerald-200"
                    cards={cards}
                    setCards={setCards}
                    projectId={projectId}
                    user={user}
                />
                <BurnBarrel 
                    setCards={setCards} 
                    cards={cards} 
                    projectId={projectId}
                    user={user}
                />
                </div>
            </div>
    </div>
    );
};

export default Board;
