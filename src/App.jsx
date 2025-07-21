import { Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import { PATH } from "./core/constants/path";

function App() {
  return (
    <>
      <Routes>
        <Route path={PATH.HOME} element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
