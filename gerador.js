// ============================================================
// GERADOR DO BANCO DE DADOS DA BÍBLIA PARA TERMUX
// ============================================================
// Como usar:
// 1. Coloque o arquivo biblia.txt na mesma pasta
// 2. Execute: node gerar-biblia.js
// 3. Será gerado o arquivo biblia-data.js
// ============================================================

const fs = require('fs');
const path = require('path');

// Cores para o terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.blue}`);
console.log('╔═══════════════════════════════════════════════╗');
console.log('║   📖 GERADOR DA BÍBLIA COMPLETA             ║');
console.log('║   Criando banco de dados para o app         ║');
console.log('╚═══════════════════════════════════════════════╝');
console.log(`${colors.reset}\n`);

// Verifica se o arquivo biblia.txt existe
const arquivoBiblia = 'biblia.txt';
if (!fs.existsSync(arquivoBiblia)) {
    console.log(`${colors.red}❌ ERRO: Arquivo "${arquivoBiblia}" não encontrado!${colors.reset}`);
    console.log(`${colors.yellow}📌 Coloque o arquivo biblia.txt na mesma pasta.${colors.reset}`);
    process.exit(1);
}

console.log(`${colors.green}✅ Arquivo biblia.txt encontrado!${colors.reset}\n`);

// Lê o arquivo da Bíblia
console.log(`${colors.cyan}📂 Lendo arquivo...${colors.reset}`);
const texto = fs.readFileSync(arquivoBiblia, 'utf8');
console.log(`${colors.green}✅ Arquivo lido (${(texto.length / 1024 / 1024).toFixed(2)} MB)${colors.reset}\n`);

// ============================================================
// PARSER DA BÍBLIA
// ============================================================
function parseBiblia(texto) {
    console.log(`${colors.cyan}🔍 Parseando a Bíblia...${colors.reset}`);
    
    const linhas = texto.split('\n');
    const livros = {};
    let livroAtual = '';
    let capituloAtual = 0;
    let versiculosDoCapitulo = [];
    let inLivro = false;
    let totalVersiculos = 0;
    let totalCapitulos = 0;

    // Expressões regulares
    const livroRegex = /^([A-ZÀ-Ú][A-ZÀ-Ú\s]+)$/;
    const capituloRegex = /^([A-ZÀ-Ú][A-ZÀ-Ú\s]+)\s+(\d+)$/;
    const versiculoRegex = /^(\d+)\s+(.+)$/;

    let linhaNum = 0;
    for (let linha of linhas) {
        linhaNum++;
        linha = linha.trim();
        if (!linha) continue;

        // Verifica se é um livro (apenas letras maiúsculas)
        const livroMatch = linha.match(livroRegex);
        if (livroMatch && !linha.includes('Capítulo') && !linha.includes('capítulo')) {
            const testCapitulo = linha.match(capituloRegex);
            if (!testCapitulo) {
                // Salva capítulo anterior
                if (livroAtual && versiculosDoCapitulo.length > 0) {
                    if (!livros[livroAtual]) livros[livroAtual] = [];
                    livros[livroAtual].push(versiculosDoCapitulo);
                    totalCapitulos++;
                    totalVersiculos += versiculosDoCapitulo.length;
                    versiculosDoCapitulo = [];
                }
                livroAtual = livroMatch[1];
                inLivro = true;
                continue;
            }
        }

        // Verifica se é capítulo (ex: "GÊNESIS 1")
        const capituloMatch = linha.match(capituloRegex);
        if (capituloMatch && inLivro) {
            // Salva capítulo anterior
            if (livroAtual && versiculosDoCapitulo.length > 0) {
                if (!livros[livroAtual]) livros[livroAtual] = [];
                livros[livroAtual].push(versiculosDoCapitulo);
                totalCapitulos++;
                totalVersiculos += versiculosDoCapitulo.length;
                versiculosDoCapitulo = [];
            }
            const livro = capituloMatch[1];
            const capitulo = parseInt(capituloMatch[2]);
            if (livro !== livroAtual) {
                livroAtual = livro;
            }
            capituloAtual = capitulo;
            continue;
        }

        // Verifica se é versículo
        const versiculoMatch = linha.match(versiculoRegex);
        if (versiculoMatch && inLivro && livroAtual && capituloAtual > 0) {
            const textoVersiculo = versiculoMatch[2];
            versiculosDoCapitulo.push(textoVersiculo);
        }
    }

    // Salva último capítulo
    if (livroAtual && versiculosDoCapitulo.length > 0) {
        if (!livros[livroAtual]) livros[livroAtual] = [];
        livros[livroAtual].push(versiculosDoCapitulo);
        totalCapitulos++;
        totalVersiculos += versiculosDoCapitulo.length;
    }

    return { livros, totalLivros: Object.keys(livros).length, totalCapitulos, totalVersiculos };
}

// ============================================================
// GERAR ARQUIVO JAVASCRIPT
// ============================================================
function gerarArquivoJS(livros, stats) {
    console.log(`${colors.cyan}💾 Gerando arquivo JavaScript...${colors.reset}`);
    
    const livrosArray = Object.keys(livros);
    let output = `// ============================================================\n`;
    output += `// BÍBLIA SAGRADA - DADOS COMPLETOS\n`;
    output += `// Gerado automaticamente em ${new Date().toLocaleString()}\n`;
    output += `// Estatísticas: ${stats.totalLivros} livros, ${stats.totalCapitulos} capítulos, ${stats.totalVersiculos} versículos\n`;
    output += `// ============================================================\n\n`;
    output += `const BIBLE_DATA = {\n`;

    let livroCount = 0;
    for (const [nome, capitulos] of Object.entries(livros)) {
        livroCount++;
        output += `  "${nome}": [\n`;
        let capCount = 0;
        for (const capitulo of capitulos) {
            capCount++;
            output += `    // Capítulo ${capCount}\n`;
            output += `    [\n`;
            let verCount = 0;
            for (const versiculo of capitulo) {
                verCount++;
                const escaped = versiculo.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
                output += `      "${escaped}",\n`;
            }
            output += `    ],\n`;
        }
        output += `  ],\n`;
        
        // Progresso
        const percent = Math.round((livroCount / stats.totalLivros) * 100);
        process.stdout.write(`\r${colors.yellow}📊 Progresso: ${percent}% (${livroCount}/${stats.totalLivros} livros)${colors.reset}`);
    }
    console.log(''); // Nova linha após o progresso

    output += `};\n\n`;
    output += `// Lista de livros\n`;
    output += `const BOOKS = ${JSON.stringify(livrosArray, null, 2)};\n\n`;
    output += `// Exportar para uso no navegador e Node.js\n`;
    output += `if (typeof module !== 'undefined' && module.exports) {\n`;
    output += `  module.exports = { BIBLE_DATA, BOOKS };\n`;
    output += `}\n`;

    return output;
}

// ============================================================
// SALVAR ARQUIVO
// ============================================================
function salvarArquivo(conteudo, nomeArquivo) {
    console.log(`\n${colors.cyan}💾 Salvando arquivo...${colors.reset}`);
    fs.writeFileSync(nomeArquivo, conteudo, 'utf8');
    const stats = fs.statSync(nomeArquivo);
    console.log(`${colors.green}✅ Arquivo salvo: ${nomeArquivo}${colors.reset}`);
    console.log(`${colors.blue}📁 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB${colors.reset}`);
}

// ============================================================
// FUNÇÃO PARA COMPRIMIR (OPCIONAL)
// ============================================================
function comprimirArquivo(nomeArquivo) {
    try {
        console.log(`${colors.cyan}🗜️ Comprimindo arquivo...${colors.reset}`);
        const conteudo = fs.readFileSync(nomeArquivo, 'utf8');
        
        // Remove comentários e espaços extras
        let comprimido = conteudo
            .replace(/\/\/.*$/gm, '') // Remove comentários de linha
            .replace(/\s+/g, ' ') // Remove espaços extras
            .replace(/,\s*]/g, ']') // Remove vírgulas antes de colchetes
            .replace(/,\s*}/g, '}') // Remove vírgulas antes de chaves
            .trim();
        
        const nomeComprimido = nomeArquivo.replace('.js', '.min.js');
        fs.writeFileSync(nomeComprimido, comprimido, 'utf8');
        const stats = fs.statSync(nomeComprimido);
        console.log(`${colors.green}✅ Versão comprimida: ${nomeComprimido} (${(stats.size / 1024 / 1024).toFixed(2)} MB)${colors.reset}`);
    } catch (err) {
        console.log(`${colors.yellow}⚠️ Não foi possível comprimir: ${err.message}${colors.reset}`);
    }
}

// ============================================================
// MAIN
// ============================================================
try {
    // Parse da Bíblia
    const resultado = parseBiblia(texto);
    const { livros, totalLivros, totalCapitulos, totalVersiculos } = resultado;

    console.log(`\n${colors.green}✅ Parse concluído!${colors.reset}`);
    console.log(`${colors.blue}📊 Estatísticas:`);
    console.log(`   - Livros: ${totalLivros}`);
    console.log(`   - Capítulos: ${totalCapitulos}`);
    console.log(`   - Versículos: ${totalVersiculos}${colors.reset}\n`);

    // Gera o arquivo
    const stats = { totalLivros, totalCapitulos, totalVersiculos };
    const conteudo = gerarArquivoJS(livros, stats);

    // Salva o arquivo principal
    salvarArquivo(conteudo, 'biblia-data.js');

    // Cria uma versão compacta (opcional)
    comprimirArquivo('biblia-data.js');

    // Gera um arquivo de metadados
    const metadados = {
        gerado_em: new Date().toISOString(),
        total_livros: totalLivros,
        total_capitulos: totalCapitulos,
        total_versiculos: totalVersiculos,
        livros: Object.keys(livros)
    };
    fs.writeFileSync('biblia-metadata.json', JSON.stringify(metadados, null, 2), 'utf8');
    console.log(`${colors.green}✅ Metadados salvos: biblia-metadata.json${colors.reset}`);

    console.log(`\n${colors.bright}${colors.green}🎯 SUCESSO! Banco de dados gerado com sucesso!${colors.reset}`);
    console.log(`${colors.cyan}📁 Arquivos gerados:`);
    console.log(`   - biblia-data.js (dados completos)`);
    console.log(`   - biblia-data.min.js (versão comprimida)`);
    console.log(`   - biblia-metadata.json (informações)${colors.reset}`);
    console.log(`\n${colors.yellow}💡 Agora copie o conteúdo de biblia-data.js para o index.html${colors.reset}`);

} catch (err) {
    console.log(`\n${colors.red}❌ ERRO: ${err.message}${colors.reset}`);
    console.log(err.stack);
    process.exit(1);
}