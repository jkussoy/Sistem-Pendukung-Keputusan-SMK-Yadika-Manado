import { db } from "../Config/Firebase";
import { ref, push } from "firebase/database";

export const saveLog = async ({
  userId,
  userName,
  role,
  action,
  agendaId = "-",
  detail = "-",
}) => {
  try {
    await push(ref(db, "auditLogs"), {
      userId,
      userName,
      role,
      action,
      agendaId,
      detail,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error saving log:", err);
  }
};
