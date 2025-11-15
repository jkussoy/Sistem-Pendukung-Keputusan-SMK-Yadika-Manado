import logo from "./logo.svg";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
        <Route path="/landing-page" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home username="Guru1" />} />
        <Route path="/workspace/:agendaId" element={<Workspace />}>
          <Route path="workspacehome" element={<WorkspaceHome />} />
          <Route path="criteria" element={<Criteria />} />
          <Route path="alternatives" element={<Alternative />} />
          <Route path="weighting" element={<WeightMerec />} />
          <Route path="result" element={<Result />} />
          <Route path="voting-result" element={<VotingResult />} />
        </Route>
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Routes>
    </Router>
  );
}

export default App;
