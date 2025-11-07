import { useEffect, useState } from "react";
import axios from "axios";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await axios.get("http://localhost:4000/api/matches");
        setMatches(res.data.matches || []);
      } catch (err) {
        console.error("Erro ao carregar partidas:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Partidas</h2>
      {loading ? (
        <p className="text-gray-800 dark:text-gray-200">Carregando...</p>
      ) : matches.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">Nenhuma partida disponível.</p>
      ) : (
        <div className="grid gap-3 text-gray-900 dark:text-gray-100">
          {matches.map((m) => (
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {new Date(m.utcDate).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
