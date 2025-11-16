import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LandingPage from "./Component/LandingPage/Index";
import Home from "./Component/Home";
import Criteria from "./Component/Criteria";
import Workspace from "./Component/Workspace";
import Alternative from "./Component/Alternative";
import WeightMerec from "./Component/Weighting";
import Result from "./Component/Result";
import WorkspaceHome from "./Component/WorkspaceHome";
import Login from "./Component/Login/index";
import SignUp from "./Component/SignUp/index";
import VotingResult from "./Component/VotingResult";
import AuditLogs from "./Component/AuditLogs";

function App() {
  return (
    <Router>
      <Routes>
        {/* DEFAULT ROUTE — FIX BLANK PAGE */}
        <Route path="/" element={<Navigate to="/landing-page" replace />} />

        {/* PUBLIC ROUTES */}
        <Route path="/landing-page" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* HOME */}
        <Route path="/home" element={<Home username="Guru1" />} />

        {/* WORKSPACE */}
        <Route path="/workspace/:agendaId" element={<Workspace />}>
          <Route path="workspacehome" element={<WorkspaceHome />} />
          <Route path="criteria" element={<Criteria />} />
          <Route path="alternatives" element={<Alternative />} />
          <Route path="weighting" element={<WeightMerec />} />
          <Route path="result" element={<Result />} />
          <Route path="voting-result" element={<VotingResult />} />
        </Route>

        {/* AUDIT LOGS */}
        <Route path="/audit-logs" element={<AuditLogs />} />

        {/* CATCH-ALL ERROR HANDLING */}
        <Route path="*" element={<Navigate to="/landing-page" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
