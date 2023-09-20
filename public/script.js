// Wait for the DOM to be fully loaded before executing the script
document.addEventListener("DOMContentLoaded", function () {
  // Select DOM elements
  const todoItems = document.querySelectorAll(".todo-item");
  const allTaskLink = document.querySelector(".all-task");
  const activeTaskLink = document.querySelector(".active-task");
  const completedTaskLink = document.querySelector(".completed-task");

  // Function to filter and update task visibility based on the filter parameter
  function filterTasks(filter) {
    todoItems.forEach(function (item) {
      const checkbox = item.querySelector("input[type=checkbox]");
      const isCompleted = checkbox.checked;

      // Check the filter and set the task's display property accordingly
      if (filter === "all" || (filter === "active" && !isCompleted) || (filter === "completed" && isCompleted)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  }

  // Event listeners for filter links if they exist
  if (allTaskLink && activeTaskLink && completedTaskLink) {
    allTaskLink.addEventListener("click", function (e) {
      e.preventDefault();
      filterTasks("all");
    });

    activeTaskLink.addEventListener("click", function (e) {
      e.preventDefault();
      filterTasks("active");
    });

    completedTaskLink.addEventListener("click", function (e) {
      e.preventDefault();
      filterTasks("completed");
    });
  }

  // Event listener for checkbox change
  todoItems.forEach(function (item) {
    const checkbox = item.querySelector("input[type=checkbox]");
    checkbox.addEventListener("change", function () {
      const spanText = item.querySelector("span.active");
      if (checkbox.checked) {
        spanText.classList.add("completed"); // Apply 'completed' class to the task name
      } else {
        spanText.classList.remove("completed"); // Remove 'completed' class from the task name
      }
    });
  });
});


// jQuery Code to Handle task removal when the "Delete" button is clicked
$(document).ready(function () {
  $('.delete-todo-item').click(function () {
    const taskItem = $(this).closest('.todo-item');
    const taskId = taskItem.data('task-id');

    // Send an AJAX request to delete the task
    $.ajax({
      url: '/deleteTask',
      type: 'POST',
      data: { taskId },
      success: function () {
        // Remove the task item from the DOM after successful deletion
        taskItem.remove();

        // Update the data-task-id attribute of remaining task items
        $('.todo-item').each(function (index) {
          $(this).data('task-id', index);
        });
      },
      error: function () {
        // Handle errors if necessary
      }
    });
  });
});

// Handle task completion for movies and TV shows
$(document).ready(function () {
  // Event handler for movie and TV show checkboxes
  function handleCheckbox(checkbox, isMovie) {
    const taskId = checkbox.data('task-id');
    const isCompleted = checkbox.prop('checked'); // Get the checkbox state

    // Send an AJAX request to update task completion on the server
    $.ajax({
      url: '/completeTask',
      type: 'POST',
      data: { taskId, isCompleted, isMovie },
      success: function () {
        // Update the checkbox state based on the response
        checkbox.prop('checked', isCompleted);
      },
      error: function () {
        // Handle errors if necessary
      }
    });
  }

  // Event handler for movie checkbox
  $('.todo-item-movie input[type="checkbox"]').click(function () {
    const checkbox = $(this);
    handleCheckbox(checkbox, true);
  });

  // Event handler for TV show checkbox
  $('.todo-item-tvshow input[type="checkbox"]').click(function () {
    const checkbox = $(this);
    handleCheckbox(checkbox, false);
  });
});

  // Handle adding to watchlist button click
  document.querySelector(".add-to-watchlist").addEventListener("click", function () {
    const button = this;
    const mediaTitle = button.getAttribute("data-media-title");
    const isMovie = button.getAttribute("data-is-movie") === "true";
  
    // Make an AJAX request to add the title to the appropriate watchlist
    $.ajax({
      url: "/add-to-watchlist",
      type: "POST",
      data: { mediaTitle: mediaTitle, isMovie: isMovie },
      success: function () {
        // Handle success (e.g., display a success message)
        alert(`Added "${mediaTitle}" to your Watchlist`);
      },
      error: function () {
        // Handle errors if necessary
        alert("Failed to add to watchlist");
      },
    });
  });
