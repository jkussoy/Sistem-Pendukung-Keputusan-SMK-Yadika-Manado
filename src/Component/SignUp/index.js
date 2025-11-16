import React, { useState } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { ref, set } from "firebase/database";
import { db, auth } from "../../Config/Firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState(null);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(""); // operator / teacher / student
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async () => {
    if (!name || !email || !password || !role) {
      setMessage("⚠️ Semua field wajib diisi!");
      setStatus("error");
      return;
    }

    // Validasi email Gmail saja
    if (!validateStrictGmail(email)) {
      setMessage(
        "⚠️ Gunakan email Gmail yang valid! Contoh: nama123@gmail.com (minimal 4 karakter, tidak boleh mulai angka, tidak boleh ada simbol aneh)"
      );
      setStatus("error");
      return;
    }

    // Password minimal 6 karakter
    if (password.length < 6) {
      setMessage("⚠️ Password minimal 6 karakter!");
      setStatus("error");
      return;
    }

    try {
      // 1) Buat akun baru
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2) Simpan display name
      await updateProfile(user, { displayName: name });

      // 3) Simpan data user ke Realtime DB
      await set(ref(db, `users/${user.uid}`), {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
      });

      setStatus("success");
      setMessage(`✅ Akun ${role} berhasil dibuat!`);

      // 4) Redirect ke login
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setStatus("error");
      setMessage("❌ Error: " + error.message);
    }
  };
  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };
  const validateGmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return pattern.test(email);
  };
  const validateStrictGmail = (email) => {
    const pattern = /^[a-zA-Z][a-zA-Z0-9._+-]{3,}@(gmail)\.com$/;

    if (email.includes("..")) return false;

    const username = email.split("@")[0];
    if (!/[a-zA-Z]/.test(username)) return false;

    return pattern.test(email);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />

        <h2>BUAT AKUN BARU</h2>
        <p>Hanya Operator dapat membuat akun</p>
        {message && (
          <div className={`notif-message ${status} fade-in`}>{message}</div>
        )}

        <label>Nama Lengkap</label>
        <input
          type="text"
          placeholder="Masukkan nama"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Email</label>
        <input
          type="email"
          placeholder="Masukkan email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Masukkan password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

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

        <button className="login-btn" onClick={handleSignUp}>
          SIGN UP
        </button>

        <p className="signin-text">
          Kembali ke login? <a href="/login">Klik di sini</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
