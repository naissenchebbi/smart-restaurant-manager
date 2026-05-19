const { Kafka } = require('kafkajs');
const db = require('../database');

const kafka = new Kafka({
    clientId: 'kitchen-service',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'kitchen-group' });

async function startConsumer() {
    try {
        await consumer.connect();
        console.log('✅ Kafka Consumer connected');

        await consumer.subscribe({
            topic: 'order.created',
            fromBeginning: true
        });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const order = JSON.parse(message.value.toString());
                console.log(`📨 Commande reçue: ${order.orderId}`);

                // Ajouter à la file d'attente cuisine
                db.run(
                    `INSERT INTO kitchen_queue (order_id, items_json, status, received_at) 
                     VALUES (?, ?, ?, ?)`,
                    [order.orderId, JSON.stringify(order.items), 'pending', new Date().toISOString()],
                    (err) => {
                        if (err) console.error('❌ Erreur insertion:', err);
                        else console.log(`✅ Commande ${order.orderId} ajoutée à la file cuisine`);
                    }
                );
            }
        });
    } catch (error) {
        console.error('❌ Erreur Kafka consumer:', error);
    }
}

module.exports = { startConsumer };