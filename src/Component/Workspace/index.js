import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Outlet, NavLink } from "react-router-dom";
import { db } from "../../Config/Firebase";
import { ref, onValue } from "firebase/database";
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

    // Ambil nama dari Firebase Auth
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsername(user.displayName || user.email || "User");
      }
    });

    // Ambil role dari localStorage
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) setUserRole(storedRole);

    // Load agenda
    const agendaRef = ref(db, `agendas/${agendaId}`);
    const unsubscribeAgenda = onValue(agendaRef, (snapshot) => {
      if (snapshot.exists()) {
        setAgenda({ id: agendaId, ...snapshot.val() });
      } else {
        setAgenda(null);
      }
    });

    return () => {
      unsub();
      unsubscribeAgenda();
    };
  }, [agendaId]);

  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    const storedRole = localStorage.getItem("userRole");

    if (storedName) setUsername(storedName);
    if (storedRole) setUserRole(storedRole);

    const agendaRef = ref(db, `agendas/${agendaId}`);
    return onValue(agendaRef, (snapshot) => {
      if (snapshot.exists()) {
        setAgenda({ id: agendaId, ...snapshot.val() });
      } else setAgenda(null);
    });
  }, [agendaId]);

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

  return (
    <div className="workspace-wrapper">
      {/* HEADER — SAME STYLE AS HOME */}
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
        {/* SIDEBAR — MATCH HOME DESIGN */}
        <aside className="workspace-sidebar">
          {userRole === "operator" && (
            <NavLink
              to={`/workspace/${agendaId}/voting-result`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              🗳️ Voting Result
            </NavLink>
          )}

          <NavLink
            to={`/workspace/${agendaId}/workspacehome`}
            end
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🏠 Home
          </NavLink>

          {userRole === "operator" && (
            <NavLink
              to={`/workspace/${agendaId}/criteria`}
              className={({ isActive }) =>
                isActive ? "workspace-menu active" : "workspace-menu"
              }
            >
              📋 Criteria
            </NavLink>
          )}

          <NavLink
            to={`/workspace/${agendaId}/alternatives`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🧩 Alternative
          </NavLink>

          <NavLink
            to={`/workspace/${agendaId}/weighting`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            ⚖️ Weight
          </NavLink>

          <NavLink
            to={`/workspace/${agendaId}/result`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🏁 Result
          </NavLink>

          <button
            className="workspace-menu active"
            onClick={() => navigate("/home")}
          >
            ⬅️ Kembali ke Home
          </button>
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
      </div>
    </div>
  );
};

export default Workspace;
