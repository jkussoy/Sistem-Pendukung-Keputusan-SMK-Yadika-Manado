import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../Config/Firebase";
import { onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { ref, onValue, update, remove } from "firebase/database";
import Logo from "./../../Assets/Image/Logo.png";
import "./style.css";

const ManageAccounts = () => {
  const navigate = useNavigate();

  const [currentUserRole, setCurrentUserRole] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // detail card

  // sama seperti Home: kontrol sidebar mini
  const [sidebarMini, setSidebarMini] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setSidebarMini(true);
      } else {
        setSidebarMini(false);
      }
    };

    handleResize(); // jalan pertama kali
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ============================
  // AUTH + ROLE GUARD (OPERATOR ONLY)
  // ============================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const userRef = ref(db, `users/${user.uid}`);
      onValue(
        userRef,
        (snap) => {
          const data = snap.val();
          const role = data?.role || "";
          setCurrentUserRole(role);
          setLoadingRole(false);

          // Bukan operator → lempar ke /home
          if (role !== "operator") {
            navigate("/home");
          }
        },
        { onlyOnce: true }
      );
    });

    return () => unsub();
  }, [navigate]);

  // ============================
  // LOAD DAFTAR USER
  // ============================
  useEffect(() => {
    if (!currentUserRole || currentUserRole !== "operator") return;

    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([uid, value]) => ({
        uid,
        ...value,
      }));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setUsers(list);
    });

    return () => unsub();
  }, [currentUserRole]);

  if (loadingRole) {
    return (
      <div className="loading-screen-pro">
        <div className="loading-card-pro">
          <div className="loader-ring"></div>

          <div className="loader-logo">
            <img src={Logo} alt="logo" />
          </div>

          <h3 className="loading-title">Memuat Manajemen Akun...</h3>
          <p className="loading-sub">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // ============================
  // ACTION: NONAKTIF / AKTIFKAN
  // ============================
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "disabled" ? "active" : "disabled";

    if (
      !window.confirm(
        newStatus === "disabled"
          ? `Nonaktifkan akun ${user.name || user.email}?`
          : `Aktifkan kembali akun ${user.name || user.email}?`
      )
    )
      return;

    await update(ref(db, `users/${user.uid}`), {
      status: newStatus,
    });

    alert(
      newStatus === "disabled"
        ? "Akun berhasil dinonaktifkan."
        : "Akun berhasil diaktifkan."
    );
  };

  // ============================
  // ACTION: RESET PASSWORD (EMAIL)
  // ============================
  const handleResetPassword = async (user) => {
    if (!window.confirm(`Kirim email reset password ke ${user.email}?`)) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      alert("Email reset password telah dikirim.");
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim email reset password.");
    }
  };

  // ============================
  // ACTION: HAPUS USER (HANYA DB)
  // ============================
  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus akun ${
          user.name || user.email
        }? (hapus dari database)`
      )
    )
      return;

    try {
      await remove(ref(db, `users/${user.uid}`));
      alert("Akun berhasil dihapus dari database.");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus akun.");
    }
  };

  // ============================
  // DETAIL CONTENT (dipakai desktop & mobile)
  // ============================
  const DetailContent = ({ user }) => (
    <>
      <div className="detail-body">
        <div className="detail-row">
          <span className="label">Nama</span>
          <span className="value">{user.name || "-"}</span>
        </div>
        <div className="detail-row">
          <span className="label">Email</span>
          <span className="value">{user.email}</span>
        </div>
        <div className="detail-row">
          <span className="label">Role</span>
          <span className="value">{user.role || "-"}</span>
        </div>
        <div className="detail-row">
          <span className="label">Status</span>
          <span
            className={`value badge-pill ${
              user.status === "disabled" ? "badge-red" : "badge-green"
            }`}
          >
            {user.status === "disabled" ? "Nonaktif" : "Aktif"}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">UID</span>
          <span className="value mono">{user.uid}</span>
        </div>
        <div className="detail-row">
          <span className="label">Dibuat</span>
          <span className="value">
            {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
          </span>
        </div>
      </div>

      <p className="detail-note">
        Password <strong>tidak</strong> pernah ditampilkan demi keamanan.
        Gunakan fitur <strong>Reset Password</strong> untuk mengirim email reset
        ke pengguna.
      </p>
    </>
  );

  // ============================
  // RENDER DETAIL DESKTOP (PANEL KANAN)
  // ============================
  const renderDetailCard = () => {
    if (!selectedUser) return null;

    return (
      <aside className="account-detail-card card-animated desktop-detail">
        <div className="detail-header-row">
          <h4>Detail Akun</h4>
          <button
            className="detail-close-btn"
            onClick={() => setSelectedUser(null)}
          >
            ✕
          </button>
        </div>
        <DetailContent user={selectedUser} />
      </aside>
    );
  };

  // ============================
  // RENDER DETAIL MOBILE (MODAL)
  // ============================
  const renderDetailModal = () => {
    if (!selectedUser) return null;

    return (
      <div
        className="detail-modal-backdrop"
        onClick={() => setSelectedUser(null)}
      >
        <div
          className="detail-modal card-animated"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="detail-header-row modal-header-row">
            <h4>Detail Akun</h4>
            <button
              className="detail-close-btn"
              onClick={() => setSelectedUser(null)}
            >
              ✕
            </button>
          </div>
          <DetailContent user={selectedUser} />
        </div>
      </div>
    );
  };

  // ============================
  // LOGOUT
  // ============================
  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      navigate("/landing-page");
    } catch (err) {
      console.error("Logout gagal:", err);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="topbar">
        <div className="left-header">
          <div className="logo-badge">
            <img src={Logo} alt="Logo" className="logo-header" />
          </div>
          <div className="header-text">
            <h2>Sistem Pendukung Keputusan</h2>
            <span className="header-subtitle">SMK Yadika Manado</span>
          </div>
        </div>

        <div className="user-info">
          <button onClick={handleLogout} className="logout">
            Keluar
          </button>
        </div>
      </header>

      <div className="content-layout">
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarMini ? "mini" : ""}`}>
          <div className="menu-item">
            <button className="menu-btn" onClick={() => navigate("/home")}>
              <span className="icon">🏠</span>
              <span className="text">Dashboard</span>
            </button>
          </div>

          <div className="menu-item">
            <button className="menu-btn active">
              <span className="icon">👥</span>
              <span className="text">Daftar Akun</span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className={`main-content ${sidebarMini ? "expand" : ""}`}>
          <div className="home-inner">
            <div className="home-header-row">
              <div>
                <h3 className="welcome-title">
                  Manajemen Akun <span>(Operator Only)</span>
                </h3>
                <p className="welcome-sub">
                  Kelola akun guru dan siswa: aktif/nonaktif, reset password,
                  dan pengelolaan dasar.
                </p>
              </div>

              <button
                className="primary-cta"
                onClick={() => navigate("/signup")}
              >
                Buat Akun Baru
              </button>
            </div>

            {/* LIST & DETAIL */}
            <div
              className={
                "manage-accounts-layout " +
                (selectedUser ? "with-detail" : "single")
              }
            >
              <section className="account-list-section">
                <div className="agenda-header-row">
                  <h4 className="agenda-title">Daftar Akun Terdaftar</h4>
                  <span className="agenda-count">{users.length} akun</span>
                </div>

                {users.length === 0 ? (
                  <p className="no-agenda">Belum ada akun terdaftar.</p>
                ) : (
                  <>
                    {/* DESKTOP TABLE */}
                    <div className="account-table-wrapper">
                      <table className="account-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Nama</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u, index) => (
                            <tr key={u.uid}>
                              <td>{index + 1}</td>
                              <td>{u.name || "-"}</td>
                              <td>{u.email}</td>
                              <td>
                                {u.role === "operator"
                                  ? "Operator"
                                  : u.role === "teacher"
                                  ? "Teacher"
                                  : "Student"}
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${
                                    u.status === "disabled"
                                      ? "status-red"
                                      : "status-green"
                                  }`}
                                >
                                  {u.status === "disabled"
                                    ? "Nonaktif"
                                    : "Aktif"}
                                </span>
                              </td>
                              <td>
                                <div className="account-actions">
                                  <button
                                    className="edit-btn"
                                    onClick={() => setSelectedUser(u)}
                                  >
                                    Detail
                                  </button>
                                  <button
                                    className="reset-btn"
                                    onClick={() => handleResetPassword(u)}
                                  >
                                    Reset Password
                                  </button>
                                  <button
                                    className="toggle-voting-btn"
                                    onClick={() => handleToggleStatus(u)}
                                  >
                                    {u.status === "disabled"
                                      ? "Aktifkan"
                                      : "Nonaktifkan"}
                                  </button>
                                  <button
                                    className="delete-btn"
                                    onClick={() => handleDeleteUser(u)}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* MOBILE CARD LIST */}
                    <div className="mobile-account-list">
                      {users.map((u, index) => (
                        <div key={u.uid} className="mobile-account-card">
                          <div className="mobile-account-header">
                            <span className="mobile-index">{index + 1}.</span>{" "}
                            <span className="mobile-name">{u.name || "-"}</span>
                          </div>
                          <div className="mobile-row">
                            <span className="acc-label">Email</span>
                            <span className="acc-value">{u.email}</span>
                          </div>
                          <div className="mobile-row">
                            <span className="acc-label">Role</span>
                            <span className="acc-value">{u.role}</span>
                          </div>
                          <div className="mobile-row">
                            <span className="acc-label">Status</span>
                            <span
                              className={`status-pill ${
                                u.status === "disabled"
                                  ? "status-red"
                                  : "status-green"
                              }`}
                            >
                              {u.status === "disabled" ? "Nonaktif" : "Aktif"}
                            </span>
                          </div>

                          <div className="mobile-actions">
                            <button
                              className="edit-btn"
                              onClick={() => setSelectedUser(u)}
                            >
                              Detail
                            </button>
                            <button
                              className="reset-btn"
                              onClick={() => handleResetPassword(u)}
                            >
                              Reset Password
                            </button>
                            <button
                              className="toggle-voting-btn"
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.status === "disabled"
                                ? "Aktifkan"
                                : "Nonaktifkan"}
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(u)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Detail panel (desktop) */}
              {renderDetailCard()}
            </div>
          </div>
        </main>
      </div>

      {/* Detail modal (mobile) */}
      {renderDetailModal()}
    </div>
  );
};

export default ManageAccounts;
