let database = require("../database").Database;
let update = require("../database").writeJSON;
const fetch = require("node-fetch");
const { calendarData, changeMonth } = require("../views/reminder/scripts/calendar")

let remindersController = {
  // List out all the reminder
  list: (req, res) => {
    res.render("reminder/index", {
      user: req.user,
      reminders: req.user.reminders,
      database: database,
      friendIDs: req.user.friends.friendID,
      calendarData,
    });
  },

  new: (req, res) => {
    res.render("reminder/create");
    // console.log(req.user);
  },

  listOne: (req, res) => {
    // List only one reminder
    const reminderToFind = req.params.id;
    const searchResult = req.user.reminders.find(function (reminder) {
      return reminder.id == reminderToFind;
    });
    if (searchResult != undefined) {
      res.render("reminder/single-reminder", { reminderItem: searchResult });
    } else {
      res.render("reminder/index", {
        user: req.user,
        reminders: req.user.reminders,
        database: database,
        friendIDs: req.user.friends.friendID,
      });
    }
  },

  searchBarResults: (req, res) => {
    // Search for reminder based on its title name
    let searchResultsDatabase = [];
    const userSearchTerm = req.query.search;

    //console.log(`DEBUG: userSearchTerm is: ${userSearchTerm}`);

    for (let i = 0; i < req.user.reminders.length; i++) {
      // if substring found
      if (req.user.reminders[i].title.includes(userSearchTerm)) {
        searchResultsDatabase.push(req.user.reminders[i]);
      }
    }
    res.render("reminder/index", {
      user: req.user,
      reminders: searchResultsDatabase,
      database: database,
      friendIDs: req.user.friends.friendID,
      calendarData,
    });
  },

  // Create a new reminder
  create: async (req, res) => {
    // const tempSubtasks = [];
    const tempSubtasks = req.body.subtasks.split(",");

    let idNum = Number(1);
    if (req.user.reminders.length != 0) {
      idNum = Number(req.user.reminders[req.user.reminders.length - 1].id) + 1;
    }
    const reminder = {
      id: idNum,
      title: req.body.title,
      description: req.body.description,
      importance: false,
      image_url: "",
      tags: req.body.tags,
      subtasks: tempSubtasks,
      date: req.body.date.replace("T", " "),
    };
    //console.log(`DEBUG create tempSubtasks is: ${tempSubtasks}`)
    //console.log(typeof tempSubtasks);

    // Use Unsplash API to fetch images for reminders
    const client_id = process.env.Unsplash_CLIENT_ID;
    const photos = await fetch(
      `https://api.unsplash.com/photos/random?query=${reminder.title}&client_id=${client_id}`
    );

    const parsedPhotos = await photos.json();

    if ("errors" in parsedPhotos) {
      console.log("ERROR: Cannot find image!");
      reminder.image_url = "/Reminder.svg";
      req.user.reminders.push(reminder);
    } else {
      // Save the URL into reminder object
      reminder.image_url = parsedPhotos.urls.regular;

      req.user.reminders.push(reminder);
    }
    update()
    res.redirect("/reminders");
  },

  // Edit a specific reminder
  edit: (req, res) => {
    const reminderToFind = req.params.id;
    const searchResult = req.user.reminders.find(function (reminder) {
      return reminder.id == reminderToFind;
    });
    // update()   // not necessary
    res.render("reminder/edit", { reminderItem: searchResult });
  },

  // Update a specific reminder
  update: (req, res) => {
    // Loop through all reminders and update the correct one (id)
    const tempSubtasks = req.body.subtasks.split(",");
    req.user.reminders.forEach((reminder) => {
      if (String(reminder.id) === req.params.id) {
        reminder.title = req.body.title;
        reminder.description = req.body.description;
        reminder.importance = req.body.importance == "true";
        reminder.tags = req.body.tags;
        reminder.subtasks = tempSubtasks;
        reminder.date = req.body.date.replace("T", " ");
      }
      // console.log(`DEBUG update tempSubtasks is: ${tempSubtasks}`)
      // console.log(typeof tempSubtasks);
    });
    update()
    res.redirect("/reminder/" + req.params.id);
  },

  // Delete reminder based on reminder's id
  delete: (req, res) => {
    const reminderToFind = req.params.id;

    req.user.reminders.forEach((reminder) => {
      reminder.id = String(reminder.id);
    });

    // Not found by default
    let index = -1;
    for (let i = 0; i < req.user.reminders.length; i++) {
      if (req.user.reminders[i].id === reminderToFind) {
        //console.log(i);
        index = i;
        break;
      }
    }

    const result = req.user.reminders.filter(({ id }) =>
      id.includes(reminderToFind)
    );
    //console.log(result);

    // Remove array element based on index position
    if (index >= 0) {
      req.user.reminders.splice(index, 1);
    }
    update()
    res.redirect("/reminders");
  },

  // Showing friend's reminder on the main page
  listFriends: (req, res) => {
    res.render("reminder/friends", {
      user: req.user,
      database: database,
    });
  },

  listEventOfTheDay: (req, res) => {
    const dateString = req.params.date
    const year = dateString.slice(0,4)
    const month = dateString.slice(4,6)
    const date = dateString.slice(6,8)
    const reminders = req.user.reminders

    const reminderOfTheDay = reminders.filter((reminder) => {
      let reminderDate = new Date(reminder.date)
      let dateStrTokens = reminderDate.toLocaleString('en-GB', {dateStyle: "short"}).split('/')
      let reminderDateString = dateStrTokens[2] + dateStrTokens[1] + dateStrTokens[0]
      
      return reminderDateString === dateString
      
    })

    res.render("reminder/events-of-the-day", {
      reminders: reminderOfTheDay
    });
  },

  // Change months
  nextMonth: (req, res) => {
    // Displays the next month on the calendar
    let newMonth = new Date(calendarData.shownDate.realDate.getFullYear(), calendarData.shownDate.realDate.getMonth()+1, 1)
    changeMonth(newMonth)
    res.redirect("/reminders");
  },

  prevMonth: (req, res) => {
    // Displays the next month on the calendar
    let newMonth = new Date(calendarData.shownDate.realDate.getFullYear(), calendarData.shownDate.realDate.getMonth()-1, 1)
    changeMonth(newMonth)
    res.redirect("/reminders");
  },

  resetMonth: (req, res) => {
    // Resets the shown month to today's month
    let newMonth = new Date(calendarData.today.realDate.getFullYear(), calendarData.today.realDate.getMonth(), calendarData.today.realDate.getDate())
    changeMonth(newMonth)
    res.redirect("/reminders");
  },
};

module.exports = remindersController;
