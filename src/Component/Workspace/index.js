import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Outlet, NavLink } from "react-router-dom";
import { db } from "../../Config/Firebase";
import { ref, onValue, get } from "firebase/database";
import Logo from "../../Assets/Image/Logo.png";
import "./style.css";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const Workspace = () => {
  const { agendaId } = useParams();
  const [agenda, setAgenda] = useState(null);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  /* ============================
        LOAD USER + AGENDA
  ============================ */
  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const snap = await get(ref(db, `users/${user.uid}`));

      if (snap.exists()) {
        const data = snap.val();
        setUsername(data.name);
        setUserRole(data.role);
      } else {
        setUsername(user.email);
      }
    });

    return () => unsub();
  }, [navigate]);

  const handleLogout = () => {
    const auth = getAuth();

    signOut(auth)
      .then(() => {
        localStorage.clear();
        navigate("/landing-page");
      })
      .catch((error) => {
        console.error("Logout gagal:", error);
      });
  };

  return (
    <div className="workspace-wrapper">
      {/* HEADER */}
      <header className="workspace-header">
        <div className="workspace-left">
          <div className="workspace-logo-wrap">
            <img src={Logo} alt="Logo" className="workspace-logo" />
          </div>

          <div className="workspace-title-text">
            <h2>Sistem Pendukung Keputusan</h2>
            <span className="workspace-sub">SMK Yadika Manado</span>
          </div>
        </div>

        <div className="workspace-right">
          <div className="workspace-user-meta">
            <span className="workspace-username">{username}</span>

            <span
              className={`workspace-role-pill ${
                userRole === "operator"
                  ? "role-operator"
                  : userRole === "teacher"
                  ? "role-teacher"
                  : "role-student"
              }`}
            >
              {userRole}
            </span>
          </div>

          <button className="workspace-logout" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </header>

      <div className="workspace-layout">
        {/* SIDEBAR */}
        <aside className="workspace-sidebar sidebar-collapse">
          {/* ✅ MENU GROUP */}
          <div className="workspace-menu-group">
            {userRole === "operator" && (
              <NavLink
                to={`/workspace/${agendaId}/voting-result`}
                className={({ isActive }) =>
                  isActive ? "workspace-menu active" : "workspace-menu"
                }
              >
                <span className="menu-icon">🗳️</span>
                <span className="menu-label">Voting Result</span>
              </NavLink>
            )}

            <NavLink
              to={`/workspace/${agendaId}/workspacehome`}
              end
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              <span className="menu-icon">🏠</span>
              <span className="menu-label">Home</span>
            </NavLink>

            {userRole === "operator" && (
              <NavLink
                to={`/workspace/${agendaId}/criteria`}
                className={({ isActive }) =>
                  isActive ? "workspace-menu active" : "workspace-menu"
                }
              >
                <span className="menu-icon">📋</span>
                <span className="menu-label">Criteria</span>
              </NavLink>
            )}

            <NavLink
              to={`/workspace/${agendaId}/alternatives`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              <span className="menu-icon">🧩</span>
              <span className="menu-label">Alternative</span>
            </NavLink>

            <NavLink
              to={`/workspace/${agendaId}/weighting`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              <span className="menu-icon">⚖️</span>
              <span className="menu-label">Weight</span>
            </NavLink>

            <NavLink
              to={`/workspace/${agendaId}/result`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              <span className="menu-icon">🏁</span>
              <span className="menu-label">Result</span>
            </NavLink>
            <NavLink
              to={`/home`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              <span className="menu-icon">⬅️</span>
              <span className="menu-label">Kembali ke Home</span>
            </NavLink>
          </div>
        </aside>

        {/* MAIN */}
        <main className="workspace-main">
          <div className="workspace-container card-animated">
            <h3 className="workspace-title">
              Workspace Agenda — {agenda?.topic || "Loading..."}
            </h3>

            <div className="workspace-box">
              <Outlet context={{ agendaId, agenda, userRole }} />
            </div>
          </div>
        </main>
        <footer className="workspace-footer">
          <p>
            © {new Date().getFullYear()} Sistem Pendukung Keputusan — Filkom
            Unklab
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Workspace;
