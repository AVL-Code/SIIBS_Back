const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const app = express();

app.use(helmet()); 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API do Instituto Brantz Social rodando!');
});

// Rota do CRUD de Cursos
app.use('/courses', require('./routes/CourseRoute'))

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});