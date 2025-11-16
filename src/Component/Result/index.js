import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, get, set, onValue } from "firebase/database";
import { useParams, useOutletContext } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
import "./style.css";
import { saveLog } from "../../Utils/savelogs";

const MOORA = () => {
  const { agendaId } = useParams();
  const { userRole } = useOutletContext();

  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [weights, setWeights] = useState({});
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [voteCount, setVoteCount] = useState({});
  const [votingClosed, setVotingClosed] = useState(false);
  const [isVotingActionLoading, setIsVotingActionLoading] = useState(false);

  /* =====================================================
     AMBIL USER LOGIN
     ===================================================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) =>
      setUserId(user ? user.uid : null)
    );
    return () => unsub();
  }, []);

  /* =====================================================
     LOAD DATA
     ===================================================== */
  useEffect(() => {
    if (!agendaId) return;

    const loadData = async () => {
      const [critSnap, altInfoSnap, altValSnap, weightSnap] = await Promise.all(
        [
          get(ref(db, `criteria/${agendaId}`)),
          get(ref(db, `alternatives/${agendaId}`)),
          get(ref(db, `alternativeValues/${agendaId}`)),
          get(ref(db, `weights/${agendaId}`)),
        ]
      );

      const critData = critSnap.val() || {};
      const altInfoData = altInfoSnap.val() || {};
      const altValData = altValSnap.val() || {};
      const weightData = weightSnap.val() || {};

      const criteriaArr = Object.entries(critData).map(([id, v]) => ({
        id,
        ...v,
      }));

      const mergedAlts = Object.entries(altInfoData).map(([altId, info]) => {
        const values = altValData[altId] || {};
        return {
          id: altId,
          code: info.code || altId,
          name: info.name || `Alternatif ${altId}`,
          values,
        };
      });

      const flatWeights = {};
      Object.keys(weightData).forEach((key) => {
        if (weightData[key]?.weight)
          flatWeights[key] = parseFloat(weightData[key].weight);
      });

      setCriteria(criteriaArr);
      setAlternatives(mergedAlts);
      setWeights(flatWeights);
    };

    loadData();
  }, [agendaId]);

  /* =====================================================
     STATUS VOTING
     ===================================================== */
  useEffect(() => {
    const unsub = onValue(ref(db, `agendas/${agendaId}/votingClosed`), (snap) =>
      setVotingClosed(!!snap.val())
    );
    return () => unsub();
  }, [agendaId]);

  /* =====================================================
     VOTE & VOTE COUNT
     ===================================================== */
  useEffect(() => {
    if (!agendaId || !userId) return;

    // USER VOTE
    get(ref(db, `votes/${agendaId}/${userId}`)).then((snap) => {
      const v = snap.val();
      setUserVote(v?.altId ?? null);
    });

    // COUNT
    const unsub = onValue(ref(db, `voteCount/${agendaId}`), (snap) =>
      setVoteCount(snap.val() || {})
    );

    return () => unsub();
  }, [agendaId, userId]);

  /* =====================================================
     HITUNG MOORA — FIXED
     ===================================================== */
  const handleCalculate = async () => {
    if (!criteria.length || !alternatives.length)
      return alert("Data tidak lengkap!");

    if (Object.keys(weights).length === 0)
      return alert("Bobot MEREC belum dihitung!");

    setIsLoading(true);

    try {
      const calc = calculateMOORA(alternatives, criteria, weights);
      setResults(calc);
      setHasCalculated(true);
      await set(ref(db, `result/${agendaId}`), calc);

      await saveLog({
        agendaId,
        userId,
        role: userRole,
        action: "CALCULATE_MOORA",
        detail: "Operator menghitung hasil MOORA",
      });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* =====================================================
     FIXED PERHITUNGAN MOORA
     ===================================================== */
  const calculateMOORA = (alts, crits, weightsObj) => {
    const criteriaCodes = crits.map((c) => c.code);

    // ❗ Filter alternatif tanpa nilai lengkap
    const validAlts = alts.filter((alt) =>
      criteriaCodes.every(
        (c) => alt.values[c] !== undefined && alt.values[c] !== null
      )
    );

    if (validAlts.length === 0)
      throw new Error("Tidak ada alternatif dengan nilai lengkap.");

    const labels = crits.map((c) => c.label || "Benefit");
    const wArr = criteriaCodes.map((c) => parseFloat(weightsObj[c] || 0));

    const matrix = validAlts.map((alt) => ({
      altId: alt.id,
      code: alt.code,
      name: alt.name,
      values: criteriaCodes.map((code) => Number(alt.values[code] || 0)),
    }));

    const denom = criteriaCodes.map((_, j) =>
      Math.sqrt(matrix.reduce((sum, a) => sum + Math.pow(a.values[j], 2), 0))
    );

    const normalized = matrix.map((alt) => ({
      ...alt,
      values: alt.values.map((v, j) => (denom[j] ? v / denom[j] : 0)),
    }));

    const weighted = normalized.map((alt) => ({
      ...alt,
      values: alt.values.map((v, j) => v * wArr[j]),
    }));

    const scores = weighted.map((alt) => {
      const benefit = alt.values.reduce(
        (s, v, j) => s + (labels[j] === "Benefit" ? v : 0),
        0
      );
      const cost = alt.values.reduce(
        (s, v, j) => s + (labels[j] === "Cost" ? v : 0),
        0
      );
      return { ...alt, score: benefit - cost };
    });

    const ranked = scores
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    return { matrix, normalized, weighted, ranked, criteriaCodes };
  };

  /* =====================================================
     VOTING FIXED
     ===================================================== */
  const handleVote = async (altId) => {
    if (!userId) return alert("Harus login!");
    if (userRole === "operator") return alert("Operator tidak boleh voting.");
    if (votingClosed) return alert("Voting ditutup.");
    if (userVote) return alert("Anda sudah voting.");
    if (isVotingActionLoading) return;

    try {
      setIsVotingActionLoading(true);

      await set(ref(db, `votes/${agendaId}/${userId}`), {
        altId,
        time: new Date().toISOString(),
      });

      const current = voteCount[altId] || 0;
      await set(ref(db, `voteCount/${agendaId}/${altId}`), current + 1);

      await saveLog({
        agendaId,
        userId,
        role: userRole,
        action: "VOTE",
        detail: `Vote alternatif ${altId}`,
      });

      setUserVote(altId);
    } finally {
      setIsVotingActionLoading(false);
    }
  };

  const handleUnvote = async () => {
    if (!userVote) return alert("Anda belum voting.");
    if (votingClosed) return alert("Voting ditutup.");

    try {
      setIsVotingActionLoading(true);

      const current = voteCount[userVote] || 0;
      await set(
        ref(db, `voteCount/${agendaId}/${userVote}`),
        Math.max(current - 1, 0)
      );

      await set(ref(db, `votes/${agendaId}/${userId}`), null);

      await saveLog({
        agendaId,
        userId,
        role: userRole,
        action: "UNVOTE",
        detail: `Membatalkan pilihan ${userVote}`,
      });

      setUserVote(null);
    } finally {
      setIsVotingActionLoading(false);
    }
  };

  /* =====================================================
     CHART DATA FIXED
     ===================================================== */
  const votingChartData =
    results?.ranked?.map((r) => ({
      altId: r.altId,
      name: r.code,
      votes: voteCount?.[r.altId] || 0,
    })) || [];

  /* =====================================================
     RENDER
     ===================================================== */
  return (
    <div className="result-container">
      <h3 className="result-title">Hasil Perhitungan MOORA</h3>

      <p>
        Status Voting:{" "}
        <strong style={{ color: votingClosed ? "red" : "green" }}>
          {votingClosed ? "DITUTUP" : "DIBUKA"}
        </strong>
      </p>

      <button
        className="add-criteria-toggle"
        onClick={handleCalculate}
        disabled={isLoading}
      >
        {isLoading ? "⏳ Menghitung..." : "➕ Hitung Hasil MOORA"}
      </button>

      {hasCalculated && results && (
        <>
          <h4 className="table-title">1️⃣ Nilai Awal</h4>
          <Table data={results.matrix} headers={results.criteriaCodes} />

          <h4 className="table-title">2️⃣ Normalisasi</h4>
          <Table
            data={results.normalized}
            headers={results.criteriaCodes}
            decimals={4}
          />

          <h4 className="table-title">3️⃣ Weighted</h4>
          <Table
            data={results.weighted}
            headers={results.criteriaCodes}
            decimals={4}
          />

          <h4 className="table-title">🏆 Hasil Akhir MOORA</h4>
          <div className="table-scroll">
            <FinalTable
              data={results.ranked}
              showOnly="result" // 👈 tampilkan Yi & ranking
              voteMode="hidden" // 👈 sembunyikan voting
            />
          </div>

          {/* ============================== */}
          {/* CARD 2 — VOTING ALTERNATIF     */}
          {/* ============================== */}
          <h4 className="table-title">🗳️ Voting Alternatif</h4>
          <div className="table-scroll">
            <FinalTable
              data={results.ranked}
              showOnly="vote" // 👈 tampilkan voting saja
              voteMode="active" // 👈 aktifkan tombol voting
              onVote={handleVote}
              onUnvote={handleUnvote}
              userVote={userVote}
              userRole={userRole}
              voteCount={voteCount}
              votingClosed={votingClosed}
            />
          </div>
        </>
      )}
    </div>
  );
};

/* =====================================================
   TABEL UMUM
   ===================================================== */
const Table = ({ data, headers, decimals = 2 }) => (
  <table className="data-table moora">
    <thead>
      <tr>
        <th>Alternatif</th>
        {headers.map((h) => (
          <th key={h}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr key={i}>
          <td>{`${row.code} - ${row.name}`}</td>
          {row.values.map((v, j) => (
            <td key={j}>{v.toFixed(decimals)}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/* =====================================================
   TABEL FINAL (AMAN DARI ERROR)
   ===================================================== */
/* =====================================================
   FINAL TABLE — SUPPORT 2 MODES (RESULT / VOTING)
===================================================== */
const FinalTable = ({
  data,
  showOnly = "result", // "result" | "vote"
  voteMode = "hidden", // "active" | "hidden"
  onVote,
  onUnvote,
  userVote,
  userRole,
  voteCount = {},
  votingClosed,
}) => (
  <table className="data-table moora result-final">
    <thead>
      <tr>
        <th>Alternatif</th>

        {showOnly !== "vote" && <th>Nilai Yi</th>}
        {showOnly !== "vote" && <th>Ranking</th>}

        {showOnly !== "result" && <th>Voting</th>}
        {showOnly !== "result" && userRole === "operator" && (
          <th>Total Suara</th>
        )}
      </tr>
    </thead>

    <tbody>
      {data.map((r, i) => {
        const votes = voteCount?.[r.altId] || 0;

        return (
          <tr
            key={i}
            className={showOnly === "result" && r.rank === 1 ? "gold-row" : ""}
          >
            <td>{`${r.code} - ${r.name}`}</td>

            {showOnly !== "vote" && <td>{r.score.toFixed(4)}</td>}
            {showOnly !== "vote" && <td>🏅 {r.rank}</td>}

            {showOnly !== "result" && (
              <td>
                {voteMode === "hidden" ? (
                  "-"
                ) : userRole === "operator" ? (
                  <span>-</span>
                ) : votingClosed ? (
                  <span className="voted-label voted-closed">
                    Voting Ditutup
                  </span>
                ) : userVote === r.altId ? (
                  <div className="vote-selected-card">
                    <span className="vote-selected-icon">✔</span>
                    <span className="vote-selected-text">Kamu memilih ini</span>
                    <button className="unvote-btn-premium" onClick={onUnvote}>
                      Batalkan
                    </button>
                  </div>
                ) : (
                  <button
                    className={`vote-btn 
    ${userVote && userVote !== r.altId ? "vote-btn-disabled" : ""}
  `}
                    onClick={() => onVote(r.altId)}
                    disabled={!!userVote || votingClosed}
                  >
                    Pilih
                  </button>
                )}
              </td>
            )}

            {showOnly !== "result" && userRole === "operator" && (
              <td>{votes}</td>
            )}
          </tr>
        );
      })}
    </tbody>
  </table>
);

export default MOORA;
