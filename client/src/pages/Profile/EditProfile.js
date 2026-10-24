import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../../config/api.js';
import useAuth from '../../hooks/useAuth.js';
import EditProfileForm from './components/EditProfileForm.js';
import { makeSquarePhoto } from './utils/photo.js';
import { getInitialForm } from './utils/profileForm.js';

const EditProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => getInitialForm(user));
  const [projects, setProjects] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm(getInitialForm(user));
  }, [user]);

  useEffect(() => {
    axios.get(`${API_URL}/projects`, { withCredentials: true })
      .then((response) => setProjects(Array.isArray(response.data) ? response.data : []))
      .catch(() => setProjects([]));
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleFeaturedProject = (projectId) => {
    setForm((current) => ({
      ...current,
      featuredProjectIds: current.featuredProjectIds.includes(projectId)
        ? current.featuredProjectIds.filter((id) => id !== projectId)
        : [...current.featuredProjectIds, projectId],
    }));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Choose an image file to upload.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Choose an image smaller than 10 MB.');
      event.target.value = '';
      return;
    }

    setErrorMessage('');
    try {
      const photo = await makeSquarePhoto(file);
      setForm((current) => ({ ...current, photoUrl: photo }));
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const userId = user?._id || user?.id;
    if (!userId) {
      setErrorMessage('Your account could not be identified. Refresh the page and try again.');
      return;
    }
    if (!form.name.trim()) {
      setErrorMessage('Enter your name before saving.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      year: form.year.trim(),
      course: form.course.trim(),
      origin: { country: form.country.trim(), state: form.state.trim() },
      instagramUrl: form.instagramUrl.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      githubUrl: form.githubUrl.trim(),
      description: form.description.trim(),
      photoUrl: form.photoUrl,
      featuredProjectIds: form.featuredProjectIds,
    };

    setIsSaving(true);
    setErrorMessage('');
    try {
      const response = await axios.patch(`${API_URL}/user/${userId}`, payload, {
        withCredentials: true,
      });
      setUser((current) => ({ ...current, ...response.data }));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/profile');
    } catch (error) {
      console.error('Error updating user profile:', error);
      setErrorMessage(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Your profile could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <main className="profile-page"><div className="profile-state" role="status">Loading profile...</div></main>;
  }

  return (
    <EditProfileForm
      form={form}
      errorMessage={errorMessage}
      isSaving={isSaving}
      onBack={() => navigate('/profile')}
      onSubmit={handleSubmit}
      onFieldChange={updateField}
      onProjectToggle={toggleFeaturedProject}
      onPhotoChange={handlePhotoChange}
      projects={projects}
    />
  );
};

export default EditProfile;
