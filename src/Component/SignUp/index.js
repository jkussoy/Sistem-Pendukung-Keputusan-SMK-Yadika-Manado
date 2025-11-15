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

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />

        <h2>BUAT AKUN BARU</h2>
        <p>Hanya Operator dapat membuat akun</p>

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

        {message && <p className={`notif-message ${status}`}>{message}</p>}

        <p className="signin-text">
          Kembali ke login? <a href="/login">Klik di sini</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
