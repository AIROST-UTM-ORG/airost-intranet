import Google from "../../assets/google-icon.png";
import "./Login.css";
import { useLocation } from "react-router-dom";
import { API_URL } from "../../config/api";

const Login = ({ getPath }) => {
  const google = () => {
    window.open(`${API_URL}/auth/google`, "_self");
  };

  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  getPath(from);
  return (
    <div className="loginPage">
      <div className="loginBtn google" onClick={google}>
        <img src={Google} alt="" />
        Login with Google
      </div>
    </div>
  );
};

export default Login;
