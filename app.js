require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const { urlencoded } = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

const PORT = process.env.PORT || 3000;
//var host = "127.0.0.1";

mongoose.set('strictQuery', false);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

// utilizamos ejs como motor de visualizacion.
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// base de datos "todolistDB", true.
// mongoose.connect(`mongodb://${host}:27017/todolistDB`, { useNewUrlParser: true }); db -> local
//mongoose.connect(`mongodb+srv://dbadmin:Test123@cluster0.jtiicuq.mongodb.net/todolistDB`, { useNewUrlParser: true }); // db -> atlas

// esquema item generado.
const itemsSchema = new mongoose.Schema({
    name: {
        //validaciones
        type: String,
        require: [true, "Please insert a name."]
    }
});

// modelo de item generado.
const Item = mongoose.model("Item", itemsSchema);

// primer item generado.
const item1 = new Item({
    name: "Welcome to your todolist!"
});
// segundo item generado.
const item2 = new Item({
    name: "Hit the + button to add a new item."
});
// tercero item generado.
const item3 = new Item({
    name: "<--Hit this to delete an item."
});

// agregamos los items a un array.
const defaultItems = [item1, item2, item3];

// esquema de listas.
const listSchema = new mongoose.Schema({
    name: {
        //validaciones
        type: String,
        require: [true, "Please insert a name."]
    },
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

// solicitudes
app.get("/", (req, res) => {
    Item.find({}) // encuentro todos los documentos.
        .then((foundItems) => { // obtenemos el array.
            if (foundItems.length === 0) { // analisamos si el array esta vacio.
                // array defaultItems insertado a nuestra DB.
                Item.insertMany(defaultItems).then(() => {
                    console.log("Data inserted"); // Success
                }).catch((err) => {
                    console.log(err); // Failure
                });
                res.redirect("/");// redireccionar una vez terminado insertMany.
            } else {
                res.render("list", { listTitle: "Today", newItems: foundItems });
            }
        }).catch((err) => {
            console.log(err);
        });
});

app.get('/list/:customListName', (req, res) => {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({ name: customListName })
        .then(function (foundList) {
            if (!foundList) {
                const list = new List({
                    name: customListName,
                    items: defaultItems,
                });
                list.save();
                res.redirect("/" + customListName);
            } else {
                res.render("list", {
                    listTitle: foundList.name,
                    newItems: foundList.items,
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
})

app.post("/", (req, res) => {
    const itemName = req.body.newItem; // tomamos el dato ingresado en el input newItem.
    const listName = req.body.list; // tomamos el valor de la lista renderizada.

    const item = new Item({
        name: itemName
    })

    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else {
        List.findOne({ name: listName })
            .then((foundList) => {
                foundList.items.push(item);
                foundList.save();
                res.redirect(`/list/${listName}`);
            });
    }


});

app.post("/delete", (req, res) => {
    const itemId = req.body.delete;
    const listName = req.body.listName;

    if (listName === "Today") {
        Item.findByIdAndRemove(itemId)
            .then(function () {
                console.log(`Succesfully deleted.`);
                res.redirect("/");
            })
            .catch(function (err) {
                console.log(err);
            })
    } else {
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: itemId } } })
            .then(() => {
                res.redirect(`/list/${listName}`);
            })
            .catch((err) => {
                console.log(err);
            });
    }



});

connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}.`));
})



/* Seccion de URL Resuelta.
    Hay varias formas de evitar esto:

    Su ruta comodín primero puede verificar req.urlo req.params.listRoutever si es algo que debe ignorar.

    Puede colocar otras rutas de nivel superior que desee mantener fuera de su ruta comodín en una posición anterior a esta ruta para que no terminen en esta.

    No utilice una ruta comodín de nivel superior. En su lugar, use algo como /list/:listRoutepara que no coincida automáticamente con ninguna solicitud http de nivel superior. Su uso de una ruta comodín de nivel superior interfiere con otros usos futuros de su sitio y puede crear compatibilidad con versiones anteriores cuando desee agregar otras rutas de nivel superior a su sitio. Imagínese si en algún momento en el futuro desea agregar /contacto /logino /logout. Todos ellos entran en conflicto con /:listRoute.
*/