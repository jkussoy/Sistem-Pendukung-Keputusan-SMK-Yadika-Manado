import React, { useState } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../Config/Firebase";
import { ref, get } from "firebase/database";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. Login ke Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // 2. Ambil role dari Firebase DB
      const roleSnap = await get(ref(db, `users/${uid}/role`));

      if (!roleSnap.exists()) {
        setError("Role tidak ditemukan. Hubungi operator.");
        return;
      }

      const role = roleSnap.val();

      // 3. Simpan role di localStorage
      localStorage.setItem("userRole", role);

      // 4. Redirect ke HOME
      navigate("/home");
    } catch (err) {
      console.error(err.message);
      setError("Email atau password salah!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />

        <h2>LOGIN</h2>
        <p>Masukkan email & password Anda</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

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
          Belum punya akun? <a href="/signup">SIGN UP</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
