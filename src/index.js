const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const serviceName = "backend"

const app = express();
app.use(express.json());

let newPort = null

const register = async function(){
    try {
        await axios.post(config.url_register, {
            name: serviceName,
            host: "localhost",
            port: newPort
        });
        console.log(`Registered ${serviceName}`)
    } catch (err) {
        console.error(`Failed to register ${serviceName}: ${err.message}`);
        setTimeout(register, 10*1000)
    }
}

getPort.default({ 
    port: getPort.portNumbers(config.port_range.min, config.port_range.max) }
).then((port)=>{
    newPort = port
    
    const healthRouter = require('./controllers/health.js')
    app.use(`/${serviceName}/health`, healthRouter)

    const authRouter = require('./controllers/auth.js')
    app.use(`/${serviceName}/auth`, authRouter)

    app.listen(port, async () => {
        console.log(`${serviceName} listening on port ${port}`)
        await register()
    });

})

