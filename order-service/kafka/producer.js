const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'order-service',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function produceOrderCreated(order) {
    try {
        await producer.connect();

        await producer.send({
            topic: 'order.created',
            messages: [
                {
                    key: order.orderId,
                    value: JSON.stringify(order)
                }
            ]
        });

        console.log(`✅ Événement produit: order.created pour ${order.orderId}`);
        await producer.disconnect();
    } catch (error) {
        console.error('❌ Erreur Kafka producer:', error);
    }
}

module.exports = { produceOrderCreated };