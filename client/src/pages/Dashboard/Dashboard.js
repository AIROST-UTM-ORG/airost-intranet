import "./Dashboard.css";
import useAuth from '../../hooks/useAuth';
import axios from 'axios';
import { useState, useEffect } from 'react';

function Dashboard() {
  const user = useAuth();

  const [description, setDescription] = useState(user?.description || "");
  const [year, setYear] = useState(user?.year || "");
  const [course, setCourse] = useState(user?.course || "");
  const [phonenum, setPhonenum] = useState(user?.phonenum || "");
  const [instagram, setInstagram] = useState(user?.instagram || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState({
    description: user?.description || "",
    year: user?.year || "",
    course: user?.course || "",
    phonenum: user?.phonenum || "",
    instagram: user?.instagram || "",
  });

  useEffect(() => {
    if (user) {
      setDescription(user.description || "");
      setYear(user.year || "");
      setCourse(user.course || "");
      setPhonenum(user.phonenum || "");
      setInstagram(user.instagram || "");
      setProfile({
        description: user.description || "",
        year: user.year || "",
        course: user.course || "",
        phonenum: user.phonenum || "",
        instagram: user.instagram || "",
      });
    }
  }, [user]);

  const openModal = () => {
    setDescription(profile.description || "");
    setYear(profile.year || "");
    setCourse(profile.course || "");
    setPhonenum(profile.phonenum || "");
    setInstagram(profile.instagram || "");
    setErrorMessage("");
    const modal = document.getElementById('my_modal_2');
    if (modal) {
      modal.showModal();
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!user?._id) return;

    setIsUpdating(true);
    setErrorMessage("");

    try {
      const response = await axios.patch(
        `${process.env.REACT_APP_API_URL}/user/${user._id}`,
        {
          description,
          year,
          course,
          phonenum,
          instagram,
        },
        {
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        const updated = response.data;
        const newProfile = {
          description: updated?.description ?? description,
          year: updated?.year ?? year,
          course: updated?.course ?? course,
          phonenum: updated?.phonenum ?? phonenum,
          instagram: updated?.instagram ?? instagram,
        };
        setProfile(newProfile);
        if (user) {
          user.description = newProfile.description;
          user.year = newProfile.year;
          user.course = newProfile.course;
          user.phonenum = newProfile.phonenum;
          user.instagram = newProfile.instagram;
        }
        const modal = document.getElementById('my_modal_2');
        if (modal) {
          modal.close();
        }
      }
    } catch (err) {
      console.error("Error updating user profile:", err);
      setErrorMessage(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className='dashboard'>
      <div className="header-container">
        <div className="background"><img src="profile_bg.png" alt="Profile background" /></div>
        <div className="profile-section">
          <img src={user?.photo} alt="Profile" className='profile-pic' referrerPolicy="no-referrer"/>
          <div className="about-section">
            <div className="name">{user?.name}</div>
            <div className="about-header">
              <div className="left-section">
                <div className="profile-description">{profile.description}</div>
                <div className="year-course">{(profile.year || "") + " year " + (profile.course || "") + " student"}</div>
              </div>
              <div className="right-section">
                <div className="phonenum">Phone no: {profile.phonenum}</div>
                <div className="profile-instagram">Instagram: {profile.instagram}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="main-container">
        <div className="main">
          <div className="information"></div>
          <div className="events"></div>
        </div>
      </div>
      <div className="buttons-container">
        <div className="buttons">
          <button className="btn btn-primary" onClick={openModal}>
            Edit Profile
          </button>
          <button className=""></button>
          <button className=""></button>
        </div>
      </div>
      <dialog id="my_modal_2" className="modal">
        <div className="modal-box">
          <form className="form grid grid-cols-1 gap-2" id='userForm' onSubmit={handleSubmit}>
            <div className="subtitle">Profile Info</div>
            {errorMessage && (
              <div className="alert alert-error text-sm py-2">
                <span>{errorMessage}</span>
              </div>
            )}
            <label className="w-full max-w-xs">
              <div className="label">
                <span className="label-text">Description</span>
              </div>
              <input 
                id="profile-description" className="input input-bordered w-full max-w-xs"
                type="text" placeholder={profile.description || "Description"} value={description}
                onChange={(e) => { setDescription(e.target.value); }} />
            </label>
            <label className="w-full max-w-xs">
              <div className="label">
                <span className="label-text">Year</span>
              </div>
              <input 
                id="profile-year" className="input input-bordered w-full max-w-xs"
                type="text" placeholder={profile.year || "Year"} value={year}
                onChange={(e) => { setYear(e.target.value); }} />
            </label>
            <label className="w-full max-w-xs">
              <div className="label">
                <span className="label-text">Course</span>
              </div>
              <input 
                id="profile-course" className="input input-bordered w-full max-w-xs"
                type="text" placeholder={profile.course || "Course"} value={course}
                onChange={(e) => { setCourse(e.target.value); }} />
            </label>
            <label className="w-full max-w-xs">
              <div className="label">
                <span className="label-text">Phone Number</span>
              </div>
              <input 
                id="profile-phonenum" className="input input-bordered w-full max-w-xs"
                type="text" placeholder={profile.phonenum || "Phone Number"} value={phonenum}
                onChange={(e) => { setPhonenum(e.target.value); }} />
            </label>
            <label className="w-full max-w-xs">
              <div className="label">
                <span className="label-text">Instagram</span>
              </div>
              <input 
                id="profile-instagram" className="input input-bordered w-full max-w-xs"
                type="text" placeholder={profile.instagram || "Instagram"} value={instagram}
                onChange={(e) => { setInstagram(e.target.value); }} />
            </label>
            <div className="modal-action">
              <button type="submit" disabled={isUpdating} className="btn btn-neutral">
                {isUpdating ? "Updating..." : "Update"}
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

export default Dashboard;
