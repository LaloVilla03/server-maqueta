// app.js
// https://maqueta-717456051179.us-central1.run.app
const express = require('express');
const mongoose = require('mongoose');
const mqtt = require('mqtt');
const http = require('http');

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);

const uri = "mongodb+srv://lalovive03:OQWZrrv87JugkVEG@cluster0.gv1iw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

app.set('port', process.env.PORT || 3000);

// Middleware para parsing de JSON
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB Atlas'))
  .catch(err => console.error('Error conectando a MongoDB', err));

// Definir esquema y modelo
const parkingSchema = new mongoose.Schema({
  entrada_numero_cajon: String,
  salida_numero_cajon: String
});

const Evento = mongoose.model('eventos', parkingSchema);

// Configuración del cliente MQTT
const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');

mqttClient.on('connect', () => {
  console.log('Conectado a MQTT');
  mqttClient.subscribe('maqueta/mongo', (err) => {
    if (err) {
      console.error('Error al suscribirse al tópico', err);
    } else {
      console.log('Suscrito al tópico maqueta/mongo');
    }
  });
});

// Recibir mensajes MQTT en el tópico "maqueta/mongo"
mqttClient.on('message', async (topic, message) => {
  if (topic === 'maqueta/mongo') {
    try {
      const data = JSON.parse(message.toString());
      const { entrada_numero_cajon, salida_numero_cajon } = data;

      // Crear y almacenar un nuevo documento en MongoDB
      const newEvento = new Evento({ entrada_numero_cajon, salida_numero_cajon });
      await newEvento.save();
      console.log('Evento almacenado en MongoDB:', newEvento);
    } catch (error) {
      console.error('Error procesando el mensaje MQTT o guardando en MongoDB:', error);
    }
  }
});

// Agregar un nuevo documento
app.post('/eventos', async (req, res) => {
  const entrada_numero_cajon = req.body.entrada;
  const salida_numero_cajon = req.body.salida;

  try {
    const newEvento = new Evento({ entrada_numero_cajon, salida_numero_cajon });
    await newEvento.save();
    res.status(201).json({ message: 'Evento agregado', item: newEvento });
  } catch (err) {
    res.status(500).json({ message: 'Error al agregar evento', error: err });
  }
});

// Editar un documento existente
app.put('/eventos/:id', async (req, res) => {
  const { id } = req.params;
  const entrada_numero_cajon = req.body.entrada;
  const salida_numero_cajon = req.body.salida;

  try {
    const updatedEvento = await Evento.findByIdAndUpdate(id, { entrada_numero_cajon, salida_numero_cajon }, { new: true });
    if (!updatedEvento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    res.status(200).json({ message: 'Evento actualizado', evento: updatedEvento });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar evento', error: err });
  }
});

// Eliminar un documento
app.delete('/eventos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEvento = await Evento.findByIdAndDelete(id);
    if (!deletedEvento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }
    res.status(200).json({ message: 'Evento eliminado', evento: deletedEvento });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar evento', error: err });
  }
});

// Iniciar servidor
// app.listen(port, () => {
//   console.log(`Servidor corriendo en http://localhost:${port}`);
// });

server.listen(app.get('port'), () => {
  console.log('Server on port', app.get('port'));
});
