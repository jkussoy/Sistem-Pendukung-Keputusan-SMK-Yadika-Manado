import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  const [auditLogs, setAuditLogs] = useState([]); // ⭐ TAMBAHAN

  const navigate = useNavigate();

  /* =====================================================
     LOAD USER + ROLE + AGENDAS
     ===================================================== */
  useEffect(() => {
    const auth = getAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsername(user.displayName || user.email || "Guru");
        setUserUID(user.uid);
        setUserRole(localStorage.getItem("userRole"));
      } else {
        navigate("/login");
      }
    });

    const agendaRef = ref(db, "agendas");
    const unsubAgenda = onValue(agendaRef, (snapshot) => {
      const data = snapshot.val() || {};
      const all = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setAgendas(all);
    });

    return () => {
      unsubAuth();
      unsubAgenda();
    };
  }, [navigate]);

  /* =====================================================
     LOAD AUDIT LOGS (Operator Only)
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
     ADD AGENDA
     ===================================================== */
  const handleAddAgenda = async () => {
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
     EDIT TOPIC — INLINE
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
          <small className="save-status">💾 Saving...</small>
        )}
        {status === "saved" && (
          <small className="save-status success">✅ Saved!</small>
        )}
      </span>
    );
  };

  /* =====================================================
     LOGOUT
     ===================================================== */
  const handleLogout = () => {
    const auth = getAuth();
    auth.signOut();
    navigate("/landing-page");
  };

  /* =====================================================
     RENDER PAGE
     ===================================================== */
  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="topbar">
        <div className="left-header">
          <img src={Logo} alt="Logo" className="logo-header" />
          <h2>Sistem Pendukung Keputusan SMK Yadika Manado</h2>
        </div>

        <div className="user-info">
          <span className="username">{username}</span>
          <button onClick={handleLogout} className="logout">
            Log Out
          </button>
        </div>
      </header>

      <div className="content-layout">
        <aside className="sidebar">
          <button className="menu-btn active" onClick={() => navigate("/home")}>
            🏠 Home
          </button>
        </aside>

        <main className="main-content">
          <h3 className="welcome-title">
            Selamat Datang di Sistem Pendukung Keputusan SMK Yadika Manado
          </h3>

          <div className="agenda-section">
            {/* BUTTON ADD */}
            {userRole === "operator" && (
              <button
                className="add-agenda-toggle"
                onClick={() => setShowForm(!showForm)}
              >
                ➕ {showForm ? "Tutup Form" : "Add Agenda"}
              </button>
            )}

            {/* FORM ADD */}
            {showForm && (
              <div className="add-agenda-box">
                <div className="agenda-input-row">
                  <input
                    type="text"
                    placeholder="Masukkan topik agenda..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <button onClick={handleAddAgenda}>Submit</button>
                </div>

                <p className="agenda-info-text">
                  Pastikan topik agenda jelas dan mudah dipahami oleh
                  guru/siswa.
                </p>
              </div>
            )}

            {/* AGENDA LIST */}
            <div className="agenda-list">
              {agendas.length === 0 ? (
                <p className="no-agenda">No Agenda</p>
              ) : (
                agendas.map((a, i) => (
                  <div key={a.id} className="agenda-row">
                    <span className="agenda-col number">#{i + 1}</span>

                    <EditableTopic agenda={a} />

                    <span className="agenda-col status">
                      {a.votingClosed ? (
                        <span className="status-red">🔴 Voting Closed</span>
                      ) : (
                        <span className="status-green">🟢 Voting Open</span>
                      )}
                    </span>

                    <span className="agenda-col user">{a.createdBy}</span>
                    <span className="agenda-col date">{a.date}</span>

                    <div className="agenda-actions">
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/workspace/${a.id}`)}
                      >
                        View
                      </button>

                      {userRole === "operator" && (
                        <>
                          <button
                            className="toggle-voting-btn"
                            onClick={() => toggleVoting(a)}
                          >
                            {a.votingClosed ? "🔓 Buka" : "🔒 Tutup"}
                          </button>

                          <button
                            className="reset-btn"
                            onClick={() => handleResetVoting(a)}
                          >
                            🔄 Reset
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(a.id)}
                          >
                            🗑 Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* =====================================
                AUDIT LOGS AREA (Operator Only)
                ===================================== */}
            {/* {userRole === "operator" && (
              <div className="audit-home-box">
                <h3 className="audit-home-title">
                  📘 Aktivitas Sistem Terbaru
                </h3>

                {auditLogs.length === 0 ? (
                  <p className="empty-log">Belum ada aktivitas.</p>
                ) : (
                  <div className="audit-home-list">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="audit-home-item">
                        <div className="log-row">
                          <span className="log-badge">{log.action}</span>

                          <div className="log-info">
                            <p className="log-detail">{log.detail}</p>
                            <p className="log-meta">
                              {log.userName} ({log.role}) •{" "}
                              {new Date(log.time).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )} */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
