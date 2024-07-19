const express = require('express');
const cron = require('node-cron');
const admin = require('firebase-admin');
const serviceAccount = require('./config/me365-81633-firebase-adminsdk-mktwk-4412832aff.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const { getMessaging } = require('firebase-admin/messaging');

const app = express();
const db = admin.firestore();

const checkAndSendNotifications = async (collectionName) => {
    try {
        const now = admin.firestore.Timestamp.now();

        const snapshot = await db.collection(collectionName).get();

        const filteredData = snapshot.docs.filter(doc => {
            const data = doc.data();
            const dataTimestamp = data.timeStamp;

            // Calculate the difference in seconds
            const diff = now.seconds - dataTimestamp.seconds;

            // Check if the difference is within one minute (60 seconds)
            return diff <= 60 && diff >= 0;
        });


        filteredData.forEach(async doc => {
            const data = doc.data();

            const payload = {
                notification: {
                    title: 'New' + collectionName,
                    body: data.description
                }
            };

            try {
                const response = await getMessaging().sendToTopic('all', payload);
                console.log('Successfully sent message:', response);
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });
    } catch (error) {
        console.error(`Error in ${collectionName} cron job:`, error);
    }
};

cron.schedule('* * * * *', async () => {
    // console.log('Cron job started at:', new Date().toISOString());
    await checkAndSendNotifications('Dailydata');
    await checkAndSendNotifications('excersises');
});

app.listen(process.env.PORT || 7000, () => {
    console.log('Server is running on port', process.env.PORT || 7000);
});
