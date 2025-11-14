import React from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const handleTeacherLogin = () => {
    navigate("/login-teacher");
  };
  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />
        <h2>SISTEM PENDUKUNG KEPUTUSAN</h2>
        <p>SMK Yadika Manado</p>

        <button className="login-btn" onClick={handleTeacherLogin}>
          LOGIN AS TEACHER
        </button>

        <button className="login-btn">LOGIN AS STUDENT</button>
      </div>
    </div>
  );
};

export default Login;
