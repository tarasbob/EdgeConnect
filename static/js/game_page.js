var makeMove = function(cell){
  // when the player clicks somewhere on the board
  if(!window.frozen &&
      window.cur_player == window.curTurn &&
      !window.finished && cell.state == 0) {
    if(cell.marked == false){
      if(window.numPotentialMoves < window.movesLeft){
         // make a potential move (put a white dot)
         window.numPotentialMoves++;
         cell.marked = true;
       }
    } else {
       // remove a white dot
       window.numPotentialMoves--;
       cell.marked = false;
    }
  }
  updateStatus();
  redraw();
}

var leave_game = function() {
  $.get('leave_game', function(response) {
     window.location.href = "/";
  });
}

var endGame = function(){
  window.finished = true;
  window.mode = "score";
  forEveryCell(function(cell) {
    cell.marked = false;
  });
  $("#btn_pass").prop('disabled', true);
}

function displayScore(){
  var score = calculateScore(1, 2);
  var gameResult = "";
  var winnerName = "";
  if(score.total[1] > score.total[2]){
    winnerName += "<p>" + window.playerNames[1] + " wins!</p>";
  } else {
    winnerName += "<p>" + window.playerNames[2] + " wins!</p>";
  }
  gameResult += "<h4>" + winnerName + "</h4>";
  gameResult += "<p><strong>Total Score:</strong></p>";
  gameResult += "<p>" + window.playerNames[1] + ": " + score.total[1] + "</p>";
  gameResult += "<p>" + window.playerNames[2] + ": " + score.total[2] + "</p>";
  gameResult += "<p><strong>Edge Cells Score:</strong></p>";
  gameResult += "<p>" + window.playerNames[1] + ": " + score.edge[1] + "</p>";
  gameResult += "<p>" + window.playerNames[2] + ": " + score.edge[2] + "</p>";
  gameResult += "<p><strong>Group Score:</strong></p>";
  gameResult += "<p>" + window.playerNames[1] + ": " + score.groups[1] + "</p>";
  gameResult += "<p>" + window.playerNames[2] + ": " + score.groups[2] + "</p>";
  gameResult += "<p><strong>Special Cells Score:</strong></p>";
  gameResult += "<p>" + window.playerNames[1] + ": " + score.special[1] + "</p>";
  gameResult += "<p>" + window.playerNames[2] + ": " + score.special[2] + "</p>";
  $("#score_status").html(gameResult);

  var modalText = "";
  modalText += "<h1>" + winnerName + "</h1>";
  modalText += "<h3>" + window.playerNames[1] + ": " + score.total[1] + "</h3>";
  modalText += "<h3>" + window.playerNames[2] + ": " + score.total[2] + "</h3>";
  $("#gameResultBody").html(modalText);
  $("#gameResultModal").modal('show');
}

var playPass = function(){
  // Rename pass to done;
  // Once player passes, game is finished, other player gets all blank cells
  if(!window.frozen &&
      window.cur_player == window.curTurn &&
      !window.finished) {
    clearMarked();
    $.ajax({
      url: '/make_move',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(["pass"]),
      dataType: 'json'
    });
  }
  forEveryCell(function(cell) {
    if (cell.state == 0) {
      cell.state = 3 - window.curTurn;
    }
  });
  endGame();
  displayScore();
  updateStatus();
  redraw();
}

var commitMove = function() {
  // When the player clicks "Make Move"
  if(!window.frozen &&
      window.cur_player == window.curTurn &&
      window.numPotentialMoves == window.movesLeft) {
    var send_cells = [];
    forEveryCell(function(cell) {
      if(cell.marked == true && cell.state == 0) {
        send_cells.push([cell.x, cell.y, cell.z]);
        cell.state = window.curTurn;
        window.numPotentialMoves = 0;
      }
    });
    $.ajax({
      url: 'make_move',
      type: 'POST',
      contentType:'application/json',
      data: JSON.stringify(send_cells),
      dataType:'json'
    });
    window.frozen = true;
  }
  updateStatus();
  redraw();
}

var formatTime = function(milisecs){
  // Given time in miliseconds, convert it to a pretty string like "2:25:04"
  if(milisecs < 0){
    return "0:00";
  }
  var seconds = milisecs/1000;
  var minutes = Math.floor(seconds/60);
  var hours = Math.floor(seconds/3600);
  seconds = Math.floor(seconds) % 60;
  minutes = minutes % 60;

  result = "";
  if(hours > 0){
    result += hours + ":";
    if(minutes < 10) result += "0";
  }
  result += minutes + ":";
  if(seconds < 10) result += "0";
  result += seconds;
  return result;
}

var clearMarked = function(){
  // Make all marked cells not marked. (remove all white circles)
  forEveryCell(function(cell) {
    cell.marked = false;
  });
  window.numPotentialMoves = 0;
  updateStatus();
  redraw();
}

var updateTime = function(){
  // update time for each player on the board, end game if someone runs out of time
  if(!window.finished){
    var timeForCurPlayer = window.timeLeft[window.curTurn] - (
        Date.now() - window.timeStarted);
    if(window.curTurn == 1){
      $("#p1_time").text(formatTime(timeForCurPlayer));
      $("#p2_time").text(formatTime(window.timeLeft[2]));
    } else {
      $("#p1_time").text(formatTime(window.timeLeft[1]));
      $("#p2_time").text(formatTime(timeForCurPlayer));
    }

    if (window.cur_player == window.curTurn &&
        timeForCurPlayer <= 0 && !window.frozen) {
      playPass();
    }
  }
  updateStatus();
}

var initGame = function(p1_name, p2_name, handicap, size, initTime, cur_player){
  // call updateTime every 100 ms
  setInterval(updateTime, 100);
  addSVG();
  
  window.boardSize = size;
  // size of each cell is derived from board size
  window.cellSize = 0.55*window.svgW/(window.boardSize*2+1);
  // contains all the cells, cellmap maps to this
  window.dataset = [];
  // contains all the cells in the game,
  // map looks like: string "i:j:k" -> int (int points to element in window.dataset)
  window.cellMap = new Object();
  // disable everything when frozen
  window.frozen = false;
  // game finished because of time or pass, pass
  window.finished = false;
  // can be game or score
  window.mode = "game";
  // Number of moves that the current player made (number of white dots on empty cells)
  window.numPotentialMoves = 0;
  // am I player 1 or 2?
  window.cur_player = cur_player

  $("#btn_pass").prop('disabled', false);
  $("#btn_pass").html("Pass");

  // Who's turn is it?
  window.curTurn = 1;
  // Number of moves left for the current player
  // (Number of white dots the player can place)
  window.movesLeft = 1 + parseInt(handicap, 10);
  window.playerNames = ["", p1_name, p2_name];
  
  window.timeInitial = initTime*1000;
  window.timeLeft = [0, window.timeInitial, window.timeInitial];
  window.timeStarted = Date.now();

  for(var i=-window.boardSize; i<=window.boardSize; i++) {
    for(var j=-window.boardSize; j<=window.boardSize; j++) {
      var k = -j-i;
      if(k <= window.boardSize && k >= -window.boardSize) {
        //figure out the tiling colors
        var col = 0;
        if((i-j)%3 == 0){
          col = 1;
        } else if((i-j-1) % 3 == 0){
          col = 2;
        }
        // is current cell on the edge?
        var edge = false;
        if(Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) == window.boardSize) edge = true;

        //Push returns the length of the array; To get the index of the element, we subtract 1.
        window.cellMap['' + i + ':' + j + ':' + k] = window.dataset.push(
           {"x": i, 
            "y": j, 
            "z": k, 
            "state": 0, // 0 means empty, 1 means player 1 has a stone here, 2 means player 2
            "patternCol": col, // which color should the empty cell be
            "edge": edge, // is this edge or not?
            "marked": false, // contains a white dot (potential move)
            "bonus": false, // bonus cell?
            "scoreState": 0, // used during score calculation to assign every cell to a player
            "group": -1}) - 1; // group is used during score calculation
      }
    }
  }
  drawHexes();
  getCell(0, 0, 0).bonus = true;
  window.groups.on("click", function(d){
    makeMove(d);
  });

  $("#score_status").text("");
  $("#p1_name").text(p1_name).css("color", window.playerColors[1]);
  $("#p2_name").text(p2_name).css("color", window.playerColors[2]);
  $("#p1_time").css("color", window.playerColors[1]);
  $("#p2_time").css("color", window.playerColors[2]);
  $("#p1_score_est").css("color", window.playerColors[1]);
  $("#p2_score_est").css("color", window.playerColors[2]);

  updateStatus();
  redraw();
}

var updateStatus = function(){
  // updates the status string on the page, so user knows what's going on
  if(window.finished){
    $("#status").text("Game Over");
  } else {
    var numMoves = window.movesLeft - window.numPotentialMoves;
    if (numMoves == 0) {
      $("#btn_move").prop('disabled', false);
    } else {
      $("#btn_move").prop('disabled', true);
    }
        
    $("#status").text(window.playerNames[window.curTurn] + " has " + numMoves + " move(s)");

    var score_1 = calculateScore(1, 2);
    var score_2 = calculateScore(2, 1);
    var best_1 = score_1.total[1];
    var worst_2 = score_1.total[2];
    var best_2 = score_2.total[2];
    var worst_1 = score_2.total[1];
    $("#p1_score_est").text(worst_1 + " - " + best_1);
    $("#p2_score_est").text(worst_2 + " - " + best_2);
  }
}

var pollServer = function() {
  // This function runs every second and asks the server if there were any state changes
  if (!window.finished) {
    $.ajax({
       url: '/get_state',
       type: 'POST',
       contentType: 'application/json',
       data: JSON.stringify({"client_state_id": window.local_state_id}),
       dataType: 'json',
       success: function(data) {
         var game_url = window.location.href + "s/" + data.game_id;
         if ($("#game_id").val() != game_url) {
           // update the game id
           $("#game_id").val(game_url);
         }
         if (data.update == "new_data" &&
             data.state_id != window.local_state_id) {
           if (window.local_state_id == "init") {
             // start game
             initGame(data.p1_name, data.p2_name, data.handicap,
               data.size, data.time_init, data.cur_player);
           } else if (data.state_id == "finished") {
             // end the game
             forEveryCell(function(cell) {
               if (cell.state == 0) {
                 cell.state = cur_player;
               }
             });
             endGame();
             displayScore();
             updateStatus();
             redraw();
           } else {
             // The opponent made a move, update the game board
             forEveryCell(function(cell) {
               cell.marked = false;
             });
             for (var i = 0; i < data.last_move.length; i++) {
               move_cell = getCell(data.last_move[i][0],
                 data.last_move[i][1],
                 data.last_move[i][2])
               move_cell.marked = true;
               move_cell.state = 3 - data.turn;
             }
             window.curTurn = data.turn;
             window.numPotentialMoves = 0;
             window.movesLeft = 2;
             // update local time
             window.timeLeft[1] = window.timeInitial;
             window.timeLeft[2] = window.timeInitial;
             window.timeStarted = Date.now();
             window.frozen = false;
           }
           window.local_state_id = data.state_id;
           updateStatus();
           redraw();
         } else if (data.update == "error") {
           // local_state_id is messed up, leave the game
           // TODO: handle this better, maybe try to fix this by requesting the entire board
           //       the server
           leave_game();
         }
       }
     });
  }
}

$(function(){
  // Main jQuery function. Execution starts here.
  
  window.local_state_id = "init";
  $("#btn_pass").prop('disabled', true);
  $("#btn_move").prop('disabled', true);

  $("#btn_pass").click(function(){
    // User clicked on the pass button. These buttons are defined in the html pages
    playPass();
  });

  $("input[type='text']").on("click", function() {
    // Select everything in a text box when a user clicks
    $(this).select();
  });

  $("#btn_exit").click(function(){
    // return to main page (and start a new game)
    leave_game();
  });

  $("#btn_move").click(function(){
    commitMove();
  });
  
  // Start polling the server every 1000 ms.
  setInterval(pollServer, 1000);
});
