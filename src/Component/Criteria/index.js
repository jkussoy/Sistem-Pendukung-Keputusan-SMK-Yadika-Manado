import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { useParams } from "react-router-dom";
import "./style.css";

const Criteria = () => {
  const { agendaId } = useParams();
  const [criteria, setCriteria] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newCriteria, setNewCriteria] = useState({
    code: "",
    name: "",
    label: "",
    weight: "",
  });
  const [username, setUsername] = useState("");

  // 🔹 Ambil data user & criteria dari Firebase
  useEffect(() => {
    const storedName = localStorage.getItem("teacherName");
    if (storedName) setUsername(storedName);

    if (agendaId) {
      const criteriaRef = ref(db, `criteria/${agendaId}`);
      onValue(criteriaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loaded = Object.entries(data).map(([id, value]) => ({
            id,
            ...value,
          }));
          setCriteria(loaded);
        } else {
          setCriteria([]);
        }
      });
    }
  }, [agendaId]);

  // 🔹 Validasi input
  const validateCriteria = (data) => {
    const { code, name, label, weight } = data;
    if (!code || !name || !label || !weight) {
      alert("⚠️ Harap isi semua kolom kriteria!");
      return false;
    }
    if (isNaN(parseFloat(weight))) {
      alert("⚠️ Bobot harus berupa angka!");
      return false;
    }
    return true;
  };

  // 🔹 Tambah Criteria baru
  const handleAddCriteria = () => {
    if (!validateCriteria(newCriteria)) return;

    const { code, name, label, weight } = newCriteria;

    const newData = {
      agendaId: agendaId,
      code: code.toUpperCase(),
      name: name.trim(),
      label,
      weight: parseFloat(weight),
      autoWeight: 0, // ← untuk hasil MEREC nanti
      createdBy: username || "Guru",
      createdAt: new Date().toISOString(),
    };

    push(ref(db, `criteria/${agendaId}`), newData)
      .then(() => {
        setNewCriteria({ code: "", name: "", label: "", weight: "" });
        setShowForm(false);
      })
      .catch((err) => alert("❌ Gagal menambah kriteria: " + err.message));
  };

  // 🔹 Hapus Criteria
  const handleDelete = (id) => {
    if (!window.confirm("Yakin ingin menghapus kriteria ini?")) return;
    remove(ref(db, `criteria/${agendaId}/${id}`));
  };

  // 🔹 Inline Edit (auto save)
  const handleEdit = (id, field, value) => {
    let cleanValue = value;
    if (field === "weight" || field === "autoWeight") {
      cleanValue = parseFloat(value) || 0;
    } else {
      cleanValue = value.trim();
    }
    update(ref(db, `criteria/${agendaId}/${id}`), { [field]: cleanValue });
  };

  return (
    <div className="criteria-wrapper">
      <header className="criteria-header">
        <h2>📊 Manajemen Kriteria</h2>
        <p>
          Data kriteria digunakan untuk menentukan dasar perhitungan dalam
          metode MEREC dan MOORA.
        </p>
      </header>

      {/* Tombol Tambah */}
      <button
        className="btn-toggle-form"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? "⬆️ Tutup Form" : "➕ Tambah Kriteria"}
      </button>

      {/* FORM TAMBAH */}
      {showForm && (
        <div className="criteria-form">
          <div className="criteria-form-grid">
            <div className="form-group">
              <label>Kode Kriteria</label>
              <input
                placeholder="Misal: C1"
                value={newCriteria.code}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, code: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Nama Kriteria</label>
              <input
                placeholder="Masukkan nama kriteria..."
                value={newCriteria.name}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, name: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Label (Benefit/Cost)</label>
              <select
                value={newCriteria.label}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, label: e.target.value })
                }
              >
                <option value="">Pilih Label</option>
                <option value="Benefit">Benefit</option>
                <option value="Cost">Cost</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bobot Manual</label>
              <input
                type="number"
                step="0.01"
                placeholder="Contoh: 0.25"
                value={newCriteria.weight}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, weight: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-submit">
            <button onClick={handleAddCriteria} className="btn-primary">
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* TABEL DATA */}
      <section className="criteria-table-section">
        <h3>📋 Daftar Kriteria</h3>

        <table className="criteria-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Kriteria</th>
              <th>Label</th>
              <th>Bobot Manual</th>
              <th>Bobot MEREC</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {criteria.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty">
                  Belum ada kriteria ditambahkan
                </td>
              </tr>
            ) : (
              criteria.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      defaultValue={c.code}
                      onBlur={(e) =>
                        handleEdit(c.id, "code", e.target.value.toUpperCase())
                      }
                      className="editable-input"
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={c.name}
                      onBlur={(e) =>
                        handleEdit(c.id, "name", e.target.value.trim())
                      }
                      className="editable-input"
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={c.label}
                      onBlur={(e) =>
                        handleEdit(c.id, "label", e.target.value.trim())
                      }
                      className="editable-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={c.weight}
                      onBlur={(e) => handleEdit(c.id, "weight", e.target.value)}
                      className="editable-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.0001"
                      defaultValue={c.autoWeight || 0}
                      onBlur={(e) =>
                        handleEdit(c.id, "autoWeight", e.target.value)
                      }
                      className="editable-input auto-weight"
                      readOnly
                    />
                  </td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(c.id)}
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

export default Criteria;
