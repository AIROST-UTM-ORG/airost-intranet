import React, { useState, useEffect } from 'react';
import './Projects.css';
import ProjectList from '../../components/ProjectList';
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from '@tanstack/react-query'
import useFetchUsers from "../../hooks/useFetchUsers";
import useGetProjects from './hooks/useGetProjects';
import axios from 'axios';
import { API_URL } from '../../config/api';

function Projects() {
  const projectsQuery = useGetProjects();
  const [projects, setProjects] = useState([]);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const users = useFetchUsers();

  // Sync projects state with fetched query data
  useEffect(() => {
    if (projectsQuery.data) {
      console.log('Projects data from query:', projectsQuery.data);
      setProjects(projectsQuery.data);
    }
  }, [projectsQuery.data]);

  console.log('Current projects state (line 20):', projects);
  console.log('Users data:', users.data);

  const createProject = async (project) => {
    return axios.post(`${API_URL}/projects`, {
      title: project.title,
      description: project.description ? project.description : "",
      lead: project.lead,
    })
  }

  const deleteProject = async (projectId) => {
    return axios.delete(`${API_URL}/projects/${projectId}`)
  }

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (response) => {
      console.log('Project created successfully:', response.data)
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (response?.data) {
        setProjects((prev) => {
          const exists = prev.some(
            (p) => (p.projectId && p.projectId === response.data.projectId) || p._id === response.data._id
          );
          return exists ? prev : [...prev, response.data];
        });
      }
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  })

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: (data, deletedProjectId) => {
      console.log('Project deleted successfully (line 55):', data)
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjects((prev) =>
        prev.filter((p) => p.projectId !== deletedProjectId && p._id !== deletedProjectId)
      );
    },
    onError: (error) => {
      console.error('Error deleting project:', error)
      alert('Failed to delete project. Please try again.');
    }
  })

  const onSubmit = (data) => {
    console.log('Form submit data (line 55):', data)
    createProjectMutation.mutate(data)
    reset();
    const modal = document.getElementById('my_modal_2');
    if (modal) {
      modal.close();
    }
  }

  const handleDeleteProject = (projectId) => {
    deleteProjectMutation.mutate(projectId);
  }

  return (
    <div className='Projects p-5'>
      <div className='flex flex-row justify-between items-center w-10/12'>
        <h1 className='project-title'>Projects</h1>
        <button className="btn btn-primary" onClick={() => document.getElementById('my_modal_2').showModal()}>Add New Project</button>
      </div>      {projectsQuery.isLoading
        ? <div className="flex flex-col gap-2">
          <div className="skeleton h-20"></div>
          <div className="skeleton h-20"></div>
          <div className="skeleton h-20"></div>
        </div>
        : <ProjectList projects={projects} onDeleteProject={handleDeleteProject}></ProjectList>
      }

      <dialog id="my_modal_2" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-5">Add New Project</h3>
          <form action="POST" onSubmit={handleSubmit(onSubmit)}>
            <div className='flex flex-col gap-3'>
              <label className="input input-bordered flex items-center gap-2">
                Project Title
                <input {...register("title", { required: true })} type="text" className="grow" placeholder="Airost Intranet" required />
              </label>
              <label className="input input-bordered flex items-center gap-2">
                Description
                <input {...register("description")} type="text" className="grow" placeholder="This project is about....." />
              </label>
              {!users.isLoading && <select
                {...register("lead")}
                className="select select-bordered w-full">
                <option value="no_assignee">Project Lead</option>
                {users.data?.map((user) => {
                  return (<option key={user.email || user._id} value={user.email}>{user.name}</option>)
                })}
              </select>}
              <button className='btn btn-neutral' type='submit'>Submit</button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

    </div>
  );
}

export default Projects;