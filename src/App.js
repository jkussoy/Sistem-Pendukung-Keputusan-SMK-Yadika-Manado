import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./Component/LandingPage";
import Home from "./Component/Home";
import Criteria from "./Component/Criteria";
import Workspace from "./Component/Workspace";
import Alternative from "./Component/Alternative";
import WeightMerec from "./Component/Weighting";
import Result from "./Component/Result";
import WorkspaceHome from "./Component/WorkspaceHome";
import SignUp from "./Component/SignUp/index";
import VotingResult from "./Component/VotingResult";
import AuditLogs from "./Component/AuditLogs";
import Login from "./Component/Login";
import "bootstrap/dist/css/bootstrap.min.css";
import ManageAccounts from "./Component/ManageAcounts";
import ChangePassword from "./Component/ChangePassword";
import Profile from "./Component/Profile";
import Contact from "./Component/Contact";

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
        <Route path="/manage-accounts" element={<ManageAccounts />} />

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
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  );
}

export default App;
