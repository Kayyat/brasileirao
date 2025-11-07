import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home.jsx";
import Matches from "./pages/Matches.jsx";
import useDarkMode from "./hooks/useDarkMode.js";
import Team from "./pages/Team.jsx";
import Live from "./pages/Live.jsx";
import RankingGeral from "./pages/RankingGeral.jsx";



function Layout() {
  const [theme, toggleTheme] = useDarkMode();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            Brasileirão
          </h1>

          <nav className="flex items-center space-x-2">
            <NavLink to="/" className={linkClass} end>
              Classificação
            </NavLink>
            <NavLink to="/matches" className={linkClass}>
              Jogos
            </NavLink>
            <NavLink to="/live" className={linkClass}>
              Ao Vivo
            </NavLink>
            <NavLink to="/ranking" className={linkClass}>
              Ranking Geral
            </NavLink>


            {/* Botão de tema */}
            <button
              onClick={toggleTheme}
              className="ml-3 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === "dark" ? "🌞 Claro" : "🌙 Escuro"}
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto p-4 w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/team/:id" element={<Team />} />
          <Route path="/live" element={<Live />} />
          <Route path="/ranking" element={<RankingGeral />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">
        © {new Date().getFullYear()} AmazeTech • Dados: football-data.org
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  </React.StrictMode>
);
