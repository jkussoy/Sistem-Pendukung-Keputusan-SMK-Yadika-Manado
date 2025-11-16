import React, { useState, useEffect } from "react";
import { db } from "../../Config/Firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import "./style.css";

const Criteria = () => {
  const { agendaId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useOutletContext();

  const [criteria, setCriteria] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newCriteria, setNewCriteria] = useState({
    code: "",
    name: "",
    label: "",
    weight: "",
  });

  const [username, setUsername] = useState("");

  /* ===============================================
     🚫 ROLE VALIDATION — hanya operator yang boleh
  =============================================== */
  useEffect(() => {
    if (userRole !== "operator") {
      navigate(`/workspace/${agendaId}/workspacehome`);
    }
  }, [userRole, navigate, agendaId]);

  /* ===============================================
     🔹 Ambil data criteria
  =============================================== */
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

  /* ===============================================
     🔹 Validasi sebelum tambah kriteria
  =============================================== */
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

  const isDuplicateCriteria = (field, value, exceptId = null) => {
    return criteria.some((c) => {
      if (exceptId && c.id === exceptId) return false;
      return c[field].toLowerCase() === value.toLowerCase();
    });
  };

  /* ===============================================
     🔹 Tambahkan kriteria baru
  =============================================== */
  const handleAddCriteria = () => {
    if (!validateCriteria(newCriteria)) return;

    const { code, name, label, weight } = newCriteria;

    if (isDuplicateCriteria("code", code)) {
      alert("❌ Kode kriteria sudah digunakan!");
      return;
    }

    if (isDuplicateCriteria("name", name)) {
      alert("❌ Nama kriteria sudah digunakan!");
      return;
    }

    const newData = {
      agendaId,
      code: code.toUpperCase(),
      name: name.trim(),
      label,
      weight: parseFloat(weight),
      autoWeight: 0,
      createdBy: username || "Operator",
      createdAt: new Date().toISOString(),
    };

    push(ref(db, `criteria/${agendaId}`), newData)
      .then(() => {
        setNewCriteria({ code: "", name: "", label: "", weight: "" });
        setShowForm(false);
      })
      .catch((err) => alert("❌ Error: " + err.message));
  };

  /* ===============================================
     🔹 Hapus kriteria
  =============================================== */
  const handleDelete = (id) => {
    if (!window.confirm("Yakin ingin menghapus kriteria ini?")) return;
    remove(ref(db, `criteria/${agendaId}/${id}`));
  };

  /* ===============================================
     🔹 Inline Edit (auto save)
  =============================================== */
  const handleEdit = (id, field, value) => {
    let cleanValue = value.trim();

    if (field === "weight" || field === "autoWeight") {
      cleanValue = parseFloat(value) || 0;
    }

    if (field === "code" && isDuplicateCriteria("code", cleanValue, id)) {
      alert("❌ Kode kriteria sudah digunakan!");
      return;
    }

    if (field === "name" && isDuplicateCriteria("name", cleanValue, id)) {
      alert("❌ Nama kriteria sudah digunakan!");
      return;
    }

    update(ref(db, `criteria/${agendaId}/${id}`), { [field]: cleanValue });
  };

  /* ===============================================
     🔹 Render
  =============================================== */
  return (
    <div className="criteria-wrapper">
      <header className="criteria-header">
        <h2>📊 Manajemen Kriteria</h2>
        <p>Kelola data kriteria untuk perhitungan MEREC dan MOORA.</p>
      </header>

      {/* Toggle Form */}
      <button
        className="btn-toggle-form"
        onClick={() => {
          if (showForm) {
            const form = document.querySelector(".criteria-form");
            form.classList.add("fadeOut");

            setTimeout(() => {
              setShowForm(false);
              setNewCriteria({ code: "", name: "", label: "", weight: "" });
            }, 250);
          } else {
            setShowForm(true);
          }
        }}
      >
        {showForm ? "⬆️ Tutup Form" : "➕ Tambah Kriteria"}
      </button>

      {/* FORM */}
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
                placeholder="Masukkan nama..."
                value={newCriteria.name}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Label</label>
              <select
                value={newCriteria.label}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, label: e.target.value })
                }
              >
                <option value="">Pilih</option>
                <option value="Benefit">Benefit</option>
                <option value="Cost">Cost</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bobot</label>
              <input
                type="number"
                step="0.01"
                value={newCriteria.weight}
                onChange={(e) =>
                  setNewCriteria({ ...newCriteria, weight: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-submit">
            <button className="btn-primary" onClick={handleAddCriteria}>
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <section className="criteria-table-section">
        <h3>📋 Daftar Kriteria</h3>

        <table className="criteria-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
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
                  Belum ada kriteria
                </td>
              </tr>
            ) : (
              criteria.map((c, index) => (
                <tr key={c.id} style={{ "--i": index }}>
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
                      readOnly
                      defaultValue={c.autoWeight || 0}
                      className="editable-input auto-weight"
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
