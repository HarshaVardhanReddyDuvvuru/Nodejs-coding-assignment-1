const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, isValid } = require("date-fns");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const validateDueDate = (date) => {
  if (date !== undefined) {
    const dateArray = date.split("-");
    if (
      dateArray.length === 3 &&
      dateArray[0].length === 4 &&
      parseInt(dateArray[1]) <= 12 &&
      parseInt(dateArray[1]) >= 1 &&
      parseInt(dateArray[2]) <= 31 &&
      parseInt(dateArray[2]) >= 1
    ) {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      if (isValid(new Date(formattedDate))) {
        return formattedDate;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
};

const categoryList = ["WORK", "HOME", "LEARNING"];
const statusList = ["TO DO", "IN PROGRESS", "DONE"];
const priorityList = ["LOW", "HIGH", "MEDIUM"];

const validateQueryInput = (request, response, next) => {
  const { status, priority, category, date } = request.query;
  if (status !== undefined && !statusList.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priority !== undefined && !priorityList.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (category !== undefined && !categoryList.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};

const validateBodyInput = (request, response, next) => {
  const { status, priority, category, dueDate } = request.body;
  if (status !== undefined && !statusList.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priority !== undefined && !priorityList.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (category !== undefined && !categoryList.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};

const dbResponseToNormalResponse = (obj) => ({
  id: obj.id,
  todo: obj.todo,
  priority: obj.priority,
  category: obj.category,
  status: obj.status,
  dueDate: obj.due_date,
});

// get todos API

app.get("/todos/", validateQueryInput, async (request, response) => {
  const { status, priority, category, search_q = "" } = request.query;
  let searchQuery;
  if (status !== undefined && priority !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            status = '${status}' 
        AND
            priority = '${priority}'
        AND 
            todo Like '%${search_q}%';

    `;
  } else if (status !== undefined && category !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            status = '${status}' 
        AND
            category = '${category}'
        AND 
            todo Like '%${search_q}%';

    `;
  } else if (priority !== undefined && category !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            priority = '${priority}' 
        AND
            category = '${category}'
        AND 
            todo Like '%${search_q}%';

    `;
  } else if (status !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            status = '${status}' 
        AND 
            todo Like '%${search_q}%';

    `;
  } else if (priority !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            priority = '${priority}' 
        AND 
            todo Like '%${search_q}%';

    `;
  } else if (category !== undefined) {
    searchQuery = `
        SELECT * FROM todo
        WHERE 
            category = '${category}' 
        AND 
            todo Like '%${search_q}%';

    `;
  } else {
    searchQuery = `
        SELECT * FROM todo
        WHERE todo Like '%${search_q}%';

    `;
  }

  const dbResponse = await db.all(searchQuery);
  const todoList = dbResponse.map((obj) => dbResponseToNormalResponse(obj));
  response.send(todoList);
});

// Get todo single todo

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const selectTodoQuery = `
        SELECT * FROM todo
        WHERE id = ${todoId}
    `;
  const dbResponse = await db.get(selectTodoQuery);
  const todoItem = dbResponseToNormalResponse(dbResponse);
  response.send(todoItem);
});

// get agenda by using dueDate

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const isDateValid = validateDueDate(date);
  if (isDateValid !== undefined) {
    const selectAgendaQuery = `
        SELECT * from todo
        WHERE due_date = '${String(isDateValid)}';

    `;
    const dbResponse = await db.all(selectAgendaQuery);
    const todoList = dbResponse.map((obj) => dbResponseToNormalResponse(obj));
    response.send(todoList);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// Creating new todoItem

app.post("/todos/", validateBodyInput, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const isDateValid = validateDueDate(dueDate);
  if (isDateValid !== undefined) {
    const createTodoQuery = `
    INSERT INTO todo( id, todo, priority, status, category, due_date)
    VALUES(
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${isDateValid}'
    )
  `;

    await db.run(createTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// Update todoItem

app.put("/todos/:todoId/", validateBodyInput, async (request, response) => {
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = request.body;
  let updateQuery;
  let updateText;
  if (todo !== undefined) {
    updateText = "Todo";
    updateQuery = `
        UPDATE todo
        SET todo = '${todo}'
        WHERE id = ${todoId};
      `;
  } else if (status !== undefined) {
    updateText = "Status";
    updateQuery = `
        UPDATE todo
        SET status = '${status}'
        WHERE id = ${todoId};
      `;
  } else if (priority !== undefined) {
    updateText = "Priority";
    updateQuery = `
        UPDATE todo
        SET priority = '${priority}'
        WHERE id = ${todoId};
      `;
  } else if (category !== undefined) {
    updateText = "Category";
    updateQuery = `
        UPDATE todo
        SET category = '${category}'
        WHERE id = ${todoId};
      `;
  } else {
    const isDateValid = validateDueDate(dueDate);
    if (isDateValid !== undefined) {
      updateText = "Due Date";
      const formattedDate = isDateValid;
      updateQuery = `
        UPDATE todo
        SET due_date = '${isDateValid}'
        WHERE id = ${todoId};
      `;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  await db.run(updateQuery);
  response.send(`${updateText} Updated`);
});

// Delete todoItem

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo
        WHERE id = ${todoId}
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
