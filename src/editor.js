// @flow

import readline from 'readline'
import Buffer from './Buffer'
import log from './logger'

import type { Char, Key } from './typings.h'

const cursorTo = readline.cursorTo.bind(null, process.stdin)
//const moveCursor = readline.moveCursor.bind(null, process.stdin)

let width: number = 0
let height: number = 0

const pos = { x: 0, y: 0 }
const buffer = new Buffer()

buffer.allocRow(0)

updateWindow()

/*const window = {
  x: { start: 0, end: width },
  y: { start: 0, end: height }
}*/

const editor = { keypress }

export default editor

class Movement {
  static up () {
    if (pos.y > 0) {
      pos.y--
      const row = buffer.getRow(pos.y)
      pos.x = row[pos.x] ? pos.x : row.length
    }
  }

  static down () {
    if (pos.y < height-1 && buffer.getRow(pos.y+1)) {
      pos.y++
      const row = buffer.getRow(pos.y)
      pos.x = row[pos.x] ? pos.x : row.length
    }
  }

  static left () {
    if (pos.x > 0) pos.x--
    else if (pos.y > 0) {
      pos.y--
      pos.x = buffer.getRow(pos.y).length
    }
  }

  static right () {
    if (pos.x < width && pos.x < buffer.getRow(pos.y).length) pos.x++
    else if (buffer.getRow(pos.y+1)) {
      pos.y++
      pos.x = 0
    }
  }
}

function keypress (ch: ?Char, key: ?Key): void {
  //console.log(ch, key)

  updateWindow()

  if (key) {
    if (key.ctrl && key.name === 'c') {
      process.stdin.pause()
      return
    }

    switch (key.name) {
    case 'backspace':
      if (pos.x > 0) {
        buffer.removeChar(pos.y, pos.x-1)
        pos.x--
        drawLineSmart(pos.y)

      } else if (pos.y > 0) {
        pos.x = buffer.getRow(pos.y-1).length

        if (pos.y === buffer.length()-1 && buffer.getRow(pos.y).length === 0) {
          buffer.removeRow(pos.y)
          pos.y--
          updateCursorPos()
          return
        }

        pos.y--
        const removed = buffer.removeRow(pos.y+1)
        buffer.concatRows(pos.y, removed)
        draw()
      }

      return
    case 'return':
      newLine()
      return

    case 'up':
      Movement.up()
      break
    case 'down':
      Movement.down()
      break
    case 'left':
      Movement.left()
      break
    case 'right':
      Movement.right()
    }

    updateCursorPos()
  }

  if (ch && isEditable(key)) {
    buffer.addChar(pos.y, pos.x, ch)
    pos.x++
    drawLineSmart(pos.y)
  }
}

function isEditable (key: ?Key): boolean {
  if (pos.x >= width) return false
  if (key && key.ctrl) return false
  if (buffer.getRow(pos.y).length >= width) return false

  return true
}

function updateWindow (): void {
  // $FlowFixMe
  width = process.stdout.columns
  // $FlowFixMe
  height = process.stdout.rows
}

function newLine (): void {
  const row = buffer.getRow(pos.y)
  const removed = row.splice(pos.x, row.length - pos.x)
  pos.y++
  pos.x = 0
  buffer.addRow(pos.y, removed)
  draw()
}

function draw (): void {
  for (let y = 0; y < buffer.length() + 5; y++) {
    drawLine(y)
  }

  updateCursorPos()
}

function drawLine (y: number): void {
  const row = buffer.getRow(y) || []

  const parsedRow = []

  for (let x = 0; x < width; x++) {
    parsedRow.push(row[x] || ' ')
  }

  cursorTo(0, y)

  process.stdout.write(parsedRow.join(''))
}

function drawLineSmart (y: number): void {
  const row = buffer.getRow(y)

  const start = pos.x > 0 ? pos.x - 1 : 0
  const end = row.length + 1

  const parsedRow = []

  for (let x = start; x < end; x++) {
    parsedRow.push(row[x] || ' ')
  }

  cursorTo(start, y)

  process.stdout.write(parsedRow.join(''))

  updateCursorPos()
}

function updateCursorPos (): void {
  cursorTo(pos.x, pos.y)
  log(JSON.stringify(pos), JSON.stringify(buffer._buffer))
}
