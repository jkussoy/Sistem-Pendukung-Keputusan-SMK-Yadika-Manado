import React, { useState } from "react";
import "./style.css";
import Logo from "./../../Assets/Image/Logo.png";
import { ref, set } from "firebase/database";
import { db, auth } from "../../Config/Firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SignInTeacher = () => {
  const [teacherId, setTeacherId] = useState("");
  const [name, setName] = useState(""); // 🆕 Nama guru
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!teacherId || !name || !email || !password) {
      setMessage("⚠️ Semua field wajib diisi!");
      setStatus("error");
      return;
    }

    try {
      // 1️⃣ Buat akun baru di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 2️⃣ Update profil Auth agar nama tampil di user.displayName
      await updateProfile(user, { displayName: name });

      // 3️⃣ Simpan data tambahan ke Firebase Realtime Database
      await set(ref(db, "teachers/" + teacherId), {
        id: teacherId,
        name: name,
        email: email,
        uid: user.uid,
      });

      // 4️⃣ Simpan nama ke localStorage agar bisa ditampilkan di halaman Home
      localStorage.setItem("teacherName", name);
      localStorage.setItem("teacherEmail", email);

      setMessage("✅ Akun berhasil dibuat!");
      setStatus("success");

      // 5️⃣ Arahkan user ke halaman login setelah 2 detik
      setTimeout(() => navigate("/login-teacher"), 2000);
    } catch (error) {
      setMessage("❌ Terjadi kesalahan: " + error.message);
      setStatus("error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo Sekolah" className="school-logo" />
        <h2>SISTEM PENDUKUNG KEPUTUSAN</h2>
        <p>SMK Yadika Manado</p>

        <label>ID Teacher</label>
        <input
          type="text"
          placeholder="Masukkan ID Teacher"
          className="input-field"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        />

        <label>Nama Lengkap</label>
        <input
          type="text"
          placeholder="Masukkan Nama Lengkap"
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Email</label>
        <input
          type="email"
          placeholder="Masukkan Email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Masukkan Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="login-btn" onClick={handleSignIn}>
          SIGN IN
        </button>

        {message && (
          <p
            className={`notif-message ${
              status === "success" ? "success" : "error"
            }`}
          >
            {message}
          </p>
        )}

        <p className="signin-text">
          Sudah punya akun?{" "}
          <a href="/login-teacher" className="link-text">
            LOGIN
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignInTeacher;
