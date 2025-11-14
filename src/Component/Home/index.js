import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Logo from "./../../Assets/Image/Logo.png";
import "./style.css";

const Home = () => {
  const [topic, setTopic] = useState("");
  const [agendas, setAgendas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [userUID, setUserUID] = useState("");
  const navigate = useNavigate();

  // 🔹 Ambil data user yang login dari Firebase Auth + data agenda
  useEffect(() => {
    const auth = getAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsername(user.displayName || user.email || "Guru");
        setUserUID(user.uid);
      } else {
        // Jika belum login, arahkan ke login
        navigate("/login-teacher");
      }
    });

    // 🔹 Ambil data agenda dari Firebase
    const agendaRef = ref(db, "agendas");
    const unsubscribeAgenda = onValue(agendaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        loaded.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setAgendas(loaded);
      } else {
        setAgendas([]);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAgenda();
    };
  }, [navigate]);

  // 🔹 Tambah agenda baru
  const handleAddAgenda = () => {
    if (topic.trim() === "") return alert("Topik tidak boleh kosong!");

    const agendaData = {
      topic,
      createdBy: username,
      userId: userUID,
      date: new Date().toLocaleString(),
      createdAt: Date.now(),
    };

    push(ref(db, "agendas"), agendaData)
      .then(() => {
        alert("Agenda berhasil ditambahkan!");
        setTopic("");
        setShowForm(false);
      })
      .catch((err) => alert("Gagal menambah agenda: " + err.message));
  };

  // 🔹 Hapus agenda
  const handleDelete = (id) => {
    if (!window.confirm("Yakin ingin menghapus agenda ini?")) return;
    remove(ref(db, `agendas/${id}`));
  };

  // 🔹 Logout
  const handleLogout = () => {
    const auth = getAuth();
    auth.signOut().then(() => {
      navigate("/login-teacher");
    });
  };

  // 🔹 Komponen untuk Edit Topic Langsung
  const EditableTopic = ({ agenda }) => {
    const [editing, setEditing] = useState(false);
    const [newTopic, setNewTopic] = useState(agenda.topic);
    const [status, setStatus] = useState(""); // "saving" | "saved" | ""

    const saveToFirebase = async () => {
      if (newTopic.trim() === "" || newTopic === agenda.topic) return;
      setStatus("saving");
      try {
        await update(ref(db, `agendas/${agenda.id}`), { topic: newTopic });
        setStatus("saved");
        setTimeout(() => setStatus(""), 1500);
      } catch (err) {
        alert("Gagal menyimpan perubahan: " + err.message);
        setStatus("");
      }
    };

    const handleBlur = () => {
      saveToFirebase();
      setEditing(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBlur();
      }
    };

    return (
      <span className="agenda-col topic editable-topic">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="topic-input"
          />
        ) : (
          <span onClick={() => setEditing(true)} title="Klik untuk edit">
            {newTopic || "Tanpa Judul"}
          </span>
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

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="topbar">
        <div className="left-header">
          <img src={Logo} alt="Logo Sekolah" className="logo-header" />
          <h2>Sistem Pendukung Keputusan SMK Yadika Manado</h2>
        </div>
        <div className="user-info">
          <span className="username">{username || "Guru"}</span>
          <button onClick={handleLogout} className="logout">
            Log Out
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="content-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <button className="menu-btn active" onClick={() => navigate("/")}>
            🏠 Home
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content">
          <h3 className="welcome-title">
            Selamat Datang di Sistem Pendukung Keputusan SMK Yadika Manado
          </h3>

          <div className="agenda-section">
            {/* FORM TAMBAH AGENDA */}
            <button
              className="add-agenda-toggle"
              onClick={() => setShowForm(!showForm)}
            >
              ➕ {showForm ? "Tutup Form" : "Add Agenda"}
            </button>

            {showForm && (
              <div className="add-agenda-box">
                <div className="agenda-input-row">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Masukkan topik agenda..."
                  />
                  <button onClick={handleAddAgenda}>Submit</button>
                </div>
                <p className="agenda-info-text">
                  Dibuat oleh: <strong>{username}</strong> |{" "}
                  <strong>{new Date().toLocaleString()}</strong>
                </p>
              </div>
            )}

            {/* LIST AGENDA */}
            <div className="agenda-list">
              {agendas.length === 0 ? (
                <p className="no-agenda">No Upcoming Agenda</p>
              ) : (
                agendas.map((a, idx) => (
                  <div key={a.id} className="agenda-row">
                    <span className="agenda-col number">#{idx + 1}</span>
                    <EditableTopic agenda={a} />
                    <span className="agenda-col user">{a.createdBy}</span>
                    <span className="agenda-col date">{a.date}</span>

                    <div className="agenda-actions">
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/workspace/${a.id}`)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(a.id)}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
