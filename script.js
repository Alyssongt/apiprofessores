// ======================= CONFIG =======================
const API_BASE = "http://localhost:3000"; // troque se backend estiver em outro endereço

// Mostrar apenas o formulário selecionado
function mostrarFormulario(id) {
  document.querySelectorAll(".formulario").forEach(f => f.style.display = "none");
  document.getElementById(id).style.display = "flex";
  document.getElementById("resultado").style.display = "none";
}
window.mostrarFormulario = mostrarFormulario;

// Função genérica para POST via fetch
async function postJSON(url, payload) {
  const resDiv = document.getElementById("resultado");
  resDiv.style.display = "block";
  resDiv.textContent = "Processando...";
  try {
    const r = await fetch(API_BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error("Erro HTTP " + r.status);
    return await r.json();
  } catch (e) {
    resDiv.textContent = "Erro: " + e.message;
  }
}

// --- Funções dos formulários ---
async function gerarAtividade() {
  const ano = document.getElementById("ano").value;
  const materia = document.getElementById("materia").value;
  const tipo = document.getElementById("tipo").value;
  const data = await postJSON("/gerar-atividade", { ano, materia, tipo });
  document.getElementById("resultado").textContent = data?.atividade || "Não foi possível gerar atividade.";
}
window.gerarAtividade = gerarAtividade;

async function corrigirTarefa() {
  const respostaAluno = document.getElementById("respostaAluno").value;
  const gabarito = document.getElementById("gabarito").value;
  const data = await postJSON("/corrigir-tarefa", { respostaAluno, gabarito });
  document.getElementById("resultado").textContent = data?.correcao || "Não foi possível corrigir.";
}
window.corrigirTarefa = corrigirTarefa;

async function planejarAula() {
  const ano = document.getElementById("anoPlanejamento").value;
  const materia = document.getElementById("materiaPlanejamento").value;
  const semana = document.getElementById("semanaPlanejamento").value;

  const data = await postJSON("/planejar-aula", { ano, materia, semana });
  document.getElementById("resultado").textContent = data?.planejamento || "Não foi possível planejar a aula.";
}
window.planejarAula = planejarAula;

async function gerenciarTurmas() {
  const nomeTurma = document.getElementById("nomeTurma").value;
  const data = await postJSON("/adicionar-turma", { nomeTurma });
  document.getElementById("resultado").textContent = data?.mensagem || "Erro ao gerenciar turma.";
}
window.gerenciarTurmas = gerenciarTurmas;

async function salvarQuestao() {
  const questao = document.getElementById("questaoBanco").value;
  const disciplina = document.getElementById("disciplinaBanco").value;
  const resposta = prompt("Digite a resposta correta da questão:");
  const data = await postJSON("/salvar-questao", { questao, disciplina, resposta });
  document.getElementById("resultado").textContent = data?.mensagem || "Erro ao salvar questão.";
}
window.salvarQuestao = salvarQuestao;

async function gerarProva() {
  const turma = document.getElementById("turmaProva").value;
  const quantidade = document.getElementById("quantQuestoes").value;
  const ano = document.getElementById("anoProva").value;
  const materia = document.getElementById("materiaProva").value;

  const data = await postJSON("/gerar-prova", { turma, quantidade, ano, materia });
  document.getElementById("resultado").textContent = data?.prova || "Não foi possível gerar a prova.";
}
window.gerarProva = gerarProva;

async function gerarPDFProva() {
  const turma = document.getElementById("turmaProva").value;
  const quantidade = document.getElementById("quantQuestoes").value;
  const ano = document.getElementById("anoProva").value;
  const materia = document.getElementById("materiaProva").value;

  const data = await postJSON("/gerar-prova", { turma, quantidade, ano, materia });
  if (!data?.prova) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Prova - Turma ${turma}`, 20, 20);
  doc.setFontSize(12);

  let y = 30;
  data.prova.split("\n").forEach(linha => {
    doc.text(linha, 20, y);
    y += 8;
    if (y > 280) { doc.addPage(); y = 20; }
  });

  doc.save(`Prova_Turma_${turma}.pdf`);
  document.getElementById("resultado").textContent = "PDF gerado com sucesso!";
}
window.gerarPDFProva = gerarPDFProva;

async function adicionarEvento() {
  const evento = document.getElementById("evento").value;
  const dataEvento = document.getElementById("dataEvento").value;
  const data = await postJSON("/adicionar-evento", { evento, data: dataEvento });
  document.getElementById("resultado").textContent = data?.mensagem || "Erro ao adicionar evento.";
}
window.adicionarEvento = adicionarEvento;

async function enviarMensagem() {
  const aluno = document.getElementById("alunoMsg").value;
  const mensagem = document.getElementById("mensagemMsg").value;
  const data = await postJSON("/enviar-mensagem", { aluno, mensagem });
  document.getElementById("resultado").textContent = data?.mensagem || "Erro ao enviar mensagem.";
}
window.enviarMensagem = enviarMensagem;

// ===== BIBLIOTECA INTELIGENTE =====
async function buscarMaterial() {
  const termo = (document.getElementById("materialBusca")?.value || "").trim();
  const disciplina = document.getElementById("disciplinaBiblioteca")?.value || "";
  const ano = document.getElementById("anoBiblioteca")?.value || "";

  const resDiv = document.getElementById("resultado");
  resDiv.style.display = "block";
  resDiv.textContent = "Buscando materiais...";

  try {
    const r = await fetch(API_BASE + "/biblioteca/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termo, disciplina, ano })
    });
    if (!r.ok) throw new Error("Erro HTTP " + r.status);
    const data = await r.json();

    if (data.origem === "banco-local" && Array.isArray(data.itens) && data.itens.length) {
      const linhas = data.itens.map(m => `• ${m.nome} (${m.disciplina} - ${m.ano}) ${m.tipo ? " – " + m.tipo : ""}`).join("\n");
      resDiv.textContent = `Materiais encontrados:\n${linhas}`;
      return;
    }

    if (data.origem === "ia" && Array.isArray(data.itens) && data.itens.length) {
      const linhas = data.itens.map(m => `• ${m.nome} (${m.disciplina} - ${m.ano}) ${m.tipo ? " – " + m.tipo : ""}\n   ${m.descricao || ""}`).join("\n\n");
      resDiv.textContent = `Sugestões de materiais (IA):\n${linhas}`;
      return;
    }

    if (data.origem === "ia" && data.texto) {
      resDiv.textContent = `Sugestões (IA):\n${data.texto}`;
      return;
    }

    resDiv.textContent = "Nenhum material encontrado.";
  } catch (e) {
    resDiv.textContent = "Erro: " + e.message;
  }
}
window.buscarMaterial = buscarMaterial;

async function resumirMaterial() {
  const conteudo = prompt("Cole aqui o texto/descrição a ser resumido:");
  if (!conteudo) return;

  const resDiv = document.getElementById("resultado");
  resDiv.style.display = "block";
  resDiv.textContent = "Gerando resumo...";

  try {
    const r = await fetch(API_BASE + "/biblioteca/resumo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo, publico: "anos iniciais do EF" })
    });
    if (!r.ok) throw new Error("Erro HTTP " + r.status);
    const data = await r.json();
    resDiv.textContent = data?.resumo || "Resumo não gerado.";
  } catch (e) {
    resDiv.textContent = "Erro: " + e.message;
  }
}
window.resumirMaterial = resumirMaterial;

async function gerarTextoBiblioteca() {
  const tema = prompt("Tema (ex: amizade, meio ambiente, frações...)");
  if (!tema) return;

  const disciplina = document.getElementById("disciplinaBiblioteca")?.value || "Português";
  const ano = document.getElementById("anoBiblioteca")?.value || "3º ano";
  const tipo = prompt("Tipo (conto curto, texto informativo, exercícios, interpretação de texto...)", "conto curto") || "conto curto";

  const resDiv = document.getElementById("resultado");
  resDiv.style.display = "block";
  resDiv.textContent = "Gerando conteúdo...";

  try {
    const r = await fetch(API_BASE + "/biblioteca/gerar-texto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema, disciplina, ano, tipo })
    });
    if (!r.ok) throw new Error("Erro HTTP " + r.status);
    const data = await r.json();
    resDiv.textContent = data?.texto || "Não foi possível gerar o conteúdo.";
  } catch (e) {
    resDiv.textContent = "Erro: " + e.message;
  }
}
window.gerarTextoBiblioteca = gerarTextoBiblioteca;

async function exportarExcel() {
  const resDiv = document.getElementById("resultado");
  resDiv.style.display = "block";
  resDiv.textContent = "Gerando Excel...";
  try {
    const r = await fetch(API_BASE + "/exportar-excel", { method: "GET" });
    if (!r.ok) throw new Error("Falha ao gerar Excel");
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "turmas.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    resDiv.textContent = "Excel gerado com sucesso!";
  } catch (e) {
    resDiv.textContent = "Erro: " + e.message;
  }
}
window.exportarExcel = exportarExcel;
