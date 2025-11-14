import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../Config/Firebase";
import { ref, get, set } from "firebase/database";
import { useParams } from "react-router-dom";
import "./style.css";

const MOORA = () => {
  const { agendaId } = useParams();
  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [weights, setWeights] = useState({});
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // 🔹 Ambil data dari Firebase
  useEffect(() => {
    if (!agendaId) return;

    const loadData = async () => {
      const [critSnap, altInfoSnap, altValSnap, weightSnap] = await Promise.all(
        [
          get(ref(db, `criteria/${agendaId}`)),
          get(ref(db, `alternatives/${agendaId}`)), // identitas alternatif
          get(ref(db, `alternativeValues/${agendaId}`)), // nilai numerik alternatif
          get(ref(db, `weights/${agendaId}`)), // bobot MEREC
        ]
      );

      const critData = critSnap.val() || {};
      const altInfoData = altInfoSnap.val() || {};
      const altValData = altValSnap.val() || {};
      const weightData = weightSnap.val() || {};

      // Ubah criteria
      const criteriaArr = Object.entries(critData).map(([id, v]) => ({
        id,
        ...v,
      }));

      // Ubah alternatif jadi array dan gabungkan nilai dengan nama
      const mergedAlts = Object.entries(altInfoData).map(([altId, info]) => {
        const values = altValData[altId] || {}; // ambil nilai kriteria
        return {
          id: altId,
          code: info.code || altId,
          name: info.name || `Alternatif ${info.code || ""}`,
          values,
        };
      });

      // Bobot hasil MEREC
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

  // 🔹 Fungsi Hitung MOORA
  const handleCalculate = async () => {
    if (!criteria.length || !alternatives.length) {
      alert("Pastikan data kriteria dan alternatif sudah lengkap!");
      return;
    }

    if (Object.keys(weights).length === 0) {
      alert(
        "Bobot belum tersedia! Harap lakukan perhitungan MEREC terlebih dahulu."
      );
      return;
    }

    setIsLoading(true);
    try {
      const calc = calculateMOORA(alternatives, criteria, weights);
      setResults(calc);
      setHasCalculated(true);
      await set(ref(db, `result/${agendaId}`), calc);
    } catch (err) {
      alert("Terjadi kesalahan perhitungan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Perhitungan MOORA
  const calculateMOORA = (alts, crits, weightsObj) => {
    const limitedAlts = alts.slice(0, 3);
    const criteriaCodes = crits.map((c) => c.code);
    const weights = criteriaCodes.map((c) => parseFloat(weightsObj[c] || 0));
    const labels = crits.map((c) => c.label || "Benefit");

    const matrix = limitedAlts.map((alt) => ({
      name: `${alt.code} - ${alt.name}`,
      values: criteriaCodes.map((code) => parseFloat(alt.values[code] || 0)),
    }));

    // Normalisasi
    const denom = criteriaCodes.map((_, j) =>
      Math.sqrt(
        matrix.reduce((sum, alt) => sum + Math.pow(alt.values[j], 2), 0)
      )
    );

    const normalized = matrix.map((alt) => ({
      name: alt.name,
      values: alt.values.map((v, j) => (denom[j] ? v / denom[j] : 0)),
    }));

    // Normalisasi Terbobot
    const weighted = normalized.map((alt) => ({
      name: alt.name,
      values: alt.values.map((v, j) => v * weights[j]),
    }));

    // Nilai Yi
    const scores = weighted.map((alt) => {
      const benefitSum = alt.values.reduce(
        (sum, v, j) => sum + (labels[j] === "Benefit" ? v : 0),
        0
      );
      const costSum = alt.values.reduce(
        (sum, v, j) => sum + (labels[j] === "Cost" ? v : 0),
        0
      );
      return {
        name: alt.name,
        score: benefitSum - costSum,
      };
    });

    const ranked = scores
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    return { matrix, normalized, weighted, ranked, criteriaCodes };
  };

  const renderTable = useMemo(() => {
    if (!results) return null;
    const { matrix, normalized, weighted, ranked, criteriaCodes } = results;

    return (
      <>
        <h4 className="table-title">1️⃣ Nilai Awal Alternatif</h4>
        <Table data={matrix} headers={criteriaCodes} />

        <h4 className="table-title">2️⃣ Normalisasi (Rij)</h4>
        <Table data={normalized} headers={criteriaCodes} decimals={4} />

        <h4 className="table-title">3️⃣ Normalisasi Terbobot (Wi × Rij)</h4>
        <Table data={weighted} headers={criteriaCodes} decimals={4} />

        <h4 className="table-title">4️⃣ Hasil Akhir dan Ranking</h4>
        <FinalTable data={ranked} />
      </>
    );
  }, [results]);

  return (
    <div className="result-container">
      <h3 className="result-title">Hasil Perhitungan MOORA</h3>

      <button
        className="add-criteria-toggle"
        onClick={handleCalculate}
        disabled={isLoading}
      >
        {isLoading ? "⏳ Sedang Menghitung..." : "➕ Hitung Hasil MOORA"}
      </button>

      {hasCalculated && !isLoading && renderTable}
    </div>
  );
};

// 🔹 Komponen Tabel
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
          <td>{row.name}</td>
          {row.values.map((v, j) => (
            <td key={j}>{v.toFixed(decimals)}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const FinalTable = ({ data }) => (
  <table className="data-table moora result-final">
    <thead>
      <tr>
        <th>Alternatif</th>
        <th>Nilai Yi</th>
        <th>Ranking</th>
      </tr>
    </thead>
    <tbody>
      {data.map((r, i) => (
        <tr key={i} className={r.rank === 1 ? "gold-row" : ""}>
          <td>{r.name}</td>
          <td>{r.score.toFixed(4)}</td>
          <td>🏅 {r.rank}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default MOORA;
