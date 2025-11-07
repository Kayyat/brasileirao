import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Alert from "../components/Alert";
import { CardSkeleton } from "../components/Skeleton";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    round: "all",
    status: "all",
    team: "all",
  });

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const res = await api.get("/api/matches");
        const data = res.data.matches || [];
        setMatches(data);
        setFilteredMatches(data);
      } catch (err) {
        console.error("Erro ao carregar partidas:", err);
        setMatches([]);
        setFilteredMatches([]);
        setError(
          err.userMessage ||
            "Não foi possível buscar a lista de partidas agora. Aguarde alguns instantes e tente novamente."
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const teams = useMemo(() => {
    const set = new Map();
    matches.forEach((m) => {
      set.set(m.homeTeam.id, m.homeTeam.shortName);
      set.set(m.awayTeam.id, m.awayTeam.shortName);
    });
    return Array.from(set.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const rounds = useMemo(() => {
    const unique = new Set(matches.map((m) => m.matchday).filter(Boolean));
    return Array.from(unique).sort((a, b) => a - b);
  }, [matches]);

  const statuses = useMemo(
    () => [
      { value: "SCHEDULED", label: "Agendado" },
      { value: "IN_PLAY", label: "Em andamento" },
      { value: "PAUSED", label: "Pausado" },
      { value: "FINISHED", label: "Finalizado" },
      { value: "POSTPONED", label: "Adiado" },
    ],
    []
  );

  useEffect(() => {
    const next = matches.filter((match) => {
      const roundOk = filters.round === "all" || match.matchday === Number(filters.round);
      const statusOk = filters.status === "all" || match.status === filters.status;
      const teamOk =
        filters.team === "all" ||
        match.homeTeam.id === Number(filters.team) ||
        match.awayTeam.id === Number(filters.team);
      return roundOk && statusOk && teamOk;
    });
    setFilteredMatches(next);
  }, [matches, filters]);

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Partidas</h2>
      <div className="grid gap-3 md:grid-cols-3 mb-5">
        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Rodada
          <select
            value={filters.round}
            onChange={(event) => handleFilterChange("round", event.target.value)}
            className="mt-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Todas</option>
            {rounds.map((round) => (
              <option key={round} value={round}>
                {round}ª rodada
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Status
          <select
            value={filters.status}
            onChange={(event) => handleFilterChange("status", event.target.value)}
            className="mt-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Todos</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Time
          <select
            value={filters.team}
            onChange={(event) => handleFilterChange("team", event.target.value)}
            className="mt-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          >
            <option value="all">Todos</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <Alert title="Erro ao carregar partidas" message={error} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <CardSkeleton count={4} />
      ) : filteredMatches.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">Nenhuma partida disponível.</p>
      ) : (
        <div className="grid gap-3 text-gray-900 dark:text-gray-100">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              className="border rounded p-3 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src={m.homeTeam.crest} className="w-6 h-6" />
                  <span>{m.homeTeam.shortName}</span>
                </div>
                <div className="font-bold text-gray-900 dark:text-gray-100">
                  {m.score.fullTime.home ?? "-"} : {m.score.fullTime.away ?? "-"}
                </div>
                <div className="flex items-center gap-2">
                  <img src={m.awayTeam.crest} className="w-6 h-6" />
                  <span>{m.awayTeam.shortName}</span>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{new Date(m.utcDate).toLocaleString("pt-BR")}</span>
                <span className="uppercase font-semibold tracking-wide">{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
