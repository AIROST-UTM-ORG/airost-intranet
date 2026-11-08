import React from 'react';
import { FiArrowLeft, FiCamera, FiUser } from 'react-icons/fi';
import FeaturedProject from './FeaturedProject';
import '../styles/editProfile.css';
import '../../MemberDirectory/styles/shared.css';

const EditProfileForm = ({
  form,
  errorMessage,
  socialErrors = {},
  hasSocialErrors = false,
  isSaving,
  onBack,
  onSubmit,
  onFieldChange,
  onProjectToggle,
  onPhotoChange,
  projects = [],
}) => (
  <main className="profile-edit-page">
    <button className="profile-back" type="button" onClick={onBack}>
      <FiArrowLeft aria-hidden="true" /> Back to profile
    </button>
    <form className="profile-edit-layout" onSubmit={onSubmit}>
      <section className="profile-edit-panel" aria-labelledby="edit-profile-title">
        <div className="profile-edit-heading">
          <h1 id="edit-profile-title">Edit profile</h1>
          <p>Update your personal details and select a project to feature.</p>
        </div>
        {errorMessage && <p className="profile-edit-error" role="alert">{errorMessage}</p>}

        <div className="profile-edit-fields">
          <label className="profile-edit-field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={onFieldChange} autoComplete="name" required />
          </label>
          <label className="profile-edit-field">
            <span>Year</span>
            <input name="year" value={form.year} onChange={onFieldChange} placeholder="e.g. 3rd year" />
          </label>
          <label className="profile-edit-field">
            <span>Course</span>
            <input name="course" value={form.course} onChange={onFieldChange} />
          </label>
          <label className="profile-edit-field">
            <span>Country</span>
            <input name="country" value={form.country} onChange={onFieldChange} autoComplete="country-name" />
          </label>
          <label className="profile-edit-field">
            <span>State</span>
            <input name="state" value={form.state} onChange={onFieldChange} autoComplete="address-level1" />
          </label>
          <label className="profile-edit-field">
            <span>Email</span>
            <input value={form.email} readOnly disabled />
          </label>
          <label className="profile-edit-field">
            <span>Instagram</span>
            <input
              name="instagramUrl"
              value={form.instagramUrl}
              onChange={onFieldChange}
              placeholder="https://www.instagram.com/user_id"
              aria-invalid={Boolean(socialErrors.instagramUrl)}
              aria-describedby={socialErrors.instagramUrl ? 'instagram-url-error' : undefined}
            />
            {socialErrors.instagramUrl && <span className="profile-edit-field-error" id="instagram-url-error" role="alert">{socialErrors.instagramUrl}</span>}
          </label>
          <label className="profile-edit-field">
            <span>LinkedIn</span>
            <input
              name="linkedinUrl"
              value={form.linkedinUrl}
              onChange={onFieldChange}
              placeholder="https://www.linkedin.com/in/user-id"
              aria-invalid={Boolean(socialErrors.linkedinUrl)}
              aria-describedby={socialErrors.linkedinUrl ? 'linkedin-url-error' : undefined}
            />
            {socialErrors.linkedinUrl && <span className="profile-edit-field-error" id="linkedin-url-error" role="alert">{socialErrors.linkedinUrl}</span>}
          </label>
          <label className="profile-edit-field">
            <span>GitHub</span>
            <input
              name="githubUrl"
              value={form.githubUrl}
              onChange={onFieldChange}
              placeholder="GitHub handle or https://github.com/user-id"
              aria-invalid={Boolean(socialErrors.githubUrl)}
              aria-describedby={socialErrors.githubUrl ? 'github-url-error' : undefined}
            />
            {socialErrors.githubUrl && <span className="profile-edit-field-error" id="github-url-error" role="alert">{socialErrors.githubUrl}</span>}
          </label>
          <label className="profile-edit-field profile-edit-field-wide">
            <span>Short description</span>
            <textarea name="description" value={form.description} onChange={onFieldChange} rows="4" />
          </label>
        </div>

        <fieldset className="profile-project-fields">
          <legend>Featured project</legend>
          <div className="profile-edit-field">
            <span>Select one or more projects</span>
            <div className="profile-edit-project-options">
              {projects.map((project) => (
                <label key={project._id}>
                  <input
                    type="checkbox"
                    checked={form.featuredProjectIds.includes(project._id)}
                    onChange={() => onProjectToggle(project._id)}
                  />
                  <span>{project.title || `Project ${project.projectId}`}</span>
                </label>
              ))}
              {!projects.length && <span>No projects are available to feature.</span>}
            </div>
          </div>
        </fieldset>

        <div className="profile-edit-actions">
          <button className="profile-save-button" type="submit" disabled={isSaving || hasSocialErrors}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button className="profile-cancel-button" type="button" onClick={onBack} disabled={isSaving}>
            Cancel
          </button>
        </div>
      </section>

      <aside className="profile-edit-aside">
        <section className="profile-edit-panel" aria-labelledby="profile-image-title">
          <div className="profile-edit-heading">
            <h2 id="profile-image-title">Profile image</h2>
            <p>Update the photo shown on your profile.</p>
          </div>
          <label className="profile-image-preview" htmlFor="profile-image-file">
            {form.photoUrl ? (
              <img src={form.photoUrl} alt="Profile preview" />
            ) : (
              <FiUser aria-hidden="true" />
            )}
          </label>
          <label className="profile-upload-button" htmlFor="profile-image-file">
            <FiCamera aria-hidden="true" /> Upload image
          </label>
          <input
            id="profile-image-file"
            className="profile-file-input"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
          />
          <p className="profile-image-help">Choose a square image. It will be cropped and resized to 400 × 400 px.</p>
        </section>

        <section className="profile-edit-panel profile-edit-project-preview" aria-label="Featured project preview">
          <FeaturedProject
            projects={projects.filter((project) => form.featuredProjectIds.includes(project._id))}
          />
        </section>
      </aside>
    </form>
  </main>
);

export default EditProfileForm;
