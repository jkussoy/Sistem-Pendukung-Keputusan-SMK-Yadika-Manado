import React, { useEffect, useState } from "react";
import { db } from "../../Config/Firebase";
import { ref, onValue } from "firebase/database";
import { useParams } from "react-router-dom";
import "./style.css";

const WorkspaceHome = () => {
  const { agendaId } = useParams();
  const [agenda, setAgenda] = useState(null);
  const [criteria, setCriteria] = useState([]); // Tambahan
  const [weights, setWeights] = useState([]);
  const [mergedWeights, setMergedWeights] = useState([]); // Tambahan
  const [rankedResults, setRankedResults] = useState([]);
  const [hasResult, setHasResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 Ambil data dari Firebase
  useEffect(() => {
    if (!agendaId) return;

    const agendaRef = ref(db, `agendas/${agendaId}`);
    const criteriaRef = ref(db, `criteria/${agendaId}`); // Tambahan
    const weightsRef = ref(db, `weights/${agendaId}`);
    const resultRef = ref(db, `result/${agendaId}/ranked`);

    const unsubAgenda = onValue(agendaRef, (snap) => {
      if (snap.exists()) setAgenda(snap.val());
      else setAgenda(null);
    });

    // Ambil data criteria
    const unsubCriteria = onValue(criteriaRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, v]) => ({
          id,
          code: v.code?.trim().toUpperCase() || "",
          name: v.name || "-",
          label: v.label || "-",
        }));
        setCriteria(arr);
      } else {
        setCriteria([]);
      }
    });

    // Ambil data weights
    const unsubWeights = onValue(weightsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.values(data).map((v) => ({
          code: v.code?.trim().toUpperCase() || "",
          weight: parseFloat(v.weight || 0).toFixed(4),
        }));
        setWeights(arr);
      } else {
        setWeights([]);
      }
    });

    // Ambil hasil perhitungan MOORA
    const unsubResults = onValue(resultRef, (snap) => {
      const data = snap.val();
      if (data) {
        setRankedResults(Object.values(data));
        setHasResult(true);
      } else {
        setRankedResults([]);
        setHasResult(false);
      }
      setLoading(false);
    });

    return () => {
      unsubAgenda();
      unsubCriteria();
      unsubWeights();
      unsubResults();
    };
  }, [agendaId]);

  // 🔹 Gabungkan data criteria dan weight berdasarkan code
  useEffect(() => {
    if (!criteria.length || !weights.length) return;

    const merged = weights.map((w) => {
      const match = criteria.find(
        (c) => c.code?.trim().toUpperCase() === w.code?.trim().toUpperCase()
      );
      return {
        code: w.code,
        name: match?.name || "(Nama kriteria tidak ditemukan)",
        label: match?.label || "(Label tidak ditemukan)",
        weight: w.weight,
      };
    });

    setMergedWeights(merged);
  }, [criteria, weights]);

  if (loading)
    return <p className="loading-text">⏳ Memuat data hasil analisis...</p>;

  const topAlternative = rankedResults[0];

  return (
    <div className="workspace-home">
      {/* HEADER AGENDA */}
      <div className="agenda-info-box">
        <h2>{agenda?.topic || "Agenda Tidak Ditemukan"}</h2>
        <p>
          Dibuat oleh: <strong>{agenda?.createdBy}</strong> |{" "}
          <span>{agenda?.date}</span>
        </p>
      </div>

      {/* JIKA BELUM ADA HASIL */}
      {!hasResult ? (
        <div className="no-result-box">
          <h3>📊 Belum Ada Hasil Perhitungan</h3>
          <p>
            Silakan lakukan perhitungan bobot (<strong>MEREC</strong>) dan hasil
            akhir (<strong>MOORA</strong>) terlebih dahulu.
          </p>
          <p className="hint">
            Setelah kamu menekan tombol “Hitung MOORA” di menu Result, hasil
            pembobotan dan perangkingan akan muncul otomatis di sini.
          </p>
        </div>
      ) : (
        <>
          {/* REKOMENDASI TERBAIK */}
          {topAlternative && (
            <div className="recommendation-box">
              <h3>🏆 Rekomendasi Terbaik</h3>
              <p>
                Berdasarkan hasil perhitungan metode <strong>MOORA</strong>,
                alternatif terbaik adalah:
              </p>
              <div className="highlight-box">
                <h4>{topAlternative.name}</h4>
                <p>
                  Nilai akhir:{" "}
                  <span className="highlight-score">
                    {topAlternative.score.toFixed(4)}
                  </span>{" "}
                  (Peringkat 1)
                </p>
              </div>
            </div>
          )}

          {/* HASIL MEREC */}
          <div className="result-section">
            <h3>⚖️ Hasil Pembobotan Kriteria (MEREC)</h3>
            {mergedWeights.length === 0 ? (
              <p className="empty-text">
                Belum ada hasil pembobotan MEREC. Silakan lakukan perhitungan.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Kriteria</th>
                    <th>Label</th>
                    <th>Bobot Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedWeights.map((w, i) => (
                    <tr key={i}>
                      <td>{w.code}</td>
                      <td>{w.name}</td>
                      <td>
                        <span
                          className={`label-chip ${
                            w.label?.toLowerCase() === "benefit"
                              ? "benefit"
                              : "cost"
                          }`}
                        >
                          {w.label}
                        </span>
                      </td>
                      <td>{w.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* HASIL MOORA */}
          <div className="result-section">
            <h3>🏅 Hasil Akhir dan Peringkat (MOORA)</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alternatif</th>
                  <th>Nilai Yi</th>
                  <th>Peringkat</th>
                </tr>
              </thead>
              <tbody>
                {rankedResults.map((r, i) => (
                  <tr key={i} className={r.rank === 1 ? "gold-row" : ""}>
                    <td>{r.name}</td>
                    <td>{r.score.toFixed(4)}</td>
                    <td>
                      {r.rank === 1
                        ? "🥇 Juara 1"
                        : r.rank === 2
                        ? "🥈 Juara 2"
                        : r.rank === 3
                        ? "🥉 Juara 3"
                        : r.rank}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceHome;
