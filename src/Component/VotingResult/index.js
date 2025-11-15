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

  /* =====================================================
     LOAD USER NAME
     ===================================================== */
  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) {
      setUsername(user.displayName || user.email || "User");
    }
  }, []);

  /* =====================================================
     LOAD AGENDA TITLE
     ===================================================== */
  useEffect(() => {
    if (!agendaId) return;

    const agendaRef = ref(db, `agendas/${agendaId}`);
    const unsub = onValue(agendaRef, (snap) => {
      const data = snap.val();
      setAgendaTitle(data?.topic || "Agenda Tanpa Judul");
    });

    return () => unsub();
  }, [agendaId]);

  /* =====================================================
     LOAD ALTERNATIVES & VOTE COUNT
     ===================================================== */
  useEffect(() => {
    if (!agendaId) return;

    const altRef = ref(db, `alternatives/${agendaId}`);
    const voteRef = ref(db, `voteCount/${agendaId}`);

    const unsubAlt = onValue(altRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
      }));
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

  /* =====================================================
     LOAD USER VOTING DETAILS
     ===================================================== */
  useEffect(() => {
    if (!agendaId || alternatives.length === 0) return;

    const votesRef = ref(db, `votes/${agendaId}`);
    const usersRef = ref(db, "users");

    const unsubVotes = onValue(votesRef, async (voteSnap) => {
      const votes = voteSnap.val() || {};

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

  /* =====================================================
     AUDIT LOG — PAGE VIEW
     ===================================================== */
  useEffect(() => {
    if (userRole === "operator" && agendaId) {
      saveLog({
        action: "VIEW_VOTING_RESULT",
        agendaId,
        detail: `Operator melihat halaman hasil voting untuk agenda '${agendaTitle}'`,
      });
    }
  }, [userRole, agendaId, agendaTitle]);

  /* =====================================================
     CHART DATA
     ===================================================== */
  const chartData = alternatives.map((alt) => ({
    altId: alt.id,
    name: alt.code || alt.id,
    fullName: alt.name,
    votes: voteCount?.[alt.id] || 0,
  }));

  const sortedTable = [...chartData].sort((a, b) => b.votes - a.votes);

  /* =====================================================
     DATE FORMATTER
     ===================================================== */
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

  /* =====================================================
     EXPORT PDF + COVER PAGE + AUDIT LOG
     ===================================================== */
  const exportPDF = () => {
    saveLog({
      action: "EXPORT_VOTING_PDF",
      agendaId,
      detail: `Operator mengekspor PDF hasil voting: ${agendaTitle}`,
    });

    const schoolName = "SMK Yadika Manado";
    const printedAt = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const generatePdfContent = (img) => {
      // COVER
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

      // TABLE - Voting Result
      doc.setFontSize(14);
      doc.text(`Tabel Hasil Voting`, 14, 20);

      autoTable(doc, {
        startY: 24,
        head: [["Kode", "Nama Alternatif", "Jumlah Suara"]],
        body: sortedTable.map((row) => [
          row.name,
          row.fullName,
          row.votes.toString(),
        ]),
        styles: { fontSize: 11 },
      });

      let y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 40;

      // TABLE - Voter List
      doc.setFontSize(14);
      doc.text(`Daftar Pemilih`, 14, y);

      autoTable(doc, {
        startY: y + 4,
        head: [["Nama", "Email", "Role", "Pilihan", "Waktu Voting"]],
        body: voterList.map((v) => [
          v.name,
          v.email,
          v.role,
          v.altLabel,
          formatTimestamp(v.time),
        ]),
        styles: { fontSize: 10 },
      });

      doc.save(`Hasil-Voting-${agendaTitle}.pdf`);
    };

    const img = new Image();
    img.onload = () => generatePdfContent(img);
    img.onerror = () => generatePdfContent(null);
    img.src = Logo;
  };

  /* =====================================================
     ROLE CHECK
     ===================================================== */
  if (userRole !== "operator") {
    return <p>Akses hanya untuk Operator.</p>;
  }

  /* =====================================================
     RENDER PAGE
     ===================================================== */
  return (
    <div className="voting-result-wrapper">
      <h2>📊 Hasil Voting Alternatif</h2>
      <h4>Agenda: {agendaTitle}</h4>

      <button className="add-criteria-toggle" onClick={exportPDF}>
        📄 Export PDF
      </button>

      <h3>Bar Chart</h3>
      <div className="chart-box">
        <BarChart width={700} height={350} data={chartData}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="votes" />
        </BarChart>
      </div>

      <h3>Pie Chart</h3>
      <div className="chart-box">
        <PieChart width={380} height={300}>
          <Pie
            data={chartData}
            dataKey="votes"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(entry) => entry.name}
          >
            {chartData.map((_, i) => (
              <Cell key={i} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>

      <h3>Tabel Hasil Voting</h3>
      <table className="vote-result-table">
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

      <h3>🧾 Daftar Pemilih</h3>
      <table className="vote-result-table">
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
              <td colSpan="5" className="empty">
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
  );
};

export default VotingResult;
