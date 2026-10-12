import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiUser, FiFolder, FiArrowRight, FiGrid, FiList } from "react-icons/fi";
import useGetProjects from "../Projects/hooks/useGetProjects";
import "./ProjectTracking.css";

export const ProjectTracking = () => {
  const { data: projects, isLoading, isError } = useGetProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(project =>
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.lead?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const ProjectCard = ({ project }) => (
    <Link
      to={`/projects/tracking/${project.projectId}`}
      state={{ projectId: project.projectId }}
      className="group block transition-all duration-200 hover:scale-[1.02]"
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2"></div>

        <div className="p-6">
          {/* Project Title */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors" style={{ color: '#111827' }}>
              {project.title}
            </h3>
            <FiArrowRight className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
          </div>

          {/* Project Description */}
          {project.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3" style={{ color: '#4b5563' }}>
              {project.description}
            </p>
          )}

          {/* Project Lead */}
          {project.lead && (
            <div className="flex items-center gap-2 text-sm text-gray-500" style={{ color: '#6b7280' }}>
              <FiUser className="w-4 h-4" />
              <span>Led by {project.lead}</span>
            </div>
          )}

          {/* Project ID Badge */}
          <div className="mt-4 pt-4 border-t border-gray-100" style={{ borderColor: '#f3f4f6' }}>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
              Project #{project.projectId}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  const ProjectListItem = ({ project }) => (
    <Link
      to={`/projects/tracking/${project.projectId}`}
      state={{ projectId: project.projectId }}
      className="group block transition-all duration-200"
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-4" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold">
                  #{project.projectId}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors" style={{ color: '#111827' }}>
                  {project.title}
                </h3>
                {project.description && (
                  <p className="text-gray-600 text-sm mt-1 truncate" style={{ color: '#4b5563' }}>
                    {project.description}
                  </p>
                )}
                {project.lead && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500" style={{ color: '#6b7280' }}>
                    <FiUser className="w-3 h-3" />
                    <span>{project.lead}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <FiArrowRight className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200 ml-4" />
        </div>
      </div>
    </Link>
  ); return (
    <div className="project-tracking-white-theme min-h-screen bg-white" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>              <h1 className="text-3xl font-bold text-gray-900" style={{ color: '#111827' }}>
              Project Tracking
            </h1>
              <p className="text-gray-600 mt-2" style={{ color: '#4b5563' }}>
                Monitor and manage your projects efficiently
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
              <button
                onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-colors ${viewMode === "grid"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
                  }`}
                style={viewMode === "grid" ? { backgroundColor: '#dbeafe', color: '#2563eb' } : { color: '#9ca3af' }}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-colors ${viewMode === "list"
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
                  }`}
                style={viewMode === "list" ? { backgroundColor: '#dbeafe', color: '#2563eb' } : { color: '#9ca3af' }}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
              />
            </div>
          </div>

          {/* Stats */}
          {projects && (
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600" style={{ color: '#4b5563' }}>
              <div className="flex items-center gap-2">
                <FiFolder className="w-4 h-4" />
                <span>{filteredProjects.length} projects found</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>            {[...Array(6)].map((_, index) => (<div key={index} className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
            <div className="bg-gray-200 h-2 animate-pulse" style={{ backgroundColor: '#f3f4f6' }}></div>
            <div className="p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }}></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }}></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" style={{ backgroundColor: '#f3f4f6' }}></div>
            </div>
          </div>
          ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">            <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
            <div className="text-red-600 mb-2" style={{ color: '#dc2626' }}>
              <FiFolder className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2" style={{ color: '#7f1d1d' }}>
              Unable to load projects
            </h3>
            <p className="text-red-700 text-sm" style={{ color: '#b91c1c' }}>
              There was an error loading your projects. Please try again later.
            </p>
          </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">            <div className="text-gray-400 mb-4" style={{ color: '#9ca3af' }}>
            <FiFolder className="w-16 h-16 mx-auto" />
          </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ color: '#111827' }}>
              {searchTerm ? "No projects found" : "No projects available"}
            </h3>
            <p className="text-gray-600" style={{ color: '#4b5563' }}>
              {searchTerm
                ? "Try adjusting your search terms or clear the search to see all projects."
                : "There are no projects to display at the moment."
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {filteredProjects?.map((project) =>
              viewMode === "grid" ? (
                <ProjectCard key={project.projectId} project={project} />
              ) : (
                <ProjectListItem key={project.projectId} project={project} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTracking;