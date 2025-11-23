import React, { useEffect, useState } from "react";
import { db } from "../../Config/Firebase";
import { ref, onValue, get } from "firebase/database";
import { useParams, useOutletContext } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { getAuth } from "firebase/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Logo from "../../Assets/Image/Logo.png";
import "./style.css";
import { saveLog } from "../../Utils/savelogs";

const VotingResult = () => {
  const { agendaId } = useParams();
  const { userRole } = useOutletContext();

  const [agendaTitle, setAgendaTitle] = useState("");
  const [voteCount, setVoteCount] = useState({});
  const [alternatives, setAlternatives] = useState([]);
  const [voterList, setVoterList] = useState([]);
  const [username, setUsername] = useState("");

  /* Load User */
  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) {
      setUsername(user.displayName || user.email || "User");
    }
  }, []);

  /* Load Agenda Title */
  useEffect(() => {
    if (!agendaId) return;
    const agendaRef = ref(db, `agendas/${agendaId}`);
    const unsub = onValue(agendaRef, (snap) => {
      const data = snap.val();
      setAgendaTitle(data?.topic || "Agenda Tanpa Judul");
    });
    return () => unsub();
  }, [agendaId]);

  /* Load Alternatives & Vote Count */
  useEffect(() => {
    if (!agendaId) return;
    const altRef = ref(db, `alternatives/${agendaId}`);
    const voteRef = ref(db, `voteCount/${agendaId}`);

    const unsubAlt = onValue(altRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
      setAlternatives(list);
    });

    const unsubVote = onValue(voteRef, (snap) => {
      setVoteCount(snap.val() || {});
    });

    return () => {
      unsubAlt();
      unsubVote();
    };
  }, [agendaId]);

  /* Load Voter Detail */
  useEffect(() => {
    if (!agendaId || alternatives.length === 0) return;

    const votesRef = ref(db, `votes/${agendaId}`);
    const usersRef = ref(db, "users");

    const unsubVotes = onValue(votesRef, async (snap) => {
      const votes = snap.val() || {};
      const usersSnap = await get(usersRef);
      const users = usersSnap.val() || {};

      const altMap = {};
      alternatives.forEach((alt) => {
        altMap[alt.id] = `${alt.code || alt.id} - ${alt.name}`;
      });

      let voterArr = Object.entries(votes).map(([uid, voteObj]) => ({
        uid,
        altId: voteObj.altId,
        time: voteObj.time || "-",
        altLabel: altMap[voteObj.altId] || voteObj.altId,
        name: users[uid]?.name || "Tidak diketahui",
        email: users[uid]?.email || "-",
        role: users[uid]?.role || "-",
      }));

      voterArr.sort((a, b) => {
        if (a.time === "-" || b.time === "-") return 0;
        return new Date(b.time) - new Date(a.time);
      });

      setVoterList(voterArr);
    });

    return () => unsubVotes();
  }, [agendaId, alternatives]);

  /* Log Page View */
  useEffect(() => {
    if (userRole === "operator" && agendaId) {
      saveLog({
        action: "VIEW_VOTING_RESULT",
        agendaId,
        detail: `Operator melihat halaman hasil voting untuk agenda '${agendaTitle}'`,
      });
    }
  }, [userRole, agendaId, agendaTitle]);

  /* Chart Data */
  const chartData = alternatives.map((alt) => ({
    altId: alt.id,
    name: alt.code || alt.id,
    fullName: alt.name,
    votes: voteCount?.[alt.id] || 0,
  }));

  const sortedTable = [...chartData].sort((a, b) => b.votes - a.votes);

  /* Time Formatter */
  const formatTimestamp = (iso) => {
    if (!iso || iso === "-") return "-";
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  /* EXPORT PDF */
  const exportPDF = () => {
    saveLog({
      action: "EXPORT_VOTING_PDF",
      agendaId,
      detail: `Operator mengekspor PDF hasil voting: ${agendaTitle}`,
    });

    const schoolName = "SMK Yadika Manado";
    const printedAt = new Date().toLocaleString("id-ID");

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const generatePdfContent = (img) => {
      if (img) doc.addImage(img, "PNG", 75, 20, 60, 60);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(schoolName, 105, 90, { align: "center" });
      doc.setFontSize(16);
      doc.text("LAPORAN HASIL VOTING", 105, 105, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.text(`Agenda: ${agendaTitle}`, 105, 115, { align: "center" });
      doc.setFontSize(11);
      doc.text(`Dicetak pada: ${printedAt}`, 105, 125, { align: "center" });
      doc.text(`Dicetak oleh: ${username} (${userRole})`, 105, 132, {
        align: "center",
      });

      doc.addPage();

      autoTable(doc, {
        head: [["Kode", "Nama Alternatif", "Jumlah Suara"]],
        body: sortedTable.map((r) => [r.name, r.fullName, r.votes.toString()]),
      });

      autoTable(doc, {
        head: [["Nama", "Email", "Role", "Pilihan", "Waktu Voting"]],
        body: voterList.map((v) => [
          v.name,
          v.email,
          v.role,
          v.altLabel,
          formatTimestamp(v.time),
        ]),
      });

      doc.save(`Hasil-Voting-${agendaTitle}.pdf`);
    };

    const img = new Image();
    img.onload = () => generatePdfContent(img);
    img.onerror = () => generatePdfContent(null);
    img.src = Logo;
  };

  /* Role Guard */
  if (userRole !== "operator") {
    return (
      <p className="text-center text-danger mt-5">
        Akses hanya untuk Operator.
      </p>
    );
  }

  /* RENDER */
  return (
    <div className="container py-3 voting-result-wrapper">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
        <div>
          <h2 className="mb-1">📊 Hasil Voting Alternatif</h2>
          <h6 className="text-muted">Agenda: {agendaTitle}</h6>
        </div>

        <button className="btn btn-primary shadow-sm" onClick={exportPDF}>
          📄 Export PDF
        </button>
      </div>

      {/* CHARTS */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Bar Chart</h5>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="votes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Pie Chart</h5>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="votes"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      label={(entry) => entry.name}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE VOTING */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title mb-3">Tabel Hasil Voting</h5>
          <div className="table-responsive">
            <table className="table table-hover table-striped vote-result-table text-center">
              <thead>
                <tr>
                  <th>Posisi</th>
                  <th>Kode</th>
                  <th>Nama Alternatif</th>
                  <th>Jumlah Suara</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map((row, idx) => (
                  <tr key={row.altId}>
                    <td>{idx + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.fullName}</td>
                    <td>{row.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VOTER LIST */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title mb-3">🧾 Daftar Pemilih</h5>
          <div className="table-responsive">
            <table className="table table-hover table-striped vote-result-table text-center">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Pilihan</th>
                  <th>Waktu Voting</th>
                </tr>
              </thead>
              <tbody>
                {voterList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-muted py-3">
                      Belum ada voting.
                    </td>
                  </tr>
                ) : (
                  voterList.map((v) => (
                    <tr key={v.uid}>
                      <td>{v.name}</td>
                      <td>{v.email}</td>
                      <td>{v.role}</td>
                      <td>{v.altLabel}</td>
                      <td>{formatTimestamp(v.time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingResult;
