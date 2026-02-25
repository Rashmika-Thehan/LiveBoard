import express from 'express';

const app = express();
const PORT = 8000;

app.use(express.json());

app.use('/', (req, res) =>{
    res.send('Hello from the Server!');
})

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});