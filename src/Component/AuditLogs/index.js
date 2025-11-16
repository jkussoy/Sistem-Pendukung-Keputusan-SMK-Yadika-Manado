import React, { useEffect, useState } from "react";
import { db } from "../../Config/Firebase";
import { ref, onValue } from "firebase/database";
import "./style.css";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const logRef = ref(db, "auditLogs");
    const unsub = onValue(logRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => new Date(b.time) - new Date(a.time));
      setLogs(list);
    });

    return () => unsub();
  }, []);

  return (
    <div className="audit-wrapper">
      <h2 className="audit-title">📘 Audit Log Aktivitas Sistem</h2>

      {logs.length === 0 ? (
        <div className="audit-empty">Belum ada aktivitas.</div>
      ) : (
        <div className="audit-list">
          {logs.map((log) => (
            <div className="audit-item" key={log.id}>
              <div className="audit-row">
                <span className={`log-badge ${log.action.toLowerCase()}`}>
                  {log.action}
                </span>

                <div className="log-info">
                  <p className="log-detail">{log.detail}</p>
                  <p className="log-meta">
                    <strong>{log.user}</strong> ({log.role}) ·{" "}
                    {new Date(log.time).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
