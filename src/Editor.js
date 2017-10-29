// @flow

import TextBuffer from './TextBuffer'
import Cursor from './Cursor'
import Movement from './Movement'
import Scroll from './Scroll'
import Drawer from './Drawer'
import EditorFs from './EditorFs'

import type { Char, Key } from './typings.h'

export default class Editor {
  file: string = ''
  width: number = 0
  height: number = 0
  pos: Cursor = new Cursor(0, 0)
  scroll: Scroll = new Scroll(0)
  buffer: TextBuffer = new TextBuffer()
  drawer: Drawer
  movement: Movement

  constructor (file: ?string, buffer: ?TextBuffer) {
    if (file) this.file = file
    if (buffer) this.buffer = buffer

    this.buffer.allocRow(0)

    this.drawer = new Drawer(this.buffer, this.pos, this.scroll)
    this.movement = new Movement(this.buffer, this.pos, this.scroll, this.drawer)

    this.updateWindow()
    if (buffer) this.drawer.fullDraw()
  }

  keypress (ch: ?Char, key: ?Key): void {
    const { movement } = this
    //console.log(ch, key)

    this.updateWindow()

    if (key) {
      if (key.ctrl) {
        switch (key.name) {
          case 'd':
            process.stdin.pause()
            return
          case 'c':
          case 'x':
            process.stdin.pause()
          case 's':
            if (this.file) EditorFs.saveToFile(this.file, this.buffer)
            return
        }
      }

      switch (key.name) {
        case 'backspace':
          this.backspace()
          return
        case 'return':
          this.newLine()
          return
        case 'up':
          movement.up()
          break
        case 'down':
          movement.down()
          break
        case 'left':
          movement.left()
          break
        case 'right':
          movement.right()
      }
    }

    if (ch && this.isEditable(key)) {
      const { buffer, pos, drawer } = this

      buffer.addChar(pos.y, pos.x, ch)
      pos.x++
      drawer.drawLineSmart(pos.y)
    }
  }

  isEditable (key: ?Key): boolean {
    const { pos, buffer, width } = this

    if (pos.x >= width) return false
    if (key && key.ctrl) return false
    if (buffer.getRow(pos.y).length >= width) return false

    return true
  }

  backspace (): this {
    const { pos, buffer, drawer } = this

    if (pos.x > 0) {
      buffer.removeChar(pos.y, pos.x-1)
      pos.x--
      drawer.drawLineSmart(pos.y)

    } else if (pos.y > 0) {
      this.removeLine()
    }

    return this
  }

  removeLine (): this {
    const { buffer, pos, drawer, movement } = this

    pos.x = buffer.getRow(pos.y-1).length

    if (pos.y === buffer.length()-1 && buffer.getRow(pos.y).length === 0) {
      buffer.removeRow(pos.y)
      pos.y--
      drawer.updateCursorPos()
      return this
    }

    pos.y--
    const removed = buffer.removeRow(pos.y+1)
    buffer.concatRows(pos.y, removed)

    movement.updateScroll(true)
    drawer.fullDraw()

    return this
  }

  newLine (): this {
    const { buffer, pos, movement, drawer } = this

    const row = buffer.getRow(pos.y)
    const removed = row.splice(pos.x, row.length - pos.x)
    pos.y++
    pos.x = 0
    buffer.addRow(pos.y, removed)

    movement.updateScroll(true)
    drawer.fullDraw()

    return this
  }

  updateWindow (): this {
    // $FlowFixMe
    this.width = process.stdout.columns
    // $FlowFixMe
    this.height = process.stdout.rows

    this.movement.updateSize(this.width, this.height)
    this.drawer.updateSize(this.width, this.height)

    return this
  }
}
