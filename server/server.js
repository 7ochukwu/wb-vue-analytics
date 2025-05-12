const express = require('express');
//const cors = require('cors');
const path = require('path')

const publicPath = path.join(__dirname, '../public')
const port = process.env.PORT || 3000

const app = express();

app.use(express.static(publicPath))


//app.use(cors()); // Разрешить все запросы CORS

// Ваш код обработки запросов

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${[port]}`);
});
