import React, { useState } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../Config/Firebase"; // pastikan path ini benar

const LoginAsTeacher = () => {
  const navigate = useNavigate();

  // state untuk menampung input user
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // fungsi login
  const handleLogin = async (e) => {
    e.preventDefault(); // cegah reload form
    try {
      // login ke Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // kalau berhasil login, arahkan ke halaman home
      navigate("/home");
    } catch (err) {
      // tampilkan pesan error
      setError("Email atau password salah!");
      console.error(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />
        <h2>SISTEM PENDUKUNG KEPUTUSAN</h2>
        <p>SMK Yadika Manado</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Email Teacher"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="login-btn">
            LOGIN
          </button>
        </form>

        <p className="signin-text">
          Not have account?{" "}
          <a href="/signin-teacher" className="link-text">
            SIGN IN
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginAsTeacher;
