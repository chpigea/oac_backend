const config = require('./config.js');
const express = require("express");
const axios = require("axios");
const getPort = require('get-port');
const cookieParser = require('cookie-parser');
const serviceName = "backend"
const jwtLibFactory = require('@igea/oac_jwt_helpers')
const jwtLib = jwtLibFactory({
    secret: process.env.JWT_SECRET || config.jwt_secret,
    excludePaths: [
        `/${serviceName}/auth/authenticate`,
        `/${serviceName}/auth/password_recovery`,
        `/${serviceName}/auth/echo`,
        `/${serviceName}/users/reset-password`,
        `/${serviceName}/health`,
        `/${serviceName}/fuseki/upload/vocabularies`
    ],
    signOptions: { expiresIn: '15m' }
});

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(jwtLib.middleware);

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

    const authRouter = require('./controllers/auth.js')(jwtLib)
    app.use(`/${serviceName}/auth`, authRouter)

    const usersRouter = require('./controllers/users.js')
    app.use(`/${serviceName}/users`, usersRouter)

    const fusekiRouter = require('./controllers/fuseki.js')
    app.use(`/${serviceName}/fuseki`, fusekiRouter)

    app.listen(port, async () => {
        console.log(`${serviceName} listening on port ${port}`)
        await register()
    });

})

