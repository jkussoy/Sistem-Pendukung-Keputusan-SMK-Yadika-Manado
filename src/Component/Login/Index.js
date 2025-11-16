import React, { useState, useEffect } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../Config/Firebase";
import { ref, get } from "firebase/database";

const Login = () => {
  const navigate = useNavigate();

  // FORM STATE
  const [email, setEmail] = useState(
    localStorage.getItem("rememberEmail") || ""
  );
  const [password, setPassword] = useState(
    localStorage.getItem("rememberPassword") || ""
  );
  const [remember, setRemember] = useState(
    localStorage.getItem("rememberMe") === "true"
  );

  // UI
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // AUTO LOGIN (jika sudah login)
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const roleSnap = await get(ref(db, `users/${user.uid}/role`));
        if (roleSnap.exists()) navigate("/home");
      }
    });
  }, [navigate]);

  // VALIDASI KUSTOM
  const validateForm = () => {
    if (!email.trim()) {
      setError("Email tidak boleh kosong");
      return false;
    }

    const emailPattern = /\S+@\S+\.\S+/;
    if (!emailPattern.test(email)) {
      setError("Format email tidak valid");
      return false;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return false;
    }

    return true;
  };

  // LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // role lookup
      const roleSnap = await get(ref(db, `users/${uid}/role`));

      if (!roleSnap.exists()) {
        setError("Role tidak ditemukan, hubungi admin.");
        setLoading(false);
        return;
      }

      const role = roleSnap.val();
      localStorage.setItem("userRole", role);

      // REMEMBER ME
      if (remember) {
        localStorage.setItem("rememberEmail", email);
        localStorage.setItem("rememberPassword", password);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberEmail");
        localStorage.removeItem("rememberPassword");
        localStorage.removeItem("rememberMe");
      }

      navigate("/home");
    } catch (err) {
      setError("Email atau password salah");
      console.log("Login Error:", err);
    }

    setLoading(false);
  };

  // AUTO HIDE ERROR
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="login-container fade-in">
      <div className="login-box slide-up">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />

        <h2>LOGIN</h2>
        <p>Masukkan email & password Anda</p>

        {error && <div className="alert-error fade-in">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-wrapper">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <span className="show-pass" onClick={() => setShowPass(!showPass)}>
              {showPass ? (
                /* EYE OPEN (Professional Feather Icon) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4a4a4a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                /* EYE CLOSED (Professional Feather Icon) */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4a4a4a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94C16.12 19.12 14.12 20 12 20c-7 0-11-8-11-8a21.75 21.75 0 0 1 5.06-6.94" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M12 5c2.12 0 4.12.88 5.94 2.06A21.75 21.75 0 0 1 23 12s-1.12 2.24-3 4" />
                </svg>
              )}
            </span>
          </div>

          <div className="remember-me">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <label>Remember Me</label>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "LOADING..." : "LOGIN"}
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
