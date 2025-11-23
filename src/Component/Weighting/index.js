import React, { useEffect, useState } from "react";
import { db } from "../../Config/Firebase";
import { ref, onValue, set } from "firebase/database";
import { useParams } from "react-router-dom";
import "./style.css";

const WeightMerec = () => {
  const { agendaId } = useParams();
  const [criteria, setCriteria] = useState([]);
  const [alternatives, setAlternatives] = useState({});
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Ambil data criteria & alternativeValues
  useEffect(() => {
    if (!agendaId) return;

    const criteriaRef = ref(db, `criteria/${agendaId}`);
    const altValRef = ref(db, `alternativeValues/${agendaId}`);

    let cList = [];
    let aVals = {};

    onValue(criteriaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        cList = Object.values(data);
        setCriteria(cList);
      }
    });

    onValue(altValRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        aVals = data;
        setAlternatives(aVals);
      }
    });

    setLoading(false);
  }, [agendaId]);

  // 🔹 Fungsi untuk hitung bobot MEREC
  const calculateMerec = () => {
    if (!criteria.length || !Object.keys(alternatives).length) {
      alert("Data kriteria dan alternatif belum lengkap!");
      return;
    }

    // 1️⃣ Ambil matriks nilai
    const critCodes = criteria.map((c) => c.code);
    const altIds = Object.keys(alternatives);

    const matrix = altIds.map((altId) =>
      critCodes.map((code) => parseFloat(alternatives[altId]?.[code]) || 0)
    );

    // 2️⃣ Normalisasi matriks
    const normMatrix = matrix.map((row) =>
      row.map((val, j) => {
        const col = matrix.map((r) => r[j]);
        const max = Math.max(...col);
        const min = Math.min(...col);
        return criteria[j].label === "Cost" ? min / val : val / max;
      })
    );

    // 3️⃣ Hitung Entropy Effect (EE)
    const EE = critCodes.map((_, j) => {
      const withoutJ = normMatrix.map((row) =>
        row.filter((_, idx) => idx !== j)
      );

      const sumWithout = withoutJ.map((r) => r.reduce((a, b) => a + b, 0));

      const sumWith = normMatrix.map((r) => r.reduce((a, b) => a + b, 0));

      const diff = sumWith.map((v, i) => Math.abs(v - sumWithout[i]));
      return diff.reduce((a, b) => a + b, 0) / diff.length;
    });

    // 4️⃣ Normalisasi jadi bobot akhir
    const totalEE = EE.reduce((a, b) => a + b, 0);
    const weightsFinal = EE.map((v, i) => ({
      code: critCodes[i],
      weight: parseFloat(v / totalEE).toFixed(4),
    }));

    // 5️⃣ Simpan ke Firebase
    weightsFinal.forEach((w) => {
      set(ref(db, `weights/${agendaId}/${w.code}`), w);
    });

    setWeights(weightsFinal);
  };

  return (
    <div className="weight-wrapper">
      <header className="weight-header">
        <h2>⚖️ Pembobotan Kriteria (MEREC)</h2>
        <p>
          Halaman ini menghitung bobot objektif berdasarkan nilai alternatif
          menggunakan metode <strong>MEREC</strong>.
        </p>
      </header>

      <button className="btn-calc" onClick={calculateMerec}>
        🚀 Hitung Bobot MEREC
      </button>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <div className="weight-table-section">
          <h3>📋 Hasil Perhitungan Bobot</h3>
          <div className="table-scroll">
            <table className="weight-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Kriteria</th>
                  <th>Label</th>
                  <th>Bobot MEREC</th>
                </tr>
              </thead>
              <tbody>
                {weights.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty">
                      Tekan tombol "Hitung Bobot MEREC" untuk melihat hasil
                    </td>
                  </tr>
                ) : (
                  weights.map((w, i) => (
                    <tr key={i}>
                      <td>{w.code}</td>
                      <td>{criteria.find((c) => c.code === w.code)?.name}</td>
                      <td>{criteria.find((c) => c.code === w.code)?.label}</td>
                      <td className="weight-cell">{w.weight}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightMerec;
