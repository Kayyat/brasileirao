import { useEffect, useRef, useState } from "react";
import { getApiUrl } from "../services/api";
import Alert from "../components/Alert";
import { CardSkeleton } from "../components/Skeleton";

export default function Live() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const previousScores = useRef({});
  const audioRef = useRef(null);
  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  function notifyGoal(match, scoreText) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const title = `Gol na partida ${match.homeTeam.shortName} x ${match.awayTeam.shortName}!`;
    const body = `${scoreText} (${match.status === "IN_PLAY" ? "ao vivo" : match.status})`;
    new Notification(title, {
      body,
      icon: match.homeTeam.crest,
    });
  }

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const url = getApiUrl("/api/matches/stream");

    function connect() {
      setLiveError("");
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        setLoading(false);
        setLiveError("");
        try {
          const payload = JSON.parse(event.data);
          const newMatches = payload.matches || [];

          newMatches.forEach((match) => {
            const key = match.id;
            const currentScore = `${match.score.fullTime.home ?? 0}-${match.score.fullTime.away ?? 0}`;
            const prev = previousScores.current[key];
            if (prev && prev !== currentScore) {
              audioRef.current?.play().catch(() => {});
              notifyGoal(match, currentScore.replace("-", " x "));
            }
            previousScores.current[key] = currentScore;
          });

          setMatches(newMatches);
          setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
        } catch (err) {
          console.error("Erro ao tratar atualização ao vivo:", err);
        }
      };

      es.onerror = () => {
        setLiveError(
          "Perdemos a conexão com o placar ao vivo. Tentaremos reconectar automaticamente."
        );
        setLoading(false);
        es.close();
        if (!retryTimeoutRef.current) {
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            connect();
          }, 5000);
        }
      };
    }

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <section>
      <audio ref={audioRef} src="/sounds/gol.mp3" preload="auto" />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">⚡ Partidas ao Vivo</h2>
        {lastUpdate ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">Atualizado às {lastUpdate}</span>
        ) : null}
      </div>

      {liveError ? (
        <Alert title="Conexão perdida" message={liveError} tone="warning" />
      ) : loading ? (
        <CardSkeleton count={3} />
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
