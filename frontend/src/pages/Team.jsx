import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Alert from "../components/Alert";
import { CardSkeleton } from "../components/Skeleton";
import Sparkline from "../components/Sparkline";

export default function Team() {
  const { id } = useParams();
  const [teamInfo, setTeamInfo] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function calcularEstatisticas(jogos, teamId) {
    const jogados = jogos.filter(
      (m) => m.score.fullTime.home !== null && m.score.fullTime.away !== null
    );

    let vitorias = 0,
      empates = 0,
      derrotas = 0,
      pontos = 0;

    jogados.forEach((m) => {
      const home = m.homeTeam.id === teamId;
      const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
      const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;

      if (golsPro > golsContra) {
        vitorias++;
        pontos += 3;
      } else if (golsPro === golsContra) {
        empates++;
        pontos += 1;
      } else {
        derrotas++;
      }
    });

    const total = vitorias + empates + derrotas;
    const aproveitamento = total > 0 ? ((pontos / (total * 3)) * 100).toFixed(1) : 0;

    const ultimos = jogados.slice(-5).map((m) => {
      const home = m.homeTeam.id === teamId;
      const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
      const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;

      if (golsPro > golsContra) return "W";
      if (golsPro === golsContra) return "E";
      return "L";
    });

    return { vitorias, empates, derrotas, aproveitamento, ultimos };
  }

  useEffect(() => {
    async function loadData() {
      setError("");
      setLoading(true);
      try {
        const [standingsRes, matchesRes] = await Promise.all([
          api.get("/api/standings"),
          api.get("/api/matches"),
        ]);

        const table =
          standingsRes.data.standings?.find((s) => s.type === "TOTAL")?.table || [];
        const teamData = table.find((t) => t.team.id === Number(id));
        setTeamInfo(teamData || null);

        const allMatches = matchesRes.data.matches || [];
        const filtered = allMatches.filter(
          (m) => m.homeTeam.id === Number(id) || m.awayTeam.id === Number(id)
        );
        setMatches(filtered);
      } catch (err) {
        console.error("Erro ao carregar dados do time:", err);
        setError(
          err.userMessage ||
            "Não conseguimos carregar as informações desse time agora. Atualize a página ou tente novamente."
        );
        setTeamInfo(null);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const timeId = Number(id);

  const { vitorias, empates, derrotas, aproveitamento, ultimos } = useMemo(
    () => calcularEstatisticas(matches, timeId),
    [matches, timeId]
  );

  const mandanteVsVisitante = useMemo(() => {
    const base = {
      home: { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0 },
      away: { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0 },
    };

    matches.forEach((m) => {
      if (m.status !== "FINISHED") return;
      const isHome = m.homeTeam.id === timeId;
      const grupo = isHome ? base.home : base.away;
      grupo.jogos += 1;
      const golsPro = isHome ? m.score.fullTime.home : m.score.fullTime.away;
      const golsContra = isHome ? m.score.fullTime.away : m.score.fullTime.home;
      grupo.golsPro += golsPro ?? 0;
      grupo.golsContra += golsContra ?? 0;
      if (golsPro > golsContra) grupo.vitorias += 1;
      else if (golsPro === golsContra) grupo.empates += 1;
      else grupo.derrotas += 1;
    });

    return base;
  }, [matches, timeId]);

  const pontosAcumulados = useMemo(() => {
    const sorted = [...matches]
      .filter((m) => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    let pontos = 0;
    const acumulado = sorted.map((m) => {
      const home = m.homeTeam.id === timeId;
      const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
      const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;
      if (golsPro > golsContra) pontos += 3;
      else if (golsPro === golsContra) pontos += 1;
      return pontos;
    });
    return acumulado;
  }, [matches, timeId]);

  const destaquesRecentes = useMemo(() => {
    return matches
      .filter((m) => m.status === "FINISHED")
      .slice(-5)
      .map((m) => ({
        id: m.id,
        adversario:
          m.homeTeam.id === timeId ? m.awayTeam.shortName : m.homeTeam.shortName,
        resultado: (() => {
          const home = m.homeTeam.id === timeId;
          const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
          const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;
          if (golsPro > golsContra) return "Vitória";
          if (golsPro === golsContra) return "Empate";
          return "Derrota";
        })(),
        placar: `${m.score.fullTime.home ?? 0} x ${m.score.fullTime.away ?? 0}`,
        data: new Date(m.utcDate).toLocaleDateString("pt-BR"),
      }))
      .reverse();
  }, [matches, timeId]);

  const jogosFinalizados = useMemo(
    () => matches.filter((m) => m.status === "FINISHED"),
    [matches]
  );

  const mediaGolsPro = useMemo(() => {
    const total = jogosFinalizados.reduce((acc, m) => {
      const home = m.homeTeam.id === timeId;
      const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
      return acc + (golsPro ?? 0);
    }, 0);
    return (total / Math.max(1, jogosFinalizados.length)).toFixed(2);
  }, [jogosFinalizados, timeId]);

  const mediaGolsContra = useMemo(() => {
    const total = jogosFinalizados.reduce((acc, m) => {
      const home = m.homeTeam.id === timeId;
      const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;
      return acc + (golsContra ?? 0);
    }, 0);
    return (total / Math.max(1, jogosFinalizados.length)).toFixed(2);
  }, [jogosFinalizados, timeId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton count={4} />
      </div>
    );
  }

  if (error) {
    return <Alert title="Erro ao carregar time" message={error} onRetry={() => window.location.reload()} />;
  }

  if (!teamInfo) {
    return <p>Time não encontrado.</p>;
  }

  const homeStats = mandanteVsVisitante.home;
  const awayStats = mandanteVsVisitante.away;

  return (
    <div className="space-y-6">
      <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
        ← Voltar
      </Link>

      <div className="flex flex-col items-center text-center">
        <img src={teamInfo.team.crest} alt="" className="w-20 h-20 mb-2" />
        <h2 className="text-2xl font-bold">{teamInfo.team.name}</h2>
        <p className="text-sm opacity-70">
          {teamInfo.position}º lugar • {teamInfo.points} pts • {teamInfo.playedGames} jogos
        </p>

        <div className="flex gap-4 mt-3 text-sm">
          <div>✅ Vitórias: {vitorias}</div>
          <div>🤝 Empates: {empates}</div>
          <div>❌ Derrotas: {derrotas}</div>
        </div>

        <p className="mt-2 text-sm">
          Aproveitamento: <span className="font-semibold">{aproveitamento}%</span>
        </p>

        <div className="flex gap-2 mt-2">
          {ultimos.map((r, i) => (
            <span
              key={i}
              className={`w-6 h-6 flex items-center justify-center rounded text-sm font-bold ${
                r === "W"
                  ? "bg-green-500 text-white"
                  : r === "E"
                  ? "bg-yellow-400 text-black"
                  : "bg-red-500 text-white"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Todos os jogos</h3>
        <div className="grid gap-2">
          {matches.map((m) => (
            <div key={m.id} className="border rounded p-3 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src={m.homeTeam.crest} className="w-6 h-6" />
                  <span>{m.homeTeam.shortName}</span>
                </div>
                <div className="font-bold">
                  {m.score.fullTime.home ?? "-"} : {m.score.fullTime.away ?? "-"}
                </div>
                <div className="flex items-center gap-2">
                  <img src={m.awayTeam.crest} className="w-6 h-6" />
                  <span>{m.awayTeam.shortName}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(m.utcDate).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-lg p-4 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
          <h3 className="text-lg font-semibold mb-3">Desempenho Mandante x Visitante</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Mandante", data: homeStats, color: "bg-blue-500" },
              { label: "Visitante", data: awayStats, color: "bg-purple-500" },
            ].map(({ label, data, color }) => {
              const total = data.jogos || 1;
              const aproveitamentoGrupo = Math.round(
                ((data.vitorias * 3 + data.empates) / (total * 3)) * 100
              );
              return (
                <div key={label} className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${color}`} /> {label}
                  </h4>
                  <p>
                    {data.jogos} jogos • {data.vitorias}V {data.empates}E {data.derrotas}D
                  </p>
                  <p>Gols: {data.golsPro} pró / {data.golsContra} contra</p>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color}`}
                      style={{ width: `${Math.min(100, aproveitamentoGrupo)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aproveitamento {aproveitamentoGrupo}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border rounded-lg p-4 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
          <h3 className="text-lg font-semibold mb-3">Evolução de pontos na temporada</h3>
          <Sparkline data={pontosAcumulados} />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Atualização a cada jogo finalizado. Mostra a soma acumulada de pontos do clube ao longo da temporada.
          </p>
        </div>

        <div className="border rounded-lg p-4 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
          <h3 className="text-lg font-semibold mb-3">Destaques recentes</h3>
          <ul className="space-y-3 text-sm">
            {destaquesRecentes.map((item) => (
              <li key={item.id} className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{item.resultado}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    vs {item.adversario} • {item.data}
                  </p>
                </div>
                <span className="text-sm font-bold">{item.placar}</span>
              </li>
            ))}
            {destaquesRecentes.length === 0 ? (
              <li className="text-sm text-gray-500 dark:text-gray-400">Ainda sem jogos finalizados recentes.</li>
            ) : null}
          </ul>
        </div>

        <div className="border rounded-lg p-4 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
          <h3 className="text-lg font-semibold mb-3">Resumo rápido</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Média de gols pró</dt>
              <dd className="text-lg font-semibold">{mediaGolsPro}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Média de gols sofridos</dt>
              <dd className="text-lg font-semibold">{mediaGolsContra}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Jogos disputados</dt>
              <dd className="text-lg font-semibold">{matches.length}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Aproveitamento total</dt>
              <dd className="text-lg font-semibold">{aproveitamento}%</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
