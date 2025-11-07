import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Alert from "../components/Alert";
import { CardSkeleton, TableSkeleton } from "../components/Skeleton";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [season, setSeason] = useState("2025");
  const [type, setType] = useState("TOTAL"); // TOTAL | HOME | AWAY
  const [tableError, setTableError] = useState("");
  const [liveError, setLiveError] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // 🔁 Carrega classificação com filtros
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setTableError("");
      try {
        const res = await api.get(`/api/standings/${season}/${type}`);
        const data = res.data.table || [];
        setTable(data);
      } catch (err) {
        console.error("Erro ao carregar tabela:", err);
        setTable([]);
        setTableError(
          err.userMessage ||
            "Não conseguimos carregar a classificação agora. Verifique sua conexão e tente novamente."
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [season, type, refreshToken]);

  // ⚡ Carrega apenas partidas ao vivo
  useEffect(() => {
    async function loadLive() {
      setLiveLoading(true);
      setLiveError("");
      try {
        const res = await api.get("/api/matches");
        const onlyLive = (res.data.matches || []).filter(
          (m) => m.status === "IN_PLAY" || m.status === "PAUSED"
        );
        setLiveMatches(onlyLive);
      } catch (err) {
        console.error("Erro ao buscar partidas ao vivo:", err);
        setLiveMatches([]);
        setLiveError(
          err.userMessage ||
            "Tivemos um problema para atualizar a lista de jogos ao vivo. Vamos tentar novamente em instantes."
        );
      } finally {
        setLiveLoading(false);
      }
    }
    loadLive();
    const interval = setInterval(() => loadLive(), 60000);
    return () => clearInterval(interval);
  }, []);

  const seasonOptions = useMemo(
    () => Array.from({ length: 2025 - 2015 + 1 }, (_, i) => 2025 - i),
    []
  );

  const typeOptions = useMemo(
    () => [
      { label: "Geral", value: "TOTAL" },
      { label: "Mandante", value: "HOME" },
      { label: "Visitante", value: "AWAY" },
    ],
    []
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* 🏆 Tabela principal */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Classificação do Brasileirão Série A
        </h2>

        {/* Filtros de temporada */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {seasonOptions.map((yr) => (
            <button
              key={yr}
              onClick={() => setSeason(String(yr))}
              className={`px-3 py-1 rounded text-sm ${
                season === String(yr)
                  ? "bg-yellow-400 text-black font-semibold"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Filtros de tipo */}
        <div className="flex justify-center gap-3 mb-6">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`px-4 py-2 rounded-md text-sm ${
                type === opt.value
                  ? "bg-yellow-400 text-black font-semibold"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tabela de classificação */}
        {tableError ? (
          <Alert
            title="Não foi possível carregar a tabela"
            message={tableError}
            onRetry={() => setRefreshToken((prev) => prev + 1)}
          />
        ) : loading ? (
          <TableSkeleton rows={10} columns={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2">P</th>
                  <th className="p-2">J</th>
                  <th className="p-2">V</th>
                  <th className="p-2">E</th>
                  <th className="p-2">D</th>
                  <th className="p-2">GP</th>
                  <th className="p-2">GC</th>
                  <th className="p-2">SG</th>
                </tr>
              </thead>
              <tbody>
                {table.map((team, index) => (
                  <tr
                    key={team.team.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="p-2 text-center">{index + 1}</td>
                    <td className="p-2 flex items-center gap-2">
                      <img src={team.team.crest} alt="" className="w-5 h-5" />
                      <Link
                        to={`/team/${team.team.id}`}
                        className="text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        {team.team.shortName}
                      </Link>
                    </td>
                    <td className="p-2 text-center font-bold">{team.points}</td>
                    <td className="p-2 text-center">{team.playedGames}</td>
                    <td className="p-2 text-center">{team.won}</td>
                    <td className="p-2 text-center">{team.draw}</td>
                    <td className="p-2 text-center">{team.lost}</td>
                    <td className="p-2 text-center">{team.goalsFor}</td>
                    <td className="p-2 text-center">{team.goalsAgainst}</td>
                    <td className="p-2 text-center">{team.goalDifference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ⚡ Barra lateral ao vivo */}
      <aside className="lg:w-80 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          ⚡ Jogos ao Vivo
        </h3>
        {liveError ? (
          <Alert title="Falha ao atualizar" message={liveError} tone="warning" />
        ) : liveLoading ? (
          <CardSkeleton count={3} />
        ) : liveMatches.length === 0 ? (
          <p className="text-sm opacity-70 text-gray-700 dark:text-gray-300">
            Nenhuma partida em andamento
          </p>
        ) : (
          <div className="space-y-2">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <img src={m.homeTeam.crest} className="w-5 h-5" />
                  <span>{m.homeTeam.tla}</span>
                </div>
                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                  {m.score.fullTime.home ?? 0} : {m.score.fullTime.away ?? 0}
                </div>
                <div className="flex items-center gap-2">
                  <span>{m.awayTeam.tla}</span>
                  <img src={m.awayTeam.crest} className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
