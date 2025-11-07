import { useEffect, useMemo, useState } from "react";
import rankingData from "../data/rankingGeral.json";
import api from "../services/api";
import Alert from "../components/Alert";
import { TableSkeleton } from "../components/Skeleton";

export default function RankingGeral() {
  const [data, setData] = useState(rankingData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(() => Math.min(20, rankingData.length));
  const [search, setSearch] = useState("");
  const [comparison, setComparison] = useState({ first: "", second: "" });

  useEffect(() => {
    async function loadDynamicRanking() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/api/ranking");
        if (Array.isArray(res.data) && res.data.length > 0) {
          setData(
            res.data.map((item, index) => ({
              pos: index + 1,
              time: item.nome || item.time,
              pontos: item.pontos,
              vitorias: item.vitorias,
              empates: item.empates,
              derrotas: item.derrotas,
              gols_pro: item.golsPro ?? item.gols_pro,
              gols_contra: item.golsContra ?? item.gols_contra,
            }))
          );
        }
      } catch (err) {
        console.warn("Falha ao buscar ranking atualizado, usando base local.", err);
        setError(
          err.userMessage ||
            "Não conseguimos atualizar o ranking agora. Estamos exibindo os dados locais."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDynamicRanking();
  }, []);

  useEffect(() => {
    setLimit((prev) => Math.min(prev, data.length));
  }, [data.length]);

  const filteredData = useMemo(() => {
    return data
      .filter((team) => team.time.toLowerCase().includes(search.toLowerCase()))
      .slice(0, limit);
  }, [data, search, limit]);

  const comparisonResult = useMemo(() => {
    const firstTeam = data.find((t) => t.time === comparison.first);
    const secondTeam = data.find((t) => t.time === comparison.second);

    if (!firstTeam || !secondTeam) return null;

    const diff = (field) => (firstTeam[field] || 0) - (secondTeam[field] || 0);

    return {
      firstTeam,
      secondTeam,
      pointsDiff: diff("pontos"),
      winsDiff: diff("vitorias"),
      goalsDiff: diff("gols_pro"),
    };
  }, [comparison, data]);

  const teamOptions = useMemo(() => data.map((team) => team.time), [data]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          🏆 Ranking Geral - Pontos Corridos (2003–Presente)
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Explore a evolução dos clubes no formato de pontos corridos. Ajuste os filtros para
          destacar um recorte específico ou comparar clubes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Buscar clube
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite o nome do time"
            className="mt-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
          />
        </label>
        <label className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          Quantidade exibida
          <input
            type="range"
            min={1}
            max={Math.max(1, data.length)}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="mt-2"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mostrando top {limit} clubes
          </span>
        </label>
        <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>Comparar clubes</span>
          <div className="flex gap-2">
            <select
              value={comparison.first}
              onChange={(event) =>
                setComparison((prev) => ({ ...prev, first: event.target.value }))
              }
              className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Time A</option>
              {teamOptions.map((team) => (
                <option key={`A-${team}`} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <select
              value={comparison.second}
              onChange={(event) =>
                setComparison((prev) => ({ ...prev, second: event.target.value }))
              }
              className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              <option value="">Time B</option>
              {teamOptions.map((team) => (
                <option key={`B-${team}`} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <Alert title="Aviso" message={error} tone="warning" /> : null}

      {loading ? (
        <TableSkeleton rows={limit} columns={8} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2 text-left">Time</th>
                <th className="p-2">Pts</th>
                <th className="p-2">V</th>
                <th className="p-2">E</th>
                <th className="p-2">D</th>
                <th className="p-2">GP</th>
                <th className="p-2">GC</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((team) => (
                <tr
                  key={team.pos}
                  className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    team.time === comparison.first || team.time === comparison.second
                      ? "bg-yellow-50/60 dark:bg-yellow-900/20"
                      : ""
                  }`}
                >
                  <td className="p-2 text-center">{team.pos}</td>
                  <td className="p-2">{team.time}</td>
                  <td className="p-2 text-center font-semibold">{team.pontos}</td>
                  <td className="p-2 text-center">{team.vitorias}</td>
                  <td className="p-2 text-center">{team.empates}</td>
                  <td className="p-2 text-center">{team.derrotas}</td>
                  <td className="p-2 text-center">{team.gols_pro}</td>
                  <td className="p-2 text-center">{team.gols_contra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comparisonResult ? (
        <div className="grid gap-4 md:grid-cols-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-100">
          <div>
            <h3 className="text-base font-semibold">{comparisonResult.firstTeam.time}</h3>
            <p>{comparisonResult.firstTeam.pontos} pontos totais</p>
            <p>{comparisonResult.firstTeam.vitorias} vitórias • {comparisonResult.firstTeam.empates} empates</p>
          </div>
          <div>
            <h3 className="text-base font-semibold">{comparisonResult.secondTeam.time}</h3>
            <p>{comparisonResult.secondTeam.pontos} pontos totais</p>
            <p>
              {comparisonResult.secondTeam.vitorias} vitórias • {comparisonResult.secondTeam.empates} empates
            </p>
          </div>
          <div className="self-center">
            <p>Diferença de pontos: {comparisonResult.pointsDiff}</p>
            <p>Diferença de vitórias: {comparisonResult.winsDiff}</p>
            <p>Saldo de gols pró: {comparisonResult.goalsDiff}</p>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Fonte: CBF / Dados históricos consolidados. Dados em tempo real quando disponíveis na API.
      </p>
    </section>
  );
}
