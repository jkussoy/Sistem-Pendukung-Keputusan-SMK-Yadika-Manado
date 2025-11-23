import React from "react";
import Logo from "./../../Assets/Image/Logo02.png";
import { useNavigate } from "react-router-dom";
import "./style.css";
import "bootstrap/dist/css/bootstrap.min.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="premium-bg d-flex justify-content-center align-items-center vh-100">
      <div className="premium-card p-5 text-center shadow-lg rounded-4">
        <img src={Logo} alt="Logo Sekolah" className="premium-logo mb-4" />

        <h2 className="fw-bold title-text mb-2">Sistem Pendukung Keputusan</h2>

        <p className="subtitle-text mb-4">SMK Yadika Manado</p>

        <button
          className="premium-btn w-100 mb-3"
          onClick={() => navigate("/login")}
        >
          Login sebagai Guru
        </button>

        <button
          className="premium-btn w-100"
          onClick={() => navigate("/login")}
        >
          Login sebagai Siswa
        </button>

        <p className="footer-premium mt-4">© 2025 SMK Yadika Manado</p>
      </div>
    </div>
  );
};

export default LandingPage;
