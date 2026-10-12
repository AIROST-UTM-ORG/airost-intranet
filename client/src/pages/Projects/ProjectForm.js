import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { API_URL } from '../../config/api';
import useAuth from '../../hooks/useAuth';
import useFetchUsers from '../../hooks/useFetchUsers';
import './ProjectForm.css';

const FIELD_OPTIONS = [
  'Web development',
  'App development',
  'Artificial Intelligence',
  'Internet of Things',
  'Robotics & Automation',
  'Data Science',
  'UI/UX Design',
  'General',
];

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProjectForm = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { id: routeId, projectId: routeProjectId } = useParams();
  const projectId = routeId || routeProjectId;
  const isEditMode = propMode === 'edit' || Boolean(projectId);

  const { user } = useAuth();
  const usersQuery = useFetchUsers();
  const usersList = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const queryClient = useQueryClient();

  // Form State
  const [title, setTitle] = useState('');
  const [lead, setLead] = useState('');
  const [field, setField] = useState('Web development');
  const [teamMembers, setTeamMembers] = useState([]);
  const [access, setAccess] = useState([]);
  const [description, setDescription] = useState('');

  // UI state
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [permissions, setPermissions] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown states
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showAccessDropdown, setShowAccessDropdown] = useState(false);
  const teamDropdownRef = useRef(null);
  const accessDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
        setShowTeamDropdown(false);
      }
      if (accessDropdownRef.current && !accessDropdownRef.current.contains(e.target)) {
        setShowAccessDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default lead if in create mode once users are loaded
  useEffect(() => {
    if (!isEditMode && !lead && usersList.length > 0) {
      // Default to current logged-in user if found, or first user
      const currentUserInList = usersList.find((u) => u.email === user?.email);
      setLead(currentUserInList ? currentUserInList.email : usersList[0].email);
    }
  }, [isEditMode, lead, usersList, user]);

  // Load existing project data if in edit mode
  useEffect(() => {
    if (!isEditMode || !projectId) return;

    let isMounted = true;
    const fetchProject = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await axios.get(`${API_URL}/projects/${projectId}`);
        const data = res.data;

        if (!isMounted) return;

        setTitle(data.title || '');
        setLead(data.lead || '');
        setField(data.category || data.field || 'Web development');
        setTeamMembers(Array.isArray(data.teamMembers) ? data.teamMembers : []);
        setAccess(Array.isArray(data.access) ? data.access : []);
        setDescription(data.description || '');
        setPermissions(data.permissions || null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching project:', err);
        setErrorMsg(
          err.response?.status === 404
            ? `Project #${projectId} not found.`
            : 'Failed to load project details. Please try again.'
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProject();
    return () => {
      isMounted = false;
    };
  }, [isEditMode, projectId]);

  // Helper to resolve user details
  const getUserDetails = (identifier) => {
    if (!identifier) return { name: 'Unknown', initials: '??', photo: null, email: '' };
    const found = usersList.find((u) => u.email === identifier || u.name === identifier);
    if (found) {
      return {
        name: found.name,
        email: found.email,
        initials: getInitials(found.name),
        photo: found.photo,
      };
    }
    return {
      name: identifier,
      email: identifier,
      initials: getInitials(identifier),
      photo: null,
    };
  };

  // Team member handlers
  const handleAddTeamMember = (userEmail) => {
    if (!teamMembers.includes(userEmail)) {
      setTeamMembers([...teamMembers, userEmail]);
    }
    setShowTeamDropdown(false);
  };

  const handleRemoveTeamMember = (userEmail) => {
    setTeamMembers(teamMembers.filter((m) => m !== userEmail));
  };

  // Access handlers
  const handleAddAccess = (userEmail) => {
    if (!access.includes(userEmail)) {
      setAccess([...access, userEmail]);
    }
    setShowAccessDropdown(false);
  };

  const handleRemoveAccess = (userEmail) => {
    setAccess(access.filter((a) => a !== userEmail));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg('Project title is required (minimum 2 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 3) {
      setErrorMsg('Project description is required.');
      return;
    }
    if (!lead || !lead.trim()) {
      setErrorMsg('Please select a project lead.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      lead: lead.trim(),
      field: field.trim(),
      category: field.trim(),
      teamMembers,
      access,
    };

    setSubmitting(true);
    try {
      if (isEditMode) {
        await axios.put(`${API_URL}/projects/${projectId}`, payload);
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        setSuccessMsg('Project updated successfully!');
        setTimeout(() => navigate('/projects'), 600);
      } else {
        await axios.post(`${API_URL}/projects`, payload);
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setSuccessMsg('Project created successfully!');
        setTimeout(() => navigate('/projects'), 600);
      }
    } catch (err) {
      console.error('Error saving project:', err);
      const backendError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'An unexpected error occurred while saving the project.';
      setErrorMsg(backendError);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete project handler
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await axios.delete(`${API_URL}/projects/${projectId}`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDeleteModal(false);
      navigate('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      const backendError =
        err.response?.data?.error || 'Failed to delete project. You may lack permission.';
      setErrorMsg(backendError);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Permission evaluation
  const isAdmin =
    user?.position &&
    (Array.isArray(user.position) ? user.position.includes('admin') : user.position === 'admin');
  const isOwnerOrLead =
    user && (user.email === lead || user.name === lead);
  const canEdit = isEditMode
    ? permissions?.canEdit ?? (isAdmin || isOwnerOrLead || permissions?.role === 'member')
    : true;
  const canDelete = isEditMode
    ? permissions?.canDelete ?? (isAdmin || isOwnerOrLead)
    : false;
  const canManageMembers = isEditMode
    ? permissions?.role === 'lead' || permissions?.role === 'admin' || isOwnerOrLead || isAdmin
    : true;

  if (loading) {
    return (
      <div className="project-form-page flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="loading loading-spinner loading-lg text-primary mb-3"></div>
          <p className="text-gray-500 text-sm">Loading project details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-form-page">
      <div className="project-form-container">
        {/* Breadcrumb */}
        <Link to="/projects" className="project-form-breadcrumb">
          <span>&larr;</span> Projects
        </Link>

        {/* Title & Subtitle matching Figma coral style */}
        <h1 className="project-form-title">
          {isEditMode ? 'Update Project' : 'Add Project'}
        </h1>
        <p className="project-form-subtitle">
          Bring your next idea to life. Set up your project and the people behind it.
        </p>

        {/* Alerts */}
        {errorMsg && (
          <div className="form-alert form-alert-error">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-red-700 hover:text-red-900 font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}
        {successMsg && (
          <div className="form-alert form-alert-success">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Card Form */}
        <div className="project-form-card">
          <div className="card-header-row">
            <h2 className="card-title">Project details</h2>
            <span className="required-hint">* Required fields</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Project title */}
            <div className="form-group">
              <label htmlFor="project-title-input" className="form-label mb-2 block">
                Project title *
              </label>
              <input
                id="project-title-input"
                type="text"
                className="form-input"
                placeholder="Airost Knowledge Hub"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit || submitting}
                required
              />
            </div>

            {/* 2-column: Project lead & Field */}
            <div className="form-group form-row-2col">
              {/* Project lead */}
              <div>
                <label htmlFor="project-lead-select" className="form-label mb-2 block">
                  Project lead *
                </label>
                <select
                  id="project-lead-select"
                  className="form-select"
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  disabled={!canManageMembers || submitting}
                  required
                >
                  <option value="" disabled>
                    Select project lead
                  </option>
                  {usersList.map((u) => (
                    <option key={u.email || u._id} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field */}
              <div>
                <label htmlFor="project-field-select" className="form-label mb-2 block">
                  Field *
                </label>
                <select
                  id="project-field-select"
                  className="form-select"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  disabled={!canEdit || submitting}
                  required
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team members */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Team members</label>
                <span className="selected-count">{teamMembers.length} selected</span>
              </div>
              <div className="chips-container">
                {teamMembers.map((memberEmail) => {
                  const details = getUserDetails(memberEmail);
                  return (
                    <div key={memberEmail} className="member-chip">
                      <span className="chip-avatar">
                        {details.photo ? (
                          <img src={details.photo} alt={details.name} />
                        ) : (
                          details.initials
                        )}
                      </span>
                      <span className="chip-name">{details.name}</span>
                      {canManageMembers && (
                        <button
                          type="button"
                          className="chip-remove-btn"
                          onClick={() => handleRemoveTeamMember(memberEmail)}
                          title="Remove member"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add member button & dropdown */}
                {canManageMembers && (
                  <div className="add-member-menu-wrapper" ref={teamDropdownRef}>
                    <button
                      type="button"
                      className="add-member-btn"
                      onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                    >
                      <FaPlus style={{ fontSize: '10px' }} /> Add members
                    </button>
                    {showTeamDropdown && (
                      <div className="add-member-dropdown">
                        {usersList
                          .filter((u) => !teamMembers.includes(u.email))
                          .map((u) => (
                            <div
                              key={u.email}
                              className="add-member-dropdown-item"
                              onClick={() => handleAddTeamMember(u.email)}
                            >
                              <span className="chip-avatar">
                                {u.photo ? (
                                  <img src={u.photo} alt={u.name} />
                                ) : (
                                  getInitials(u.name)
                                )}
                              </span>
                              <div className="dropdown-user-info">
                                <span className="dropdown-user-name">{u.name}</span>
                                <span className="dropdown-user-email">{u.email}</span>
                              </div>
                            </div>
                          ))}
                        {usersList.filter((u) => !teamMembers.includes(u.email)).length === 0 && (
                          <div className="p-2 text-xs text-gray-400 text-center">
                            All members already added
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="form-helper-text">
                Select people from your team. The project lead is included automatically.
              </p>
            </div>

            {/* Access */}
            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Access</label>
                <span className="selected-count">{access.length} selected</span>
              </div>
              <div className="chips-container">
                {access.map((accEmail) => {
                  const details = getUserDetails(accEmail);
                  return (
                    <div key={accEmail} className="member-chip">
                      <span className="chip-avatar">
                        {details.photo ? (
                          <img src={details.photo} alt={details.name} />
                        ) : (
                          details.initials
                        )}
                      </span>
                      <span className="chip-name">{details.name}</span>
                      {canManageMembers && (
                        <button
                          type="button"
                          className="chip-remove-btn"
                          onClick={() => handleRemoveAccess(accEmail)}
                          title="Remove access"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add access dropdown */}
                {canManageMembers && (
                  <div className="add-member-menu-wrapper" ref={accessDropdownRef}>
                    <button
                      type="button"
                      className="add-member-btn"
                      onClick={() => setShowAccessDropdown(!showAccessDropdown)}
                    >
                      <FaPlus style={{ fontSize: '10px' }} /> Add members
                    </button>
                    {showAccessDropdown && (
                      <div className="add-member-dropdown">
                        {usersList
                          .filter((u) => !access.includes(u.email))
                          .map((u) => (
                            <div
                              key={u.email}
                              className="add-member-dropdown-item"
                              onClick={() => handleAddAccess(u.email)}
                            >
                              <span className="chip-avatar">
                                {u.photo ? (
                                  <img src={u.photo} alt={u.name} />
                                ) : (
                                  getInitials(u.name)
                                )}
                              </span>
                              <div className="dropdown-user-info">
                                <span className="dropdown-user-name">{u.name}</span>
                                <span className="dropdown-user-email">{u.email}</span>
                              </div>
                            </div>
                          ))}
                        {usersList.filter((u) => !access.includes(u.email)).length === 0 && (
                          <div className="p-2 text-xs text-gray-400 text-center">
                            All members already have access
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="form-helper-text">
                Select people from your team. The project lead is included automatically.
              </p>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="project-description-input" className="form-label mb-2 block">
                Description *
              </label>
              <textarea
                id="project-description-input"
                className="form-textarea"
                rows={4}
                placeholder="Build a shared space for Airost members to discover learning resources, document project work, and share knowledge across the team."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit || submitting}
                required
              />
              <p className="form-helper-text">
                A short overview of the problem, goals, and what your team will build.
              </p>
            </div>

            {/* Footer row */}
            <div className="form-footer-row">
              <p className="footer-hint-text">Your project will appear in the Projects list.</p>
              <div className="footer-actions-group">
                <button
                  type="button"
                  className="btn-form-cancel"
                  onClick={() => navigate('/projects')}
                  disabled={submitting}
                >
                  Cancel
                </button>

                {isEditMode && canDelete && (
                  <button
                    type="button"
                    className="btn-form-delete"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={submitting || isDeleting}
                  >
                    <FaTrash style={{ fontSize: '12px' }} /> Delete project
                  </button>
                )}

                <button
                  type="submit"
                  className="btn-form-submit"
                  disabled={!canEdit || submitting}
                >
                  {submitting
                    ? 'Saving...'
                    : isEditMode
                    ? 'Save'
                    : '+ Create Project'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3 className="delete-modal-title">Delete Project</h3>
            <p className="delete-modal-message">
              Are you sure you want to delete <strong>"{title}"</strong>? This will permanently remove
              the project and its tracking board. This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-form-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-form-delete"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectForm;
