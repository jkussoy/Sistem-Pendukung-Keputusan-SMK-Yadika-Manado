import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { useParams } from "react-router-dom";
import "./style.css";

const Alternative = () => {
  const { agendaId } = useParams();
  const [alternatives, setAlternatives] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAlt, setNewAlt] = useState({ code: "", name: "" });
  const [values, setValues] = useState({});
  const [username, setUsername] = useState("");

  // 🔹 Ambil data user, criteria, dan alternative dari Firebase
  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    if (storedName) setUsername(storedName);

    if (agendaId) {
      const criteriaRef = ref(db, `criteria/${agendaId}`);
      onValue(criteriaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
          setCriteria(list);
        }
      });

      const altRef = ref(db, `alternatives/${agendaId}`);
      onValue(altRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
          setAlternatives(list);
        } else {
          setAlternatives([]);
        }
      });

      const valueRef = ref(db, `alternativeValues/${agendaId}`);
      onValue(valueRef, (snapshot) => {
        const data = snapshot.val() || {};
        setValues(data);
      });
    }
  }, [agendaId]);

  // 🔹 Tambah alternatif baru
  const handleAddAlternative = () => {
    if (!newAlt.code || !newAlt.name)
      return alert("Harap isi semua kolom alternatif!");

    const altData = {
      agendaId,
      code: newAlt.code.toUpperCase(),
      name: newAlt.name,
      createdBy: username,
      createdAt: new Date().toISOString(),
    };

    push(ref(db, `alternatives/${agendaId}`), altData)
      .then(() => {
        setNewAlt({ code: "", name: "" });
        setShowForm(false);
      })
      .catch((err) => alert("Gagal menambah alternatif: " + err.message));
  };

  // 🔹 Hapus alternatif
  const handleDelete = (altId) => {
    if (!window.confirm("Yakin ingin menghapus alternatif ini?")) return;
    remove(ref(db, `alternatives/${agendaId}/${altId}`));
    remove(ref(db, `alternativeValues/${agendaId}/${altId}`));
  };

  // 🔹 Edit nilai alternatif terhadap kriteria (auto save)
  const handleValueChange = (altId, critCode, value) => {
    const numValue = parseFloat(value) || 0;
    update(ref(db, `alternativeValues/${agendaId}/${altId}`), {
      [critCode]: numValue,
    });
  };

  return (
    <div className="alt-wrapper">
      <header className="alt-header">
        <h2>🧮 Data Alternatif</h2>
        <p>
          Setiap alternatif akan dinilai berdasarkan semua kriteria yang sudah
          kamu buat.
        </p>
      </header>

      <button
        className="btn-toggle-form"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "⬆️ Tutup Form" : "➕ Tambah Alternatif"}
      </button>

      {showForm && (
        <div className="alt-form">
          <div className="alt-form-grid">
            <div className="form-group">
              <label>Kode Alternatif</label>
              <input
                placeholder="Misal: A1"
                value={newAlt.code}
                onChange={(e) => setNewAlt({ ...newAlt, code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Nama Alternatif</label>
              <input
                placeholder="Masukkan nama alternatif..."
                value={newAlt.name}
                onChange={(e) => setNewAlt({ ...newAlt, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-submit">
            <button onClick={handleAddAlternative} className="btn-primary">
              Simpan
            </button>
          </div>
        </div>
      )}

      <section className="alt-table-section">
        <h3>📋 Matriks Nilai Alternatif per Kriteria</h3>

        <table className="criteria-table">
          <thead>
            <tr>
              <th>Alternatif</th>
              {criteria.map((c) => (
                <th key={c.id}>{c.code}</th>
              ))}
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.length === 0 ? (
              <tr>
                <td colSpan={criteria.length + 2} className="empty">
                  Belum ada alternatif
                </td>
              </tr>
            ) : (
              alternatives.map((alt) => (
                <tr key={alt.id}>
                  <td>{alt.name}</td>
                  {criteria.map((c) => (
                    <td key={c.code}>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={
                          values?.[alt.id]?.[c.code]
                            ? values[alt.id][c.code]
                            : ""
                        }
                        onBlur={(e) =>
                          handleValueChange(alt.id, c.code, e.target.value)
                        }
                        className="editable-input"
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(alt.id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Alternative;
