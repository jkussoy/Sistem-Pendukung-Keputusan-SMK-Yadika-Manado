import React, { useState } from "react";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./style.css";
import Logo from "../../Assets/Image/Logo.png";

const ChangePassword = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getStrengthLabel = () => {
    if (newPass.length === 0) return "";
    if (newPass.length < 6) return "Weak";
    if (newPass.length < 10) return "Medium";
    return "Strong";
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;

    if (!user) return alert("User tidak ditemukan!");

    if (!oldPass || !newPass || !confirmPass)
      return alert("Semua field wajib diisi!");

    if (newPass !== confirmPass)
      return alert("Konfirmasi password tidak cocok!");

    if (newPass.length < 6) return alert("Password baru minimal 6 karakter!");

    try {
      setLoading(true);

      const credential = EmailAuthProvider.credential(user.email, oldPass);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPass);

      alert("Password berhasil diperbarui! Silakan login kembali.");

      await signOut(auth);
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/wrong-password") {
        alert("Password lama salah!");
      } else {
        alert("Gagal mengganti password!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-wrapper">
      <div className="cp-card">
        {/* ✅ LOGO */}
        <div className="cp-logo">
          <img src={Logo} alt="logo" />
        </div>

        <h2>🔐 Ganti Password</h2>
        <p className="cp-sub">Pastikan password baru kuat & mudah diingat</p>

        <div className="cp-group">
          <label>Password Lama</label>
          <div className="cp-input-wrap">
            <input
              type={showOld ? "text" : "password"}
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
              placeholder="Masukkan password lama"
            />
            <span onClick={() => setShowOld(!showOld)} className="toggle-eye">
              {showOld ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>
        </div>

        <div className="cp-group">
          <label>Password Baru</label>
          <div className="cp-input-wrap">
            <input
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Masukkan password baru"
            />
            <span onClick={() => setShowNew(!showNew)} className="toggle-eye">
              {showNew ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>

          {newPass && (
            <div className={`cp-strength ${getStrengthLabel().toLowerCase()}`}>
              {getStrengthLabel()}
            </div>
          )}
        </div>

        <div className="cp-group">
          <label>Konfirmasi Password Baru</label>
          <div className="cp-input-wrap">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Ulangi password baru"
            />
            <span
              onClick={() => setShowConfirm(!showConfirm)}
              className="toggle-eye"
            >
              {showConfirm ? "👁️" : "👁️‍🗨️"}
            </span>
          </div>
        </div>

        <button
          className="cp-btn"
          onClick={handleChangePassword}
          disabled={loading}
        >
          {loading ? "Menyimpan..." : "Simpan Password"}
        </button>
      </div>
    </div>
  );
};

export default ChangePassword;
