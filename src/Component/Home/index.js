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
  const [photoBase64, setPhotoBase64] = useState("");
  const [sidebarMini, setSidebarMini] = useState(false);
  const [selectedRole, setSelectedRole] = useState("all");

  const navigate = useNavigate();

  // Auto mini sidebar on small screen
  useEffect(() => {
    const handleResize = () => setSidebarMini(window.innerWidth < 900);

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load user & role
  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingRole(false);
        navigate("/login");
        return;
      }

      setUserUID(user.uid);

      try {
        const snap = await get(ref(db, `users/${user.uid}`));
        if (snap.exists()) {
          const data = snap.val();
          setUsername(data.name || user.email);
          setUserRole(data.role || "");
          setPhotoBase64(data.photoBase64 || "");
        } else {
          setUsername(user.email);
        }
      } catch {
        setUsername(user.email);
      }
      setLoadingRole(false);
    });

    return () => unsub();
  }, [navigate]);

  // Load agendas realtime
  useEffect(() => {
    const unsub = onValue(ref(db, "agendas"), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setAgendas(list);
    });

    return () => unsub();
  }, []);

  const handleAddAgenda = async () => {
    if (userRole !== "operator") return alert("Hanya operator!");

    if (!topic.trim()) return alert("Topik wajib diisi!");

    const data = {
      topic,
      createdBy: username,
      userId: userUID,
      date: new Date().toLocaleString(),
      createdAt: Date.now(),
      votingClosed: false,
      assignedTo: selectedRole,
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

    setTopic("");
    setShowForm(false);
    alert("Agenda ditambahkan!");
  };

  const handleDelete = async (id) => {
    if (userRole !== "operator") return;
    if (!window.confirm("Hapus agenda ini?")) return;

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
      detail: "Menghapus agenda & voting",
    });

    alert("Agenda terhapus!");
  };

  const handleResetVoting = async (a) => {
    if (userRole !== "operator") return;
    if (!window.confirm("Reset semua suara agenda ini?")) return;

    await remove(ref(db, `voteCount/${a.id}`));
    await remove(ref(db, `votes/${a.id}`));

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: "RESET_VOTING",
      agendaId: a.id,
    });

    alert("Voting direset!");
  };

  const toggleVoting = async (a) => {
    if (userRole !== "operator") return;

    const newVal = !a.votingClosed;
    if (!window.confirm(newVal ? "Tutup voting?" : "Buka voting?")) return;

    await update(ref(db, `agendas/${a.id}`), {
      votingClosed: newVal,
    });

    await saveLog({
      userId: userUID,
      userName: username,
      role: userRole,
      action: newVal ? "CLOSE_VOTING" : "OPEN_VOTING",
      agendaId: a.id,
    });

    alert("Berhasil!");
  };

  const handleLogout = () => {
    signOut(getAuth()).then(() => {
      localStorage.clear();
      navigate("/landing-page");
    });
  };

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
  const EditableAssignedRole = ({ agenda }) => {
    const [editing, setEditing] = useState(false);
    const [role, setRole] = useState(agenda.assignedTo || "all");

    // Non-operator hanya melihat, tidak bisa edit
    if (userRole !== "operator") {
      return (
        <span className={`assign-pill role-${agenda.assignedTo || "all"}`}>
          {!agenda.assignedTo || agenda.assignedTo === "all"
            ? "Semua Role"
            : agenda.assignedTo.charAt(0).toUpperCase() +
              agenda.assignedTo.slice(1)}
        </span>
      );
    }

    const save = async (newRole) => {
      setEditing(false);

      if (!newRole || newRole === agenda.assignedTo) return;

      await update(ref(db, `agendas/${agenda.id}`), {
        assignedTo: newRole,
      });

      await saveLog({
        userId: userUID,
        userName: username,
        role: userRole,
        action: "EDIT_ASSIGNED_ROLE",
        agendaId: agenda.id,
        detail: `Assigned role menjadi: ${newRole}`,
      });
    };

    return editing ? (
      <select
        className="assign-edit-select"
        value={role}
        autoFocus
        onBlur={() => save(role)}
        onChange={(e) => {
          setRole(e.target.value);
          save(e.target.value);
        }}
      >
        <option value="all">Semua Role</option>
        <option value="operator">Operator</option>
        <option value="teacher">Teacher</option>
        <option value="student">Student</option>
      </select>
    ) : (
      <span
        className={`assign-pill role-${agenda.assignedTo || "all"}`}
        onClick={() => setEditing(true)}
        style={{ cursor: "pointer" }}
      >
        {!agenda.assignedTo || agenda.assignedTo === "all"
          ? "Semua Role"
          : agenda.assignedTo.charAt(0).toUpperCase() +
            agenda.assignedTo.slice(1)}
      </span>
    );
  };

  const EditableTopic = ({ agenda }) => {
    const [editing, setEditing] = useState(false);
    const [newTopic, setNewTopic] = useState(agenda.topic);

    if (userRole !== "operator") return <span>{agenda.topic}</span>;

    const save = async () => {
      if (!newTopic.trim() || newTopic === agenda.topic) {
        setEditing(false);
        return;
      }

      await update(ref(db, `agendas/${agenda.id}`), {
        topic: newTopic,
      });

      await saveLog({
        userId: userUID,
        userName: username,
        role: userRole,
        action: "EDIT_TOPIC",
        agendaId: agenda.id,
        detail: `Topik menjadi: ${newTopic}`,
      });

      setEditing(false);
    };

    return editing ? (
      <input
        autoFocus
        value={newTopic}
        onChange={(e) => setNewTopic(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="topic-input"
      />
    ) : (
      <span onClick={() => setEditing(true)} className="editable-topic">
        {agenda.topic}
      </span>
    );
  };
  // ✅ Filter agenda berdasarkan role user
  const filteredAgendas =
    userRole === "operator"
      ? agendas
      : agendas.filter(
          (a) => a.assignedTo === "all" || a.assignedTo === userRole
        );

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="topbar">
        <div className="left-header">
          <img src={Logo} alt="Logo" className="logo-header" />
          <div>
            <h2>Sistem Pendukung Keputusan</h2>
            <span className="header-subtitle">SMK Yadika Manado</span>
          </div>
        </div>

        <div className="right-header">
          <div className="user-meta-header">
            <span className="username-header">{username}</span>
            <span className={`role-pill role-${userRole}`}>{userRole}</span>
          </div>

          <div className="user-avatar" onClick={() => navigate("/profile")}>
            {photoBase64 ? (
              <img src={photoBase64} className="header-avatar" />
            ) : (
              <div className="header-avatar default">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="content-layout">
        <aside className={`sidebar ${sidebarMini ? "mini" : ""}`}>
          <button className="menu-btn active" onClick={() => navigate("/home")}>
            🏠 <span className="text">Dashboard</span>
          </button>

          {userRole === "operator" && (
            <button
              className="menu-btn"
              onClick={() => navigate("/manage-accounts")}
            >
              👥 <span className="text">Daftar Akun</span>
            </button>
          )}
        </aside>

        <main className={`main-content ${sidebarMini ? "expand" : ""}`}>
          <div className="home-inner">
            <div className="home-header-row">
              <div>
                <h3 className="welcome-title">
                  Selamat Datang, <span>{username}</span>
                </h3>
                <p className="welcome-sub">
                  Kelola agenda rapat dan proses pengambilan keputusan.
                </p>
              </div>

              {userRole === "operator" && (
                <button
                  className="primary-cta"
                  onClick={() => setShowForm(!showForm)}
                >
                  {showForm ? "Tutup Form" : "Tambah Agenda"}
                </button>
              )}
            </div>

            {showForm && userRole === "operator" && (
              <div className="add-agenda-box">
                <div className="agenda-input-row">
                  <select
                    className="assign-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="all">Semua Role</option>
                    <option value="operator">Operator</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Masukkan topik agenda..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <button onClick={handleAddAgenda}>Simpan</button>
                </div>

                {/* ✅ Tambahan baru */}

                <p className="agenda-info-text">
                  Pastikan topik agenda jelas, singkat, dan mudah dipahami oleh
                  guru maupun siswa.
                </p>
              </div>
            )}

            <section className="agenda-section">
              <div className="agenda-header-row">
                <h4 className="agenda-title">Daftar Agenda</h4>
                <span className="agenda-count">
                  {filteredAgendas.length} agenda
                </span>
              </div>

              <div className="agenda-list">
                {filteredAgendas.length === 0 ? (
                  <p className="no-agenda">Belum ada agenda.</p>
                ) : (
                  filteredAgendas.map((a, i) => (
                    <div key={a.id} className="agenda-row">
                      <span className="agenda-col number">#{i + 1}</span>

                      <EditableTopic agenda={a} />
                      <span className="agenda-col status-col">
                        <EditableAssignedRole agenda={a} />

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
                              {a.votingClosed ? "Buka" : "Tutup"}
                            </button>

                            <button
                              className="reset-btn"
                              onClick={() => handleResetVoting(a)}
                            >
                              Reset
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
            <section className="contact-section card-animated">
              <h4 className="contact-title">Contact Us</h4>
              <p className="contact-desc">
                Jika Anda memiliki pertanyaan, kendala, atau membutuhkan
                bantuan, silakan hubungi kami melalui informasi berikut:
              </p>

              <ul className="contact-list">
                <li>📧 Joshua: jkussoy30@gmail.com</li>
                <li>📧 Griffin: griffinroleh24113@gmail.com</li>

                <li>📱 Joshua: 0858-2402-6268</li>
                <li>📱 Griffin: 0823-4839-0206</li>

                <iframe
                  title="Lokasi SMK Yadika Manado"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.597345140141!2d124.98139947447187!3d1.4175081613556781!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32870a95df6309dd%3A0x21d86e4847556add!2sUniversitas%20Klabat!5e0!3m2!1sen!2sid!4v1764084084275!5m2!1sen!2sid"
                  width="100%"
                  height="260"
                  style={{
                    borderRadius: "14px",
                    border: "0",
                    marginTop: "12px",
                  }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </ul>
            </section>
          </div>
        </main>
        <footer className="footer">
          <p>
            © {new Date().getFullYear()} Sistem Pendukung Keputusan — Filkom
            Unklab
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
