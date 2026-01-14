// o prisma usa uma pool de conxões
// se você rodar um comando para setar o id do usuario e depois outro para salvar o aluno,
// o prisma pode usar conexões diferentes e o log vai sair sem autor.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * * @param {string} userId - o id do usuário logado 
 * @param {function} action - Uma função que recebe 'tx' para fazer as queries
 */
async function dbAuthAction(userId, action) {
  return prisma.$transaction(async (tx) => {
    
    // injeta o id do usuario na sessão do bd
    // Se userId for nulo ou indefinido, usa uma string vazia ou trata o erro
    if (!userId) {
       console.warn("Aviso: dbAuthAction chamado sem userId. O log ficará sem autor.");
    }
    
    // o comando sql que avisa o banco quem ta mexendo
    await tx.$executeRawUnsafe(`SET app.current_user_id = '${userId || ''}';`);

    // executa a ação que você pediu 
    return await action(tx);
  });
}

// exporta para usar em outros arquivos
module.exports = { prisma, dbAuthAction };

// Um exemplo pro brn usar:

// // importa a função
// const { dbAuthAction } = require('./src/lib/database'); // ajuste o caminho se precisa

// // exemplo: funçao para matricular um aluno
// async function matricularAluno(req, res) {
//   const dados = req.body;
//   const usuarioId = "id-do-usuario-logado-aqui"; // Pega do req.user ou token

//   try {
//     // aqui é o uso da dfunção la de cima
//     const novaMatricula = await dbAuthAction(usuarioId, async (tx) => {
      
//       // Aqui usamos 'tx' ao inves de 'prisma' aqui dentro
//       const resultado = await tx.enrollments.create({
//         data: {
//           student_id: dados.studentId,
//           class_id: dados.classId,
//           status: 'ACTIVE'
//         }
//       });
      
//       return resultado;
//     });

//     res.json(novaMatricula);

//   } catch (erro) {
//     console.error(erro);
//     res.status(500).json({ erro: "Erro ao matricular" });
//   }
// }