const {createService} = require("./quote-service")

const app = createService()


app.listen(5000, ()=>{
    console.log("App running on http://localhost:5000");
})