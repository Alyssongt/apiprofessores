import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// Rota da API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/perguntar", async (req, res) => {
  try {
    const { pergunta } = req.body;
    if (!pergunta) return res.status(400).json({ erro: "Pergunta é obrigatória" });

    const resposta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: pergunta }],
    });

    res.json({ resposta: resposta.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Falha ao consultar a OpenAI" });
  }
});

// **Rota catch-all**: qualquer rota que não seja API retorna index.html
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// Dados simulados
let turmas = [];
let bancoQuestoes = [];
let eventos = [];
let materiais = [
  { nome: 'Livro de Português', disciplina: 'Português', ano: '3º ano', tipo: 'Livro', resposta: 'Exemplo' },
  { nome: 'Livro de Matemática', disciplina: 'Matemática', ano: '4º ano', tipo: 'Livro', resposta: '42' },
];

// Função genérica para IA
async function gerarIA(prompt, max_tokens = 500) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens,
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('Erro IA:', err.message);
    return 'Erro ao gerar conteúdo via IA.';
  }
}

// =================== ROTAS ===================

// Gerar atividade
app.post('/gerar-atividade', async (req,res)=>{
  const { ano, materia, tipo } = req.body;
  const prompt = `Crie uma atividade completa para o ${ano} de ${materia}. Tipo: ${tipo}. Inclua texto, contos ou problemas conforme necessário.`;
  const atividade = await gerarIA(prompt, 1000);
  res.json({ atividade });
});

// Corrigir tarefa
app.post('/corrigir-tarefa', async (req,res)=>{
  const { respostaAluno, gabarito } = req.body;
  const prompt = `Corrija a resposta do aluno em relação ao gabarito e explique o que está correto ou errado.\nResposta do aluno: ${respostaAluno}\nGabarito: ${gabarito}`;
  const correcao = await gerarIA(prompt, 300);
  res.json({ correcao });
});

// Planejar aula
app.post('/planejar-aula', async (req,res)=>{
  const { ano, materia, semana } = req.body;
  const prompt = `Crie um planejamento de aula detalhado para ${ano} de ${materia}, abordando objetivos, metodologia e recursos para a(s) semana(s) ${semana}.`;
  const planejamento = await gerarIA(prompt, 1000);
  res.json({ planejamento });
});

// Gerenciar turmas
app.post('/adicionar-turma', (req,res)=>{
  const { nomeTurma } = req.body;
  turmas.push(nomeTurma);
  res.json({ mensagem: `Turma "${nomeTurma}" adicionada com sucesso!` });
});

// Banco de questões
app.post('/salvar-questao', (req,res)=>{
  const { questao, disciplina, resposta } = req.body;
  bancoQuestoes.push({ questao, disciplina, resposta });
  res.json({ mensagem: 'Questão salva com sucesso!' });
});

// Gerar prova
app.post('/gerar-prova', async (req,res)=>{
  const { turma, quantidade, ano, materia } = req.body;
  const numQuestoes = Number(quantidade) || 5;
  const prompt = `
Crie ${numQuestoes} questões completas para uma prova do ${ano} de ${materia} para a turma ${turma}.
Inclua:
- Questão numerada
- Texto ou contos, se for interpretação textual
- Alternativas A,B,C,D para cada questão
- Indique claramente o gabarito (ex: Questão 1: B)
Separe as questões do gabarito.
`;
  try {
    const provaCompleta = await gerarIA(prompt, 2000);
    let [questoes, gabarito] = provaCompleta.split(/Gabarito/i);
    if(!gabarito) gabarito = 'Gabarito não gerado separadamente.';
    res.json({ prova: questoes?.trim() || 'Não foi possível gerar a prova.', gabarito: gabarito?.trim() });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});

// Agenda
app.post('/adicionar-evento', (req,res)=>{
  const { evento, data } = req.body;
  eventos.push({ evento, data });
  res.json({ mensagem: `Evento "${evento}" adicionado para ${data}.` });
});

// Comunicação com responsáveis
app.post('/enviar-mensagem', async (req,res)=>{
  const { aluno, mensagem } = req.body;
  const prompt = `Escreva uma mensagem clara e cordial para o responsável do aluno ${aluno}: "${mensagem}"`;
  const mensagemIA = await gerarIA(prompt, 300);
  res.json({ mensagem: mensagemIA });
});

// Biblioteca Inteligente - Buscar
app.post('/biblioteca/buscar', async (req, res) => {
  try {
    const { termo = '', disciplina = '', ano = '' } = req.body;
    const resultados = materiais.filter(m =>
      (!disciplina || m.disciplina === disciplina) &&
      (!ano || m.ano === ano) &&
      (termo ? m.nome.toLowerCase().includes(termo.toLowerCase()) : true)
    );
    if (resultados.length > 0) {
      res.json({ origem: 'banco-local', itens: resultados });
      return;
    }
    const prompt = `
Sugira 5 materiais para ${disciplina || 'disciplinas variadas'} do ${ano || 'EF anos iniciais'} sobre "${termo || 'conteúdos básicos'}".
Retorne em JSON no formato:
[
  {"nome":"","disciplina":"","ano":"","tipo":"","descricao":""},
  ...
]
Use títulos curtos e úteis para professor.`;
    const sugestoesJson = await gerarIA(prompt, 600);
    let sugestoes = [];
    try { 
      sugestoes = JSON.parse(sugestoesJson.replace(/```json|```/g,"").trim()); 
    } catch(_) {}
    if (Array.isArray(sugestoes) && sugestoes.length) {
      res.json({ origem:'ia', itens: sugestoes });
      return;
    }
    res.json({ origem:'ia', itens:[], texto: sugestoesJson.trim() });
  } catch(e) {
    console.error(e);
    res.status(500).json({ erro: 'Falha ao buscar materiais.' });
  }
});

// Biblioteca Inteligente - Resumo
app.post('/biblioteca/resumo', async (req,res)=>{
  try {
    const { conteudo, publico } = req.body;
    const prompt = `Resuma o seguinte texto para ${publico || "estudantes"}:\n\n${conteudo}`;
    const resumo = await gerarIA(prompt, 500);
    res.json({ resumo });
  } catch(e) {
    console.error("Erro em /biblioteca/resumo:", e);
    res.status(500).json({ erro: 'Falha ao gerar resumo.' });
  }
});

// Biblioteca Inteligente - Gerar Texto
app.post('/biblioteca/gerar-texto', async (req,res)=>{
  try {
    const { tema, disciplina, ano, tipo } = req.body;
    const prompt = `Crie um ${tipo || "conto"} educativo para ${disciplina || "disciplinas variadas"} do ${ano || "ensino fundamental"}, com o tema: "${tema}".`;
    const texto = await gerarIA(prompt, 1000);
    res.json({ texto });
  } catch(e) {
    console.error("Erro em /biblioteca/gerar-texto:", e);
    res.status(500).json({ erro: 'Falha ao gerar texto.' });
  }
});

// Exportar Excel
app.get('/exportar-excel', async (req,res)=>{
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Turmas');
  sheet.columns = [
    { header:'ID', key:'id', width:10 },
    { header:'Nome da Turma', key:'nome', width:30 }
  ];
  turmas.forEach((t,i)=>sheet.addRow({id:i+1,nome:t}));
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename=turmas.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, ()=>console.log(`✅ Servidor rodando em http://localhost:${PORT}`));

