import React, { useState, useEffect } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo02.png";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../Config/Firebase";
import { ref, get } from "firebase/database";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    localStorage.getItem("rememberEmail") || ""
  );
  const [password, setPassword] = useState(
    localStorage.getItem("rememberPassword") || ""
  );
  const [remember, setRemember] = useState(
    localStorage.getItem("rememberMe") === "true"
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const roleSnap = await get(ref(db, `users/${user.uid}/role`));
        if (roleSnap.exists()) navigate("/home");
      }
    });
  }, [navigate]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const loginResult = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = loginResult.user.uid;

      // 🔥 Ambil semua data user sekaligus
      const userRef = ref(db, `users/${uid}`);
      const userSnap = await get(userRef);

      if (!userSnap.exists()) {
        setError("Data akun tidak ditemukan. Hubungi operator.");
        setLoading(false);
        return;
      }

      const userData = userSnap.val();
      const role = userData.role || "";
      const status = userData.status || "active"; // default active jika belum ada field

      // ❌ Jika akun dinonaktifkan
      if (status === "disabled") {
        setError("Akun Anda telah dinonaktifkan. Hubungi operator.");
        await auth.signOut(); // keluar paksa
        setLoading(false);
        return;
      }

      // ✅ Simpan role jika aktif
      localStorage.setItem("userRole", role);

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
    }

    setLoading(false);
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="premium-bg login-page d-flex justify-content-center align-items-center vh-100">
      <div className="login-card fade-in shadow-lg p-4">
        <img src={Logo} alt="Logo" className="login-logo mb-3" />

        <h2 className="login-title">LOGIN</h2>
        <p className="login-subtitle">Masukkan email & password Anda</p>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleLogin} className="mt-3">
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control premium-input"
              placeholder="Masukkan Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>

            <div className="position-relative">
              <input
                type={showPass ? "text" : "password"}
                className="form-control premium-input"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <span
                className="position-absolute top-50 end-0 translate-middle-y me-3 toggle-pass"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? (
                  // eye-off
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#6c757d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.45 21.45 0 0 1 5.06-6.94" />
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                    <path d="M12 5c2.12 0 4.12.88 5.94 2.06A21.45 21.45 0 0 1 23 12a21.45 21.45 0 0 1-2.06 3.94" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // eye
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#6c757d"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </span>
            </div>
          </div>

          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input login-checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <label className="form-check-label login-check-label">
              Remember Me
            </label>
          </div>

          <button type="submit" className="w-100 login-btn" disabled={loading}>
            {loading ? "LOADING..." : "LOGIN"}
          </button>
        </form>

        {/* <p className="signin-text mt-3">
          Belum punya akun? <a href="/signup">SIGN UP</a>
        </p> */}
      </div>
    </div>
  );
};

export default Login;
