import logo from "./logo.svg";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./Component/Login/Index";
import Login from "./Component/Login/Index";
import LoginAsTeacher from "./Component/LoginAsTeacher/index";
import SignInTeacher from "./Component/SignInTeacher/index";
import Home from "./Component/Home";
import Criteria from "./Component/Criteria";
import Workspace from "./Component/Workspace";
import Alternative from "./Component/Alternative";
import WeightMerec from "./Component/Weighting";
import Result from "./Component/Result";
import WorkspaceHome from "./Component/WorkspaceHome";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login-teacher" element={<LoginAsTeacher />} />
        <Route path="/signin-teacher" element={<SignInTeacher />} />
        <Route path="/home" element={<Home username="Guru1" />} />
        <Route path="/workspace/:agendaId" element={<Workspace />}>
          <Route path="workspacehome" element={<WorkspaceHome />} />
          <Route path="criteria" element={<Criteria />} />
          <Route path="alternatives" element={<Alternative />} />
          <Route path="weighting" element={<WeightMerec />} />
          <Route path="result" element={<Result />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
