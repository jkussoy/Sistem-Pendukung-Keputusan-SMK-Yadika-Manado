import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Outlet, NavLink } from "react-router-dom";
import { db } from "../../Config/Firebase";
import { ref, onValue } from "firebase/database";
import Logo from "../../Assets/Image/Logo.png";
import "./style.css";

const Workspace = () => {
  const { agendaId } = useParams();
  const [agenda, setAgenda] = useState(null);
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState(""); // ROLE HERE
  const navigate = useNavigate();

  // Ambil data user & data agenda dari Firebase
  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    const storedRole = localStorage.getItem("userRole");

    if (storedName) setUsername(storedName);
    if (storedRole) setUserRole(storedRole);

    const agendaRef = ref(db, `agendas/${agendaId}`);
    const unsubscribe = onValue(agendaRef, (snapshot) => {
      if (snapshot.exists()) {
        setAgenda({ id: agendaId, ...snapshot.val() });
      } else {
        setAgenda(null);
      }
    });

    return () => unsubscribe();
  }, [agendaId]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/landing-page");
  };

  return (
    <div className="workspace-wrapper">
      {/* HEADER */}
      <header className="workspace-header">
        <div className="workspace-left">
          <img src={Logo} alt="Logo Sekolah" className="workspace-logo" />
          <h2>Sistem Pendukung Keputusan SMK Yadika Manado</h2>
        </div>
        <div className="workspace-right">
          <span className="workspace-user">{username}</span>
          <button className="workspace-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="workspace-layout">
        {/* SIDEBAR */}
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

          {/* Semua role */}
          <NavLink
            to={`/workspace/${agendaId}/workspacehome`}
            end
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🏠 Home
          </NavLink>

          {/* Criteria — operator only */}
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

          {/* Alternative — semua role */}
          <NavLink
            to={`/workspace/${agendaId}/alternatives`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🧩 Alternative
          </NavLink>

          {/* Weighting — semua role boleh */}
          <NavLink
            to={`/workspace/${agendaId}/weighting`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            ⚖️ Weight
          </NavLink>

          {/* Result — semua role */}
          <NavLink
            to={`/workspace/${agendaId}/result`}
            className={({ isActive }) =>
              isActive ? "workspace-menu active" : "workspace-menu"
            }
          >
            🏁 Result
          </NavLink>

          <button className="workspace-back" onClick={() => navigate("/home")}>
            ⬅️ Kembali ke Home
          </button>
        </aside>

        {/* MAIN */}
        <main className="workspace-main">
          <div className="workspace-container">
            <h3 className="workspace-title">
              Selamat Datang di Sistem Pendukung Keputusan SMK Yadika Manado
            </h3>

            <div className="workspace-box">
              {/* Pass role ke semua halaman */}
              <Outlet context={{ agendaId, agenda, userRole }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Workspace;
