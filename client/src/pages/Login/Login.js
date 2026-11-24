import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Google from "../../assets/google-icon.png";
import "./Login.css";

const Login = ({ getPath }) => {
  const google = () => {
    window.open("/auth/google", "_self");
  };

  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (typeof getPath === "function") {
      getPath(from);
    }
  }, [from, getPath]);

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
