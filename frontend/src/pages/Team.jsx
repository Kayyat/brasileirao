import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Team() {
  const { id } = useParams();
  const [teamInfo, setTeamInfo] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔍 função auxiliar para calcular forma e aproveitamento
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

    // Últimos 5 jogos (forma)
    const ultimos = jogados.slice(-5).map((m) => {
      const home = m.homeTeam.id === teamId;
      const golsPro = home ? m.score.fullTime.home : m.score.fullTime.away;
      const golsContra = home ? m.score.fullTime.away : m.score.fullTime.home;

      if (golsPro > golsContra) return "W"; // win
      if (golsPro === golsContra) return "E"; // draw
      return "L"; // loss
    });

    return { vitorias, empates, derrotas, aproveitamento, ultimos };
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Busca dados da tabela
        const standingsRes = await axios.get("http://localhost:4000/api/standings");
        const table = standingsRes.data.standings?.find((s) => s.type === "TOTAL")?.table || [];
        const teamData = table.find((t) => t.team.id === Number(id));
        setTeamInfo(teamData);

        // Busca jogos e filtra os do time
        const matchesRes = await axios.get("http://localhost:4000/api/matches");
        const allMatches = matchesRes.data.matches || [];

        const filtered = allMatches.filter(
          (m) => m.homeTeam.id === Number(id) || m.awayTeam.id === Number(id)
        );

        setMatches(filtered);
      } catch (err) {
        console.error("Erro ao carregar dados do time:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (!teamInfo) return <p>Time não encontrado.</p>;

  // Calcula estatísticas
  const { vitorias, empates, derrotas, aproveitamento, ultimos } = calcularEstatisticas(matches, Number(id));

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

        {/* Estatísticas */}
        <div className="flex gap-4 mt-3 text-sm">
          <div>✅ Vitórias: {vitorias}</div>
          <div>🤝 Empates: {empates}</div>
          <div>❌ Derrotas: {derrotas}</div>
        </div>

        <p className="mt-2 text-sm">
          Aproveitamento: <span className="font-semibold">{aproveitamento}%</span>
        </p>

        {/* Forma recente */}
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

      {/* Lista de jogos */}
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
    </div>
  );
}
