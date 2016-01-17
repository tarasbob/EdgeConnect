import random
import itertools
import string
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for)

app = Flask(__name__)
# This key is a random string that is used for session cookie management
app.secret_key = "8edca468f5f7bb849e5d8bedb" + str(random.randint(0, 100000))
# Store all games in this map (global variable)
# maps game_id (str) -> Game
app.games = {}
# Store all users in this map
# maps user_id (str) -> User
app.users = {}

ASSETS = {
    'bootstrap_css': 'css/bootstrap.min.css',
    'bootstrap_js': 'js/bootstrap.min.js',
    'd3_js': 'js/d3.v3.min.js',
    'favicon_ico': 'favicon.ico',
    'front_page_js': 'js/front_page.js',
    'game_css': 'css/game.css',
    'game_page_js': 'js/game_page.js',
    'jquery_js': 'js/jquery-2.0.3.min.js',
    'lib_js': 'js/lib.js'}

def get_id():
  '''Returns a random 10 character string, which can be used to identify objects.'''
  characters = string.ascii_uppercase + string.ascii_lowercase + string.digits
  return ''.join(random.choice(characters) for _ in range(10))

class GameBoard(object):
  '''Currently only stores the state of the game board.

  TODO: extend to do an independent score calculation on the server.
  '''

  def __init__(self, size, handicap):
    # board size
    self.size = size
    # The number of handicap moves player 1 has
    self.handicap = handicap
    # Map that stores the state of the board
    # Map keys are (int, int, int) representing the coordinates
    # Map values are int: 0 represents blank cell, 1 represents player 1 color, 2
    # represents player 2 color
    self.grid = {}
    # Who's turn is it? The game always starts with player 1 moving
    self.turn = 1
    self._create_grid()

  def _create_grid(self):
    '''Create empty grid, set all cells to 0 (empty).'''
    for x, y, z in itertools.product(
        range(-self.size, self.size + 1), repeat=3):
      if x + y + z == 0:
        self.grid[(x, y, z)] = 0

  def make_move(self, move):
    # TODO: verify that the correct player is making a move now
    for (x, y, z) in move:
      if self.grid[(x, y, z)] != 0:
        # The player played an illegal move (by moving to a cell that is not blank)
        pass
    # TODO: verify that all positions are unique
    for (x, y, z) in move:
      self.grid[(x, y, z)] = self.turn
    self.turn = 3 - self.turn

class Game(object):
  '''Represents the game.'''

  def __init__(self, board_size, handicap, time_init, p2):
    self.game_id = get_id()
    self.time_init = time_init
    self.p1 = None
    self.p2 = p2
    # Every state of the game has a unique identifier. The state changes after every move.
    # It can be used to check if any updates happened to the game. Game always starts in
    # "init" state and ends in "finished" state.
    self.state_id = 'init'
    # Previous state id.
    self.prev_state_id = 'init'
    # What was the last move?
    self.last_move = []
    self.board = GameBoard(board_size, handicap)

  def _update_id(self):
    '''Update state_id and prev_state_id.'''
    self.prev_state_id = self.state_id
    self.state_id = get_id()

  def make_move(self, move):
    self.last_move = move
    self.board.make_move(move)
    self._update_id()

  def add_player(self, p1):
    '''Add player 1 to the game.'''
    self.p1 = p1
    p1.game = self
    self._update_id()

  def finish_game(self):
    self.prev_state_id = self.state_id
    self.state_id = 'finished'

  def remove_player(self, user):
    '''Remove player from the game.'''
    user.game = None
    if self.p1 == user:
      self.p1 = None
    if self.p2 == user:
      self.p2 = None
    self.finish_game()

  @property
  def turn(self):
    return self.board.turn

class User(object):
  '''Represents a player.'''
  def __init__(self, username, user_id):
    self.username = username
    self.user_id = user_id
    self.game = None

def add_user_to_db(username):
  import psycopg2
  conn_string = "host='104.236.83.49' dbname='test1' user='postgres'"
  conn = psycopg2.connect(conn_string)
  cursor = conn.cursor()
  cursor.execute("INSERT INTO player (name, rating) values ('{0}', {1})".format(username, 500))
  cursor.execute('SELECT * FROM player')
  result = cursor.fetchall()
  print result

@app.route("/", methods=['GET', 'POST'])
def front_page():
  '''Renders the front page as HTML.'''
  if request.method == 'POST':
    # If this is a POST, this means the user is trying to log in
    username = request.form['username']
    # Each user has a unique id
    user_id = get_id()
    app.users[user_id] = User(username, user_id)
    # Store username an user_id in the session. Session is imported from flask and works
    # via cookies. Flask abstracts coookie management.
    add_user_to_db(username)
    session['username'] = username
    session['user_id'] = user_id
    # Send user to front page after logging in
    tmp = redirect(url_for('front_page'))
    print 'redirect', tmp
    return tmp
  if 'username' not in session:
    # User is not logged in, send him to the login page
    return render_template('login_page.tmpl', assets=ASSETS)
  game_to_join = session.get('game_to_join')
  if game_to_join:
    # If the session stores which game to join, redirect the player to the game. This
    # parameter is set in join_game.
    del session['game_to_join']
    return redirect('/games/' + game_to_join)
  tmp = render_template('front_page.tmpl', assets=ASSETS)
  print 'render', type(tmp), tmp
  return tmp

@app.route('/games/<game_id>')
def join_game(game_id):
  '''Renders a report as HTML. '''
  # Sets current game to game_id
  user_id = session.get('user_id')
  user = app.users.get(user_id)
  if user is None:
    # User is trying to join the game before logging in, send him to the login page first.
    session['game_to_join'] = game_id
    return redirect(url_for('front_page'))
  game = app.games.get(game_id)
  if game is None or game.p1 is not None or game.p2 == user:
    # game does not exist or is full
    return redirect(url_for('front_page'))
  game.add_player(user)
  return redirect(url_for('show_game'))

@app.route('/leave_game')
def leave_game():
  # When player clicks "leave game"
  user_id = session.get('user_id')
  user = app.users.get(user_id)
  if user is None: return ''
  game = user.game
  if game is None: return ''
  game.remove_player(user)
  return ''

@app.route('/game')
def show_game():
  user_id = session.get('user_id')
  user = app.users.get(user_id)
  if user is None:
    return redirect(url_for('front_page'))
  game = user.game
  if game is None:
    return redirect(url_for('front_page'))
  # TODO: getting user and game causes too much code repetition, put this code into a
  # separate method
  return render_template('game_page.tmpl', assets=ASSETS)

@app.route('/get_state', methods=['GET', 'POST'])
def get_state():
  # Get the current state of the game
  # TODO: handle a case where one of the players disconnected (or closed the browser)
  user = app.users.get(session.get('user_id'))
  if user is None:
    return ''
  game = user.game
  if game is None:
    return ''
  # Current player number (Did this request come from p1 or p2?).
  cur_player = 1 if game.p1 == user else 2
  # state_id on the client side
  client_state_id = request.json['client_state_id']
  if client_state_id == game.state_id:
    # If state_id is the same, no need to send a big update
    return jsonify(update="no_update", game_id=game.game_id)
  elif client_state_id == game.prev_state_id:
    # TODO: it's not necessary to send so much info each time, figure out how to optimize
    #       this.
    return jsonify(
        update="new_data",
        state_id=game.state_id,
        turn=game.turn,
        last_move=game.last_move,
        time_init=game.time_init,
        p1_name=game.p1.username if game.p1 else 'Empty',
        p2_name=game.p2.username if game.p2 else 'Empty',
        handicap=game.board.handicap,
        size=game.board.size,
        game_id=game.game_id,
        cur_player=cur_player)
  else:
    # client state id is messed up
    return jsonify(update="error")

@app.route('/make_move', methods=['GET', 'POST'])
def make_move():
  user = app.users.get(session.get('user_id'))
  if user is None:
    return ''
  game = user.game
  if game is None:
    return ''
  move = request.json
  if move[0] == 'pass':
    # If player passes, game should be finished.
    # TODO: Rename pass to something more meaningful
    game.finish_game()
  else:
    game.make_move(move)
  return ''

@app.route('/create_game')
def create_game():
  user = app.users.get(session.get('user_id'))
  if user is None: return ''
  try:
    # We need try except here because we try to parse string as integer here.
    game = Game(
        board_size=int(request.args['board_size']),
        handicap=int(request.args['handicap']),
        # TODO: rename time_init to something more meaningful
        time_init=int(request.args['time_init']),
        p2=user)
  except:
    return ''
  app.games[game.game_id] = game
  user.game = game
  return 'success'

if __name__ == '__main__':
  app.run(host='0.0.0.0', debug=False)
