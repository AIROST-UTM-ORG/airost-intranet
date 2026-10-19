import "./Dashboard.css";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="header-container">
        <div className="background">
          <img src="profile_bg.png" alt="Profile background" />
        </div>
        <div className="profile-section">
          <img
            src={user?.photo}
            alt="Profile"
            className="profile-pic"
            referrerPolicy="no-referrer"
          />
          <div className="about-section">
            <div className="name">{user?.name}</div>
            <div className="about-header">
              <div className="left-section">
                <div className="profile-description">{user?.description}</div>
                <div className="year-course">
                  {[user?.year, user?.course, "student"].filter(Boolean).join(" ")}
                </div>
              </div>
              <div className="right-section">
                <div className="phonenum">Phone no: {user?.phonenum}</div>
                <div className="profile-instagram">Instagram: {user?.instagram}</div>
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
          <button className="btn btn-primary" type="button" onClick={() => navigate("/profile/edit")}>
            Edit Profile
          </button>
          <button className=""></button>
          <button className=""></button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
