import React from 'react';
import './Projects.css';
import ProjectList from '../../components/ProjectList';
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useFetchUsers from "../../hooks/useFetchUsers";
import useGetProjects from './hooks/useGetProjects';
import axios from 'axios';
import { API_URL } from '../../config/api';

function Projects() {
  const projects = useGetProjects();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
  } = useForm();

  const users = useFetchUsers();

  const createProject = async (project) => {
    return axios.post(`${API_URL}/projects`, {
      title: project.title,
      description: project.description ? project.description : "",
      lead: project.lead === "no_assignee" ? "" : (project.lead || ""),
    }, { withCredentials: true });
  };

  const deleteProject = async (projectId) => {
    return axios.delete(`${API_URL}/projects/${projectId}`, { withCredentials: true });
  };

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      console.log('Project created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      reset();
      const modal = document.getElementById('my_modal_2');
      if (modal && typeof modal.close === 'function') {
        modal.close();
      }
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: (data) => {
      console.log('Project deleted successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  });

  const onSubmit = (data) => {
    createProjectMutation.mutate(data);
  };

  const handleDeleteProject = (projectId) => {
    deleteProjectMutation.mutate(projectId);
  };

  return (
    <div className='Projects p-5'>
      <div className='flex flex-row justify-between items-center w-10/12'>
        <h1 className='project-title'>Projects</h1>
        <button
          className="btn btn-primary"
          onClick={() => document.getElementById('my_modal_2')?.showModal()}
        >
          Add New Project
        </button>
      </div>

      {projects.isLoading ? (
        <div className="flex flex-col gap-2">
          <div className="skeleton h-20"></div>
          <div className="skeleton h-20"></div>
          <div className="skeleton h-20"></div>
        </div>
      ) : (
        <ProjectList
          projects={projects.data || []}
          onDeleteProject={handleDeleteProject}
        />
      )}

      <dialog id="my_modal_2" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-5">Add New Project</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='flex flex-col gap-3'>
              <label className="input input-bordered flex items-center gap-2">
                Project Title
                <input
                  {...register("title", { required: true })}
                  type="text"
                  className="grow"
                  placeholder="Airost Intranet"
                  required
                />
              </label>
              <label className="input input-bordered flex items-center gap-2">
                Description
                <input
                  {...register("description")}
                  type="text"
                  className="grow"
                  placeholder="This project is about....."
                />
              </label>
              {!users.isLoading && Array.isArray(users.data) && (
                <select
                  {...register("lead")}
                  defaultValue="no_assignee"
                  className="select select-bordered w-full"
                >
                  <option value="no_assignee">Project Lead</option>
                  {users.data.map(user => (
                    <option key={user._id || user.email} value={user.email}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              )}
              <button
                className='btn btn-neutral'
                type='submit'
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
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
