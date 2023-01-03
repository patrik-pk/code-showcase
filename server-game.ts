// Main game class on server that handles game flow.

// Explanation:
// Server runs a update function 60 (tickRate) times per second,
// that handles game state - player movement, attacks, animations, collisions (not yet), etc.
// Server then sends game state to the client, which then handles it with
// render delay and linear interpolation to make smooth transition between states
// and draws the result on the Canvas HTML Element.

// Note:
// Client only handles inputs and drawing.
// All the logic is handled here on the server for better security.

import { v4 as uuidv4 } from 'uuid'
import { Socket } from 'socket.io'

import Player from '../player/player'
import { PlayerMovement } from '../player/player.types'

import addPlayer from './game.addPlayer'
import sendUpdateToPlayers from './game.sendUpdateToPlayers'
import movePlayers from './game.movePlayers'

class Game {
  sockets: { [key: string]: Socket }
  players: { [key: string]: Player }
  playingPlayers: { [key: string]: Player }
  mapSize: number

  tickRate: number
  loopTimeout: number
  lastUpdateTime: number
  start: number
  time: number

  constructor() {
    this.sockets = {}
    this.players = {}
    this.playingPlayers = {}
    this.mapSize = 1000

    this.tickRate = 60
    this.loopTimeout = 1000 / this.tickRate
    this.lastUpdateTime = Date.now()
    this.start = new Date().getTime()
    this.time = 0

    // Init game loop
    setTimeout(() => this.update(), this.loopTimeout)
  }

  // Update x (tickRate) amount of times per second
  update() {
    this.lastUpdateTime = Date.now()

    // Move players if they are playing or their camera if they are not
    movePlayers(this.players, this.mapSize)

    // Handle player attack
    this.handlePlayerAttacks(this.players)

    // Send update to all players
    sendUpdateToPlayers(this.sockets, this.players, this.mapSize)

    // Handle setTimeout with proper times to ensure correct tickRate
    this.time += this.loopTimeout
    const diff = new Date().getTime() - this.start - this.time
    setTimeout(() => this.update(), this.loopTimeout - diff)
  }

  handlePlayerAttacks = (players: { [key: string]: Player }): void => {
    Object.keys(players).forEach((key) => {
      const player = players[key]
      player.handleAttack()
    })
  }

  addPlayer(socket: Socket) {
    addPlayer(this.sockets, this.players, socket)
  }

  removePlayer(socket: Socket) {
    delete this.players[socket.id]
    delete this.sockets[socket.id]
  }

  spawnPlayer(socket: Socket, username: string) {
    const player = this.players[socket.id]
    player.spawn(username, this.mapSize)
  }

  handlePlayerMovement(socket: Socket, playerMovement: PlayerMovement) {
    const player = this.players[socket.id]
    player && player.handleMovement(playerMovement)
  }

  handlePlayerMouseDirection(socket: Socket, direction: number) {
    const player = this.players[socket.id]
    player && player.handleMouseDirection(direction)
  }

  setPlayerIsAttacking(socket: Socket, bool: boolean) {
    const player = this.players[socket.id]
    player && player.setIsAttacking(bool)
  }
}

export default Game
