import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../Config/Firebase";
import { ref, get, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./style.css";

const Profile = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [userUID, setUserUID] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ LOAD USER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUserUID(user.uid);

      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setName(data.name || "");
        setEmail(data.email || user.email);
        setRole(data.role || "");
        setPhotoBase64(data.photoBase64 || "");
      }

      setLoading(false);
    });

    return () => unsub();
  }, [auth, navigate]);

  // ✅ UPLOAD FOTO (BASE64)
  const handleUploadPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      return alert("Ukuran foto maksimal 200KB!");
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;

      await update(ref(db, `users/${userUID}`), {
        photoBase64: base64,
      });

      setPhotoBase64(base64);
      alert("Foto berhasil diperbarui!");
    };

    reader.readAsDataURL(file);
  };

  // ✅ SAVE PROFILE
  const handleSave = async () => {
    if (!name.trim()) return alert("Nama tidak boleh kosong!");
    setSaving(true);

    await update(ref(db, `users/${userUID}`), { name });

    setSaving(false);
    alert("Profil berhasil diperbarui!");
  };

  if (loading) return null;

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        {/* ✅ BACK BUTTON */}
        <button className="back-btn" onClick={() => navigate("/home")}>
          ⬅ Kembali
        </button>

        {/* ✅ AVATAR */}
        <div className="avatar-wrap">
          {photoBase64 ? (
            <img src={photoBase64} alt="avatar" className="avatar" />
          ) : (
            <div className="avatar default">{name.charAt(0).toUpperCase()}</div>
          )}
        </div>

        {/* ✅ UPLOAD BUTTON */}
        <label className="upload-btn">
          Ganti Foto
          <input type="file" accept="image/*" onChange={handleUploadPhoto} />
        </label>

        <h2 className="profile-title">Profil Saya</h2>

        {/* ✅ FORM */}
        <div className="profile-group">
          <label>Nama Lengkap</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="profile-group">
          <label>Email</label>
          <input type="text" value={email} disabled />
        </div>

        <div className="profile-group">
          <label>Role</label>
          <input type="text" value={role} disabled />
        </div>

        {/* ✅ BUTTONS */}
        <button className="save-btn" onClick={handleSave}>
          Simpan Perubahan
        </button>

        <button
          className="password-btn"
          onClick={() => navigate("/change-password")}
        >
          Ganti Password
        </button>
      </div>
    </div>
  );
};

export default Profile;
