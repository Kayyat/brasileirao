import { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function Live() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const previousScores = useRef({});
  const audioRef = useRef(null);

  async function loadLive() {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:4000/api/matches?live=true");
      const newMatches = res.data.matches || [];

      // Detecta gols
      newMatches.forEach((m) => {
        const key = m.id;
        const prev = previousScores.current[key];
        const currentScore = `${m.score.fullTime.home ?? 0}-${m.score.fullTime.away ?? 0}`;
        if (prev && prev !== currentScore) {
          // Tocou gol
          audioRef.current.play().catch(() => {});
        }
        previousScores.current[key] = currentScore;
      });

      setMatches(newMatches);
    } catch (err) {
      console.error("Erro ao buscar partidas ao vivo:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLive();
    const interval = setInterval(() => loadLive(), 60000); // atualiza a cada 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <audio ref={audioRef} src="/sounds/gol.mp3" preload="auto" />
      <h2 className="text-2xl font-bold mb-4">⚡ Partidas ao Vivo</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : matches.length === 0 ? (
        <p>Nenhuma partida em andamento agora.</p>
      ) : (
        <div className="grid gap-3">
          {matches.map((m) => (
            <div
              key={m.id}
              className="border rounded-lg p-3 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 animate-fadeIn"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src={m.homeTeam.crest} className="w-6 h-6" />
                  <span>{m.homeTeam.shortName}</span>
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400 animate-pulse">
                  {m.score.fullTime.home ?? 0} : {m.score.fullTime.away ?? 0}
                </div>
                <div className="flex items-center gap-2">
                  <img src={m.awayTeam.crest} className="w-6 h-6" />
                  <span>{m.awayTeam.shortName}</span>
                </div>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">⏱ Em andamento...</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
