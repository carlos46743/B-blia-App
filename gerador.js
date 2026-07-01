// ============================================================
// GERADOR DO BANCO DE DADOS DA BÍBLIA
// ============================================================
// Como usar:
// 1. Coloque o arquivo biblia.txt na mesma pasta
// 2. Execute: node gerador.js
// 3. Será gerado o arquivo biblia-data.js com a Bíblia completa
// ============================================================

const fs = require('fs');
const path = require('path');

// ============================================================
// FUNÇÕES PRINCIPAIS
// ============================================================

// Lê o arquivo da Bíblia
function lerBiblia() {
    try {
        const texto = fs.readFileSync('biblia.txt', 'utf8');
        return texto;
    } catch (err) {
        console.error('❌ Erro ao ler biblia.txt:', err.message);
        console.log('📌 Certifique-se que o arquivo "biblia.txt" está na mesma pasta.');
        process.exit(1);
    }
}

// Parser da Bíblia - reconhece o formato:
// LIVRO (ex: GÊNESIS)
// LIVRO CAPÍTULO (ex: GÊNESIS 1)
// NÚMERO TEXTO (ex: 1 No princípio criou Deus...)
function parseBiblia(texto) {
    const linhas = texto.split('\n');
    const livros = {};
    let livroAtual = '';
    let capituloAtual = 0;
    let versiculosDoCapitulo = [];
    let inLivro = false;

    // Expressões regulares
    const livroRegex = /^([A-ZÀ-Ú][A-ZÀ-Ú\s]+)$/;
    const capituloRegex = /^([A-ZÀ-Ú][A-ZÀ-Ú\s]+)\s+(\d+)$/;
    const versiculoRegex = /^(\d+)\s+(.+)$/;

    for (let linha of linhas) {
        linha = linha.trim();
        if (!linha) continue;

        // Verifica se é um livro (apenas letras maiúsculas)
        const livroMatch = linha.match(livroRegex);
        if (livroMatch && !linha.includes('Capítulo') && !linha.includes('capítulo')) {
            // Testa se não é um capítulo (ex: "GÊNESIS 1")
            const testCapitulo = linha.match(capituloRegex);
            if (!testCapitulo) {
                // Salva capítulo anterior
                if (livroAtual && versiculosDoCapitulo.length > 0) {
                    if (!livros[livroAtual]) livros[livroAtual] = [];
                    livros[livroAtual].push(versiculosDoCapitulo);
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
                versiculosDoCapitulo = [];
            }
            const livro = capituloMatch[1];
            const capitulo = parseInt(capituloMatch[2]);
            // Atualiza livro se mudou
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
    }

    return livros;
}

// Gera o arquivo JavaScript
function gerarArquivoJS(livros) {
    const livrosArray = Object.keys(livros);
    const dataAtual = new Date().toLocaleString('pt-BR');
    
    let output = `// ============================================================\n`;
    output += `// BÍBLIA SAGRADA - DADOS COMPLETOS\n`;
    output += `// Gerado automaticamente em ${dataAtual}\n`;
    output += `// Total: ${livrosArray.length} livros\n`;
    output += `// ============================================================\n\n`;
    output += `const BIBLE_DATA = {\n`;

    let totalChapters = 0;
    let totalVerses = 0;

    for (const [nome, capitulos] of Object.entries(livros)) {
        totalChapters += capitulos.length;
        for (const capitulo of capitulos) {
            totalVerses += capitulo.length;
        }
        
        output += `  "${nome}": [\n`;
        for (const capitulo of capitulos) {
            output += `    [\n`;
            for (const versiculo of capitulo) {
                // Escapa aspas duplas
                const escaped = versiculo.replace(/"/g, '\\"');
                output += `      "${escaped}",\n`;
            }
            output += `    ],\n`;
        }
        output += `  ],\n`;
    }

    output += `};\n\n`;
    output += `// Lista de livros\n`;
    output += `const BOOKS = ${JSON.stringify(livrosArray, null, 2)};\n\n`;
    output += `// Estatísticas\n`;
    output += `console.log(\`✅ Bíblia carregada: \${BOOKS.length} livros, ${totalChapters} capítulos, ${totalVerses} versículos\`);\n\n`;
    output += `// Exportar para uso no Node.js\n`;
    output += `if (typeof module !== 'undefined' && module.exports) {\n`;
    output += `  module.exports = { BIBLE_DATA, BOOKS };\n`;
    output += `}\n`;

    return output;
}

// Gera versão minificada (opcional)
function gerarArquivoMinificado(livros) {
    let output = `const BIBLE_DATA={`;
    let firstBook = true;
    
    for (const [nome, capitulos] of Object.entries(livros)) {
        if (!firstBook) output += `,`;
        firstBook = false;
        output += `"${nome}":[`;
        let firstChapter = true;
        for (const capitulo of capitulos) {
            if (!firstChapter) output += `,`;
            firstChapter = false;
            output += `[`;
            let firstVerse = true;
            for (const versiculo of capitulo) {
                if (!firstVerse) output += `,`;
                firstVerse = false;
                const escaped = versiculo.replace(/"/g, '\\"');
                output += `"${escaped}"`;
            }
            output += `]`;
        }
        output += `]`;
    }
    output += `};const BOOKS=Object.keys(BIBLE_DATA);`;
    output += `if(typeof module!=='undefined'&&module.exports){module.exports={BIBLE_DATA,BOOKS};}`;
    
    return output;
}

// ============================================================
// MAIN
// ============================================================
console.log('📖 GERADOR DO BANCO DE DADOS DA BÍBLIA');
console.log('========================================\n');

// Verifica se o arquivo existe
if (!fs.existsSync('biblia.txt')) {
    console.error('❌ Arquivo biblia.txt não encontrado!');
    console.log('📌 Coloque o arquivo "biblia.txt" na mesma pasta deste script.');
    process.exit(1);
}

console.log('📂 Lendo arquivo biblia.txt...');
const texto = lerBiblia();

console.log('🔍 Parseando a Bíblia...');
const livros = parseBiblia(texto);

const totalLivros = Object.keys(livros).length;
let totalCapitulos = 0;
let totalVersiculos = 0;

for (const [nome, capitulos] of Object.entries(livros)) {
    totalCapitulos += capitulos.length;
    for (const capitulo of capitulos) {
        totalVersiculos += capitulo.length;
    }
}

console.log('\n📊 ESTATÍSTICAS:');
console.log(`   📖 Livros: ${totalLivros}`);
console.log(`   📑 Capítulos: ${totalCapitulos}`);
console.log(`   📝 Versículos: ${totalVersiculos}`);

// Verifica se encontrou dados
if (totalLivros === 0 || totalVersiculos === 0) {
    console.error('\n❌ Nenhum dado foi encontrado!');
    console.log('📌 Verifique o formato do arquivo biblia.txt:');
    console.log('   - Cada livro deve estar em MAIÚSCULAS (ex: GÊNESIS)');
    console.log('   - Capítulos no formato: LIVRO NÚMERO (ex: GÊNESIS 1)');
    console.log('   - Versículos no formato: NÚMERO TEXTO (ex: 1 No princípio...)');
    process.exit(1);
}

console.log('\n💾 Gerando arquivo biblia-data.js...');
const output = gerarArquivoJS(livros);
fs.writeFileSync('biblia-data.js', output, 'utf8');

console.log('✅ Arquivo gerado com sucesso: biblia-data.js');
const stats = fs.statSync('biblia-data.js');
console.log(`📁 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

// Gera versão minificada (opcional)
console.log('\n💾 Gerando versão minificada...');
const outputMin = gerarArquivoMinificado(livros);
fs.writeFileSync('biblia-data.min.js', outputMin, 'utf8');
const statsMin = fs.statSync('biblia-data.min.js');
console.log(`📁 Tamanho minificado: ${(statsMin.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   (economia de ${((1 - statsMin.size / stats.size) * 100).toFixed(1)}%)`);

console.log('\n🎯 PRONTO!');
console.log('   📄 biblia-data.js - versão completa');
console.log('   📄 biblia-data.min.js - versão minificada');
console.log('\n📌 Copie o arquivo para a pasta do seu projeto e use no HTML:');
console.log('   <script src="biblia-data.js"></script>');