import React from 'react';
import { FiArrowLeft, FiCamera, FiUser } from 'react-icons/fi';
import FeaturedProject from './FeaturedProject';
import '../styles/editProfile.css';
import '../../MemberDirectory/styles/shared.css';

const EditProfileForm = ({
  form,
  errorMessage,
  isSaving,
  onBack,
  onSubmit,
  onFieldChange,
  onProjectFieldChange,
  onPhotoChange,
}) => (
  <main className="profile-edit-page">
    <button className="profile-back" type="button" onClick={onBack}>
      <FiArrowLeft aria-hidden="true" /> Back to profile
    </button>
    <form className="profile-edit-layout" onSubmit={onSubmit}>
      <section className="profile-edit-panel" aria-labelledby="edit-profile-title">
        <div className="profile-edit-heading">
          <h1 id="edit-profile-title">Edit profile</h1>
          <p>Update your personal details and featured project information.</p>
        </div>
        {errorMessage && <p className="profile-edit-error" role="alert">{errorMessage}</p>}

        <div className="profile-edit-fields">
          <label className="profile-edit-field">
            <span>Name</span>
            <input name="name" value={form.name} onChange={onFieldChange} autoComplete="name" required />
          </label>
          <label className="profile-edit-field">
            <span>Position</span>
            <input name="profileTitle" value={form.profileTitle} onChange={onFieldChange} placeholder="e.g. Student Developer" />
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
            <span>Phone number</span>
            <input name="phonenum" value={form.phonenum} onChange={onFieldChange} type="tel" autoComplete="tel" />
          </label>
          <label className="profile-edit-field">
            <span>Instagram</span>
            <input name="instagram" value={form.instagram} onChange={onFieldChange} placeholder="@username" />
          </label>
          <label className="profile-edit-field">
            <span>LinkedIn</span>
            <input name="linkedin" value={form.linkedin} onChange={onFieldChange} type="url" placeholder="https://linkedin.com/in/…" />
          </label>
          <label className="profile-edit-field">
            <span>GitHub</span>
            <input name="github" value={form.github} onChange={onFieldChange} type="url" placeholder="https://github.com/…" />
          </label>
          <label className="profile-edit-field profile-edit-field-wide">
            <span>Short description</span>
            <textarea name="description" value={form.description} onChange={onFieldChange} rows="4" />
          </label>
        </div>

        <fieldset className="profile-project-fields">
          <legend>Featured project</legend>
          <div className="profile-edit-fields">
            <label className="profile-edit-field">
              <span>Project name</span>
              <input name="title" value={form.featuredProject.title} onChange={onProjectFieldChange} />
            </label>
            <label className="profile-edit-field">
              <span>Your role</span>
              <input name="role" value={form.featuredProject.role} onChange={onProjectFieldChange} />
            </label>
            <label className="profile-edit-field">
              <span>Status</span>
              <input name="status" value={form.featuredProject.status} onChange={onProjectFieldChange} />
            </label>
            <label className="profile-edit-field">
              <span>Technologies</span>
              <input
                name="technologies"
                value={form.featuredProject.technologies}
                onChange={onProjectFieldChange}
                placeholder="React, Node.js"
              />
            </label>
            <label className="profile-edit-field profile-edit-field-wide">
              <span>Project description</span>
              <textarea name="description" value={form.featuredProject.description} onChange={onProjectFieldChange} rows="4" />
            </label>
          </div>
        </fieldset>

        <div className="profile-edit-actions">
          <button className="profile-save-button" type="submit" disabled={isSaving}>
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
            {form.photo ? (
              <img src={form.photo} alt="Profile preview" />
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
            project={
              Object.values(form.featuredProject).some((value) => value.trim())
                ? {
                  ...form.featuredProject,
                  technologies: form.featuredProject.technologies.split(',').map((item) => item.trim()).filter(Boolean),
                }
                : null
            }
          />
        </section>
      </aside>
    </form>
  </main>
);

export default EditProfileForm;
