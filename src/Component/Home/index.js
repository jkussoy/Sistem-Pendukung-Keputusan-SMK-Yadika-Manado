import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import Logo from "./../../Assets/Image/Logo.png";
import "./style.css";
import { saveLog } from "../../Utils/savelogs";

const Home = () => {
  const [topic, setTopic] = useState("");
  const [agendas, setAgendas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [userUID, setUserUID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sidebarMini, setSidebarMini] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) {
        setSidebarMini(true); // Auto mini
      } else {
        setSidebarMini(false); // Full mode
      }
    };

    handleResize(); // run on first load
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const navigate = useNavigate();

  /* =====================================================
     LOAD USER + ROLE DARI FIREBASE (REALTIME & AMAN)
     ===================================================== */
  useEffect(() => {
    const auth = getAuth();

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUsername(user.displayName || user.email || "Guru");
      setUserUID(user.uid);

      const roleSnap = await get(ref(db, `users/${user.uid}/role`));
      const role = roleSnap.exists() ? roleSnap.val() : "";

      setUserRole(role);
      localStorage.setItem("userRole", role);
      setLoadingRole(false);
    });

    return () => unsubAuth();
  }, [navigate]);

  /* =====================================================
     LOAD AGENDA LIST
     ===================================================== */
  useEffect(() => {
    const agendaRef = ref(db, "agendas");
    const unsubAgenda = onValue(agendaRef, (snapshot) => {
      const data = snapshot.val() || {};
      const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setAgendas(all);
    });

    return () => unsubAgenda();
  }, []);

  /* =====================================================
     LOAD AUDIT LOGS (OPERATOR ONLY)
     ===================================================== */
  useEffect(() => {
    if (userRole !== "operator") return;

    const logRef = ref(db, "auditLogs");
    const unsub = onValue(logRef, (snap) => {
      const data = snap.val() || {};

      const list = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
      }));

      list.sort((a, b) => new Date(b.time) - new Date(a.time));

      setAuditLogs(list.slice(0, 10));
    });

    return () => unsub();
  }, [userRole]);

  /* =====================================================
     TUNGGU ROLE SEBELUM RENDER (ANTI-FLICKER)
     ===================================================== */
  if (loadingRole) {
    return (
      <div className="loading-screen-pro">
        <div className="loading-card-pro">
          <div className="loader-ring"></div>

          <div className="loader-logo">
            <img src={Logo} alt="logo" />
          </div>

          <h3 className="loading-title">Loading Dashboard...</h3>
          <p className="loading-sub">Please wait a moment</p>
        </div>
      </div>
    );
  }

  /* =====================================================
     ADD AGENDA
     ===================================================== */
  const handleAddAgenda = async () => {
    if (userRole !== "operator") {
      return alert("Akses ditolak! Hanya operator yang bisa menambah agenda.");
    }

    if (topic.trim() === "") return alert("Topik tidak boleh kosong!");

    const data = {
      topic,
      createdBy: username,
      userId: userUID,
      date: new Date().toLocaleString(),
      createdAt: Date.now(),
      votingClosed: false,
    };

    const newAgenda = await push(ref(db, "agendas"), data);

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: "ADD_AGENDA",
      agendaId: newAgenda.key,
      detail: `Menambahkan agenda: ${topic}`,
    });

    alert("Agenda berhasil dibuat!");
    setTopic("");
    setShowForm(false);
  };

  /* =====================================================
     DELETE AGENDA
     ===================================================== */
  const handleDelete = async (id) => {
    if (userRole !== "operator") return alert("Akses ditolak!");

    if (!window.confirm("Yakin ingin menghapus agenda ini?")) return;

    await remove(ref(db, `agendas/${id}`));
    await remove(ref(db, `voteCount/${id}`));
    await remove(ref(db, `votes/${id}`));
    await remove(ref(db, `votingLogs/${id}`));

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: "DELETE_AGENDA",
      agendaId: id,
      detail: "Menghapus agenda beserta seluruh data voting",
    });

    alert("Agenda berhasil dihapus!");
  };

  /* =====================================================
     RESET VOTING
     ===================================================== */
  const handleResetVoting = async (agenda) => {
    if (userRole !== "operator") return;

    if (!window.confirm("Reset semua suara untuk agenda ini?")) return;

    await remove(ref(db, `voteCount/${agenda.id}`));
    await remove(ref(db, `votes/${agenda.id}`));

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: "RESET_VOTING",
      agendaId: agenda.id,
      detail: `Mereset semua suara`,
    });

    alert("Voting berhasil di-reset!");
  };

  /* =====================================================
     TOGGLE OPEN/CLOSE VOTING
     ===================================================== */
  const toggleVoting = async (agenda) => {
    if (userRole !== "operator") return;

    const willClose = !agenda.votingClosed;

    if (!window.confirm(willClose ? "Tutup voting?" : "Buka voting kembali?"))
      return;

    await update(ref(db, `agendas/${agenda.id}`), {
      votingClosed: willClose,
    });

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: willClose ? "CLOSE_VOTING" : "OPEN_VOTING",
      agendaId: agenda.id,
      detail: willClose ? "Menutup voting" : "Membuka voting",
    });

    alert("Berhasil!");
  };

  /* =====================================================
     EDIT TOPIC (INLINE)
     ===================================================== */
  const EditableTopic = ({ agenda }) => {
    const [editing, setEditing] = useState(false);
    const [newTopic, setNewTopic] = useState(agenda.topic);
    const [status, setStatus] = useState("");

    if (userRole !== "operator") {
      return <span className="agenda-col topic">{agenda.topic}</span>;
    }

    const saveTopic = async () => {
      if (newTopic.trim() === "" || newTopic === agenda.topic) {
        setEditing(false);
        return;
      }

      setStatus("saving");

      await update(ref(db, `agendas/${agenda.id}`), { topic: newTopic });

      await saveLog({
        userId: userUID,
        userName: username,
        role: userRole,
        action: "EDIT_TOPIC",
        agendaId: agenda.id,
        detail: `Mengubah topik menjadi: ${newTopic}`,
      });

      setStatus("saved");
      setTimeout(() => setStatus(""), 1500);
      setEditing(false);
    };

    return (
      <span className="agenda-col topic editable-topic">
        {editing ? (
          <input
            className="topic-input"
            autoFocus
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onBlur={saveTopic}
            onKeyDown={(e) => e.key === "Enter" && saveTopic()}
          />
        ) : (
          <span onClick={() => setEditing(true)}>{agenda.topic}</span>
        )}

        {status === "saving" && (
          <small className="save-status">💾 Menyimpan...</small>
        )}
        {status === "saved" && (
          <small className="save-status success">✅ Tersimpan</small>
        )}
      </span>
    );
  };

  /* =====================================================
     LOGOUT
     ===================================================== */
  const handleLogout = () => {
    const auth = getAuth();

    signOut(auth)
      .then(() => {
        localStorage.clear(); // pastikan role & nama juga dibersihkan
        navigate("/landing-page");
      })
      .catch((error) => {
        console.error("Logout gagal:", error);
      });
  };

  /* =====================================================
     RENDER PAGE
     ===================================================== */

  const Tooltip = ({ text }) => <div className="sidebar-tooltip">{text}</div>;

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
          <div className="user-meta">
            <span className="username">{username}</span>
            {userRole && (
              <span className={`role-pill role-${userRole}`}>
                {userRole === "operator"
                  ? "Operator"
                  : userRole === "teacher"
                  ? "Teacher"
                  : "Student"}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="logout">
            Keluar
          </button>
        </div>
      </header>

      <div className="content-layout">
        <aside className={`sidebar ${sidebarMini ? "mini" : ""}`}>
          <div className="menu-item">
            <button
              className="menu-btn active"
              onClick={() => navigate("/home")}
            >
              <span className="icon">🏠</span>
              <span className="text">Dashboard</span>
            </button>

            {sidebarMini && <div className="sidebar-tooltip">Dashboard</div>}
          </div>
        </aside>

        <main className={`main-content ${sidebarMini ? "expand" : ""}`}>
          <div className="home-inner">
            <div className="home-header-row">
              <div>
                <h3 className="welcome-title">
                  Selamat Datang, <span>{username}</span>
                </h3>
                <p className="welcome-sub">
                  Kelola agenda rapat dan proses pengambilan keputusan secara
                  terstruktur di satu tempat.
                </p>
              </div>

              {userRole === "operator" && (
                <button
                  className="primary-cta"
                  onClick={() => {
                    if (showForm) setTopic("");
                    setShowForm(!showForm);
                  }}
                >
                  {showForm ? "Tutup Form" : "Tambah Agenda"}
                </button>
              )}
            </div>

            {showForm && userRole === "operator" && (
              <div className="add-agenda-box card-animated">
                <div className="agenda-input-row">
                  <input
                    type="text"
                    placeholder="Masukkan topik agenda..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <button onClick={handleAddAgenda}>Simpan</button>
                </div>
                <p className="agenda-info-text">
                  Pastikan topik agenda jelas, singkat, dan mudah dipahami oleh
                  guru maupun siswa.
                </p>
              </div>
            )}

            <section className="agenda-section">
              <div className="agenda-header-row">
                <h4 className="agenda-title">Daftar Agenda Aktif</h4>
                <span className="agenda-count">
                  {agendas.length} agenda terdaftar
                </span>
              </div>

              <div className="agenda-list">
                {agendas.length === 0 ? (
                  <p className="no-agenda">
                    Belum ada agenda.{" "}
                    {userRole === "operator" && "Mulai dengan menambah agenda."}
                  </p>
                ) : (
                  agendas.map((a, i) => (
                    <div key={a.id} className="agenda-row card-animated">
                      <span className="agenda-col number">#{i + 1}</span>

                      <EditableTopic agenda={a} />

                      <span className="agenda-col status">
                        <span
                          className={
                            a.votingClosed
                              ? "status-pill status-red"
                              : "status-pill status-green"
                          }
                        >
                          {a.votingClosed ? "Voting Closed" : "Voting Open"}
                        </span>
                      </span>

                      <span className="agenda-col user">
                        <span className="label">Dibuat oleh</span>
                        <span className="value">{a.createdBy}</span>
                      </span>

                      <span className="agenda-col date">
                        <span className="label">Tanggal</span>
                        <span className="value">{a.date}</span>
                      </span>

                      <div className="agenda-actions">
                        <button
                          className="edit-btn"
                          onClick={() => navigate(`/workspace/${a.id}`)}
                        >
                          Lihat Detail
                        </button>

                        {userRole === "operator" && (
                          <>
                            <button
                              className="toggle-voting-btn"
                              onClick={() => toggleVoting(a)}
                            >
                              {a.votingClosed ? "Buka Voting" : "Tutup Voting"}
                            </button>

                            <button
                              className="reset-btn"
                              onClick={() => handleResetVoting(a)}
                            >
                              Reset Voting
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(a.id)}
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
