import React, { useState, useEffect } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo02.png";
import { ref, set, get } from "firebase/database";
import { db, auth, apiKey } from "../../Config/Firebase";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  /* ======================================================
      PROTECT ROUTE — HALAMAN INI HANYA UNTUK OPERATOR
     ====================================================== */
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const userRef = ref(db, `users/${auth.currentUser.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const currentRole = snapshot.val().role;

        if (currentRole !== "operator") {
          navigate("/");
        }
      }
    });
  }, [navigate]);

  /* ======================================================
      CREATE USER TANPA AUTO LOGIN — REST API FIREBASE
     ====================================================== */
  const createUserWithoutLogin = async (email, password) => {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          returnSecureToken: false, // ❗ PENTING AGAR TIDAK AUTO LOGIN
        }),
      }
    );

    return await response.json();
  };

  /* ======================================================
      HANDLE SIGN UP (FLOW BARU TANPA AUTO LOGIN)
     ====================================================== */
  const handleSignUp = async () => {
    if (!name || !email || !password || !role) {
      setStatus("error");
      setMessage("⚠️ Semua field wajib diisi!");
      return;
    }

    if (!validateStrictGmail(email)) {
      setStatus("error");
      setMessage("⚠️ Gunakan email Gmail yang valid.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("⚠️ Password minimal 6 karakter!");
      return;
    }

    try {
      // 1️⃣ Buat user TANPA MENGGANTI SESSION OPERATOR
      const result = await createUserWithoutLogin(email, password);

      if (result.error) {
        throw new Error(result.error.message);
      }

      const newUid = result.localId; // UID user baru

      // 2️⃣ Simpan ke Realtime Database
      await set(ref(db, `users/${newUid}`), {
        uid: newUid,
        name,
        email,
        role,
        status: "active",
        createdAt: Date.now(),
      });

      setStatus("success");
      setMessage("✅ Akun berhasil dibuat!");

      // 3️⃣ Kembali ke manage accounts
      setTimeout(() => {
        navigate("/manage-accounts");
      }, 1500);
    } catch (err) {
      setStatus("error");
      setMessage("❌ Error: " + err.message);
    }
  };

  /* ======================================================
      VALIDASI EMAIL
     ====================================================== */
  const validateStrictGmail = (email) => {
    const pattern = /^[a-zA-Z][a-zA-Z0-9._+-]{3,}@(gmail)\.com$/;
    if (email.includes("..")) return false;
    const username = email.split("@")[0];
    if (!/[a-zA-Z]/.test(username)) return false;
    return pattern.test(email);
  };

  return (
    <div className="signup-wrapper">
      <div className="glass-card">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />

        <h2 className="title">BUAT AKUN BARU</h2>
        <p className="subtitle">Hanya Operator dapat membuat akun</p>

        {message && (
          <div className={`notif-message ${status} fade-in`}>{message}</div>
        )}

        <div className="form-group">
          <label>Nama Lengkap</label>
          <input
            type="text"
            placeholder="Masukkan nama"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Masukkan email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              className="input-field password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {password.length > 0 && (
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <i className="fa-solid fa-eye-slash"></i>
                ) : (
                  <i className="fa-solid fa-eye"></i>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Pilih Role</label>
          <select
            className="input-field"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">-- Pilih Role --</option>
            <option value="operator">Operator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        <button className="signup-btn neon-btn" onClick={handleSignUp}>
          SIGN UP
        </button>
      </div>
    </div>
  );
};

export default SignUp;
