const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const serviceName = "backend"

const app = express();
app.use(express.json());


getPort.default({ 
    port: getPort.portNumbers(config.port_range.min, config.port_range.max) }
).then((newPort)=>{
    
    const healthRouter = require('./controllers/health.js');
    app.use('/health', healthRouter);

    app.listen(newPort, async () => {
        console.log(`${serviceName} listening on port ${newPort}`);
        try {
            await axios.post(config.url_register, {
                name: serviceName,
                host: "localhost",
                port: newPort
            });
            console.log(`Registered ${serviceName}`);
        } catch (err) {
            console.error(`Failed to register ${serviceName}: ${err.message}`);
        }
    });


})

